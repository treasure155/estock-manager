//! Items, categories, payment methods and stock movements.

use crate::{auth::{self, Role}, db, AppState};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

pub const KINDS: [&str; 3] = ["product", "service", "material"];

#[derive(Serialize, Clone)]
pub struct Product {
    id: i64,
    sku: String,
    barcode: String,
    name: String,
    category_id: Option<i64>,
    category_name: String,
    kind: String,
    unit: String,
    selling_price_kobo: i64,
    /// Hidden (0) for cashiers.
    cost_price_kobo: i64,
    track_stock: bool,
    stock_qty: f64,
    reorder_level: f64,
    description: String,
    active: bool,
}

#[tauri::command]
pub fn list_products(state: tauri::State<'_, AppState>, session_token: String, include_inactive: Option<bool>) -> Result<Vec<Product>, String> {
    let me = auth::require(&state, &session_token, Role::Cashier)?;
    let conn = state.db()?;
    let mut stmt = conn
        .prepare(
            "SELECT p.id,p.sku,p.barcode,p.name,p.category_id,COALESCE(c.name,''),p.kind,p.unit,p.selling_price_kobo,p.cost_price_kobo,
                    p.track_stock,p.stock_qty,p.reorder_level,p.description,p.active
             FROM products p LEFT JOIN categories c ON c.id=p.category_id
             WHERE (?1=1 OR p.active=1)
             ORDER BY COALESCE(c.sort_order,9999), c.name COLLATE NOCASE, p.name COLLATE NOCASE",
        )
        .map_err(|e| e.to_string())?;
    let show_cost = me.role >= Role::Manager;
    let rows = stmt
        .query_map([include_inactive.unwrap_or(false) && show_cost], |r| {
            Ok(Product {
                id: r.get(0)?, sku: r.get(1)?, barcode: r.get(2)?, name: r.get(3)?, category_id: r.get(4)?, category_name: r.get(5)?,
                kind: r.get(6)?, unit: r.get(7)?, selling_price_kobo: r.get(8)?, cost_price_kobo: if show_cost { r.get(9)? } else { 0 },
                track_stock: r.get::<_, i64>(10)? == 1, stock_qty: r.get(11)?, reorder_level: r.get(12)?, description: r.get(13)?, active: r.get::<_, i64>(14)? == 1,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[derive(Deserialize)]
pub struct ProductInput {
    id: Option<i64>,
    sku: String,
    barcode: String,
    name: String,
    category_id: Option<i64>,
    kind: String,
    unit: String,
    selling_price_kobo: i64,
    cost_price_kobo: i64,
    track_stock: bool,
    /// Opening stock for new items only; use stock adjustments afterwards.
    stock_qty: f64,
    reorder_level: f64,
    description: String,
    active: bool,
}

pub fn save_product_tx(conn: &Connection, input: &ProductInput, user: &str) -> Result<i64, String> {
    let sku = input.sku.trim();
    let name = input.name.trim();
    let unit = input.unit.trim();
    let barcode = input.barcode.trim();
    if sku.is_empty() || name.is_empty() || unit.is_empty() {
        return Err("Code (SKU), name and unit are required".into());
    }
    if sku.len() > 40 || name.chars().count() > 120 || unit.chars().count() > 24 || barcode.len() > 64 || input.description.chars().count() > 500 {
        return Err("One of the fields is too long".into());
    }
    if !KINDS.contains(&input.kind.as_str()) {
        return Err("Type must be product, service or material".into());
    }
    if input.selling_price_kobo < 0 || input.cost_price_kobo < 0 || !input.stock_qty.is_finite() || !input.reorder_level.is_finite() || input.stock_qty < 0.0 || input.reorder_level < 0.0 {
        return Err("Prices and stock values must be zero or more".into());
    }
    if input.kind != "material" && input.selling_price_kobo == 0 {
        return Err("Set a selling price for items you sell".into());
    }
    // Services never carry stock.
    let track = input.track_stock && input.kind != "service";
    if let Some(cid) = input.category_id {
        let ok: Option<i64> = conn.query_row("SELECT id FROM categories WHERE id=?1", [cid], |r| r.get(0)).optional().map_err(|e| e.to_string())?;
        if ok.is_none() { return Err("Selected category no longer exists".into()); }
    }
    let map_unique = |e: rusqlite::Error| {
        let s = e.to_string();
        if s.contains("products.sku") { "Another item already uses that code (SKU)".to_string() }
        else if s.contains("barcode") { "Another item already uses that barcode".to_string() }
        else { s }
    };
    match input.id {
        Some(id) => {
            conn.execute(
                "UPDATE products SET sku=?1,barcode=?2,name=?3,category_id=?4,kind=?5,unit=?6,selling_price_kobo=?7,cost_price_kobo=?8,
                 track_stock=?9,reorder_level=?10,description=?11,active=?12,updated_at=CURRENT_TIMESTAMP WHERE id=?13",
                params![sku, barcode, name, input.category_id, input.kind, unit, input.selling_price_kobo, input.cost_price_kobo, track as i64, input.reorder_level, input.description.trim(), input.active as i64, id],
            )
            .map_err(map_unique)?;
            Ok(id)
        }
        None => {
            let opening = if track { input.stock_qty } else { 0.0 };
            conn.execute(
                "INSERT INTO products(sku,barcode,name,category_id,kind,unit,selling_price_kobo,cost_price_kobo,track_stock,stock_qty,reorder_level,description,active)
                 VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
                params![sku, barcode, name, input.category_id, input.kind, unit, input.selling_price_kobo, input.cost_price_kobo, track as i64, opening, input.reorder_level, input.description.trim(), input.active as i64],
            )
            .map_err(map_unique)?;
            let id = conn.last_insert_rowid();
            if opening > 0.0 {
                conn.execute(
                    "INSERT INTO stock_movements(product_id,movement_type,quantity_delta,unit_cost_kobo,note,user_name) VALUES(?1,'opening',?2,?3,'Opening stock',?4)",
                    params![id, opening, input.cost_price_kobo, user],
                )
                .map_err(|e| e.to_string())?;
            }
            Ok(id)
        }
    }
}

#[tauri::command]
pub fn save_product(state: tauri::State<'_, AppState>, session_token: String, input: ProductInput) -> Result<i64, String> {
    let me = auth::require(&state, &session_token, Role::Manager)?;
    let mut conn = state.db()?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let id = save_product_tx(&tx, &input, &me.display_name())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(id)
}

/// Deletes an item that has never been sold; otherwise archives it so receipt
/// history stays intact.
#[tauri::command]
pub fn remove_product(state: tauri::State<'_, AppState>, session_token: String, product_id: i64) -> Result<String, String> {
    auth::require(&state, &session_token, Role::Manager)?;
    let conn = state.db()?;
    let sold: i64 = conn.query_row("SELECT COUNT(*) FROM receipt_items WHERE product_id=?1", [product_id], |r| r.get(0)).map_err(|e| e.to_string())?;
    if sold > 0 {
        conn.execute("UPDATE products SET active=0,updated_at=CURRENT_TIMESTAMP WHERE id=?1", [product_id]).map_err(|e| e.to_string())?;
        Ok("archived".into())
    } else {
        conn.execute("DELETE FROM products WHERE id=?1", [product_id]).map_err(|e| e.to_string())?;
        Ok("deleted".into())
    }
}

#[derive(Deserialize)]
pub struct StockAdjustInput {
    product_id: i64,
    /// stock_in | stock_out | count
    mode: String,
    quantity: f64,
    unit_cost_kobo: Option<i64>,
    note: String,
}

pub fn adjust_stock_tx(conn: &Connection, input: &StockAdjustInput, user: &str, allow_negative: bool) -> Result<f64, String> {
    if !input.quantity.is_finite() || input.quantity < 0.0 || (input.mode != "count" && input.quantity == 0.0) {
        return Err("Enter a quantity greater than zero".into());
    }
    let row: Option<(String, i64, f64, i64)> = conn
        .query_row("SELECT name,track_stock,stock_qty,cost_price_kobo FROM products WHERE id=?1 AND active=1", [input.product_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)))
        .optional()
        .map_err(|e| e.to_string())?;
    let (name, track, current, cost) = row.ok_or("Item was not found or is archived")?;
    if track == 0 {
        return Err(format!("{name} does not track stock"));
    }
    let note = input.note.trim();
    if note.chars().count() > 200 { return Err("Note is too long".into()); }
    let (movement, delta) = match input.mode.as_str() {
        "stock_in" => ("stock_in", input.quantity),
        "stock_out" => {
            if note.is_empty() { return Err("Give a reason for removing stock (e.g. damaged, expired, mortality)".into()); }
            ("stock_out", -input.quantity)
        }
        "count" => ("adjustment", input.quantity - current),
        _ => return Err("Unknown stock action".into()),
    };
    if delta.abs() < 1e-9 { return Ok(current); }
    let new_qty = current + delta;
    if new_qty < -1e-9 && !allow_negative {
        return Err(format!("Only {} in stock for {name}", db::format_qty(current)));
    }
    let unit_cost = input.unit_cost_kobo.unwrap_or(0).max(0);
    if movement == "stock_in" && unit_cost > 0 {
        // Weighted average cost keeps profit reports honest when buying prices change.
        let base = current.max(0.0);
        let avg = if base + input.quantity > 0.0 { ((base * cost as f64) + (input.quantity * unit_cost as f64)) / (base + input.quantity) } else { unit_cost as f64 };
        conn.execute("UPDATE products SET cost_price_kobo=?1 WHERE id=?2", params![avg.round() as i64, input.product_id]).map_err(|e| e.to_string())?;
    }
    conn.execute("UPDATE products SET stock_qty=?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2", params![new_qty, input.product_id]).map_err(|e| e.to_string())?;
    let note = if note.is_empty() && movement == "adjustment" { "Stock count".to_string() } else { note.to_string() };
    conn.execute(
        "INSERT INTO stock_movements(product_id,movement_type,quantity_delta,unit_cost_kobo,note,user_name) VALUES(?1,?2,?3,?4,?5,?6)",
        params![input.product_id, movement, delta, if unit_cost > 0 { unit_cost } else { cost }, note, user],
    )
    .map_err(|e| e.to_string())?;
    Ok(new_qty)
}

#[tauri::command]
pub fn adjust_stock(state: tauri::State<'_, AppState>, session_token: String, input: StockAdjustInput) -> Result<f64, String> {
    let me = auth::require(&state, &session_token, Role::Manager)?;
    let mut conn = state.db()?;
    let allow_negative = db::setting_bool(&conn, "allow_negative_stock")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let q = adjust_stock_tx(&tx, &input, &me.display_name(), allow_negative)?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(q)
}

#[derive(Serialize)]
pub struct Movement {
    id: i64,
    product_id: i64,
    product_name: String,
    unit: String,
    movement_type: String,
    quantity_delta: f64,
    unit_cost_kobo: i64,
    note: String,
    receipt_no: String,
    user_name: String,
    created_at: String,
}

#[tauri::command]
pub fn list_movements(state: tauri::State<'_, AppState>, session_token: String, product_id: Option<i64>, from: Option<String>, to: Option<String>) -> Result<Vec<Movement>, String> {
    auth::require(&state, &session_token, Role::Manager)?;
    let conn = state.db()?;
    let mut stmt = conn
        .prepare(
            "SELECT m.id,m.product_id,p.name,p.unit,m.movement_type,m.quantity_delta,m.unit_cost_kobo,m.note,COALESCE(r.receipt_no,''),m.user_name,datetime(m.created_at,'localtime')
             FROM stock_movements m JOIN products p ON p.id=m.product_id LEFT JOIN receipts r ON r.id=m.receipt_id
             WHERE (?1 IS NULL OR m.product_id=?1)
               AND (?2 IS NULL OR date(m.created_at,'localtime')>=?2)
               AND (?3 IS NULL OR date(m.created_at,'localtime')<=?3)
             ORDER BY m.id DESC LIMIT 1000",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![product_id, from.filter(|s| !s.is_empty()), to.filter(|s| !s.is_empty())], |r| {
            Ok(Movement { id: r.get(0)?, product_id: r.get(1)?, product_name: r.get(2)?, unit: r.get(3)?, movement_type: r.get(4)?, quantity_delta: r.get(5)?, unit_cost_kobo: r.get(6)?, note: r.get(7)?, receipt_no: r.get(8)?, user_name: r.get(9)?, created_at: r.get(10)? })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ------------------------------------------------------------------ categories

#[derive(Serialize)]
pub struct Category {
    id: i64,
    name: String,
    sort_order: i64,
    item_count: i64,
}

#[tauri::command]
pub fn list_categories(state: tauri::State<'_, AppState>, session_token: String) -> Result<Vec<Category>, String> {
    auth::require(&state, &session_token, Role::Cashier)?;
    let conn = state.db()?;
    let mut stmt = conn
        .prepare("SELECT c.id,c.name,c.sort_order,(SELECT COUNT(*) FROM products p WHERE p.category_id=c.id AND p.active=1) FROM categories c WHERE c.active=1 ORDER BY c.sort_order, c.name COLLATE NOCASE")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |r| Ok(Category { id: r.get(0)?, name: r.get(1)?, sort_order: r.get(2)?, item_count: r.get(3)? })).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_category(state: tauri::State<'_, AppState>, session_token: String, id: Option<i64>, name: String, sort_order: i64) -> Result<i64, String> {
    auth::require(&state, &session_token, Role::Manager)?;
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 60 { return Err("Category name must be 1 to 60 characters".into()); }
    let conn = state.db()?;
    let map = |e: rusqlite::Error| if e.to_string().contains("UNIQUE") { "A category with that name already exists".to_string() } else { e.to_string() };
    match id {
        Some(id) => { conn.execute("UPDATE categories SET name=?1,sort_order=?2,active=1 WHERE id=?3", params![name, sort_order, id]).map_err(map)?; Ok(id) }
        None => { conn.execute("INSERT INTO categories(name,sort_order) VALUES(?1,?2)", params![name, sort_order]).map_err(map)?; Ok(conn.last_insert_rowid()) }
    }
}

#[tauri::command]
pub fn delete_category(state: tauri::State<'_, AppState>, session_token: String, id: i64) -> Result<(), String> {
    auth::require(&state, &session_token, Role::Manager)?;
    let conn = state.db()?;
    // Items keep existing; they simply become uncategorised.
    conn.execute("UPDATE products SET category_id=NULL WHERE category_id=?1", [id]).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM categories WHERE id=?1", [id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ------------------------------------------------------------------ payment methods

#[derive(Serialize)]
pub struct PaymentMethod {
    id: i64,
    name: String,
    active: bool,
    sort_order: i64,
}

#[tauri::command]
pub fn list_payment_methods(state: tauri::State<'_, AppState>, session_token: String) -> Result<Vec<PaymentMethod>, String> {
    auth::require(&state, &session_token, Role::Cashier)?;
    let conn = state.db()?;
    let mut stmt = conn.prepare("SELECT id,name,active,sort_order FROM payment_methods ORDER BY sort_order,name").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |r| Ok(PaymentMethod { id: r.get(0)?, name: r.get(1)?, active: r.get::<_, i64>(2)? == 1, sort_order: r.get(3)? })).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_payment_method(state: tauri::State<'_, AppState>, session_token: String, id: Option<i64>, name: String, active: bool, sort_order: i64) -> Result<i64, String> {
    auth::require(&state, &session_token, Role::Owner)?;
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 40 { return Err("Payment method name must be 1 to 40 characters".into()); }
    let conn = state.db()?;
    if !active {
        let others: i64 = conn.query_row("SELECT COUNT(*) FROM payment_methods WHERE active=1 AND id<>?1", [id.unwrap_or(0)], |r| r.get(0)).map_err(|e| e.to_string())?;
        if others == 0 { return Err("Keep at least one payment method active".into()); }
    }
    let map = |e: rusqlite::Error| if e.to_string().contains("UNIQUE") { "That payment method already exists".to_string() } else { e.to_string() };
    match id {
        Some(id) => { conn.execute("UPDATE payment_methods SET name=?1,active=?2,sort_order=?3 WHERE id=?4", params![name, active as i64, sort_order, id]).map_err(map)?; Ok(id) }
        None => { conn.execute("INSERT INTO payment_methods(name,active,sort_order) VALUES(?1,?2,?3)", params![name, active as i64, sort_order]).map_err(map)?; Ok(conn.last_insert_rowid()) }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(kind: &str, stock: f64) -> ProductInput {
        ProductInput { id: None, sku: format!("T-{kind}"), barcode: String::new(), name: "Test".into(), category_id: None, kind: kind.into(), unit: "piece".into(),
            selling_price_kobo: 1000, cost_price_kobo: 600, track_stock: true, stock_qty: stock, reorder_level: 1.0, description: String::new(), active: true }
    }

    #[test]
    fn stock_in_uses_weighted_average_cost_and_out_needs_reason() {
        let conn = db::test_conn();
        let id = save_product_tx(&conn, &item("product", 10.0), "t").unwrap();
        adjust_stock_tx(&conn, &StockAdjustInput { product_id: id, mode: "stock_in".into(), quantity: 10.0, unit_cost_kobo: Some(800), note: String::new() }, "t", false).unwrap();
        let cost: i64 = conn.query_row("SELECT cost_price_kobo FROM products WHERE id=?1", [id], |r| r.get(0)).unwrap();
        assert_eq!(cost, 700);
        assert!(adjust_stock_tx(&conn, &StockAdjustInput { product_id: id, mode: "stock_out".into(), quantity: 1.0, unit_cost_kobo: None, note: String::new() }, "t", false).is_err());
        assert!(adjust_stock_tx(&conn, &StockAdjustInput { product_id: id, mode: "stock_out".into(), quantity: 50.0, unit_cost_kobo: None, note: "damaged".into() }, "t", false).is_err());
        let q = adjust_stock_tx(&conn, &StockAdjustInput { product_id: id, mode: "count".into(), quantity: 7.0, unit_cost_kobo: None, note: String::new() }, "t", false).unwrap();
        assert_eq!(q, 7.0);
    }

    #[test]
    fn services_never_track_stock() {
        let conn = db::test_conn();
        let id = save_product_tx(&conn, &item("service", 5.0), "t").unwrap();
        let (track, qty): (i64, f64) = conn.query_row("SELECT track_stock,stock_qty FROM products WHERE id=?1", [id], |r| Ok((r.get(0)?, r.get(1)?))).unwrap();
        assert_eq!((track, qty), (0, 0.0));
    }
}
