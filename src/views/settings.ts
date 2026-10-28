import { auth, call } from '../api';
import { $, $$, confirmDialog, errText, esc, formValues, modal, toast, withBusy } from '../lib/dom';
import { icon } from '../lib/icons';
import { printHtml, receiptMarkup } from '../lib/receipt';
import { applyTheme, contrast, PRESETS } from '../lib/theme';
import { store } from '../store';
import type { PaymentMethod, Receipt } from '../types';
import type { ViewCtx } from './shell';
import { questionFields, readQuestions, wireQuestionFields } from './recovery-ui';

type Section = 'business' | 'receipts' | 'selling' | 'appearance' | 'email' | 'payments' | 'type' | 'security' | 'backup' | 'account';
const SECTIONS: Array<{ key: Section; label: string; icon: string; owner: boolean }> = [
  { key: 'business', label: 'Business profile', icon: 'store', owner: true },
  { key: 'receipts', label: 'Receipts & tax', icon: 'receipt', owner: true },
  { key: 'selling', label: 'Selling rules & wording', icon: 'tag', owner: true },
  { key: 'appearance', label: 'Colours & theme', icon: 'palette', owner: true },
  { key: 'email', label: 'Email', icon: 'mail', owner: true },
  { key: 'payments', label: 'Payment methods', icon: 'cash', owner: true },
  { key: 'type', label: 'Business type', icon: 'layers', owner: true },
  { key: 'security', label: 'Security & recovery', icon: 'shield', owner: true },
  { key: 'backup', label: 'Backup', icon: 'download', owner: true },
  { key: 'account', label: 'My account', icon: 'key', owner: false },
];

const PROVIDERS: Record<string, { name: string; host: string; port: string; security: string; help: string }> = {
  gmail: { name: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: '587', security: 'starttls',
    help: `<ol><li>Turn on <b>2-Step Verification</b> for the Google account.</li><li>Open <b>myaccount.google.com/apppasswords</b>, create an app password named “eStock”, and copy the 16 letters.</li><li>Paste it below as the password. Your normal Gmail password will not work.</li></ol><p>Send from the same Gmail address, or an alias added under Gmail → Settings → Accounts → “Send mail as”. Gmail allows about 500 emails a day.</p>` },
  outlook: { name: 'Outlook / Microsoft 365', host: 'smtp.office365.com', port: '587', security: 'starttls',
    help: '<p>Use your full email address and password. For Microsoft 365 business mailboxes, your admin must allow <b>Authenticated SMTP</b> for this mailbox. If you use two-step sign-in, create an app password.</p><p>Outlook.com personal accounts use <b>smtp-mail.outlook.com</b>.</p>' },
  yahoo: { name: 'Yahoo Mail', host: 'smtp.mail.yahoo.com', port: '465', security: 'ssl',
    help: '<p>Go to Yahoo Account Security → <b>Generate app password</b>, and use that password here.</p>' },
  zoho: { name: 'Zoho Mail', host: 'smtp.zoho.com', port: '465', security: 'ssl',
    help: '<p>Use <b>smtp.zoho.eu</b> or <b>smtp.zoho.in</b> if your account is hosted there. With two-factor sign-in, create an application-specific password.</p>' },
  custom: { name: 'Other (your host or domain email)', host: '', port: '587', security: 'starttls',
    help: '<p>Get the SMTP server, port and security type from your web host (cPanel → Email Accounts → Connect Devices). Port 587 normally uses STARTTLS, and port 465 uses SSL/TLS.</p>' },
};

let section: Section = 'business';

export async function render(ctx: ViewCtx) {
  const owner = auth.can('owner');
  if (!owner) section = 'account';
  else if (ctx.params.section) section = ctx.params.section as Section;
  ctx.header('Settings', owner ? 'Make the app fit your business.' : 'Your account.');
  await store.loadSettings();
  const visible = SECTIONS.filter((s) => owner || !s.owner);
  ctx.main.innerHTML = `<div class="settings">
    <nav class="settings-nav" aria-label="Settings sections">${visible.map((s) => `<button data-sec="${s.key}" class="${s.key === section ? 'is-on' : ''}">${icon(s.icon, 17)}<span>${s.label}</span></button>`).join('')}</nav>
    <div class="settings-body" data-body></div></div>`;
  const body = $('[data-body]', ctx.main)!;
  const show = async () => {
    $$('[data-sec]', ctx.main).forEach((b) => b.classList.toggle('is-on', b.dataset.sec === section));
    // Leaving the colour section without saving restores the saved theme.
    applyTheme(store.settings.theme_primary, store.settings.theme_secondary, store.settings.theme_mode);
    body.innerHTML = '';
    await ({ business, receipts, selling, appearance, email, payments, type: businessType, security, backup, account } as Record<Section, (b: HTMLElement, c: ViewCtx) => Promise<void> | void>)[section](body, ctx);
  };
  ctx.main.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-sec]');
    if (b) { section = b.dataset.sec as Section; show().catch((x) => toast(errText(x), 'error')); }
  });
  await show();
}

