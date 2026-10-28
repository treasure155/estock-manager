//! eStock Manager backend: offline-first inventory, sales and receipts for any
//! business, with role-based staff accounts. All data lives in one local
//! SQLite database; the UI talks to it only through the commands below.

mod auth;
mod db;
mod email;
mod inventory;
mod recovery;
mod reports;
mod sales;
mod settings;
mod templates;

use rusqlite::Connection;
use std::{collections::HashMap, sync::{Mutex, MutexGuard}, time::Instant};
use tauri::Manager;

pub struct AppState {
    conn: Mutex<Connection>,
    pub sessions: Mutex<HashMap<String, auth::Session>>,
    pub login_failures: Mutex<HashMap<String, (u32, Instant)>>,
    pub recovery_failures: Mutex<(u32, Instant)>,
}

impl AppState {
    pub fn db(&self) -> Result<MutexGuard<'_, Connection>, String> {
        self.conn.lock().map_err(|_| "Database lock was poisoned. Restart the app.".to_string())
    }
}

/// Opens the operating system print dialog for the current window. Used instead
/// of `window.print()`, which some platform webviews ignore.
#[tauri::command]
fn print_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| format!("Could not open the print dialog: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let path = db::db_path(app.handle()).map_err(std::io::Error::other)?;
            let conn = db::open(&path).map_err(std::io::Error::other)?;
            app.manage(AppState { conn: Mutex::new(conn), sessions: Mutex::new(HashMap::new()), login_failures: Mutex::new(HashMap::new()), recovery_failures: Mutex::new((0, Instant::now())) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // public
            auth::setup_status, auth::setup_owner, auth::login, settings::branding, templates::list_templates,
            recovery::recovery_options, recovery::recover_account,
            // security (owner)
            recovery::security_status, recovery::regenerate_recovery_key, recovery::save_security_questions,
            // account
            auth::logout, auth::change_own_password, auth::list_users, auth::save_user,
            // settings
            settings::get_settings, settings::save_settings, templates::apply_business_template,
            // inventory
            inventory::list_products, inventory::save_product, inventory::remove_product, inventory::adjust_stock, inventory::list_movements,
            inventory::list_categories, inventory::save_category, inventory::delete_category,
            inventory::list_payment_methods, inventory::save_payment_method,
            // sales
            sales::create_receipt, sales::list_receipts, sales::get_receipt, sales::record_payment, sales::void_receipt, sales::update_fulfilment,
            sales::list_customers, sales::save_customer, sales::delete_customer,
            // reports & files
            reports::dashboard, reports::sales_report, reports::save_export, reports::backup_database,
            // email
            email::send_receipt_email, email::send_test_email,
            // printing
            print_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running eStock Manager");
}
