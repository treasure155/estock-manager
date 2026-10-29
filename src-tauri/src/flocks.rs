//! Broiler flock (batch) tracking: daily mortality, feed and weight logs,
//! costs, bird sales and the key numbers a farmer watches: birds alive,
//! mortality %, feed conversion ratio (FCR), cost per bird and profit.

use crate::{auth::{self, Role}, AppState};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

fn valid_date(d: &str) -> bool { chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").is_ok() }
fn today() -> chrono::NaiveDate { chrono::Local::now().date_naive() }

#[derive(Serialize, Default)]
pub struct FlockSummary {
    id: i64, code: String, breed: String, house: String, placed_date: String, chicks_placed: i64, chick_cost_kobo: i64, status: String, closed_date: String, notes: String,
    age_days: i64, dead: i64, culled: i64, sold: i64, alive: i64, mortality_pct: f64,
    feed_kg: f64, latest_weight_kg: f64, sold_weight_kg: f64, fcr: f64,
    costs_kobo: i64, revenue_kobo: i64, profit_kobo: i64, cost_per_bird_kobo: i64, cost_per_kg_kobo: i64,
}

fn summary(conn: &Connection, id: i64) -> Result<FlockSummary, String> {
    let mut f = conn.query_row("SELECT id,code,breed,house,placed_date,chicks_placed,chick_cost_kobo,status,closed_date,notes FROM flocks WHERE id=?1", [id], |r| Ok(FlockSummary {
        id: r.get(0)?, code: r.get(1)?, breed: r.get(2)?, house: r.get(3)?, placed_date: r.get(4)?, chicks_placed: r.get(5)?, chick_cost_kobo: r.get(6)?, status: r.get(7)?, closed_date: r.get(8)?, notes: r.get(9)?, ..Default::default()
    })).optional().map_err(|e| e.to_string())?.ok_or("Flock not found")?;
    let (dead, culled, feed): (i64, i64, f64) = conn.query_row("SELECT COALESCE(SUM(mortality),0),COALESCE(SUM(culls),0),COALESCE(SUM(feed_kg),0) FROM flock_logs WHERE flock_id=?1", [id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).map_err(|e| e.to_string())?;
    let latest_weight: f64 = conn.query_row("SELECT avg_weight_kg FROM flock_logs WHERE flock_id=?1 AND avg_weight_kg>0 ORDER BY log_date DESC, id DESC LIMIT 1", [id], |r| r.get(0)).optional().map_err(|e| e.to_string())?.unwrap_or(0.0);
    let (sold, sold_kg, revenue): (i64, f64, i64) = conn.query_row("SELECT COALESCE(SUM(birds),0),COALESCE(SUM(live_weight_kg),0),COALESCE(SUM(amount_kobo),0) FROM flock_sales WHERE flock_id=?1", [id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).map_err(|e| e.to_string())?;
    let other_costs: i64 = conn.query_row("SELECT COALESCE(SUM(amount_kobo),0) FROM flock_costs WHERE flock_id=?1", [id], |r| r.get(0)).map_err(|e| e.to_string())?;
    let end = if f.status == "closed" && valid_date(&f.closed_date) { chrono::NaiveDate::parse_from_str(&f.closed_date, "%Y-%m-%d").unwrap() } else { today() };
    f.age_days = chrono::NaiveDate::parse_from_str(&f.placed_date, "%Y-%m-%d").map(|d| (end - d).num_days().max(0)).unwrap_or(0);
    f.dead = dead;
    f.culled = culled;
    f.sold = sold;
    f.alive = (f.chicks_placed - dead - culled - sold).max(0);
    f.mortality_pct = if f.chicks_placed > 0 { (dead as f64) * 100.0 / (f.chicks_placed as f64) } else { 0.0 };
    f.feed_kg = feed;
    f.latest_weight_kg = latest_weight;
    f.sold_weight_kg = sold_kg;
    // FCR = feed eaten ÷ live weight produced (sold weight + current birds × latest average weight).
    let produced = sold_kg + (f.alive as f64) * latest_weight;
    f.fcr = if produced > 0.0 { feed / produced } else { 0.0 };
    f.costs_kobo = f.chick_cost_kobo + other_costs;
    f.revenue_kobo = revenue;
    f.profit_kobo = revenue - f.costs_kobo;
    let birds_out = (sold + f.alive).max(1);
    f.cost_per_bird_kobo = f.costs_kobo / birds_out;
    f.cost_per_kg_kobo = if produced > 0.0 { ((f.costs_kobo as f64) / produced).round() as i64 } else { 0 };
    Ok(f)
}

#[tauri::command]
pub fn list_flocks(state: tauri::State<'_, AppState>, session_token: String, include_closed: Option<bool>) -> Result<Vec<FlockSummary>, String> {
    auth::require(&state, &session_token, Role::Cashier)?;
    let conn = state.db()?;
    let mut stmt = conn.prepare("SELECT id FROM flocks WHERE ?1=1 OR status='active' ORDER BY status, placed_date DESC, id DESC LIMIT 300").map_err(|e| e.to_string())?;
    let ids: Vec<i64> = stmt.query_map([include_closed.unwrap_or(false) as i64], |r| r.get(0)).map_err(|e| e.to_string())?.collect::<Result<_, _>>().map_err(|e| e.to_string())?;
    ids.into_iter().map(|id| summary(&conn, id)).collect()
}

#[derive(Serialize)]
pub struct FlockEntry { id: i64, kind: String, date: String, description: String, quantity: f64, amount_kobo: i64, mortality: i64, culls: i64, feed_kg: f64, avg_weight_kg: f64, user_name: String }

#[derive(Serialize)]
pub struct FlockDetail { flock: FlockSummary, entries: Vec<FlockEntry> }

#[tauri::command]
pub fn get_flock(state: tauri::State<'_, AppState>, session_token: String, id: i64) -> Result<FlockDetail, String> {
    auth::require(&state, &session_token, Role::Cashier)?;
    let conn = state.db()?;
    let flock = summary(&conn, id)?;
    let sql = "
        SELECT id,'log',log_date,notes,0,0,mortality,culls,feed_kg,avg_weight_kg,user_name FROM flock_logs WHERE flock_id=?1
        UNION ALL SELECT id,'cost',cost_date,category||CASE WHEN description<>'' THEN ': '||description ELSE '' END,quantity,amount_kobo,0,0,0,0,user_name FROM flock_costs WHERE flock_id=?1
        UNION ALL SELECT id,'sale',sale_date,'Sold '||birds||' birds'||CASE WHEN buyer<>'' THEN ' to '||buyer ELSE '' END,live_weight_kg,amount_kobo,0,0,0,0,user_name FROM flock_sales WHERE flock_id=?1
        ORDER BY 3 DESC, 1 DESC";
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let entries = stmt.query_map([id], |r| Ok(FlockEntry { id: r.get(0)?, kind: r.get(1)?, date: r.get(2)?, description: r.get(3)?, quantity: r.get(4)?, amount_kobo: r.get(5)?, mortality: r.get(6)?, culls: r.get(7)?, feed_kg: r.get(8)?, avg_weight_kg: r.get(9)?, user_name: r.get(10)? }))
        .map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(FlockDetail { flock, entries })
}

#[derive(Deserialize)]
pub struct FlockInput { id: Option<i64>, code: String, breed: String, house: String, placed_date: String, chicks_placed: i64, chick_cost_kobo: i64, notes: String }

#[tauri::command]
pub fn save_flock(state: tauri::State<'_, AppState>, session_token: String, input: FlockInput) -> Result<i64, String> {
    auth::require(&state, &session_token, Role::Manager)?;
    let code = input.code.trim();
    if code.is_empty() || code.chars().count() > 40 { return Err("Give the flock a short code, such as B-2026-07".into()); }
    if !valid_date(&input.placed_date) { return Err("Choose the date the chicks were placed".into()); }
    if !(1..=10_000_000).contains(&input.chicks_placed) { return Err("Enter how many chicks were placed".into()); }
    if input.chick_cost_kobo < 0 { return Err("Chick cost cannot be negative".into()); }
    if input.breed.chars().count() > 60 || input.house.chars().count() > 60 || input.notes.chars().count() > 500 { return Err("One of the fields is too long".into()); }
    let conn = state.db()?;
    let dup: Option<i64> = conn.query_row("SELECT id FROM flocks WHERE code=?1 AND id<>COALESCE(?2,-1)", params![code, input.id], |r| r.get(0)).optional().map_err(|e| e.to_string())?;
    if dup.is_some() { return Err("Another flock already uses that code".into()); }
    match input.id {
        Some(id) => {
            conn.execute("UPDATE flocks SET code=?1,breed=?2,house=?3,placed_date=?4,chicks_placed=?5,chick_cost_kobo=?6,notes=?7 WHERE id=?8", params![code, input.breed.trim(), input.house.trim(), input.placed_date, input.chicks_placed, input.chick_cost_kobo, input.notes.trim(), id]).map_err(|e| e.to_string())?;
            Ok(id)
        }
        None => {
            conn.execute("INSERT INTO flocks(code,breed,house,placed_date,chicks_placed,chick_cost_kobo,notes) VALUES(?1,?2,?3,?4,?5,?6,?7)", params![code, input.breed.trim(), input.house.trim(), input.placed_date, input.chicks_placed, input.chick_cost_kobo, input.notes.trim()]).map_err(|e| e.to_string())?;
            Ok(conn.last_insert_rowid())
        }
    }
}

#[tauri::command]
pub fn close_flock(state: tauri::State<'_, AppState>, session_token: String, id: i64, closed_date: String, reopen: Option<bool>) -> Result<(), String> {
    auth::require(&state, &session_token, Role::Manager)?;
    let conn = state.db()?;
    let n = if reopen.unwrap_or(false) {
        conn.execute("UPDATE flocks SET status='active',closed_date='' WHERE id=?1", [id])
    } else {
        if !valid_date(&closed_date) { return Err("Choose the closing date".into()); }
        conn.execute("UPDATE flocks SET status='closed',closed_date=?1 WHERE id=?2", params![closed_date, id])
    }.map_err(|e| e.to_string())?;
    if n == 0 { return Err("Flock not found".into()); }
    Ok(())
}

#[derive(Deserialize)]
pub struct FlockEntryInput {
    flock_id: i64,
    /// log | cost | sale
    kind: String,
    date: String,
    #[serde(default)] mortality: i64,
    #[serde(default)] culls: i64,
    #[serde(default)] feed_kg: f64,
    #[serde(default)] avg_weight_kg: f64,
    #[serde(default)] category: String,
    #[serde(default)] description: String,
    /// For costs: take this stock item (e.g. feed, vaccine) out of inventory.
    #[serde(default)] product_id: Option<i64>,
    #[serde(default)] quantity: f64,
    #[serde(default)] amount_kobo: i64,
    #[serde(default)] birds: i64,
    #[serde(default)] live_weight_kg: f64,
    #[serde(default)] buyer: String,
    #[serde(default)] receipt_no: String,
}

#[tauri::command]
pub fn add_flock_entry(state: tauri::State<'_, AppState>, session_token: String, input: FlockEntryInput) -> Result<FlockSummary, String> {
    let me = auth::require(&state, &session_token, Role::Cashier)?;
    if !valid_date(&input.date) { return Err("Choose a valid date".into()); }
    if input.description.chars().count() > 300 || input.buyer.chars().count() > 120 || input.category.chars().count() > 60 || input.receipt_no.chars().count() > 40 { return Err("One of the fields is too long".into()); }
    let nonneg = |v: f64| v.is_finite() && v >= 0.0;
    let mut conn = state.db()?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let flock = summary(&tx, input.flock_id)?;
    if flock.status != "active" { return Err("This flock is closed. Reopen it to add entries.".into()); }
    let who = me.display_name();
    match input.kind.as_str() {
        "log" => {
            if input.mortality < 0 || input.culls < 0 || !nonneg(input.feed_kg) || !nonneg(input.avg_weight_kg) { return Err("Numbers cannot be negative".into()); }
            if input.mortality + input.culls > flock.alive { return Err(format!("Only {} birds are alive in this flock", flock.alive)); }
            if input.mortality == 0 && input.culls == 0 && input.feed_kg == 0.0 && input.avg_weight_kg == 0.0 && input.description.trim().is_empty() { return Err("Enter at least one figure for the day".into()); }
            tx.execute("INSERT INTO flock_logs(flock_id,log_date,mortality,culls,feed_kg,avg_weight_kg,notes,user_name) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
                params![input.flock_id, input.date, input.mortality, input.culls, input.feed_kg, input.avg_weight_kg, input.description.trim(), who]).map_err(|e| e.to_string())?;
        }
        "cost" => {
            if me.role < Role::Manager { return Err("Only managers can record flock costs".into()); }
            let category = input.category.trim();
            if category.is_empty() { return Err("Choose a cost category, such as Feed or Vaccine".into()); }
            let mut amount = input.amount_kobo;
            let mut feed_from_stock = 0.0;
            if let Some(pid) = input.product_id {
                if !(input.quantity.is_finite() && input.quantity > 0.0) { return Err("Enter the quantity taken from stock".into()); }
                let (name, unit, cost, stock, track): (String, String, i64, f64, i64) = tx.query_row("SELECT name,unit,cost_price_kobo,stock_qty,track_stock FROM products WHERE id=?1", [pid], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?))).optional().map_err(|e| e.to_string())?.ok_or("Stock item not found")?;
                if track == 1 && stock + 1e-9 < input.quantity { return Err(format!("Not enough {name} in stock. Available: {} {unit}", crate::db::format_qty(stock))); }
                if amount <= 0 { amount = ((cost as f64) * input.quantity).round() as i64; }
                if track == 1 {
                    tx.execute("UPDATE products SET stock_qty=stock_qty-?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2", params![input.quantity, pid]).map_err(|e| e.to_string())?;
                    tx.execute("INSERT INTO stock_movements(product_id,movement_type,quantity_delta,unit_cost_kobo,note,user_name) VALUES(?1,'flock_issue',?2,?3,?4,?5)", params![pid, -input.quantity, cost, format!("Issued to flock {}", flock.code), who]).map_err(|e| e.to_string())?;
                    crate::inventory::consume_batches(&tx, pid, input.quantity)?;
                }
                // Feed issued in kg counts toward the flock's feed total for FCR.
                if category.eq_ignore_ascii_case("feed") && unit.eq_ignore_ascii_case("kg") { feed_from_stock = input.quantity; }
            }
            if amount < 0 { return Err("Amount cannot be negative".into()); }
            tx.execute("INSERT INTO flock_costs(flock_id,cost_date,category,description,product_id,quantity,amount_kobo,user_name) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
                params![input.flock_id, input.date, category, input.description.trim(), input.product_id, input.quantity.max(0.0), amount, who]).map_err(|e| e.to_string())?;
            if feed_from_stock > 0.0 {
                tx.execute("INSERT INTO flock_logs(flock_id,log_date,feed_kg,notes,user_name) VALUES(?1,?2,?3,'Feed issued from stock',?4)", params![input.flock_id, input.date, feed_from_stock, who]).map_err(|e| e.to_string())?;
            }
        }
        "sale" => {
            if input.birds <= 0 { return Err("Enter how many birds were sold".into()); }
            if input.birds > flock.alive { return Err(format!("Only {} birds are alive in this flock", flock.alive)); }
            if !nonneg(input.live_weight_kg) || input.amount_kobo < 0 { return Err("Numbers cannot be negative".into()); }
            tx.execute("INSERT INTO flock_sales(flock_id,sale_date,birds,live_weight_kg,amount_kobo,buyer,receipt_no,user_name) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
                params![input.flock_id, input.date, input.birds, input.live_weight_kg, input.amount_kobo, input.buyer.trim(), input.receipt_no.trim(), who]).map_err(|e| e.to_string())?;
        }
        _ => return Err("Unknown entry type".into()),
    }
    let s = summary(&tx, input.flock_id)?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command]
pub fn delete_flock_entry(state: tauri::State<'_, AppState>, session_token: String, kind: String, id: i64) -> Result<(), String> {
    auth::require(&state, &session_token, Role::Manager)?;
    let table = match kind.as_str() { "log" => "flock_logs", "cost" => "flock_costs", "sale" => "flock_sales", _ => return Err("Unknown entry type".into()) };
    // Stock issued to a flock is not put back automatically; adjust stock if it was a mistake.
    let n = state.db()?.execute(&format!("DELETE FROM {table} WHERE id=?1"), [id]).map_err(|e| e.to_string())?;
    if n == 0 { return Err("Entry not found".into()); }
    Ok(())
}

#[tauri::command]
pub fn delete_flock(state: tauri::State<'_, AppState>, session_token: String, id: i64) -> Result<(), String> {
    auth::require(&state, &session_token, Role::Owner)?;
    let n = state.db()?.execute("DELETE FROM flocks WHERE id=?1", [id]).map_err(|e| e.to_string())?;
    if n == 0 { return Err("Flock not found".into()); }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn flock_metrics() {
        let conn = crate::db::test_conn();
        conn.execute("INSERT INTO flocks(code,placed_date,chicks_placed,chick_cost_kobo) VALUES('B1','2026-01-01',1000,60000000)", []).unwrap();
        conn.execute("INSERT INTO flock_logs(flock_id,log_date,mortality,feed_kg,avg_weight_kg) VALUES(1,'2026-01-10',30,1500,0.5)", []).unwrap();
        conn.execute("INSERT INTO flock_logs(flock_id,log_date,mortality,feed_kg,avg_weight_kg) VALUES(1,'2026-02-10',20,2500,2.0)", []).unwrap();
        conn.execute("INSERT INTO flock_costs(flock_id,cost_date,category,amount_kobo) VALUES(1,'2026-01-05','Feed',200000000)", []).unwrap();
        conn.execute("INSERT INTO flock_sales(flock_id,sale_date,birds,live_weight_kg,amount_kobo) VALUES(1,'2026-02-12',450,900,450000000)", []).unwrap();
        let f = summary(&conn, 1).unwrap();
        assert_eq!(f.alive, 500);
        assert!((f.mortality_pct - 5.0).abs() < 1e-9);
        // feed 4000 kg ÷ (900 kg sold + 500 × 2.0 kg) = 2.105
        assert!((f.fcr - 4000.0 / 1900.0).abs() < 1e-9);
        assert_eq!(f.costs_kobo, 260000000);
        assert_eq!(f.profit_kobo, 190000000);
    }
}