async function save(values: Record<string, string>, btn: HTMLButtonElement | null, after?: () => void) {
  await withBusy(btn, async () => {
    await call('save_settings', { values });
    await store.loadSettings();
    toast('Settings saved');
    after?.();
  });
}

const head = (title: string, text: string) => `<header class="settings-head"><h2>${esc(title)}</h2><p class="muted">${text}</p></header>`;
const check = (name: string, title: string, text: string) => `<label class="check"><input type="checkbox" name="${name}" ${store.flag(name) ? 'checked' : ''}><span><b>${esc(title)}</b><br><small class="muted">${esc(text)}</small></span></label>`;
const val = (k: string) => esc(store.settings[k] ?? '');

// ---------------------------------------------------------------- business

function business(body: HTMLElement, ctx: ViewCtx) {
  let logo = store.settings.business_logo ?? '';
  body.innerHTML = `${head('Business profile', 'Shown on receipts, emails and the sign-in screen.')}
    <form class="stack form-narrow" novalidate>
      <label class="field"><span>Business name</span><input name="business_name" required maxlength="120" value="${val('business_name')}"></label>
      <label class="field"><span>Address</span><textarea name="business_address" rows="2" maxlength="300">${val('business_address')}</textarea></label>
      <div class="grid-2">
        <label class="field"><span>Phone</span><input name="business_phone" maxlength="60" value="${val('business_phone')}"></label>
        <label class="field"><span>Email</span><input name="business_email" type="email" maxlength="254" value="${val('business_email')}"></label>
      </div>
      <div class="grid-2">
        <label class="field"><span>Currency symbol</span><input name="currency_symbol" maxlength="4" value="${val('currency_symbol') || '₦'}"><small>Use ₦ for naira, or GH₵, KSh, $, £ and so on.</small></label>
      </div>
      <div class="field"><span>Logo</span>
        <div class="logo-row"><div class="logo-preview" data-logo>${logo ? `<img src="${esc(logo)}" alt="Current logo">` : '<span class="muted small">No logo</span>'}</div>
          <div class="stack-sm"><label class="btn btn-ghost btn-sm file-btn">${icon('download', 15)} Choose image<input type="file" accept="image/png,image/jpeg,image/webp" data-file hidden></label>
          <button type="button" class="link-btn" data-clear-logo ${logo ? '' : 'hidden'}>Remove logo</button>
          <small class="muted">PNG, JPG or WebP. Square images work best.</small></div></div></div>
      <div class="form-actions start"><button class="btn btn-primary">Save business profile</button></div>
    </form>`;
  const form = $<HTMLFormElement>('form', body)!;
  const preview = $('[data-logo]', body)!;
  $<HTMLInputElement>('[data-file]', body)!.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      logo = await shrinkImage(file, 320);
      preview.innerHTML = `<img src="${esc(logo)}" alt="New logo">`;
      $('[data-clear-logo]', body)!.hidden = false;
    } catch (x) { toast(errText(x), 'error'); }
  });
  $('[data-clear-logo]', body)!.addEventListener('click', () => { logo = ''; preview.innerHTML = '<span class="muted small">No logo</span>'; $('[data-clear-logo]', body)!.hidden = true; });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formValues(form);
    save({ business_name: v.business_name, business_address: v.business_address, business_phone: v.business_phone, business_email: v.business_email, currency_symbol: v.currency_symbol, business_logo: logo }, $('.btn-primary', form) as HTMLButtonElement, ctx.refreshChrome);
  });
}

/** Downscales an uploaded logo to a small PNG data URL so it stays light in the database and emails. */
function shrinkImage(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error('Choose a PNG, JPG or WebP image'));
    if (file.size > 8 * 1024 * 1024) return reject(new Error('That image is larger than 8 MB'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const out = c.toDataURL('image/png');
      out.length > 680_000 ? reject(new Error('Logo is still too large after resizing')) : resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image')); };
    img.src = url;
  });
}

// ---------------------------------------------------------------- receipts

