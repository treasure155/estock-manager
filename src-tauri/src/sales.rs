//! Receipts, payments, voids, collection tracking and customers.

use crate::{auth::{self, Role, Session}, db, AppState};
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};

// ------------------------------------------------------------------ input / output types

#[derive(Deserialize)]
pub struct SaleItemInput {
    pub product_id: i64,
    pub quantity: f64,
    /// Only honoured when price overrides are enabled in Settings.
    pub unit_price_kobo: Option<i64>,
}

#[derive(Deserialize)]
pub struct PaymentInput {
    pub method: String,
    pub amount_kobo: i64,
    pub reference: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateReceiptInput {
    pub customer_id: Option<i64>,
    pub customer_name: Option<String>,
    pub customer_phone: Option<String>,
    pub customer_email: Option<String>,
    pub discount_kobo: i64,
    pub note: Option<String>,
    pub collection_date: Option<String>,
    pub items: Vec<SaleItemInput>,
    pub payments: Vec<PaymentInput>,
}

#[derive(Serialize, Clone)]
pub struct ReceiptLine {
    pub product_name: String,
    pub product_kind: String,
    pub unit: String,
    pub quantity: f64,
    pub unit_price_kobo: i64,
    pub line_total_kobo: i64,
}

#[derive(Serialize, Clone)]
pub struct ReceiptPayment {
    pub method: String,
    pub amount_kobo: i64,
    pub reference: String,
    pub received_by: String,
    pub created_at: String,
}

#[derive(Serialize)]
pub struct ReceiptDetail {
    pub id: i64,
    pub receipt_no: String,
    pub customer_id: Option<i64>,
    pub customer_name: String,
    pub customer_phone: String,
    pub customer_email: String,
    pub cashier_name: String,
    pub subtotal_kobo: i64,
    pub discount_kobo: i64,
    pub tax_kobo: i64,
    pub total_kobo: i64,
    pub amount_paid_kobo: i64,
    pub change_kobo: i64,
    pub balance_kobo: i64,
    pub payment_status: String,
    pub fulfilment_status: String,
    pub collection_date: String,
    pub note: String,
    pub void_reason: String,
    pub voided_by: String,
    pub created_at: String,
    pub items: Vec<ReceiptLine>,
    pub payments: Vec<ReceiptPayment>,
}

#[derive(Serialize)]
pub struct ReceiptSummary {
    id: i64,
    receipt_no: String,
    customer_name: String,
    customer_email: String,
    cashier_name: String,
    total_kobo: i64,
    amount_paid_kobo: i64,
    payment_status: String,
    fulfilment_status: String,
    collection_date: String,
    created_at: String,
    item_count: i64,
}

fn clean(s: &Option<String>, max: usize, field: &str) -> Result<String, String> {
    let v = s.as_deref().unwrap_or("").trim().to_string();
    if v.chars().count() > max { return Err(format!("{field} is too long")); }
    Ok(v)
}

pub fn valid_email(e: &str) -> bool {
    let e = e.trim();
    if e.len() > 254 || e.contains(char::is_whitespace) { return false; }
    match e.split_once('@') {
        Some((local, domain)) => !local.is_empty() && domain.contains('.') && !domain.starts_with('.') && !domain.ends_with('.'),
        None => false,
    }
}

fn status_for(paid: i64, total: i64) -> &'static str {
    if paid >= total { "paid" } else if paid > 0 { "partial" } else { "unpaid" }
}

// ------------------------------------------------------------------ create

