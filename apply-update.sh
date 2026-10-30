#!/bin/sh
# eStock Manager update: phone layout fixes, PDF receipts on Android, Copy/WhatsApp for the Install ID, Receive payment for customers who owe.
# Run from the project folder (the one that contains package.json):  sh apply-update.sh
set -e
[ -f package.json ] && [ -d src ] || { echo "Run this from the project folder (where package.json is)."; exit 1; }

cat > src/styles/mobile-fixes.css <<'ESTOCK_EOF'
/* ---------------------------------------------------------------- phone fixes (loaded after mobile.css)
   - Screens that are taller than the phone (first-run setup, sign-in, recovery key) now scroll inside
     themselves. The page itself never scrolls (body is overflow:hidden), so before this the Continue
     button of the setup screen was cut off and unreachable.
   - Everything stays clear of the status bar and the navigation bar. */
:root { --safe-t: env(safe-area-inset-top, 0px); --safe-b: env(safe-area-inset-bottom, 0px); }

/* Receive payment dialog: the unpaid receipts it will clear */
.pay-receipts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.pay-receipts li { display: flex; justify-content: space-between; gap: 12px; padding: 8px 10px; background: var(--surface-2); border-radius: var(--r); }

/* Install ID row: the code and its Copy / WhatsApp buttons wrap instead of squeezing */
.install-id-row { flex-wrap: wrap; }
.install-id-actions { display: flex; flex-wrap: wrap; gap: 8px; }

@media (max-width: 760px) {
  #app { height: 100vh; height: 100dvh; padding: var(--safe-t) 0 var(--safe-b); }
  .shell { display: block; height: 100%; }
  .workspace { height: 100%; }
  .sidebar { padding-top: var(--safe-t); padding-bottom: var(--safe-b); }
  .modal-wrap, .modal-wrap.is-drawer { padding: var(--safe-t) 0 var(--safe-b); place-items: stretch; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); }
  .modal, .modal-sm, .modal-md, .modal-lg, .modal-wrap.is-drawer .modal { max-height: 100%; }

  .auth { grid-template-columns: 1fr; grid-template-rows: minmax(0, 1fr); height: 100%; min-height: 0; }
  .auth-side { display: none; }
  .auth-main { display: flex; flex-direction: column; padding: 20px 16px 24px; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
  .auth-main > * { margin: auto; }
  /* Back / Continue stay on screen while the long setup form scrolls */
  .auth-setup .auth-main { padding-bottom: 0; }
  .auth-setup .form-actions { position: sticky; bottom: 0; z-index: 3; margin: 0 -16px; padding: 12px 16px; background: var(--surface); border-top: 1px solid var(--line); }

  .key-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; padding: 16px; overflow-y: auto; overscroll-behavior: contain; }
  .key-screen > * { margin: auto; }
  .key-card { padding: 22px 18px; }
  .key-value { font-size: 20px; }

  #toasts { left: 12px; right: 12px; bottom: calc(14px + var(--safe-b)); align-items: stretch; }
  .toast { max-width: none; }

  /* Till: payment rows (method, amount, reference, remove) stack instead of squeezing */
  .pay-line { grid-template-columns: 1fr 32px; }
  .pay-line > :nth-child(2), .pay-line > :nth-child(3) { grid-column: 1 / -1; }
  .pay-line > :nth-child(4) { grid-column: 2; grid-row: 1; }
  .pay-line > :nth-child(3):empty { display: none; }

  /* Till: the page scrolls. It was clipped (overflow:hidden) before, so nothing below the first
     screenful of products could be reached and the till felt frozen after opening a shift. */
  .view { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
  .view-pos { overflow-y: auto; padding-bottom: 12px; }
  .view-pos > .pos { flex: none; min-height: auto; }

  /* Pop-ups: the body scrolls and the Save / Cancel row stays in view at the bottom */
  .modal { display: flex; flex-direction: column; }
  .modal-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
  .modal-body .form-actions { position: sticky; bottom: -16px; z-index: 4; margin: 10px -16px -16px; padding: 12px 16px; background: var(--surface); border-top: 1px solid var(--line); }
  .modal-wrap.is-drawer .modal-body .form-actions { background: var(--surface-2); }

  /* Receipt pop-up: Print / WhatsApp / Email first, the paper below */
  .receipt-view { display: flex; flex-direction: column; gap: 14px; }
  .receipt-view .receipt-side { order: -1; position: static; }

  /* Rows of buttons, tabs and categories wrap, so every one is visible without sideways scrolling */
  .topbar-actions { flex-wrap: wrap; overflow: visible; }
  .topbar-actions .btn { flex: 1 1 auto; justify-content: center; }
  .settings-nav { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; overflow: visible; }
  .settings-nav button { white-space: normal; border: 1px solid var(--line); background: var(--surface); padding: 10px; }
  .chips { flex-wrap: wrap; overflow: visible; }
  .tabs, .panel-head { flex-wrap: wrap; }

  /* Tables become stacked cards: every column and every button is on screen (cell headings are added by lib/enhance.ts) */
  .table-scroll { overflow-x: visible; }
  .table, .table tbody, .table tfoot, .table tr, .table td, .table th { display: block; width: auto; }
  .table thead { display: none; }
  .table tr { padding: 12px 14px; border-bottom: 1px solid var(--line); }
  .table tbody tr:last-child { border-bottom: 0; }
  .table td, .table th { padding: 2px 0; border: 0; text-align: left; white-space: normal; position: static; background: none; }
  .table td:first-child, .table th:first-child { padding: 0 0 4px; font-size: 15px; }
  .table .num { text-align: left; white-space: normal; }
  .table td[data-label]:not([data-label=""]):not(:first-child)::before { content: attr(data-label) ": "; color: var(--muted); font-weight: 600; font-size: 12.5px; }
  .table .actions-col { width: auto; text-align: left; padding-top: 6px; }
  .table tfoot tr { background: var(--surface-2); font-weight: 700; }
}
ESTOCK_EOF