function sampleReceipt(): Receipt {
  const items = (store.products.filter((p) => p.kind !== 'material').slice(0, 3));
  const lines = items.length ? items.map((p, i) => ({ product_name: p.name, product_kind: p.kind, unit: p.unit, quantity: i + 1, unit_price_kobo: p.selling_price_kobo, line_total_kobo: p.selling_price_kobo * (i + 1) }))
    : [{ product_name: 'Sample item', product_kind: 'product' as const, unit: 'piece', quantity: 2, unit_price_kobo: 250000, line_total_kobo: 500000 }];
  const subtotal = lines.reduce((a, l) => a + l.line_total_kobo, 0);
  const rate = store.flag('tax_enabled') ? Number(store.settings.tax_rate || 0) : 0;
  const tax = Math.round((subtotal * rate) / 100);
  return { id: 0, receipt_no: `${store.settings.receipt_prefix || 'RCP'}-2610-00042`, customer_id: null, customer_name: 'Mrs Ekaette Bassey', customer_phone: '', customer_email: '', cashier_name: auth.session!.full_name,
    subtotal_kobo: subtotal, discount_kobo: 0, tax_kobo: tax, total_kobo: subtotal + tax, amount_paid_kobo: subtotal + tax, change_kobo: 0, balance_kobo: 0, payment_status: 'paid', fulfilment_status: 'none',
    collection_date: '', note: '', void_reason: '', voided_by: '', created_at: new Date().toISOString().slice(0, 19).replace('T', ' '), items: lines,
    payments: [{ method: 'Bank transfer', amount_kobo: subtotal + tax, reference: '', received_by: '', created_at: '' }] };
}

