import { auth, call } from '../api';
import { exportCsv, nairaPlain } from '../lib/csv';
import { $, confirmDialog, emptyState, errText, esc, formValues, modal, toast, withBusy } from '../lib/dom';
import { dateLabel, isoDate, money, nairaInput, qty, toKobo } from '../lib/format';
import { icon } from '../lib/icons';
import { store } from '../store';
import type { Flock, FlockEntry } from '../types';
import type { ViewCtx } from './shell';

let showClosed = false;
const cur = () => esc(store.settings.currency_symbol || '₦');
const COST_CATS = ['Feed', 'Vaccine', 'Medication', 'Litter / wood shavings', 'Labour', 'Fuel / power', 'Transport', 'Other'];

export async function render(ctx: ViewCtx) {
  const manager = auth.can('manager');
  ctx.header('Flocks', 'Each batch of birds from placement to sale: deaths, feed, weight, costs and profit.', manager ? `<button class="btn btn-primary" data-new>${icon('plus', 16)} New flock</button>` : '');
  ctx.main.innerHTML = `<div class="toolbar"><label class="check inline"><input type="checkbox" data-closed ${showClosed ? 'checked' : ''}><span>Show closed flocks</span></label></div><div data-list></div>`;
  const list = $('[data-list]', ctx.main)!;
  const load = async () => {
    const rows = await call<Flock[]>('list_flocks', { includeClosed: showClosed });
    list.innerHTML = rows.length ? `<div class="flock-grid">${rows.map((f) => `<button class="flock-card ${f.status === 'closed' ? 'is-closed' : ''}" data-open="${f.id}">
        <span class="flock-top"><b>${esc(f.code)}</b><span class="pill ${f.status === 'active' ? 'pill-ok' : 'pill-mute'}">${f.status === 'active' ? `Day ${f.age_days}` : 'Closed'}</span></span>
        <span class="muted small">${esc([f.breed, f.house].filter(Boolean).join(' · ') || 'Placed')} ${esc(dateLabel(f.placed_date))}</span>
        <span class="flock-figs">
          <span><small>Alive</small><b>${qty(f.alive)}</b></span>
          <span><small>Mortality</small><b class="${f.mortality_pct > 5 ? 'bad-text' : ''}">${f.mortality_pct.toFixed(1)}%</b></span>
          <span><small>FCR</small><b>${f.fcr ? f.fcr.toFixed(2) : '—'}</b></span>
          <span><small>Profit</small><b class="${f.profit_kobo < 0 ? 'bad-text' : 'ok-text'}">${money(f.profit_kobo, { whole: true })}</b></span>
        </span></button>`).join('')}</div>`
      : emptyState('No flocks yet', manager ? 'Start a flock when day-old chicks arrive. Then log deaths, feed and weights daily.' : 'Ask a manager to start a flock.', manager ? `<button class="btn btn-primary" data-new-inline>${icon('plus', 16)} New flock</button>` : '');
  };
  await load();
  ctx.main.addEventListener('change', (e) => { if ((e.target as HTMLElement).matches('[data-closed]')) { showClosed = (e.target as HTMLInputElement).checked; load(); } });
  ctx.main.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const o = t.closest<HTMLElement>('[data-open]');
    if (o) openFlock(Number(o.dataset.open), load);
    if (t.closest('[data-new-inline]')) flockForm(null, load);
  });
  $('[data-new]')?.addEventListener('click', () => flockForm(null, load));
}

