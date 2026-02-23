use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::fs;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

struct WatchState {
  current_path: Option<String>,
  watcher: Option<RecommendedWatcher>,
  last_content: Option<String>,
  last_save_at: Option<Instant>,
  debug: bool,
}

type SharedWatchState = Arc<Mutex<WatchState>>;

fn debug_log(debug: bool, message: &str) {
  if debug {
    eprintln!("[idatz-desktop] {message}");
  }
}

fn build_watcher(app: AppHandle, state: SharedWatchState) -> Result<RecommendedWatcher, String> {
  RecommendedWatcher::new(
    move |res: Result<notify::Event, notify::Error>| {
      if let Ok(event) = res {
        match event.kind {
          EventKind::Modify(_) | EventKind::Create(_) => {
            let (maybe_path, last_content, last_save_at, debug_enabled) = {
              let guard = state.lock();
              match guard {
                Ok(guard) => (
                  guard.current_path.clone(),
                  guard.last_content.clone(),
                  guard.last_save_at,
                  guard.debug,
                ),
                Err(_) => (None, None, None, false),
              }
            };

            if let Some(current_path) = maybe_path {
              if let Ok(mut updated) = fs::read_to_string(&current_path) {
                let recent_save = last_save_at
                  .map(|saved_at| saved_at.elapsed() < Duration::from_millis(400))
                  .unwrap_or(false);

                if let Some(last_content) = last_content.as_deref() {
                  if updated == last_content {
                    debug_log(debug_enabled, "Watcher change ignored (content matches last save)");
                    return;
                  }

                  if recent_save && updated.is_empty() && !last_content.is_empty() {
                    std::thread::sleep(Duration::from_millis(60));
                    if let Ok(retry) = fs::read_to_string(&current_path) {
                      if retry == last_content {
                        debug_log(debug_enabled, "Watcher change ignored after retry (matches last save)");
                        return;
                      }
                      if !retry.is_empty() {
                        updated = retry;
                      }
                    }
                  }
                }

                debug_log(debug_enabled, "Watcher detected external change, emitting file-changed");
                let _ = app.emit("file-changed", serde_json::json!({ "content": updated.clone() }));

                if let Ok(mut guard) = state.lock() {
                  guard.last_content = Some(updated);
                }
              }
            }
          }
          _ => {}
        }
      }
    },
    Config::default(),
  )
  .map_err(|e| format!("Failed to start watcher: {e}"))
}

fn attach_watcher(path: &str, app: AppHandle, state: SharedWatchState, guard: &mut WatchState) -> Result<(), String> {
  debug_log(guard.debug, &format!("Attaching watcher for {path}"));
  guard.watcher = None;
  let mut watcher = build_watcher(app, state.clone())?;
  watcher
    .watch(std::path::Path::new(path), RecursiveMode::NonRecursive)
    .map_err(|e| format!("Failed to watch file: {e}"))?;
  guard.watcher = Some(watcher);
  Ok(())
}

#[tauri::command]
fn open_file(path: String, app: AppHandle, state: tauri::State<SharedWatchState>) -> Result<String, String> {
  let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {e}"))?;
  let watch_state = state.inner().clone();
  let mut guard = watch_state
    .lock()
    .map_err(|_| "Failed to lock watcher state".to_string())?;

  debug_log(guard.debug, &format!("Opening file {path}"));
  guard.current_path = Some(path.clone());
  guard.last_content = Some(content.clone());
  guard.last_save_at = Some(Instant::now());
  attach_watcher(&path, app, watch_state.clone(), &mut guard)?;
  Ok(content)
}

#[tauri::command]
fn save_file(path: String, content: String, app: AppHandle, state: tauri::State<SharedWatchState>) -> Result<(), String> {
  fs::write(&path, &content).map_err(|e| format!("Failed to write file: {e}"))?;
  let watch_state = state.inner().clone();
  let mut guard = watch_state
    .lock()
    .map_err(|_| "Failed to lock watcher state".to_string())?;
  let needs_watcher = guard.current_path.as_deref() != Some(path.as_str()) || guard.watcher.is_none();
  guard.current_path = Some(path.clone());
  guard.last_content = Some(content);
  guard.last_save_at = Some(Instant::now());
  debug_log(guard.debug, &format!("Saved file {path}"));
  if needs_watcher {
    attach_watcher(&path, app, watch_state.clone(), &mut guard)?;
  }
  Ok(())
}

#[tauri::command]
fn rename_file(old_path: String, new_path: String, app: AppHandle, state: tauri::State<SharedWatchState>) -> Result<(), String> {
  fs::rename(&old_path, &new_path).map_err(|e| format!("Failed to rename file: {e}"))?;
  let watch_state = state.inner().clone();
  let mut guard = watch_state
    .lock()
    .map_err(|_| "Failed to lock watcher state".to_string())?;
  guard.current_path = Some(new_path.clone());
  guard.last_save_at = Some(Instant::now());
  debug_log(guard.debug, &format!("Renamed file {old_path} -> {new_path}"));
  attach_watcher(&new_path, app, watch_state.clone(), &mut guard)?;
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let debug_enabled = std::env::args().any(|arg| arg == "--debug");
  if debug_enabled {
    eprintln!("[idatz-desktop] Debug logging enabled");
  }

  let watch_state: SharedWatchState = Arc::new(Mutex::new(WatchState {
    current_path: None,
    watcher: None,
    last_content: None,
    last_save_at: None,
    debug: debug_enabled,
  }));

  tauri::Builder::default()
    .manage(watch_state)
    .setup(|app| {
      app.handle().plugin(tauri_plugin_dialog::init())?;
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![open_file, save_file, rename_file])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