async function receipts(body: HTMLElement) {
  if (!store.products.length) await store.loadProducts().catch(() => undefined);
  body.innerHTML = `${head('Receipts & tax', 'What prints at the top and bottom of every receipt.')}
    <div class="split-preview"><form class="stack" novalidate>
      <div class="grid-2">
        <label class="field"><span>Receipt title</span><input name="receipt_title" maxlength="60" value="${val('receipt_title')}"><small>e.g. Sales receipt, Laundry ticket, Invoice.</small></label>
        <label class="field"><span>Number prefix</span><input name="receipt_prefix" maxlength="8" value="${val('receipt_prefix')}" spellcheck="false"><small>Letters or numbers, up to 8.</small></label>
      </div>
      <label class="field"><span>Message at the bottom</span><textarea name="receipt_footer" rows="3" maxlength="300">${val('receipt_footer')}</textarea></label>
      <div class="field"><span>Paper size</span><div class="seg" role="radiogroup">
        ${[['58', '58 mm roll'], ['80', '80 mm roll'], ['a4', 'A4 sheet']].map(([v, l]) => `<label><input type="radio" name="receipt_width_mm" value="${v}" ${store.settings.receipt_width_mm === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
      </div><small class="muted">Pick your thermal printer and the same paper size in the print dialog.</small></div>
      <fieldset class="subtle stack">
        ${check('tax_enabled', 'Charge tax on sales', 'Added after any discount and shown as its own line on the receipt.')}
        <div class="grid-2"><label class="field"><span>Tax name</span><input name="tax_label" maxlength="20" value="${val('tax_label')}"></label>
        <label class="field"><span>Rate (%)</span><input name="tax_rate" inputmode="decimal" value="${val('tax_rate')}"><small>Nigerian VAT is 7.5%.</small></label></div>
      </fieldset>
      <div class="form-actions start"><button class="btn btn-primary">Save receipt settings</button></div>
    </form><aside class="preview-pane"><span class="field-label">Preview</span><div class="paper-wrap" data-preview></div></aside></div>`;
  const form = $<HTMLFormElement>('form', body)!;
  const preview = $('[data-preview]', body)!;
  const draw = () => {
    const v = formValues(form);
    const saved = { ...store.settings };
    Object.assign(store.settings, { receipt_title: v.receipt_title, receipt_prefix: v.receipt_prefix, receipt_footer: v.receipt_footer, tax_enabled: v.tax_enabled, tax_label: v.tax_label, tax_rate: v.tax_rate });
    preview.innerHTML = receiptMarkup(sampleReceipt(), { width: v.receipt_width_mm === 'a4' ? '80' : v.receipt_width_mm });
    store.settings = saved;
  };
  draw();
  form.addEventListener('input', draw);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formValues(form);
    save({ receipt_title: v.receipt_title, receipt_prefix: v.receipt_prefix, receipt_footer: v.receipt_footer, receipt_width_mm: v.receipt_width_mm, tax_enabled: v.tax_enabled, tax_label: v.tax_label, tax_rate: v.tax_rate }, $('.btn-primary', form) as HTMLButtonElement);
  });
}

// ---------------------------------------------------------------- selling rules & wording

function selling(body: HTMLElement, ctx: ViewCtx) {
  body.innerHTML = `${head('Selling rules & wording', 'Adjust how the till behaves and what things are called, so the app speaks your business language.')}
    <form class="stack form-narrow">
      <fieldset class="subtle stack"><legend>At the till</legend>
        ${check('allow_price_override', 'Let cashiers change prices on a sale', 'Useful for farm produce, bulk buyers and negotiated prices. Managers can always change prices.')}
        ${check('allow_negative_stock', 'Allow selling when stock shows zero', 'Keep this off unless you sell before recording deliveries. Counts can go below zero.')}
        ${check('track_collection', 'Track orders for pickup', 'Each receipt gets In progress, Ready and Collected stages with a collection date. Ideal for dry cleaning, tailoring and repairs.')}
      </fieldset>
      <fieldset class="subtle stack"><legend>Wording</legend>
        <div class="grid-3">
          <label class="field"><span>One item is called</span><input name="label_item" maxlength="30" value="${val('label_item')}" placeholder="Item"></label>
          <label class="field"><span>Many items are called</span><input name="label_items" maxlength="30" value="${val('label_items')}" placeholder="Items"></label>
          <label class="field"><span>A buyer is called</span><input name="label_customer" maxlength="30" value="${val('label_customer')}" placeholder="Customer"></label>
        </div>
        <small class="muted">For example: Product / Products / Customer for a supermarket, Menu item / Menu items / Guest for an eatery, Service / Services / Client for a laundry.</small>
      </fieldset>
      <div class="form-actions start"><button class="btn btn-primary">Save</button></div>
    </form>`;
  const form = $<HTMLFormElement>('form', body)!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formValues(form);
    save({ allow_price_override: v.allow_price_override, allow_negative_stock: v.allow_negative_stock, track_collection: v.track_collection, label_item: v.label_item || 'Item', label_items: v.label_items || 'Items', label_customer: v.label_customer || 'Customer' }, $('.btn-primary', form) as HTMLButtonElement, ctx.refreshChrome);
  });
}

// ---------------------------------------------------------------- appearance

function appearance(body: HTMLElement) {
  let primary = store.settings.theme_primary || PRESETS[0].primary;
  let secondary = store.settings.theme_secondary || PRESETS[0].secondary;
  let mode = store.settings.theme_mode || 'light';
  body.innerHTML = `${head('Colours & theme', 'Pick two colours: the action colour for buttons and highlights, and the frame colour for the side menu and receipt emails.')}
    <div class="stack form-narrow">
      <div class="field"><span>Ready-made pairs</span><div class="swatches">${PRESETS.map((p) => `<button type="button" class="swatch" data-preset="${p.primary}|${p.secondary}" aria-label="${esc(p.name)}"><span class="swatch-colors"><i style="background:${p.secondary}"></i><i style="background:${p.primary}"></i></span><span>${esc(p.name)}</span></button>`).join('')}</div></div>
      <div class="grid-2">
        <label class="field"><span>Action colour</span><span class="color-field"><input type="color" data-c="primary" value="${primary}"><input data-hex="primary" value="${primary}" maxlength="7" spellcheck="false" aria-label="Action colour hex"></span></label>
        <label class="field"><span>Frame colour</span><span class="color-field"><input type="color" data-c="secondary" value="${secondary}"><input data-hex="secondary" value="${secondary}" maxlength="7" spellcheck="false" aria-label="Frame colour hex"></span></label>
      </div>
      <p class="small" data-contrast></p>
      <div class="field"><span>Brightness</span><div class="seg" role="radiogroup">
        <label><input type="radio" name="mode" value="light" ${mode === 'light' ? 'checked' : ''}><span>${icon('sun', 15)} Light</span></label>
        <label><input type="radio" name="mode" value="dark" ${mode === 'dark' ? 'checked' : ''}><span>${icon('moon', 15)} Dark</span></label>
      </div></div>
      <div class="theme-sample"><div class="ts-nav"><span></span><span class="on"></span><span></span></div><div class="ts-main"><b>Sample screen</b><p class="muted small">Buttons and highlights use the action colour.</p><div class="ts-row"><button type="button" class="btn btn-primary btn-sm">Take payment</button><span class="pill pill-ok">Paid</span><a class="link-btn">A link</a></div></div></div>
      <div class="form-actions start"><button type="button" class="btn btn-ghost" data-reset>Undo changes</button><button type="button" class="btn btn-primary" data-save>Save colours</button></div>
    </div>`;
  const sync = () => {
    applyTheme(primary, secondary, mode);
    $$<HTMLElement>('[data-preset]', body).forEach((b) => b.classList.toggle('is-on', b.dataset.preset!.toUpperCase() === `${primary}|${secondary}`.toUpperCase()));
    (['primary', 'secondary'] as const).forEach((k) => {
      const v = k === 'primary' ? primary : secondary;
      ($(`[data-c="${k}"]`, body) as HTMLInputElement).value = v;
      ($(`[data-hex="${k}"]`, body) as HTMLInputElement).value = v.toUpperCase();
    });
    const surface = mode === 'dark' ? '#171C24' : '#FFFFFF';
    const c = contrast(primary, surface);
    $('[data-contrast]', body)!.innerHTML = c < 3 ? `${icon('alert', 15)} This action colour is faint against the page. Buttons stay readable, but a deeper shade will be clearer.` : '';
  };
  sync();
  body.addEventListener('click', (e) => {
    const p = (e.target as HTMLElement).closest<HTMLElement>('[data-preset]');
    if (p) { [primary, secondary] = p.dataset.preset!.split('|'); sync(); }
  });
  body.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    const key = el.dataset.c ?? el.dataset.hex;
    if (key && /^#[0-9a-f]{6}$/i.test(el.value)) { if (key === 'primary') primary = el.value; else secondary = el.value; sync(); }
    if (el.name === 'mode') { mode = el.value; sync(); }
  });
  $('[data-reset]', body)!.addEventListener('click', () => {
    primary = store.settings.theme_primary; secondary = store.settings.theme_secondary; mode = store.settings.theme_mode || 'light';
    ($(`input[name=mode][value=${mode}]`, body) as HTMLInputElement).checked = true;
    sync();
  });
  $('[data-save]', body)!.addEventListener('click', (e) => save({ theme_primary: primary, theme_secondary: secondary, theme_mode: mode }, e.currentTarget as HTMLButtonElement));
}

// ---------------------------------------------------------------- email

function email(body: HTMLElement) {
  const s = store.settings;
  let provider = s.smtp_provider || 'gmail';
  const pwSet = s.smtp_password_set === '1';
  body.innerHTML = `${head('Email', 'Send receipts straight to customers’ inboxes from your own email account.')}
    <form class="stack form-narrow" novalidate>
      <div class="field"><span>Email provider</span><div class="provider-grid" role="radiogroup">
        ${Object.entries(PROVIDERS).map(([k, p]) => `<label><input type="radio" name="smtp_provider" value="${k}" ${provider === k ? 'checked' : ''}><span>${esc(p.name)}</span></label>`).join('')}
      </div></div>
      <div class="callout callout-info" data-help></div>
      <div class="grid-3" data-server>
        <label class="field span-2"><span>SMTP server</span><input name="smtp_host" maxlength="253" value="${esc(s.smtp_host || '')}" spellcheck="false"></label>
        <label class="field"><span>Port</span><input name="smtp_port" inputmode="numeric" maxlength="5" value="${esc(s.smtp_port || '587')}"></label>
      </div>
      <div class="field" data-security><span>Connection security</span><div class="seg" role="radiogroup">
        ${[['starttls', 'STARTTLS (587)'], ['ssl', 'SSL/TLS (465)'], ['none', 'None (local only)']].map(([v, l]) => `<label><input type="radio" name="smtp_security" value="${v}" ${(s.smtp_security || 'starttls') === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
      </div></div>
      <div class="grid-2">
        <label class="field"><span>Email address / username</span><input name="smtp_username" maxlength="254" value="${esc(s.smtp_username || '')}" autocomplete="off" spellcheck="false" placeholder="yourshop@gmail.com"></label>
        <label class="field"><span data-pwlabel>App password</span><input name="smtp_password" type="password" maxlength="256" autocomplete="new-password" placeholder="${pwSet ? 'Saved. Leave blank to keep it.' : 'Paste the password here'}"></label>
      </div>
      <div class="grid-2">
        <label class="field"><span>Sender name</span><input name="smtp_from_name" maxlength="80" value="${esc(s.smtp_from_name || '')}" placeholder="${esc(s.business_name || '')}"></label>
        <label class="field"><span>Send from address</span><input name="smtp_from_email" type="email" maxlength="254" value="${esc(s.smtp_from_email || '')}" placeholder="Same as the username"></label>
      </div>
      <label class="field"><span>Replies go to <em class="muted">(optional)</em></span><input name="smtp_reply_to" type="email" maxlength="254" value="${esc(s.smtp_reply_to || '')}" placeholder="${esc(s.business_email || 'e.g. manager@yourshop.com')}"></label>
      ${check('email_bcc_self', 'Send me a copy of every receipt', 'A blind copy goes to the sending address, so you have a record in your mailbox.')}
      <div class="form-actions start"><button class="btn btn-primary">Save email settings</button></div>
    </form>
    <section class="test-mail">
      <h3>Send a test email</h3><p class="muted small">Save first, then send a test to check everything works.</p>
      <form class="inline-form" data-test><input type="email" name="to" required placeholder="you@example.com" value="${esc(s.business_email || s.smtp_username || '')}" aria-label="Test recipient"><button class="btn btn-ghost">${icon('mail', 16)} Send test</button></form>
    </section>`;
  const form = $<HTMLFormElement>('form', body)!;
  const apply = (fromUser: boolean) => {
    const p = PROVIDERS[provider];
    $('[data-help]', body)!.innerHTML = `${icon('mail', 18)}<div><b>${esc(p.name)}</b>${p.help}</div>`;
    const host = form.elements.namedItem('smtp_host') as HTMLInputElement;
    const port = form.elements.namedItem('smtp_port') as HTMLInputElement;
    if (fromUser && provider !== 'custom') {
      host.value = p.host; port.value = p.port;
      ($(`input[name=smtp_security][value=${p.security}]`, form) as HTMLInputElement).checked = true;
    }
    if (fromUser && provider === 'custom') { host.value = ''; }
    $('[data-pwlabel]', form)!.textContent = provider === 'gmail' || provider === 'yahoo' ? 'App password' : 'Password';
  };
  apply(false);
  form.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.name === 'smtp_provider') { provider = el.value; apply(true); }
    if (el.name === 'smtp_security') { const port = form.elements.namedItem('smtp_port') as HTMLInputElement; if (el.value === 'ssl' && port.value === '587') port.value = '465'; if (el.value === 'starttls' && port.value === '465') port.value = '587'; }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formValues(form);
    const values: Record<string, string> = {};
    ['smtp_provider', 'smtp_host', 'smtp_port', 'smtp_security', 'smtp_username', 'smtp_password', 'smtp_from_name', 'smtp_from_email', 'smtp_reply_to', 'email_bcc_self'].forEach((k) => (values[k] = v[k] ?? ''));
    save(values, $('.btn-primary', form) as HTMLButtonElement, () => { (form.elements.namedItem('smtp_password') as HTMLInputElement).value = ''; if (values.smtp_password) (form.elements.namedItem('smtp_password') as HTMLInputElement).placeholder = 'Saved. Leave blank to keep it.'; });
  });
  const test = $<HTMLFormElement>('[data-test]', body)!;
  test.addEventListener('submit', (e) => {
    e.preventDefault();
    withBusy(test.querySelector('button'), async () => toast(await call<string>('send_test_email', { recipient: (test.elements.namedItem('to') as HTMLInputElement).value })));
  });
}