pub fn create_receipt_tx(tx: &Transaction<'_>, input: CreateReceiptInput, cashier: &Session) -> Result<ReceiptDetail, String> {
    if input.items.is_empty() { return Err("Add at least one item to the receipt".into()); }
    if input.items.len() > 500 { return Err("A receipt can hold at most 500 lines".into()); }
    if input.discount_kobo < 0 { return Err("Discount cannot be negative".into()); }

    let allow_override = db::setting_bool(tx, "allow_price_override")?;
    let allow_negative = db::setting_bool(tx, "allow_negative_stock")?;
    let tax_enabled = db::setting_bool(tx, "tax_enabled")?;
    let tax_rate: f64 = db::setting(tx, "tax_rate")?.parse().unwrap_or(0.0);
    let track_collection = db::setting_bool(tx, "track_collection")?;

    let mut customer_name = clean(&input.customer_name, 120, "Customer name")?;
    let mut customer_phone = clean(&input.customer_phone, 40, "Customer phone")?;
    let mut customer_email = clean(&input.customer_email, 254, "Customer email")?;
    if !customer_email.is_empty() && !valid_email(&customer_email) { return Err("Customer email address is not valid".into()); }
    if let Some(cid) = input.customer_id {
        let c: Option<(String, String, String)> = tx.query_row("SELECT name,phone,email FROM customers WHERE id=?1", [cid], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).optional().map_err(|e| e.to_string())?;
        let (n, p, e) = c.ok_or("Selected customer no longer exists")?;
        if customer_name.is_empty() { customer_name = n; }
        if customer_phone.is_empty() { customer_phone = p; }
        if customer_email.is_empty() { customer_email = e; }
    }
    let note = clean(&input.note, 500, "Note")?;
    let collection_date = clean(&input.collection_date, 20, "Collection date")?;

    // Resolve lines. Quantities of the same item are merged so the stock check is exact.
    struct Line { pid: i64, name: String, kind: String, unit: String, qty: f64, price: i64, cost: i64, total: i64, track: bool }
    let mut lines: Vec<Line> = Vec::new();
    let mut subtotal: i64 = 0;
    for item in &input.items {
        if !item.quantity.is_finite() || item.quantity <= 0.0 || item.quantity > 1_000_000.0 { return Err("Every quantity must be greater than zero".into()); }
        let row: Option<(String, String, String, i64, i64, i64, f64)> = tx
            .query_row("SELECT name,kind,unit,selling_price_kobo,cost_price_kobo,track_stock,stock_qty FROM products WHERE id=?1 AND active=1", [item.product_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?, r.get(6)?)))
            .optional()
            .map_err(|e| e.to_string())?;
        let Some((name, kind, unit, list_price, cost, track, stock)) = row else { return Err("One of the items is no longer available. Refresh and try again.".into()) };
        if kind == "material" { return Err(format!("{name} is an internal stock material and cannot be sold. Change its type to product to sell it.")); }
        let price = match item.unit_price_kobo {
            Some(p) if p != list_price => {
                if !allow_override && cashier.role < Role::Manager { return Err("Price changes at the till are switched off in Settings".into()); }
                if p < 0 { return Err("Price cannot be negative".into()); }
                p
            }
            _ => list_price,
        };
        let track = track == 1;
        let already: f64 = lines.iter().filter(|l| l.pid == item.product_id).map(|l| l.qty).sum();
        if track && !allow_negative && stock + 1e-9 < already + item.quantity {
            return Err(format!("Not enough stock for {name}. Available: {} {unit}", db::format_qty(stock)));
        }
        let line_total = ((price as f64) * item.quantity).round() as i64;
        subtotal = subtotal.checked_add(line_total).ok_or("Receipt total is too large")?;
        lines.push(Line { pid: item.product_id, name, kind, unit, qty: item.quantity, price, cost, total: line_total, track });
    }
    if input.discount_kobo > subtotal { return Err("Discount cannot be more than the subtotal".into()); }
    let taxable = subtotal - input.discount_kobo;
    let tax = if tax_enabled && tax_rate > 0.0 { ((taxable as f64) * tax_rate / 100.0).round() as i64 } else { 0 };
    let total = taxable + tax;

    // Payments: tendered amounts may exceed the total (change is given back);
    // less than the total makes a credit sale, which needs a named customer.
    let mut tendered: i64 = 0;
    let mut payments: Vec<(String, i64, String)> = Vec::new();
    for p in &input.payments {
        if p.amount_kobo <= 0 { continue; }
        let method: Option<String> = tx.query_row("SELECT name FROM payment_methods WHERE name=?1 COLLATE NOCASE AND active=1", [p.method.trim()], |r| r.get(0)).optional().map_err(|e| e.to_string())?;
        let method = method.ok_or_else(|| format!("Payment method '{}' is not available", p.method))?;
        let reference = clean(&p.reference, 80, "Payment reference")?;
        tendered = tendered.checked_add(p.amount_kobo).ok_or("Payment total is too large")?;
        payments.push((method, p.amount_kobo, reference));
    }
    let change = (tendered - total).max(0);
    let paid = tendered.min(total);
    if paid < total && customer_name.is_empty() {
        return Err("This sale is not fully paid. Add the customer's name so the balance can be tracked.".into());
    }
    // Change comes back out of the last payment lines so method totals stay accurate.
    let mut to_return = change;
    for p in payments.iter_mut().rev() {
        if to_return == 0 { break; }
        let take = to_return.min(p.1);
        p.1 -= take;
        to_return -= take;
    }
    payments.retain(|p| p.1 > 0);

    let prefix: String = db::setting(tx, "receipt_prefix")?.chars().filter(|c| c.is_ascii_alphanumeric()).take(8).collect::<String>().to_uppercase();
    let prefix = if prefix.is_empty() { "RCP".to_string() } else { prefix };
    let next_id: i64 = tx.query_row("SELECT COALESCE(MAX(id),0)+1 FROM receipts", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    let receipt_no = format!("{prefix}-{}-{:05}", chrono::Local::now().format("%y%m"), next_id);
    let status = status_for(paid, total);
    let fulfilment = if track_collection { "pending" } else { "none" };

    tx.execute(
        "INSERT INTO receipts(receipt_no,customer_id,customer_name,customer_phone,customer_email,cashier_id,cashier_name,subtotal_kobo,discount_kobo,tax_kobo,total_kobo,amount_paid_kobo,change_kobo,payment_status,fulfilment_status,collection_date,note)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)",
        params![receipt_no, input.customer_id, customer_name, customer_phone, customer_email, cashier.user_id, cashier.display_name(), subtotal, input.discount_kobo, tax, total, paid, change, status, fulfilment, collection_date, note],
    )
    .map_err(|e| e.to_string())?;
    let receipt_id = tx.last_insert_rowid();

    for l in &lines {
        tx.execute(
            "INSERT INTO receipt_items(receipt_id,product_id,product_name,product_kind,unit,quantity,unit_price_kobo,unit_cost_kobo,line_total_kobo,stock_deducted) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
            params![receipt_id, l.pid, l.name, l.kind, l.unit, l.qty, l.price, l.cost, l.total, l.track as i64],
        )
        .map_err(|e| e.to_string())?;
        if l.track {
            tx.execute("UPDATE products SET stock_qty=stock_qty-?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2", params![l.qty, l.pid]).map_err(|e| e.to_string())?;
            tx.execute(
                "INSERT INTO stock_movements(product_id,movement_type,quantity_delta,unit_cost_kobo,note,receipt_id,user_name) VALUES(?1,'sale',?2,?3,?4,?5,?6)",
                params![l.pid, -l.qty, l.cost, format!("Sale {receipt_no}"), receipt_id, cashier.display_name()],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    for (method, amount, reference) in &payments {
        tx.execute("INSERT INTO receipt_payments(receipt_id,method,amount_kobo,reference,received_by) VALUES(?1,?2,?3,?4,?5)", params![receipt_id, method, amount, reference, cashier.display_name()]).map_err(|e| e.to_string())?;
    }
    load_receipt(tx, receipt_id)
}

pub fn load_receipt(conn: &Connection, receipt_id: i64) -> Result<ReceiptDetail, String> {
    let mut r = conn
        .query_row(
            "SELECT id,receipt_no,customer_id,customer_name,customer_phone,customer_email,cashier_name,subtotal_kobo,discount_kobo,tax_kobo,total_kobo,amount_paid_kobo,change_kobo,
                    payment_status,fulfilment_status,collection_date,note,void_reason,voided_by,datetime(created_at,'localtime')
             FROM receipts WHERE id=?1",
            [receipt_id],
            |r| {
                let total: i64 = r.get(10)?;
                let paid: i64 = r.get(11)?;
                let status: String = r.get(13)?;
                Ok(ReceiptDetail {
                    id: r.get(0)?, receipt_no: r.get(1)?, customer_id: r.get(2)?, customer_name: r.get(3)?, customer_phone: r.get(4)?, customer_email: r.get(5)?, cashier_name: r.get(6)?,
                    subtotal_kobo: r.get(7)?, discount_kobo: r.get(8)?, tax_kobo: r.get(9)?, total_kobo: total, amount_paid_kobo: paid, change_kobo: r.get(12)?,
                    balance_kobo: if status == "void" { 0 } else { (total - paid).max(0) }, payment_status: status, fulfilment_status: r.get(14)?, collection_date: r.get(15)?,
                    note: r.get(16)?, void_reason: r.get(17)?, voided_by: r.get(18)?, created_at: r.get(19)?, items: vec![], payments: vec![],
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?
        .ok_or("Receipt not found")?;
    let mut stmt = conn.prepare("SELECT product_name,product_kind,unit,quantity,unit_price_kobo,line_total_kobo FROM receipt_items WHERE receipt_id=?1 ORDER BY id").map_err(|e| e.to_string())?;
    r.items = stmt
        .query_map([receipt_id], |x| Ok(ReceiptLine { product_name: x.get(0)?, product_kind: x.get(1)?, unit: x.get(2)?, quantity: x.get(3)?, unit_price_kobo: x.get(4)?, line_total_kobo: x.get(5)? }))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT method,amount_kobo,reference,received_by,datetime(created_at,'localtime') FROM receipt_payments WHERE receipt_id=?1 ORDER BY id").map_err(|e| e.to_string())?;
    r.payments = stmt
        .query_map([receipt_id], |x| Ok(ReceiptPayment { method: x.get(0)?, amount_kobo: x.get(1)?, reference: x.get(2)?, received_by: x.get(3)?, created_at: x.get(4)? }))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(r)
}

/// Cashiers may only open receipts they issued.
fn assert_can_view(conn: &Connection, me: &Session, receipt_id: i64) -> Result<(), String> {
    if me.role >= Role::Manager { return Ok(()); }
    let owner: Option<Option<i64>> = conn.query_row("SELECT cashier_id FROM receipts WHERE id=?1", [receipt_id], |r| r.get(0)).optional().map_err(|e| e.to_string())?;
    match owner {
        Some(Some(id)) if id == me.user_id => Ok(()),
        Some(_) => Err("You can only open receipts you issued".into()),
        None => Err("Receipt not found".into()),
    }
}

// ------------------------------------------------------------------ commands

#[tauri::command]
pub fn create_receipt(state: tauri::State<'_, AppState>, session_token: String, input: CreateReceiptInput) -> Result<ReceiptDetail, String> {
    let me = auth::require(&state, &session_token, Role::Cashier)?;
    let mut conn = state.db()?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let receipt = create_receipt_tx(&tx, input, &me)?;
    tx.commit().map_err(|e| format!("Could not save the sale: {e}"))?;
    Ok(receipt)
}

#[derive(Deserialize, Default)]
pub struct ReceiptFilter {
    search: Option<String>,
    status: Option<String>,
    fulfilment: Option<String>,
    from: Option<String>,
    to: Option<String>,
    customer_id: Option<i64>,
}

#[tauri::command]
pub fn list_receipts(state: tauri::State<'_, AppState>, session_token: String, filter: Option<ReceiptFilter>) -> Result<Vec<ReceiptSummary>, String> {
    let me = auth::require(&state, &session_token, Role::Cashier)?;
    let f = filter.unwrap_or_default();
    let conn = state.db()?;
    let term = format!("%{}%", f.search.unwrap_or_default().trim().replace(['%', '_'], ""));
    let only_cashier: Option<i64> = if me.role < Role::Manager { Some(me.user_id) } else { None };
    let mut stmt = conn
        .prepare(
            "SELECT r.id,r.receipt_no,r.customer_name,r.customer_email,r.cashier_name,r.total_kobo,r.amount_paid_kobo,r.payment_status,r.fulfilment_status,r.collection_date,
                    datetime(r.created_at,'localtime'),(SELECT COUNT(*) FROM receipt_items i WHERE i.receipt_id=r.id)
             FROM receipts r
             WHERE (r.receipt_no LIKE ?1 OR r.customer_name LIKE ?1 OR r.customer_phone LIKE ?1 OR r.customer_email LIKE ?1)
               AND (?2 IS NULL OR r.payment_status=?2 OR (?2='owing' AND r.payment_status IN ('partial','unpaid')))
               AND (?3 IS NULL OR r.fulfilment_status=?3)
               AND (?4 IS NULL OR date(r.created_at,'localtime')>=?4)
               AND (?5 IS NULL OR date(r.created_at,'localtime')<=?5)
               AND (?6 IS NULL OR r.cashier_id=?6)
               AND (?7 IS NULL OR r.customer_id=?7)
             ORDER BY r.id DESC LIMIT 1000",
        )
        .map_err(|e| e.to_string())?;
    let nz = |s: Option<String>| s.filter(|v| !v.is_empty());
    let rows = stmt
        .query_map(params![term, nz(f.status), nz(f.fulfilment), nz(f.from), nz(f.to), only_cashier, f.customer_id], |r| {
            Ok(ReceiptSummary { id: r.get(0)?, receipt_no: r.get(1)?, customer_name: r.get(2)?, customer_email: r.get(3)?, cashier_name: r.get(4)?, total_kobo: r.get(5)?, amount_paid_kobo: r.get(6)?, payment_status: r.get(7)?, fulfilment_status: r.get(8)?, collection_date: r.get(9)?, created_at: r.get(10)?, item_count: r.get(11)? })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_receipt(state: tauri::State<'_, AppState>, session_token: String, receipt_id: i64) -> Result<ReceiptDetail, String> {
    let me = auth::require(&state, &session_token, Role::Cashier)?;
    let conn = state.db()?;
    assert_can_view(&conn, &me, receipt_id)?;
    load_receipt(&conn, receipt_id)
}

pub fn record_payment_tx(tx: &Transaction<'_>, me: &Session, receipt_id: i64, method: &str, amount_kobo: i64, reference: &str) -> Result<ReceiptDetail, String> {
    if amount_kobo <= 0 { return Err("Enter an amount greater than zero".into()); }
    let (total, paid, status): (i64, i64, String) = tx.query_row("SELECT total_kobo,amount_paid_kobo,payment_status FROM receipts WHERE id=?1", [receipt_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).optional().map_err(|e| e.to_string())?.ok_or("Receipt not found")?;
    if status == "void" { return Err("This receipt has been voided".into()); }
    let balance = total - paid;
    if balance <= 0 { return Err("This receipt is already fully paid".into()); }
    if amount_kobo > balance { return Err(format!("Amount is more than the balance of {}", db::format_money(&db::setting(tx, "currency_symbol")?, balance))); }
    let method: String = tx.query_row("SELECT name FROM payment_methods WHERE name=?1 COLLATE NOCASE AND active=1", [method.trim()], |r| r.get(0)).optional().map_err(|e| e.to_string())?.ok_or("Choose an available payment method")?;
    if reference.chars().count() > 80 { return Err("Payment reference is too long".into()); }
    tx.execute("INSERT INTO receipt_payments(receipt_id,method,amount_kobo,reference,received_by) VALUES(?1,?2,?3,?4,?5)", params![receipt_id, method, amount_kobo, reference.trim(), me.display_name()]).map_err(|e| e.to_string())?;
    let new_paid = paid + amount_kobo;
    tx.execute("UPDATE receipts SET amount_paid_kobo=?1,payment_status=?2 WHERE id=?3", params![new_paid, status_for(new_paid, total), receipt_id]).map_err(|e| e.to_string())?;
    load_receipt(tx, receipt_id)
}

#[tauri::command]
pub fn record_payment(state: tauri::State<'_, AppState>, session_token: String, receipt_id: i64, method: String, amount_kobo: i64, reference: Option<String>) -> Result<ReceiptDetail, String> {
    let me = auth::require(&state, &session_token, Role::Cashier)?;
    let mut conn = state.db()?;
    assert_can_view(&conn, &me, receipt_id)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let r = record_payment_tx(&tx, &me, receipt_id, &method, amount_kobo, reference.as_deref().unwrap_or(""))?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(r)
}

pub fn void_receipt_tx(tx: &Transaction<'_>, me: &Session, receipt_id: i64, reason: &str) -> Result<ReceiptDetail, String> {
    let reason = reason.trim();
    if reason.chars().count() < 3 || reason.chars().count() > 200 { return Err("Give a short reason for voiding this receipt".into()); }
    let (no, status): (String, String) = tx.query_row("SELECT receipt_no,payment_status FROM receipts WHERE id=?1", [receipt_id], |r| Ok((r.get(0)?, r.get(1)?))).optional().map_err(|e| e.to_string())?.ok_or("Receipt not found")?;
    if status == "void" { return Err("This receipt is already void".into()); }
    let mut stmt = tx.prepare("SELECT product_id,quantity,unit_cost_kobo FROM receipt_items WHERE receipt_id=?1 AND stock_deducted=1 AND product_id IS NOT NULL").map_err(|e| e.to_string())?;
    let restock = stmt.query_map([receipt_id], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, f64>(1)?, r.get::<_, i64>(2)?))).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    drop(stmt);
    for (pid, qty, cost) in restock {
        tx.execute("UPDATE products SET stock_qty=stock_qty+?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2", params![qty, pid]).map_err(|e| e.to_string())?;
        tx.execute("INSERT INTO stock_movements(product_id,movement_type,quantity_delta,unit_cost_kobo,note,receipt_id,user_name) VALUES(?1,'void_reversal',?2,?3,?4,?5,?6)", params![pid, qty, cost, format!("Void {no}: {reason}"), receipt_id, me.display_name()]).map_err(|e| e.to_string())?;
    }
    tx.execute("UPDATE receipts SET payment_status='void',void_reason=?1,voided_by=?2,voided_at=CURRENT_TIMESTAMP WHERE id=?3", params![reason, me.display_name(), receipt_id]).map_err(|e| e.to_string())?;
    load_receipt(tx, receipt_id)
}

#[tauri::command]
pub fn void_receipt(state: tauri::State<'_, AppState>, session_token: String, receipt_id: i64, reason: String) -> Result<ReceiptDetail, String> {
    let me = auth::require(&state, &session_token, Role::Manager)?;
    let mut conn = state.db()?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let r = void_receipt_tx(&tx, &me, receipt_id, &reason)?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(r)
}

#[tauri::command]
pub fn update_fulfilment(state: tauri::State<'_, AppState>, session_token: String, receipt_id: i64, status: String) -> Result<ReceiptDetail, String> {
    let me = auth::require(&state, &session_token, Role::Cashier)?;
    if !["pending", "ready", "collected"].contains(&status.as_str()) { return Err("Status must be pending, ready or collected".into()); }
    let conn = state.db()?;
    assert_can_view(&conn, &me, receipt_id)?;
    let n = conn.execute("UPDATE receipts SET fulfilment_status=?1 WHERE id=?2 AND payment_status<>'void'", params![status, receipt_id]).map_err(|e| e.to_string())?;
    if n == 0 { return Err("Receipt not found or voided".into()); }
    load_receipt(&conn, receipt_id)
}

// ------------------------------------------------------------------ customers

#[derive(Serialize)]
pub struct Customer {
    id: i64,
    name: String,
    phone: String,
    email: String,
    address: String,
    notes: String,
    receipt_count: i64,
    total_spent_kobo: i64,
    balance_kobo: i64,
}

#[tauri::command]
pub fn list_customers(state: tauri::State<'_, AppState>, session_token: String, search: Option<String>) -> Result<Vec<Customer>, String> {
    auth::require(&state, &session_token, Role::Cashier)?;
    let conn = state.db()?;
    let term = format!("%{}%", search.unwrap_or_default().trim().replace(['%', '_'], ""));
    let mut stmt = conn
        .prepare(
            "SELECT c.id,c.name,c.phone,c.email,c.address,c.notes,
                    COUNT(r.id), COALESCE(SUM(r.total_kobo),0), COALESCE(SUM(r.total_kobo-r.amount_paid_kobo),0)
             FROM customers c LEFT JOIN receipts r ON r.customer_id=c.id AND r.payment_status<>'void'
             WHERE c.name LIKE ?1 OR c.phone LIKE ?1 OR c.email LIKE ?1
             GROUP BY c.id ORDER BY c.name COLLATE NOCASE LIMIT 1000",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([term], |r| Ok(Customer { id: r.get(0)?, name: r.get(1)?, phone: r.get(2)?, email: r.get(3)?, address: r.get(4)?, notes: r.get(5)?, receipt_count: r.get(6)?, total_spent_kobo: r.get(7)?, balance_kobo: r.get(8)? }))
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[derive(Deserialize)]
pub struct CustomerInput {
    id: Option<i64>,
    name: String,
    phone: String,
    email: String,
    address: String,
    notes: String,
}

#[tauri::command]
pub fn save_customer(state: tauri::State<'_, AppState>, session_token: String, input: CustomerInput) -> Result<i64, String> {
    let me = auth::require(&state, &session_token, Role::Cashier)?;
    let name = input.name.trim();
    if name.is_empty() || name.chars().count() > 120 { return Err("Enter the customer's name (up to 120 characters)".into()); }
    if input.phone.trim().chars().count() > 40 || input.address.chars().count() > 300 || input.notes.chars().count() > 500 { return Err("One of the fields is too long".into()); }
    let email = input.email.trim();
    if !email.is_empty() && !valid_email(email) { return Err("Email address is not valid".into()); }
    let conn = state.db()?;
    match input.id {
        Some(id) => {
            if me.role < Role::Manager { return Err("Only managers can edit saved customers".into()); }
            conn.execute("UPDATE customers SET name=?1,phone=?2,email=?3,address=?4,notes=?5,updated_at=CURRENT_TIMESTAMP WHERE id=?6", params![name, input.phone.trim(), email, input.address.trim(), input.notes.trim(), id]).map_err(|e| e.to_string())?;
            Ok(id)
        }
        None => {
            conn.execute("INSERT INTO customers(name,phone,email,address,notes) VALUES(?1,?2,?3,?4,?5)", params![name, input.phone.trim(), email, input.address.trim(), input.notes.trim()]).map_err(|e| e.to_string())?;
            Ok(conn.last_insert_rowid())
        }
    }
}

#[tauri::command]
pub fn delete_customer(state: tauri::State<'_, AppState>, session_token: String, id: i64) -> Result<(), String> {
    auth::require(&state, &session_token, Role::Manager)?;
    let conn = state.db()?;
    let owing: i64 = conn.query_row("SELECT COALESCE(SUM(total_kobo-amount_paid_kobo),0) FROM receipts WHERE customer_id=?1 AND payment_status IN ('partial','unpaid')", [id], |r| r.get(0)).map_err(|e| e.to_string())?;
    if owing > 0 { return Err("This customer still owes money. Clear the balance before deleting.".into()); }
    // Receipts keep the customer's name and contact details as written at the time of sale.
    conn.execute("DELETE FROM customers WHERE id=?1", [id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;

    fn cashier() -> Session { Session { user_id: 1, username: "c".into(), full_name: "Cashier".into(), role: Role::Cashier, last_seen: Instant::now() } }

    fn setup() -> Connection {
        let conn = db::test_conn();
        conn.execute("INSERT INTO users(username,password_hash,role) VALUES('c','x','cashier')", []).unwrap();
        conn.execute("INSERT INTO products(sku,name,kind,unit,selling_price_kobo,cost_price_kobo,track_stock,stock_qty) VALUES('A','Rice','product','plate',150000,70000,1,10)", []).unwrap();
        conn.execute("INSERT INTO products(sku,name,kind,unit,selling_price_kobo,track_stock) VALUES('S','Shirt wash','service','piece',70000,0)", []).unwrap();
        conn.execute("INSERT INTO products(sku,name,kind,unit,cost_price_kobo,track_stock,stock_qty) VALUES('M','Detergent','material','bag',100,1,5)", []).unwrap();
        conn
    }

    fn sale(items: Vec<(i64, f64)>, pays: Vec<(&str, i64)>, name: &str) -> CreateReceiptInput {
        CreateReceiptInput {
            customer_id: None, customer_name: Some(name.into()), customer_phone: None, customer_email: None, discount_kobo: 0, note: None, collection_date: None,
            items: items.into_iter().map(|(p, q)| SaleItemInput { product_id: p, quantity: q, unit_price_kobo: None }).collect(),
            payments: pays.into_iter().map(|(m, a)| PaymentInput { method: m.into(), amount_kobo: a, reference: None }).collect(),
        }
    }

    #[test]
    fn cash_sale_gives_change_and_deducts_stock_only_for_tracked_items() {
        let mut conn = setup();
        let tx = conn.transaction().unwrap();
        let r = create_receipt_tx(&tx, sale(vec![(1, 2.0), (2, 1.0)], vec![("cash", 400000)], ""), &cashier()).unwrap();
        tx.commit().unwrap();
        assert_eq!(r.total_kobo, 370000);
        assert_eq!(r.change_kobo, 30000);
        assert_eq!(r.payment_status, "paid");
        assert_eq!(r.payments[0].amount_kobo, 370000);
        let stock: f64 = conn.query_row("SELECT stock_qty FROM products WHERE id=1", [], |x| x.get(0)).unwrap();
        assert_eq!(stock, 8.0);
    }

    #[test]
    fn credit_sale_needs_customer_and_can_be_settled() {
        let mut conn = setup();
        let tx = conn.transaction().unwrap();
        assert!(create_receipt_tx(&tx, sale(vec![(1, 1.0)], vec![], ""), &cashier()).is_err());
        let r = create_receipt_tx(&tx, sale(vec![(1, 1.0)], vec![("Bank transfer", 50000)], "Chief Okon"), &cashier()).unwrap();
        assert_eq!(r.payment_status, "partial");
        assert_eq!(r.balance_kobo, 100000);
        assert!(record_payment_tx(&tx, &cashier(), r.id, "Cash", 200000, "").is_err());
        let r = record_payment_tx(&tx, &cashier(), r.id, "Cash", 100000, "").unwrap();
        assert_eq!(r.payment_status, "paid");
    }

    #[test]
    fn materials_cannot_be_sold_and_stock_is_enforced() {
        let mut conn = setup();
        let tx = conn.transaction().unwrap();
        assert!(create_receipt_tx(&tx, sale(vec![(3, 1.0)], vec![("Cash", 100)], ""), &cashier()).is_err());
        // Two lines of the same item that together exceed stock are rejected.
        assert!(create_receipt_tx(&tx, sale(vec![(1, 6.0), (1, 6.0)], vec![("Cash", 2_000_000)], ""), &cashier()).is_err());
    }

    #[test]
    fn price_override_blocked_for_cashier_unless_enabled() {
        let mut conn = setup();
        let tx = conn.transaction().unwrap();
        let mut input = sale(vec![(1, 1.0)], vec![("Cash", 100000)], "");
        input.items[0].unit_price_kobo = Some(100000);
        assert!(create_receipt_tx(&tx, input, &cashier()).is_err());
        db::set_setting(&tx, "allow_price_override", "1").unwrap();
        let mut input = sale(vec![(1, 1.0)], vec![("Cash", 100000)], "");
        input.items[0].unit_price_kobo = Some(100000);
        assert_eq!(create_receipt_tx(&tx, input, &cashier()).unwrap().total_kobo, 100000);
    }

    #[test]
    fn tax_is_applied_after_discount() {
        let mut conn = setup();
        db::set_setting(&conn, "tax_enabled", "1").unwrap();
        let tx = conn.transaction().unwrap();
        let mut input = sale(vec![(1, 2.0)], vec![("Cash", 400000)], "");
        input.discount_kobo = 100000;
        let r = create_receipt_tx(&tx, input, &cashier()).unwrap();
        assert_eq!(r.tax_kobo, 15000);
        assert_eq!(r.total_kobo, 215000);
    }

    #[test]
    fn void_restocks_items() {
        let mut conn = setup();
        let tx = conn.transaction().unwrap();
        let r = create_receipt_tx(&tx, sale(vec![(1, 3.0)], vec![("Cash", 450000)], ""), &cashier()).unwrap();
        let mgr = Session { role: Role::Manager, ..cashier() };
        let v = void_receipt_tx(&tx, &mgr, r.id, "Customer returned").unwrap();
        assert_eq!(v.payment_status, "void");
        let stock: f64 = tx.query_row("SELECT stock_qty FROM products WHERE id=1", [], |x| x.get(0)).unwrap();
        assert_eq!(stock, 10.0);
        assert!(void_receipt_tx(&tx, &mgr, r.id, "again").is_err());
    }

    #[test]
    fn email_validation() {
        assert!(valid_email("ada@example.com"));
        assert!(!valid_email("ada@example"));
        assert!(!valid_email("a da@example.com"));
    }
}
