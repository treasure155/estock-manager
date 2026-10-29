//! Automatic and manual database backups.
//!
//! A background thread makes one backup a day (checked every 30 minutes) into
//! the backup folder (default: Documents/eStock Backups), keeping the newest
//! N files. The owner can change the folder (e.g. a flash drive or a synced
//! Google Drive folder), the number kept, or switch automatic backups off.

use crate::{auth::{self, Role}, db, AppState};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::{fs, path::{Path, PathBuf}, time::Duration};
use tauri::Manager;

const PREFIX: &str = "estock-backup-";
const AUTO_INTERVAL_HOURS: i64 = 20;

pub fn default_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path().document_dir().or_else(|_| app.path().home_dir()).unwrap_or_else(|_| std::env::temp_dir()).join("eStock Backups")
}

fn effective_dir(app: &tauri::AppHandle, conn: &Connection) -> PathBuf {
    let custom = db::setting(conn, "backup_dir").unwrap_or_default();
    if custom.trim().is_empty() { default_dir(app) } else { PathBuf::from(custom.trim()) }
}

/// Copies the live database into `dir` using SQLite's online backup API, then
/// removes the oldest backups beyond `keep`.
pub fn backup_to(conn: &Connection, dir: &Path, keep: usize) -> Result<PathBuf, String> {
    fs::create_dir_all(dir).map_err(|e| format!("Could not open the backup folder {}: {e}", dir.display()))?;
    let path = dir.join(format!("{PREFIX}{}.sqlite3", chrono::Local::now().format("%Y%m%d-%H%M%S")));
    let mut dest = Connection::open(&path).map_err(|e| format!("Could not create the backup file: {e}"))?;
    let backup = rusqlite::backup::Backup::new(conn, &mut dest).map_err(|e| e.to_string())?;
    backup.run_to_completion(512, Duration::from_millis(0), None).map_err(|e| format!("Backup failed: {e}"))?;
    drop(backup);
    drop(dest);
    prune(dir, keep);
    Ok(path)
}

fn list_files(dir: &Path) -> Vec<(String, u64, String)> {
    let mut files: Vec<(String, u64, String)> = fs::read_dir(dir)
        .map(|rd| rd.flatten().filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            if !name.starts_with(PREFIX) || !name.ends_with(".sqlite3") { return None; }
            let meta = e.metadata().ok()?;
            let modified = meta.modified().ok().map(|t| chrono::DateTime::<chrono::Local>::from(t).format("%Y-%m-%d %H:%M:%S").to_string()).unwrap_or_default();
            Some((name, meta.len(), modified))
        }).collect())
        .unwrap_or_default();
    files.sort_by(|a, b| b.0.cmp(&a.0));
    files
}

fn prune(dir: &Path, keep: usize) {
    for (name, _, _) in list_files(dir).into_iter().skip(keep.max(1)) {
        let _ = fs::remove_file(dir.join(name));
    }
}

fn keep_count(conn: &Connection) -> usize {
    db::setting(conn, "backup_keep").ok().and_then(|v| v.parse::<usize>().ok()).unwrap_or(14).clamp(1, 365)
}

/// Starts the once-a-day automatic backup worker.
pub fn start_auto(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(20));
        loop {
            let _ = run_auto_if_due(&app);
            std::thread::sleep(Duration::from_secs(30 * 60));
        }
    });
}

fn run_auto_if_due(app: &tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let conn = state.db()?;
    if db::setting(&conn, "auto_backup")? != "1" { return Ok(()); }
    let last = db::setting(&conn, "last_auto_backup")?;
    let due = chrono::NaiveDateTime::parse_from_str(&last, "%Y-%m-%d %H:%M:%S")
        .map(|t| chrono::Local::now().naive_local() - t >= chrono::Duration::hours(AUTO_INTERVAL_HOURS))
        .unwrap_or(true);
    if !due { return Ok(()); }
    let dir = effective_dir(app, &conn);
    match backup_to(&conn, &dir, keep_count(&conn)) {
        Ok(_) => { db::set_setting(&conn, "last_auto_backup", &db::now_local())?; db::set_setting(&conn, "last_backup_error", "")?; }
        Err(e) => { db::set_setting(&conn, "last_backup_error", &e)?; }
    }
    Ok(())
}