// ---------------------------------------------------------------- payment methods

async function payments(body: HTMLElement) {
  const list = await call<PaymentMethod[]>('list_payment_methods');
  body.innerHTML = `${head('Payment methods', 'The buttons cashiers see when taking payment. Turn off any you do not accept.')}
    <section class="form-narrow stack">
      <ul class="cat-list">${list.map((p) => `<li data-id="${p.id}">
        <input value="${esc(p.name)}" maxlength="40" data-name aria-label="Payment method name">
        <input type="number" class="w-num" value="${p.sort_order}" data-sort aria-label="Order">
        <label class="check inline"><input type="checkbox" data-active ${p.active ? 'checked' : ''}><span>In use</span></label>
        <button class="btn btn-ghost btn-sm" data-save>Save</button></li>`).join('')}</ul>
      <form class="inline-form" data-add><input name="name" maxlength="40" required placeholder="e.g. OPay, Moniepoint, Cheque" aria-label="New payment method"><button class="btn btn-primary">${icon('plus', 16)} Add method</button></form>
      <p class="muted small">Selling on credit does not need a method: take a part payment or none, and the balance is tracked against the ${esc(store.label('customer').toLowerCase())}.</p>
    </section>`;
  body.onclick = (e) => {
    const t = e.target as HTMLElement;
    const li = t.closest<HTMLElement>('li[data-id]');
    if (li && t.closest('[data-save]')) withBusy(t.closest('button'), async () => {
      await call('save_payment_method', { id: Number(li.dataset.id), name: ($('[data-name]', li) as HTMLInputElement).value, active: ($('[data-active]', li) as HTMLInputElement).checked, sortOrder: Number(($('[data-sort]', li) as HTMLInputElement).value) || 0 });
      await store.loadPaymentMethods(); toast('Payment method saved');
    });
  };
  $<HTMLFormElement>('[data-add]', body)!.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget as HTMLFormElement;
    withBusy(f.querySelector('button'), async () => {
      await call('save_payment_method', { id: null, name: (f.elements.namedItem('name') as HTMLInputElement).value, active: true, sortOrder: list.length + 1 });
      await store.loadPaymentMethods(); toast('Payment method added'); await payments(body);
    });
  });
}