cat > src/lib/insets.ts <<'ESTOCK_EOF'
import { isAndroid } from './platform';

/**
 * The Android app draws edge-to-edge, so the status bar (top) and the navigation
 * bar (bottom) sit on top of the page. Newer WebViews report their size through
 * env(safe-area-inset-*); older ones report 0. When that happens we fall back to
 * typical bar heights so buttons never end up underneath the navigation bar.
 * (Runs once when the app starts; does nothing on Windows and Mac.)
 */
function applySafeAreaFallback() {
  if (!isAndroid) return;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;'
    + 'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
  document.body.append(probe);
  const cs = getComputedStyle(probe);
  const top = parseFloat(cs.paddingTop) || 0;
  const bottom = parseFloat(cs.paddingBottom) || 0;
  probe.remove();
  const root = document.documentElement.style;
  if (top < 1) root.setProperty('--safe-t', '24px');
  if (bottom < 1) root.setProperty('--safe-b', '56px');
}

applySafeAreaFallback();
ESTOCK_EOF

cat > src/lib/pdf.ts <<'ESTOCK_EOF'
import type { Receipt } from '../types';

/**
 * A tiny PDF writer for plain monospaced text (receipts). It uses the PDF standard
 * Courier fonts, so nothing is embedded and no library is needed; a 3-line
 * receipt is about 1.5 KB. Used on Android to share receipts on WhatsApp and to
 * hand them to the phone's print / Save-as-PDF screen.
 */
export interface PdfLine { t: string; b?: boolean }
export interface PdfLayout { widthPt: number; marginX: number; marginY: number; fontSize: number; cols: number; pageHeightPt?: number }

const CP1252: Record<string, number> = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99 };

/** The standard PDF fonts only know Western characters: swap the naira sign for "N" and anything unknown for "?". */
export function pdfSafe(s: string): string {
  return s.replace(/₦/g, 'N').replace(/[−‒]/g, '-').replace(/\u00a0/g, ' ').replace(/[\r\n\t]+/g, ' ')
    .split('').map((ch) => {
      const c = ch.charCodeAt(0);
      if (c >= 32 && c < 127) return ch;
      if (c >= 160 && c < 256) return ch;
      const m = CP1252[ch];
      return m ? String.fromCharCode(m) : '?';
    }).join('');
}

const pdfEsc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);