// ------------------------------------------------------------------ commands (owner)

#[derive(Serialize)]
pub struct BackupFile { name: String, size: u64, modified: String }

#[derive(Serialize)]
pub struct BackupStatus { auto: bool, dir: String, default_dir: String, keep: usize, last_auto: String, last_error: String, files: Vec<BackupFile> }

#[tauri::command]
pub fn backup_status(app: tauri::AppHandle, state: tauri::State<'_, AppState>, session_token: String) -> Result<BackupStatus, String> {
    auth::require(&state, &session_token, Role::Owner)?;
    let conn = state.db()?;
    let dir = effective_dir(&app, &conn);
    Ok(BackupStatus {
        auto: db::setting(&conn, "auto_backup")? == "1", dir: dir.display().to_string(), default_dir: default_dir(&app).display().to_string(),
        keep: keep_count(&conn), last_auto: db::setting(&conn, "last_auto_backup")?, last_error: db::setting(&conn, "last_backup_error")?,
        files: list_files(&dir).into_iter().take(60).map(|(name, size, modified)| BackupFile { name, size, modified }).collect(),
    })
}

#[derive(Deserialize)]
pub struct BackupSettingsInput { auto: bool, dir: String, keep: usize }

#[tauri::command]
pub fn save_backup_settings(state: tauri::State<'_, AppState>, session_token: String, input: BackupSettingsInput) -> Result<(), String> {
    auth::require(&state, &session_token, Role::Owner)?;
    if !(1..=365).contains(&input.keep) { return Err("Keep between 1 and 365 backups".into()); }
    let dir = input.dir.trim();
    if dir.len() > 1000 { return Err("Folder path is too long".into()); }
    if !dir.is_empty() {
        let p = Path::new(dir);
        if !p.is_absolute() { return Err("Choose a full folder path".into()); }
        fs::create_dir_all(p).map_err(|e| format!("Cannot use that folder: {e}"))?;
        let probe = p.join(".estock-write-test");
        fs::write(&probe, b"ok").map_err(|e| format!("eStock Manager cannot write to that folder: {e}"))?;
        let _ = fs::remove_file(probe);
    }
    let conn = state.db()?;
    db::set_setting(&conn, "auto_backup", if input.auto { "1" } else { "0" })?;
    db::set_setting(&conn, "backup_dir", dir)?;
    db::set_setting(&conn, "backup_keep", &input.keep.to_string())
}

#[tauri::command]
pub fn backup_now(app: tauri::AppHandle, state: tauri::State<'_, AppState>, session_token: String) -> Result<String, String> {
    auth::require(&state, &session_token, Role::Owner)?;
    let conn = state.db()?;
    let dir = effective_dir(&app, &conn);
    let path = backup_to(&conn, &dir, keep_count(&conn))?;
    db::set_setting(&conn, "last_auto_backup", &db::now_local())?;
    db::set_setting(&conn, "last_backup_error", "")?;
    Ok(path.display().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn backups_are_made_and_pruned() {
        let conn = db::test_conn();
        let dir = std::env::temp_dir().join(format!("estock-test-{}", uuid::Uuid::new_v4()));
        for i in 0..4 {
            let p = backup_to(&conn, &dir, 2).unwrap();
            assert!(p.exists());
            // File names carry the time to the second; rename so each run is distinct.
            let renamed = dir.join(format!("{PREFIX}2000010{i}-000000.sqlite3"));
            fs::rename(&p, &renamed).unwrap();
        }
        prune(&dir, 2);
        assert_eq!(list_files(&dir).len(), 2);
        let _ = fs::remove_dir_all(dir);
    }
}