// ---------------------------------------------------------------- business type

async function businessType(body: HTMLElement, ctx: ViewCtx) {
  await store.loadTemplates();
  const current = store.settings.business_type;
  body.innerHTML = `${head('Business type', 'Load the starter categories, wording and sample items for a type of business. Nothing you already have is changed or deleted, so you can mix types, for example a farm that also runs a shop.')}
    <div class="type-grid">${store.templates.map((t) => `<article class="type-card static ${t.key === current ? 'is-current' : ''}">
      <span class="type-name">${esc(t.name)}${t.key === current ? ' <span class="pill pill-info">Current</span>' : ''}</span>
      <span class="type-text">${esc(t.summary)}</span>
      <span class="type-meta">${t.categories.length} categories · ${t.sample_count} sample items</span>
      <div class="type-actions"><button class="btn btn-ghost btn-sm" data-apply="${t.key}" data-samples="0">Use wording & categories</button><button class="btn btn-primary btn-sm" data-apply="${t.key}" data-samples="1">Add with sample items</button></div>
    </article>`).join('')}</div>`;
  body.onclick = async (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-apply]');
    if (!b) return;
    const t = store.templates.find((x) => x.key === b.dataset.apply)!;
    const samples = b.dataset.samples === '1';
    if (await confirmDialog({ title: `Use “${t.name}”?`, message: `This sets the receipt wording and adds ${t.categories.length} categories${samples ? ` and up to ${t.sample_count} sample items (existing codes are skipped)` : ''}. Your current items, sales and colours are kept.`, confirm: 'Apply' }) === null) return;
    withBusy(b, async () => {
      const added = await call<number>('apply_business_template', { key: t.key, loadSamples: samples });
      await Promise.all([store.loadSettings(), store.loadCategories(), store.loadPaymentMethods()]);
      toast(samples ? `${t.name} applied. ${added} sample items added.` : `${t.name} applied`);
      ctx.refreshChrome();
      await businessType(body, ctx);
    });
  };
}