function flockForm(f: Flock | null, done: () => void) {
  const m = modal({ title: f ? `Edit ${f.code}` : 'New flock', size: 'md', body: `<form class="stack">
    <div class="grid-2"><label class="field"><span>Flock code</span><input name="code" required maxlength="40" value="${esc(f?.code ?? `B-${isoDate(new Date()).slice(0, 7)}`)}" autofocus></label>
    <label class="field"><span>Date placed</span><input type="date" name="placed_date" required value="${esc(f?.placed_date ?? isoDate(new Date()))}"></label></div>
    <div class="grid-2"><label class="field"><span>Chicks placed</span><input name="chicks" inputmode="numeric" required value="${f?.chicks_placed ?? ''}"></label>
    <label class="field"><span>Cost of the chicks (total)</span><span class="input-affix"><span class="affix">${cur()}</span><input name="cost" inputmode="decimal" value="${nairaInput(f?.chick_cost_kobo ?? 0)}"></span></label></div>
    <div class="grid-2"><label class="field"><span>Breed / strain</span><input name="breed" maxlength="60" value="${esc(f?.breed ?? '')}" placeholder="e.g. Arbor Acres, Cobb 500"></label>
    <label class="field"><span>House / pen</span><input name="house" maxlength="60" value="${esc(f?.house ?? '')}" placeholder="e.g. Pen 2"></label></div>
    <label class="field"><span>Notes</span><textarea name="notes" rows="2" maxlength="500">${esc(f?.notes ?? '')}</textarea></label>
    <p class="form-error" role="alert" data-err></p>
    <div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary">Save</button></div></form>` });
  const form = m.el.querySelector('form')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formValues(form);
    withBusy($<HTMLButtonElement>('.btn-primary', form), async () => {
      try { await call('save_flock', { input: { id: f?.id ?? null, code: v.code, breed: v.breed, house: v.house, placed_date: v.placed_date, chicks_placed: Math.round(Number(v.chicks) || 0), chick_cost_kobo: toKobo(v.cost), notes: v.notes } }); }
      catch (x) { $('[data-err]', form)!.textContent = errText(x); return; }
      toast('Flock saved'); m.close(); done();
    });
  });
}