/** Builds the PDF as a "binary string" (one char = one byte). */
export function buildPdfBinary(lines: PdfLine[], layout: PdfLayout): string {
  const { widthPt, marginX, marginY, fontSize } = layout;
  const lh = fontSize * 1.28;
  const perPage = layout.pageHeightPt ? Math.max(1, Math.floor((layout.pageHeightPt - marginY * 2) / lh)) : Math.max(1, lines.length);
  const pages: PdfLine[][] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  if (!pages.length) pages.push([{ t: '' }]);

  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [];
  const add = (n: number, body: string) => { offsets[n] = out.length; out += `${n} 0 obj\n${body}\nendobj\n`; };

  add(1, '<< /Type /Catalog /Pages 2 0 R >>');
  add(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  add(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>');
  add(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>');

  pages.forEach((page, i) => {
    const pageH = layout.pageHeightPt ?? Math.max(120, marginY * 2 + page.length * lh);
    let stream = '';
    page.forEach((ln, idx) => {
      if (!ln.t.trim()) return;
      const y = (pageH - marginY - fontSize - idx * lh).toFixed(2);
      stream += `BT /${ln.b ? 'F2' : 'F1'} ${fontSize} Tf ${marginX.toFixed(2)} ${y} Td (${pdfEsc(ln.t)}) Tj ET\n`;
    });
    add(5 + i * 2, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt.toFixed(2)} ${pageH.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`);
    add(6 + i * 2, `<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  });

  const count = 5 + pages.length * 2;
  const xref = out.length;
  out += `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let n = 1; n < count; n++) out += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return out;
}

export const pdfBase64 = (lines: PdfLine[], layout: PdfLayout) => btoa(buildPdfBinary(lines, layout));

// ------------------------------------------------------------------ text layout (monospaced columns)

export function wrapText(text: string, cols: number): string[] {
  const out: string[] = [];
  let line = '';
  for (let word of pdfSafe(text).split(' ')) {
    while (word.length > cols) { if (line) { out.push(line); line = ''; } out.push(word.slice(0, cols)); word = word.slice(cols); }
    if (!line) line = word;
    else if (line.length + 1 + word.length <= cols) line += ` ${word}`;
    else { out.push(line); line = word; }
  }
  out.push(line);
  return out;
}

const centre = (s: string, cols: number) => ' '.repeat(Math.max(0, Math.floor((cols - s.length) / 2))) + s;

/** "label ........ value" on one line, wrapping the label when it is long. */
function pairLines(left: string, right: string, cols: number): string[] {
  const l = pdfSafe(left), r = pdfSafe(right);
  if (l.length + 1 + r.length <= cols) return [l + ' '.repeat(cols - l.length - r.length) + r];
  const parts = wrapText(l, cols);
  const last = parts[parts.length - 1];
  if (last.length + 1 + r.length <= cols) { parts[parts.length - 1] = last + ' '.repeat(cols - last.length - r.length) + r; return parts; }
  return [...parts, ' '.repeat(Math.max(0, cols - r.length)) + r];
}

export interface ReceiptCfg {
  name: string; contact: string[]; title: string; footer: string; taxLabel: string; taxRate: string; customerLabel: string;
  money: (kobo: number) => string; qty: (n: number) => string; dateTime: (iso: string) => string;
}
const STATUS: Record<string, string> = { paid: 'Paid', partial: 'Part paid', unpaid: 'Not paid', void: 'Void' };

export function receiptLines(r: Receipt, c: ReceiptCfg, cols: number): PdfLine[] {
  const L: PdfLine[] = [];
  const text = (t: string, b = false) => L.push({ t, b });
  const wrapC = (t: string, b = false) => wrapText(t, cols).forEach((x) => text(centre(x, cols), b));
  const rule = () => text('-'.repeat(cols));
  const pair = (l: string, v: string, b = false) => pairLines(l, v, cols).forEach((x) => text(x, b));

  wrapC(c.name.toUpperCase(), true);
  c.contact.filter(Boolean).forEach((x) => wrapC(x));
  text('');
  wrapC(c.title.toUpperCase(), true);
  rule();
  pair('No.', r.receipt_no);
  pair('Date', c.dateTime(r.created_at));
  pair('Served by', r.cashier_name || '-');
  if (r.customer_name) pair(c.customerLabel, r.customer_name);
  if (r.customer_phone) pair('Phone', r.customer_phone);
  if (r.collection_date) pair('Collect on', r.collection_date);
  rule();
  for (const i of r.items) {
    wrapText(i.product_name, cols).forEach((x) => text(x, true));
    pair(`${c.qty(i.quantity)} ${i.unit} x ${c.money(i.unit_price_kobo)}`, c.money(i.line_total_kobo));
    if (i.returned_qty) text(`  Returned ${c.qty(i.returned_qty)} ${i.unit}`);
  }
  rule();
  pair('Subtotal', c.money(r.subtotal_kobo));
  if (r.discount_kobo) pair('Discount', `-${c.money(r.discount_kobo)}`);
  if (r.tax_kobo) pair(`${c.taxLabel} (${c.taxRate}%)`, c.money(r.tax_kobo));
  pair('TOTAL', c.money(r.total_kobo), true);
  if (r.returned_kobo) pair('Returned goods', `-${c.money(r.returned_kobo)}`);
  rule();
  r.payments.forEach((p) => pair(`${p.method}${p.reference ? ` (${p.reference})` : ''}`, c.money(p.amount_kobo)));
  if (r.change_kobo > 0) pair('Change', c.money(r.change_kobo));
  if (r.refunded_kobo > 0) pair('Refunded', `-${c.money(r.refunded_kobo)}`);
  if (r.balance_kobo > 0) pair('BALANCE DUE', c.money(r.balance_kobo), true);
  pair('Status', STATUS[r.payment_status] ?? r.payment_status);
  if (r.note) { text(''); wrapText(r.note, cols).forEach((x) => text(x)); }
  if (r.payment_status === 'void') { text(''); wrapText(`VOID: ${r.void_reason}`, cols).forEach((x) => text(x, true)); }
  if (c.footer) { text(''); wrapC(c.footer); }
  return L;
}

/** Page size and number of text columns for the receipt paper width chosen in Settings ('58', '80' or 'a4'). */
export function layoutFor(width: string): PdfLayout {
  const MM = 72 / 25.4;
  if (width === 'a4') {
    const cols = 46, fontSize = 11, widthPt = 595.28;
    return { widthPt, marginX: (widthPt - cols * fontSize * 0.6) / 2, marginY: 50, fontSize, cols, pageHeightPt: 841.89 };
  }
  const mm = width === '58' ? 58 : 80;
  const widthPt = mm * MM, marginX = mm === 58 ? 6 : 8, fontSize = mm === 58 ? 7.4 : 8.4;
  return { widthPt, marginX, marginY: 12, fontSize, cols: Math.floor((widthPt - marginX * 2) / (fontSize * 0.6)) };
}
ESTOCK_EOF

cat > src/lib/receipt-pdf.ts <<'ESTOCK_EOF'
import { store } from '../store';
import type { Receipt } from '../types';
import { $, errText, modal, toast } from './dom';
import { dateTimeLabel, money, qty } from './format';
import { icon } from './icons';
import { isAndroid } from './platform';
import { layoutFor, pdfBase64, receiptLines } from './pdf';
import { waNumber } from './whatsapp';

/** Functions added to the Android app by tools/android-native.mjs (absent on Windows, Mac and older APKs). */
interface Native {
  shareFile(b64: string, name: string, mime: string, packages: string, text: string, jid: string): string;
  printPdf(b64: string, name: string): string;
}
const native = () => (window as unknown as { EstockNative?: Native }).EstockNative;

/** The receipt as a PDF (base64), laid out for the paper width chosen in Settings. */
export function receiptPdf(r: Receipt): { b64: string; name: string } {
  const s = store.settings;
  const layout = layoutFor(s.receipt_width_mm || '80');
  const lines = receiptLines(r, {
    name: s.business_name || 'My Business',
    contact: [s.business_address, s.business_phone, s.business_email],
    title: s.receipt_title || 'Sales receipt',
    footer: s.receipt_footer || '',
    taxLabel: s.tax_label || 'Tax', taxRate: s.tax_rate || '',
    customerLabel: store.label('customer'),
    money, qty, dateTime: dateTimeLabel,
  }, layout.cols);
  return { b64: pdfBase64(lines, layout), name: `Receipt-${r.receipt_no.replace(/[^A-Za-z0-9-]/g, '')}.pdf` };
}

/** Android: shares the receipt as a PDF straight into WhatsApp. Everywhere else the old text message is used. */
export async function shareReceipt(r: Receipt, fallback: () => void) {
  const n = native();
  if (!isAndroid || !n) return fallback();
  try {
    const { b64, name } = receiptPdf(r);
    const caption = `${store.settings.business_name || 'Receipt'} - ${r.receipt_no}`;
    const err = n.shareFile(b64, name, 'application/pdf', 'com.whatsapp,com.whatsapp.w4b', caption, r.customer_phone.trim() ? waNumber(r.customer_phone) : '');
    if (err) toast(`Could not share the receipt: ${err}`, 'error');
  } catch (e) {
    toast(`Could not share the receipt: ${errText(e)}`, 'error');
  }
}

/** Android: lets the user pick the phone's own print screen (Save as PDF or any printer) or a thermal printer. */
export async function printReceiptAndroidPdf(r: Receipt) {
  const thermal = async () => { const { printReceiptAndroid } = await import('./escpos'); return printReceiptAndroid(r); };
  const n = native();
  if (!n) return thermal();
  const m = modal({ title: 'Print receipt', size: 'sm', body: `<div class="stack">
    <button class="btn btn-primary btn-lg btn-block" data-pdf>${icon('print', 18)} Print or save as PDF</button>
    <p class="muted small">Opens your phone's print screen. Choose <b>Save as PDF</b>, or any printer your phone can reach.</p>
    <button class="btn btn-ghost btn-block" data-thermal>Thermal printer (RawBT)</button>
  </div>` });
  $('[data-pdf]', m.el)!.addEventListener('click', () => {
    m.close();
    try {
      const { b64, name } = receiptPdf(r);
      const err = n.printPdf(b64, name);
      if (err) toast(`Could not open printing: ${err}`, 'error');
    } catch (e) { toast(`Could not open printing: ${errText(e)}`, 'error'); }
  });
  $('[data-thermal]', m.el)!.addEventListener('click', () => { m.close(); void thermal(); });
}
ESTOCK_EOF

cat > src/lib/clipboard.ts <<'ESTOCK_EOF'
/** Copies text to the clipboard. Works in the Android app too, where navigator.clipboard is often blocked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through to the older method */ }
  try {
    const box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
    document.body.append(box);
    box.focus();
    box.select();
    box.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    box.remove();
    return ok;
  } catch { return false; }
}
ESTOCK_EOF

cat > src/lib/customer-pay.ts <<'ESTOCK_EOF'
import { call } from '../api';
import { errText, esc, modal, toast, withBusy } from './dom';
import { dateLabel, money, nairaInput, toKobo } from './format';
import { store } from '../store';
import type { Customer, ReceiptSummary } from '../types';

const owed = (r: ReceiptSummary) => (r.total_kobo - r.returned_kobo) - (r.amount_paid_kobo - r.refunded_kobo);

/**
 * A customer who owes comes to pay: one amount, applied to their unpaid receipts oldest first.
 * Each part is saved as a normal "Record payment" on that receipt, so it lands in the open shift
 * (cash-up and X / Z report), in the day's takings and in the customer's balance.
 */
export async function receivePayment(customerId: number, done: () => void) {
  try {
    const [customers, receipts] = await Promise.all([
      call<Customer[]>('list_customers', { search: '' }),
      call<ReceiptSummary[]>('list_receipts', { filter: { customer_id: customerId, status: 'owing' } }),
    ]);
    const customer = customers.find((c) => c.id === customerId);
    const unpaid = receipts.filter((r) => r.payment_status !== 'void' && owed(r) > 0).sort((a, b) => a.id - b.id);
    if (!customer) { toast('Customer not found', 'error'); return; }
    if (!unpaid.length) { toast('There is no unpaid receipt here that you can take payment on.', 'info'); return; }
    const total = unpaid.reduce((a, r) => a + owed(r), 0);
    const methods = store.paymentMethods.filter((p) => p.active);
    const hidden = customer.balance_kobo > total;

    const m = modal({ title: 'Receive payment', subtitle: customer.name, size: 'sm', body: `<form class="stack">
      <div class="callout callout-warn"><div><b>${money(total)} owed</b><span>${unpaid.length} unpaid receipt${unpaid.length === 1 ? '' : 's'}. The payment clears the oldest first.</span></div></div>
      <ul class="pay-receipts">${unpaid.map((r) => `<li><span>${esc(r.receipt_no)} · ${esc(dateLabel(r.created_at))}</span><b>${money(owed(r))}</b></li>`).join('')}</ul>
      ${hidden ? '<p class="muted small">This customer also owes on receipts issued by someone else. The owner or a manager can take payment on those.</p>' : ''}
      <label class="field"><span>Amount received</span><span class="input-affix"><span class="affix">${esc(store.settings.currency_symbol || '₦')}</span><input name="amount" inputmode="decimal" required value="${nairaInput(total)}" autofocus></span></label>
      <label class="field"><span>Method</span><select name="method">${methods.map((p) => `<option>${esc(p.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Reference <em class="muted">(optional)</em></span><input name="reference" maxlength="80"></label>
      <p class="form-error" role="alert" data-err></p>
      <div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary">Save payment</button></div></form>` });

    const form = m.el.querySelector('form')!;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = form.querySelector('[data-err]')!;
      err.textContent = '';
      const f = new FormData(form);
      const amount = toKobo(String(f.get('amount')));
      if (!(amount > 0)) { err.textContent = 'Enter an amount greater than zero.'; return; }
      if (amount > total) { err.textContent = `That is more than the ${money(total)} owed.`; return; }
      withBusy(form.querySelector('.btn-primary'), async () => {
        let left = amount;
        try {
          for (const r of unpaid) {
            if (left <= 0) break;
            const part = Math.min(left, owed(r));
            await call('record_payment', { receiptId: r.id, method: f.get('method'), amountKobo: part, reference: String(f.get('reference') || '') });
            left -= part;
          }
          const still = total - amount;
          toast(still > 0 ? `Payment saved. ${money(still)} still owed.` : 'Payment saved. Fully paid.');
          m.close();
        } catch (x) {
          err.textContent = errText(x);
        }
        done();
      });
    });
  } catch (x) {
    toast(errText(x), 'error');
  }
}
ESTOCK_EOF

cat > src/lib/enhance.ts <<'ESTOCK_EOF'
import { copyText } from './clipboard';
import { receivePayment } from './customer-pay';
import { toast } from './dom';
import { icon } from './icons';
import { shareWhatsApp } from './whatsapp';

/**
 * Small additions that apply to every page without touching each page's code.
 * Runs once at start-up and again whenever a page redraws itself.
 */

/** Install ID (the code you send to get a licence key): a Copy button and a WhatsApp button next to it. */
function enhanceInstallIds() {
  document.querySelectorAll<HTMLElement>('.install-id-row:not([data-enhanced])').forEach((row) => {
    const id = row.querySelector('code')?.textContent?.trim();
    if (!id) return;
    row.dataset.enhanced = '1';
    row.querySelectorAll('[data-copy]').forEach((old) => old.remove());
    const actions = document.createElement('div');
    actions.className = 'install-id-actions';
    actions.innerHTML = `<button type="button" class="btn btn-primary btn-sm" data-copy-id>Copy</button>
      <button type="button" class="btn btn-ghost btn-sm" data-send-id>${icon('chat', 15)} WhatsApp</button>`;
    row.append(actions);
    actions.querySelector('[data-copy-id]')!.addEventListener('click', async () => {
      toast((await copyText(id)) ? 'Install ID copied' : 'Could not copy. Press and hold the code to select it.', 'info');
    });
    actions.querySelector('[data-send-id]')!.addEventListener('click', () => { void shareWhatsApp('', `eStock Manager Install ID: ${id}`); });
  });
}

/**
 * On a phone, tables turn into stacked cards (see mobile-fixes.css) so no column or button sits
 * off-screen. The cards need each cell to know its column heading, which is set here.
 */
function labelTables() {
  document.querySelectorAll<HTMLTableElement>('table.table').forEach((table) => {
    const heads = Array.from(table.tHead?.rows[0]?.cells ?? []).map((c) => (c.textContent ?? '').trim());
    if (!heads.length) return;
    Array.from(table.tBodies).forEach((body) => Array.from(body.rows).forEach((row) => {
      let col = 0;
      Array.from(row.cells).forEach((cell) => {
        if (cell.tagName === 'TD' && !cell.hasAttribute('data-label')) cell.setAttribute('data-label', heads[col] ?? '');
        col += cell.colSpan || 1;
      });
    }));
  });
}

/** Customers who owe: a "Receive payment" button next to Receipts / Statement. */
function enhanceCustomerRows() {
  document.querySelectorAll<HTMLElement>('[data-receipts]:not([data-pay-added])').forEach((btn) => {
    btn.dataset.payAdded = '1';
    if (!btn.closest('tr')?.querySelector('b.warn-text')) return;
    const pay = document.createElement('button');
    pay.type = 'button';
    pay.className = 'btn btn-primary btn-sm';
    pay.textContent = 'Receive payment';
    pay.dataset.payCustomer = btn.dataset.receipts ?? '';
    btn.before(pay);
  });
}
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-pay-customer]');
  if (!b) return;
  void receivePayment(Number(b.dataset.payCustomer), () => {
    document.querySelector<HTMLInputElement>('[data-search]')?.dispatchEvent(new Event('input'));
  });
});