// ---------------------------------------------------------------- backup

function backup(body: HTMLElement) {
  body.innerHTML = `${head('Backup', 'Everything is stored on this computer only. Make a copy regularly and keep it somewhere safe, such as a flash drive or Google Drive.')}
    <div class="form-narrow stack">
      <div class="callout callout-info">${icon('shield', 18)}<div><b>Back up at least once a week.</b><p>If this computer is stolen, damaged or reformatted, a recent backup is the only way to get your sales and stock back.</p></div></div>
      <div><button class="btn btn-primary" data-backup>${icon('download', 16)} Save a backup to Downloads</button></div>
      <p class="muted small">To restore, close the app and replace <code>eatery-manager.sqlite3</code> in the app data folder with the backup file, renamed to that name. The README lists the folder for Windows and macOS.</p>
    </div>`;
  $<HTMLButtonElement>('[data-backup]', body)!.addEventListener('click', (e) => withBusy(e.currentTarget as HTMLButtonElement, async () => toast(`Backup saved: ${await call<string>('backup_database')}`)));
}

// ---------------------------------------------------------------- account

function account(body: HTMLElement) {
  const s = auth.session!;
  body.innerHTML = `${head('My account', `Signed in as <b>${esc(s.username)}</b>.`)}
    <form class="stack form-narrow" novalidate>
      <label class="field"><span>Current password</span><input name="current" type="password" required autocomplete="current-password"></label>
      <div class="grid-2"><label class="field"><span>New password</span><input name="next" type="password" minlength="8" required autocomplete="new-password"><small>At least 8 characters.</small></label>
      <label class="field"><span>Repeat new password</span><input name="again" type="password" minlength="8" required autocomplete="new-password"></label></div>
      <p class="form-error" role="alert" data-err></p>
      <div class="form-actions start"><button class="btn btn-primary">Change password</button></div>
    </form>`;
  const form = $<HTMLFormElement>('form', body)!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formValues(form);
    const err = $('[data-err]', form)!;
    err.textContent = '';
    if (v.next.length < 8) { err.textContent = 'New password must be at least 8 characters.'; return; }
    if (v.next !== v.again) { err.textContent = 'The new passwords do not match.'; return; }
    withBusy($('.btn-primary', form) as HTMLButtonElement, async () => {
      try { await call('change_own_password', { currentPassword: v.current, newPassword: v.next }); } catch (x) { err.textContent = errText(x); return; }
      form.reset(); toast('Password changed');
    });
  });
}

// ---------------------------------------------------------------- security & recovery

interface SecurityStatus { key_set: boolean; questions: string[]; updated_at: string; events: Array<{ event: string; username: string; detail: string; created_at: string }> }

const EVENT_LABEL: Record<string, string> = {
  recovery_failed: 'Failed recovery attempt',
  password_reset_by_recovery: 'Password reset with recovery',
  owner_created_by_recovery: 'Owner account created with recovery',
  recovery_key_changed: 'New recovery key created',
  security_questions_changed: 'Security questions changed',
};