async function openFlock(id: number, onChange: () => void) {
  const { flock: f, entries } = await call<{ flock: Flock; entries: FlockEntry[] }>('get_flock', { id });
  const manager = auth.can('manager');
  const active = f.status === 'active';
  const KIND: Record<string, string> = { log: 'Daily record', cost: 'Cost', sale: 'Birds sold' };
  const m = modal({ title: `Flock ${f.code}`, subtitle: `${f.breed || 'Broilers'}${f.house ? ` · ${f.house}` : ''} · placed ${dateLabel(f.placed_date)}${active ? ` · day ${f.age_days}` : ` · closed ${dateLabel(f.closed_date)}`}`, size: 'lg', body: `<div class="stack">
    <div class="figures"><div><span>Birds alive</span><b>${qty(f.alive)}</b><small class="muted">of ${qty(f.chicks_placed)} placed</small></div>
      <div><span>Mortality</span><b class="${f.mortality_pct > 5 ? 'bad-text' : ''}">${f.mortality_pct.toFixed(1)}%</b><small class="muted">${f.dead} dead · ${f.culled} culled</small></div>
      <div><span>Feed used</span><b>${qty(Math.round(f.feed_kg))} kg</b><small class="muted">FCR ${f.fcr ? f.fcr.toFixed(2) : '—'} · avg ${f.latest_weight_kg ? `${f.latest_weight_kg} kg` : '—'}</small></div>
      <div><span>Profit so far</span><b class="${f.profit_kobo < 0 ? 'bad-text' : 'ok-text'}">${money(f.profit_kobo)}</b><small class="muted">Sales ${money(f.revenue_kobo, { whole: true })} − costs ${money(f.costs_kobo, { whole: true })}</small></div></div>
    <p class="muted small">Cost per bird ${money(f.cost_per_bird_kobo)}${f.cost_per_kg_kobo ? ` · cost per kg live weight ${money(f.cost_per_kg_kobo)}` : ''} · ${qty(f.sold)} birds sold${f.sold_weight_kg ? ` (${qty(f.sold_weight_kg)} kg)` : ''}</p>
    ${active ? `<div class="row-actions"><button class="btn btn-primary" data-entry="log">${icon('calendar', 16)} Daily record</button>${manager ? `<button class="btn btn-ghost" data-entry="cost">${icon('wallet', 16)} Add cost</button>` : ''}<button class="btn btn-ghost" data-entry="sale">${icon('cash', 16)} Birds sold</button></div>` : ''}
    <div class="table-scroll"><table class="table compact"><thead><tr><th>Date</th><th>Entry</th><th>Details</th><th class="num">Deaths</th><th class="num">Feed</th><th class="num">Amount</th>${manager ? '<th></th>' : ''}</tr></thead><tbody>
      ${entries.map((e) => `<tr><td>${esc(dateLabel(e.date))}</td><td>${KIND[e.kind]}</td><td>${esc(e.description || '—')}${e.kind === 'log' && e.avg_weight_kg ? ` <small class="muted">avg ${e.avg_weight_kg} kg</small>` : ''}${e.kind === 'sale' && e.quantity ? ` <small class="muted">${qty(e.quantity)} kg</small>` : ''}<small class="muted block">${esc(e.user_name)}</small></td>
        <td class="num">${e.mortality || e.culls ? `${e.mortality}${e.culls ? ` + ${e.culls} culled` : ''}` : ''}</td><td class="num">${e.feed_kg ? `${qty(e.feed_kg)} kg` : ''}</td><td class="num">${e.amount_kobo ? money(e.amount_kobo) : ''}</td>
        ${manager ? `<td class="actions-col"><button class="icon-btn" data-del="${e.kind}:${e.id}" aria-label="Delete entry">${icon('trash', 15)}</button></td>` : ''}</tr>`).join('') || `<tr><td colspan="7" class="muted">No entries yet. Add the first daily record.</td></tr>`}
    </tbody></table></div>
    <div class="form-actions">
      ${auth.can('owner') ? `<button class="btn btn-ghost btn-danger-text push-left" data-delete-flock>${icon('trash', 16)} Delete flock</button>` : ''}
      ${manager ? `<button class="btn btn-ghost" data-edit>${icon('edit', 16)} Edit</button><button class="btn btn-ghost" data-export>${icon('download', 16)} Export</button><button class="btn ${active ? 'btn-ghost' : 'btn-primary'}" data-toggle>${active ? 'Close flock' : 'Reopen flock'}</button>` : ''}
    </div></div>` });
  const refresh = () => { m.close(); onChange(); openFlock(id, onChange); };
  m.el.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const en = t.closest<HTMLElement>('[data-entry]');
    if (en) entryForm(f, en.dataset.entry as 'log' | 'cost' | 'sale', refresh);
    const del = t.closest<HTMLElement>('[data-del]');
    if (del) {
      const [kind, eid] = del.dataset.del!.split(':');
      if (await confirmDialog({ title: 'Delete this entry?', message: kind === 'cost' ? 'Stock issued with this cost is not put back. Use a stock adjustment if needed.' : 'The flock figures will be recalculated.', confirm: 'Delete', danger: true }) === null) return;
      try { await call('delete_flock_entry', { kind, id: Number(eid) }); toast('Entry deleted'); refresh(); } catch (x) { toast(errText(x), 'error'); }
    }
    if (t.closest('[data-edit]')) flockForm(f, refresh);
    if (t.closest('[data-delete-flock]')) {
      if (await confirmDialog({ title: `Delete flock ${f.code}?`, message: 'All its daily records, costs and sales records are deleted. Stock already issued to it is not put back. This cannot be undone.', confirm: 'Delete flock', danger: true }) === null) return;
      try { await call('delete_flock', { id }); toast('Flock deleted'); m.close(); onChange(); } catch (x) { toast(errText(x), 'error'); }
    }
    if (t.closest('[data-toggle]')) {
      if (active && await confirmDialog({ title: `Close flock ${f.code}?`, message: 'Close it when the last birds are sold. You can reopen it later.', confirm: 'Close flock' }) === null) return;
      try { await call('close_flock', { id, closedDate: isoDate(new Date()), reopen: !active }); toast(active ? 'Flock closed' : 'Flock reopened'); refresh(); } catch (x) { toast(errText(x), 'error'); }
    }
    if (t.closest('[data-export]')) exportCsv(`flock-${f.code}.csv`, ['Date', 'Entry', 'Details', 'Deaths', 'Culls', 'Feed kg', 'Avg weight kg', 'Amount', 'By'],
      entries.map((x) => [x.date, KIND[x.kind], x.description, x.mortality, x.culls, x.feed_kg, x.avg_weight_kg, nairaPlain(x.amount_kobo), x.user_name]));
  });
}