let queued = false;
function run() {
  queued = false;
  enhanceInstallIds();
  labelTables();
  enhanceCustomerRows();
}
new MutationObserver(() => {
  if (!queued) { queued = true; requestAnimationFrame(run); }
}).observe(document.body, { childList: true, subtree: true });
run();
ESTOCK_EOF

cat > tools/android-native.mjs <<'ESTOCK_EOF'
#!/usr/bin/env node
// Runs after `tauri android init` (imported by android-signing.mjs). Adds two small
// features to the generated Android project that the web page cannot do by itself:
//   - share a PDF file straight into WhatsApp (or any app)
//   - open Android's own print screen (Save as PDF / printers) with a PDF
// The page reaches them as window.EstockNative. If anything below does not match the
// generated project, the build carries on without them and the app falls back to
// the old behaviour (text message / RawBT).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './common.mjs';

const androidDir = join(ROOT, 'src-tauri', 'gen', 'android');
const main = join(androidDir, 'app', 'src', 'main');

function findFile(dir, name) {
  if (!existsSync(dir)) return null;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { const f = findFile(p, name); if (f) return f; }
    else if (e === name) return p;
  }
  return null;
}

try {
  const activity = findFile(join(main, 'java'), 'MainActivity.kt');
  const manifestPath = join(main, 'AndroidManifest.xml');
  if (!activity || !existsSync(manifestPath)) throw new Error('MainActivity.kt or AndroidManifest.xml not found');

  let src = readFileSync(activity, 'utf8');
  const pkg = /^\s*package\s+([\w.]+)/m.exec(src)?.[1];
  if (!pkg) throw new Error('package name not found in MainActivity.kt');

  // ---- file provider (the generated project normally already has one with this authority)
  let manifest = readFileSync(manifestPath, 'utf8');
  let authority = '${applicationId}.fileprovider';
  let kotlinAuthority = 'activity.packageName + ".fileprovider"';
  const xmlDir = join(main, 'res', 'xml');
  mkdirSync(xmlDir, { recursive: true });
  if (manifest.includes('androidx.core.content.FileProvider')) {
    const m = /android:authorities="([^"]+)"/.exec(manifest.slice(manifest.indexOf('androidx.core.content.FileProvider')));
    if (m && m[1] === authority) {
      const paths = join(xmlDir, 'file_paths.xml');
      if (existsSync(paths)) {
        let x = readFileSync(paths, 'utf8');
        if (!/<cache-path/.test(x)) { x = x.replace(/<\/paths>/, '    <cache-path name="estock_cache" path="." />\n</paths>'); writeFileSync(paths, x); }
      }
    } else { throw new Error('an unexpected FileProvider is already declared'); }
  } else {
    authority = '${applicationId}.estockshare';
    kotlinAuthority = 'activity.packageName + ".estockshare"';
    writeFileSync(join(xmlDir, 'estock_share_paths.xml'), '<?xml version="1.0" encoding="utf-8"?>\n<paths>\n    <cache-path name="estock_cache" path="." />\n</paths>\n');
    manifest = manifest.replace('</application>', `    <provider android:name="androidx.core.content.FileProvider" android:authorities="${authority}" android:exported="false" android:grantUriPermissions="true">\n            <meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/estock_share_paths" />\n        </provider>\n    </application>`);
    writeFileSync(manifestPath, manifest);
  }

  // ---- the bridge
  writeFileSync(join(activity, '..', 'NativeBridge.kt'), `package ${pkg}

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintManager
import android.util.Base64
import android.webkit.JavascriptInterface
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

/** Exposed to the page as window.EstockNative. Every function returns "" on success or an error message. */
class NativeBridge(private val activity: Activity) {

    private fun writeTemp(b64: String, name: String): File {
        val dir = File(activity.cacheDir, "shared")
        dir.mkdirs()
        val now = System.currentTimeMillis()
        dir.listFiles()?.forEach { if (now - it.lastModified() > 86_400_000L) it.delete() }
        val file = File(dir, name.replace(Regex("[^A-Za-z0-9._-]"), "_"))
        file.writeBytes(Base64.decode(b64, Base64.DEFAULT))
        return file
    }

    @JavascriptInterface
    fun shareFile(b64: String, name: String, mime: String, packages: String, text: String, jid: String): String {
        return try {
            val file = writeTemp(b64, name)
            val uri = FileProvider.getUriForFile(activity, ${kotlinAuthority}, file)
            val send = Intent(Intent.ACTION_SEND)
            send.type = mime
            send.putExtra(Intent.EXTRA_STREAM, uri)
            if (text.isNotEmpty()) send.putExtra(Intent.EXTRA_TEXT, text)
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            for (p in packages.split(",")) {
                val pkgName = p.trim()
                if (pkgName.isEmpty()) continue
                try {
                    val direct = Intent(send)
                    direct.setPackage(pkgName)
                    if (jid.isNotEmpty()) direct.putExtra("jid", jid + "@s.whatsapp.net")
                    activity.startActivity(direct)
                    return ""
                } catch (e: ActivityNotFoundException) {
                    // that app is not installed, try the next one
                }
            }
            activity.startActivity(Intent.createChooser(send, "Share receipt"))
            ""
        } catch (e: Exception) {
            e.message ?: "Could not share the file"
        }
    }

    @JavascriptInterface
    fun printPdf(b64: String, name: String): String {
        return try {
            val bytes = Base64.decode(b64, Base64.DEFAULT)
            activity.runOnUiThread {
                val manager = activity.getSystemService(Context.PRINT_SERVICE) as PrintManager
                manager.print(name, PdfAdapter(bytes, name), null)
            }
            ""
        } catch (e: Exception) {
            e.message ?: "Could not open printing"
        }
    }

    private class PdfAdapter(private val data: ByteArray, private val docName: String) : PrintDocumentAdapter() {
        override fun onLayout(oldAttributes: PrintAttributes?, newAttributes: PrintAttributes?, cancellationSignal: CancellationSignal?, callback: LayoutResultCallback?, extras: Bundle?) {
            if (cancellationSignal?.isCanceled == true) { callback?.onLayoutCancelled(); return }
            val info = PrintDocumentInfo.Builder(docName)
                .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                .setPageCount(PrintDocumentInfo.PAGE_COUNT_UNKNOWN)
                .build()
            callback?.onLayoutFinished(info, true)
        }

        override fun onWrite(pages: Array<out PageRange>?, destination: ParcelFileDescriptor?, cancellationSignal: CancellationSignal?, callback: WriteResultCallback?) {
            try {
                FileOutputStream(destination!!.fileDescriptor).use { it.write(data) }
                callback?.onWriteFinished(arrayOf(PageRange.ALL_PAGES))
            } catch (e: Exception) {
                callback?.onWriteFailed(e.message)
            }
        }
    }
}
`);

  // ---- hook it into the web view as soon as it is created (before the page loads)
  if (!src.includes('EstockNative')) {
    const hook = `    override fun onWebViewCreate(webView: android.webkit.WebView) {
        super.onWebViewCreate(webView)
        webView.addJavascriptInterface(NativeBridge(this), "EstockNative")
    }
`;
    if (/class\s+MainActivity\s*:\s*TauriActivity\(\)\s*\{/.test(src)) src = src.replace(/(class\s+MainActivity\s*:\s*TauriActivity\(\)\s*\{\s*\n)/, `$1${hook}\n`);
    else if (/class\s+MainActivity\s*:\s*TauriActivity\(\)/.test(src)) src = src.replace(/class\s+MainActivity\s*:\s*TauriActivity\(\)/, `class MainActivity : TauriActivity() {\n${hook}}`);
    else throw new Error('class MainActivity declaration not recognised');
    writeFileSync(activity, src);
  }
  console.log('✔ Android: PDF share and print bridge added');
} catch (e) {
  console.warn(`⚠ Android PDF share/print bridge was not added (${e.message}). The app will use the plain WhatsApp message and RawBT instead.`);
}
ESTOCK_EOF

# receipt.ts: Android print -> phone print screen / Save as PDF (RawBT stays as an option)
grep -q receipt-pdf src/lib/receipt.ts || sed -i "s#{ const { printReceiptAndroid } = await import('./escpos'); return printReceiptAndroid(r); }#{ const { printReceiptAndroidPdf } = await import('./receipt-pdf'); return printReceiptAndroidPdf(r); }#" src/lib/receipt.ts
# WhatsApp button on receipts: PDF on Android
for f in src/views/pos.ts src/views/receipts.ts; do
  grep -q shareReceipt $f || sed -i "s#shareWhatsApp(r.customer_phone, receiptText(r))#shareReceipt(r, () => shareWhatsApp(r.customer_phone, receiptText(r)))#; s#^import { receiptText, shareWhatsApp } from '../lib/whatsapp';#import { receiptText, shareWhatsApp } from '../lib/whatsapp';\nimport { shareReceipt } from '../lib/receipt-pdf';#" $f
done
# Android build: add the share / print bridge
grep -q android-native tools/android-signing.mjs || sed -i "s#^import { ROOT } from './common.mjs';#import { ROOT } from './common.mjs';\nimport './android-native.mjs';#" tools/android-signing.mjs
# (from the previous round, only if not already applied)
grep -q viewport-fit index.html || sed -i 's/initial-scale=1.0"/initial-scale=1.0, viewport-fit=cover"/' index.html
grep -q mobile-fixes src/main.ts || sed -i "s#^import './styles/mobile.css';#import './styles/mobile.css';\nimport './styles/mobile-fixes.css';\nimport './lib/insets';#" src/main.ts
# clearer shift wording: "float" is the starting change money, not a sale
sed -i "s#row('Opening float'#row('Starting cash (float)'#; s#<span>Opening float</span>#<span>Starting cash (float)</span>#g; s#row('Expected in drawer'#row('Drawer should have'#; s#Cash in drawer now (float)#Starting cash in the drawer (change money, not a sale)#; s#Count the cash in the drawer before your first sale\.#Count the change money already in the drawer before your first sale. This is your starting cash (float), not a sale.#" src/views/shifts.ts
grep -q "lib/enhance" src/main.ts || sed -i "s#^import './lib/insets';#import './lib/insets';\nimport './lib/enhance';#" src/main.ts


# ---- check every edit landed
ok=1
grep -q printReceiptAndroidPdf src/lib/receipt.ts || { echo "!! src/lib/receipt.ts was not updated"; ok=0; }
grep -q "shareReceipt(r," src/views/pos.ts || { echo "!! src/views/pos.ts was not updated"; ok=0; }
grep -q "shareReceipt(r," src/views/receipts.ts || { echo "!! src/views/receipts.ts was not updated"; ok=0; }
grep -q android-native tools/android-signing.mjs || { echo "!! tools/android-signing.mjs was not updated"; ok=0; }
grep -q viewport-fit index.html || { echo "!! index.html was not updated"; ok=0; }
grep -q mobile-fixes src/main.ts || { echo "!! src/main.ts (mobile-fixes) was not updated"; ok=0; }
grep -q "lib/enhance" src/main.ts || { echo "!! src/main.ts (enhance) was not updated"; ok=0; }
grep -q "Starting cash (float)" src/views/shifts.ts || { echo "!! src/views/shifts.ts wording was not updated"; ok=0; }
if [ $ok = 1 ]; then echo "All changes applied. Now: git add -A && git commit -m \"Phone fixes, PDF receipts, receive payment\" && git push origin main"; else echo "Some edits did not match your files - send me the lines above."; exit 1; fi