async function security(body: HTMLElement) {
  const st = await call<SecurityStatus>('security_status');
  const ready = st.key_set && st.questions.length === 3;
  body.innerHTML = `${head('Security & recovery', 'If an owner password is lost, the recovery key or the three security answers let you reset any password, or create a new owner account, from the sign-in screen. It all works offline.')}
    <div class="form-narrow stack">
      ${ready ? '' : `<div class="callout callout-warn"><div><b>Recovery is not fully set up.</b><span>Set it up now so a forgotten owner password never locks you out.</span></div></div>`}
      <table class="table status-table"><tbody>
        <tr><th>Recovery key</th><td>${st.key_set ? '<span class="pill pill-ok">Set</span>' : '<span class="pill pill-bad">Not set</span>'}</td><td class="muted small">The key itself is never shown again after it is created.</td></tr>
        <tr><th>Security questions</th><td>${st.questions.length === 3 ? '<span class="pill pill-ok">Set</span>' : '<span class="pill pill-bad">Not set</span>'}</td><td class="muted small">${st.questions.map(esc).join('<br>') || 'No questions yet'}</td></tr>
      </tbody></table>

      <section class="sub-panel stack">
        <div><h3>${st.key_set ? 'Create a new recovery key' : 'Create a recovery key'}</h3><p class="muted small">Do this if the printed key is lost or someone else may have seen it. The old key stops working at once.</p></div>
        <form class="inline-form" data-newkey><input type="password" name="current" placeholder="Your current password" autocomplete="current-password" required aria-label="Your current password"><button class="btn btn-primary">${icon('key', 16)} Create key</button></form>
      </section>

      <section class="sub-panel stack">
        <div><h3>${st.questions.length === 3 ? 'Change security questions' : 'Set security questions'}</h3><p class="muted small">All three answers are needed to recover. Answers are not case-sensitive.</p></div>
        <form class="stack" data-questions novalidate>
          ${questionFields(st.questions)}
          <label class="field"><span>Your current password</span><input type="password" name="current" autocomplete="current-password" required></label>
          <p class="form-error" role="alert" data-err></p>
          <div class="form-actions start"><button class="btn btn-primary">Save security questions</button></div>
        </form>
      </section>

      <section class="stack">
        <h3>Recent security activity</h3>
        ${st.events.length ? `<table class="table"><thead><tr><th>When</th><th>What happened</th><th>Account</th></tr></thead><tbody>
          ${st.events.map((ev) => `<tr><td>${esc(ev.created_at)}</td><td>${esc(EVENT_LABEL[ev.event] ?? ev.event)}${ev.detail ? ` <small class="muted">(${esc(ev.detail)})</small>` : ''}</td><td>${esc(ev.username || '—')}</td></tr>`).join('')}
        </tbody></table>` : '<p class="muted small">Nothing yet. Recovery use and failed attempts appear here.</p>'}
      </section>
    </div>`;

  const keyForm = $<HTMLFormElement>('[data-newkey]', body)!;
  keyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = (keyForm.elements.namedItem('current') as HTMLInputElement).value;
    withBusy(keyForm.querySelector('button'), async () => {
      const key = await call<string>('regenerate_recovery_key', { currentPassword: pw });
      keyForm.reset();
      showKeyModal(key);
      await security(body);
    });
  });
  const qForm = $<HTMLFormElement>('[data-questions]', body)!;
  wireQuestionFields(qForm);
  qForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('[data-err]', qForm)!;
    err.textContent = '';
    const qa = readQuestions(qForm);
    if (typeof qa === 'string') { err.textContent = qa; return; }
    const pw = (qForm.elements.namedItem('current') as HTMLInputElement).value;
    if (!pw) { err.textContent = 'Enter your current password.'; return; }
    withBusy($<HTMLButtonElement>('.btn-primary', qForm), async () => {
      try { await call('save_security_questions', { currentPassword: pw, questions: qa.questions, answers: qa.answers }); }
      catch (x) { err.textContent = errText(x); return; }
      toast('Security questions saved');
      await security(body);
    });
  });
}

function showKeyModal(key: string) {
  const m = modal({ title: 'Your new recovery key', size: 'sm', body: `<div class="stack">
    <p class="lead-text">Write this down or print it now. It is not shown again, and the old key no longer works.</p>
    <div class="key-value">${esc(key)}</div>
    <div class="form-actions"><button class="btn btn-ghost" data-print>${icon('print', 16)} Print</button><button class="btn btn-primary" data-close>I have saved it</button></div>
  </div>` });
  m.el.querySelector('[data-print]')!.addEventListener('click', () => printHtml(`<article class="key-sheet"><h1>eStock Manager recovery key</h1><p><b>${esc(store.settings.business_name || '')}</b> · ${esc(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))}</p><div class="key-sheet-key">${esc(key)}</div><p>Use with Forgot password or Create a new owner account on the sign-in screen. Keep it private and away from the shop counter.</p></article>`));
}