async function entryForm(f: Flock, kind: 'log' | 'cost' | 'sale', done: () => void) {
  if (kind === 'cost') await store.loadProducts();
  const materials = store.products.filter((p) => p.active && p.track_stock);
  const today = isoDate(new Date());
  const body = kind === 'log' ? `
      <div class="grid-2"><label class="field"><span>Deaths today</span><input name="mortality" inputmode="numeric" value="0" autofocus></label><label class="field"><span>Culled</span><input name="culls" inputmode="numeric" value="0"></label></div>
      <div class="grid-2"><label class="field"><span>Feed given (kg)</span><input name="feed_kg" inputmode="decimal" value="0"><small>Leave 0 if you issue feed from stock as a cost.</small></label><label class="field"><span>Average weight (kg)</span><input name="avg_weight_kg" inputmode="decimal" value="0"><small>From a sample weighing, if done.</small></label></div>
      <label class="field"><span>Notes</span><input name="description" maxlength="300" placeholder="e.g. Gumboro vaccine given, birds active"></label>`
    : kind === 'cost' ? `
      <label class="field"><span>Category</span><input name="category" required list="fc-cats" value="Feed"><datalist id="fc-cats">${COST_CATS.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></label>
      <div class="grid-2"><label class="field"><span>Take from stock <em class="muted">(optional)</em></span><select name="product_id"><option value="">Not from stock (paid directly)</option>${materials.map((p) => `<option value="${p.id}">${esc(p.name)}: ${qty(p.stock_qty)} ${esc(p.unit)}</option>`).join('')}</select></label>
      <label class="field"><span>Quantity from stock</span><input name="quantity" inputmode="decimal" value="0"><small>Feed issued in kg also counts toward FCR.</small></label></div>
      <label class="field"><span>Amount</span><span class="input-affix"><span class="affix">${cur()}</span><input name="amount" inputmode="decimal" placeholder="Worked out from the stock cost if left empty"></span></label>
      <label class="field"><span>Details</span><input name="description" maxlength="300"></label>`
    : `
      <div class="grid-2"><label class="field"><span>Birds sold</span><input name="birds" inputmode="numeric" required autofocus><small>${qty(f.alive)} alive now.</small></label><label class="field"><span>Total live weight (kg)</span><input name="live_weight_kg" inputmode="decimal" value="0"></label></div>
      <div class="grid-2"><label class="field"><span>Amount received</span><span class="input-affix"><span class="affix">${cur()}</span><input name="amount" inputmode="decimal" required></span></label><label class="field"><span>Receipt no. <em class="muted">(optional)</em></span><input name="receipt_no" maxlength="40"></label></div>
      <label class="field"><span>Buyer</span><input name="buyer" maxlength="120"></label>
      <p class="muted small">If you also gave a till receipt for these birds, enter its number here. Flock profit is worked out from this record.</p>`;
  const title = { log: 'Daily record', cost: 'Add flock cost', sale: 'Birds sold' }[kind];
  const m = modal({ title, subtitle: `Flock ${f.code}`, size: 'md', body: `<form class="stack">
    <label class="field"><span>Date</span><input type="date" name="date" value="${today}" max="${today}" min="${esc(f.placed_date)}" required></label>
    ${body}
    <p class="form-error" role="alert" data-err></p>
    <div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary">Save</button></div></form>` });
  const form = m.el.querySelector('form')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formValues(form);
    const n = (k: string) => Number((v[k] ?? '').replace(',', '.')) || 0;
    withBusy($<HTMLButtonElement>('.btn-primary', form), async () => {
      try {
        await call('add_flock_entry', { input: {
          flock_id: f.id, kind, date: v.date, mortality: Math.round(n('mortality')), culls: Math.round(n('culls')), feed_kg: n('feed_kg'), avg_weight_kg: n('avg_weight_kg'),
          category: v.category ?? '', description: v.description ?? '', product_id: v.product_id ? Number(v.product_id) : null, quantity: n('quantity'),
          amount_kobo: v.amount ? toKobo(v.amount) : 0, birds: Math.round(n('birds')), live_weight_kg: n('live_weight_kg'), buyer: v.buyer ?? '', receipt_no: v.receipt_no ?? '',
        } });
      } catch (x) { $('[data-err]', form)!.textContent = errText(x); return; }
      toast('Saved'); m.close(); done();
    });
  });
}
