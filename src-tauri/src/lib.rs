//! eStock Manager backend: offline-first inventory, sales and receipts for any
//! business, with role-based staff accounts. All data lives in one local
//! SQLite database; the UI talks to it only through the commands below.

mod auth;
mod backup;
mod db;
mod email;
mod expenses;
mod flocks;
mod inventory;
mod license;
mod purchases;
mod recovery;
mod reports;
mod sales;
mod settings;
mod shifts;
mod templates;

use rusqlite::Connection;
use std::{collections::HashMap, sync::{Mutex, MutexGuard}, time::Instant};
use tauri::Manager;

pub struct AppState {
    conn: Mutex<Connection>,
    pub sessions: Mutex<HashMap<String, auth::Session>>,
    pub login_failures: Mutex<HashMap<String, (u32, Instant)>>,
    pub recovery_failures: Mutex<(u32, Instant)>,
    pub license: Mutex<Option<license::LicenseState>>,
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
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init());
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }
    builder
        .setup(|app| {
            let path = db::db_path(app.handle()).map_err(std::io::Error::other)?;
            let conn = db::open(&path).map_err(std::io::Error::other)?;
            let lic = license::compute(app.handle(), &conn);
            app.manage(AppState {
                conn: Mutex::new(conn),
                sessions: Mutex::new(HashMap::new()),
                login_failures: Mutex::new(HashMap::new()),
                recovery_failures: Mutex::new((0, Instant::now())),
                license: Mutex::new(Some(lic)),
            });
            backup::start_auto(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // public
            auth::setup_status, auth::setup_owner, auth::login, settings::branding, templates::list_templates,
            recovery::recovery_options, recovery::recover_account,
            license::license_status, license::activate_license,
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
            inventory::list_batches, inventory::get_recipe, inventory::save_recipe, inventory::generate_barcodes,
            // sales
            sales::create_receipt, sales::list_receipts, sales::get_receipt, sales::record_payment, sales::void_receipt, sales::update_fulfilment,
            sales::create_return, sales::hold_sale, sales::list_held_sales, sales::delete_held_sale,
            sales::list_customers, sales::save_customer, sales::delete_customer, sales::customer_statement,
            // shifts & expenses
            shifts::current_shift, shifts::open_shift, shifts::close_shift, shifts::list_shifts, shifts::shift_report,
            expenses::list_expenses, expenses::save_expense, expenses::delete_expense,
            // suppliers & purchases
            purchases::list_suppliers, purchases::save_supplier, purchases::delete_supplier,
            purchases::create_purchase, purchases::list_purchases, purchases::get_purchase, purchases::record_supplier_payment,
            // broiler flocks
            flocks::list_flocks, flocks::get_flock, flocks::save_flock, flocks::close_flock, flocks::add_flock_entry, flocks::delete_flock_entry, flocks::delete_flock,
            // reports, files & backups
            reports::dashboard, reports::sales_report, reports::save_export,
            backup::backup_status, backup::save_backup_settings, backup::backup_now,
            // email
            email::send_receipt_email, email::send_test_email,
            // printing
            print_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running eStock Manager");
}
