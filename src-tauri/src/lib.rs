mod board;
mod commands;
mod error;
mod exec;
mod locate;
mod watch;

use tauri::{AppHandle, Emitter, State};

use commands::{AppState, TASKS_CHANGED_EVENT};

#[tauri::command]
fn furrow_resolve(state: State<'_, AppState>) -> Result<String, error::CoreError> {
    commands::furrow_resolve_impl(&state).map(|p| p.display().to_string())
}

#[tauri::command]
fn furrow_set_path(state: State<'_, AppState>, path: String) -> Result<String, error::CoreError> {
    commands::furrow_set_path_impl(&state, &path).map(|p| p.display().to_string())
}

#[tauri::command]
fn board_info(state: State<'_, AppState>) -> Result<board::BoardPaths, error::CoreError> {
    commands::board_paths_impl(&state)
}

#[tauri::command]
fn furrow_exec(
    state: State<'_, AppState>,
    args: Vec<String>,
) -> Result<exec::ExecResult, error::CoreError> {
    commands::furrow_exec_impl(&state, &args)
}

#[tauri::command]
fn watch_start(app: AppHandle, state: State<'_, AppState>) -> Result<bool, error::CoreError> {
    let mut guard = state.watcher.lock().unwrap();
    if guard.is_some() {
        return Ok(false);
    }
    let paths = commands::board_paths_impl(&state)?;
    let handle = watch::start(&paths.furrow_dir, move || {
        let _ = app.emit(TASKS_CHANGED_EVENT, ());
    })?;
    *guard = Some(handle);
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            furrow_resolve,
            furrow_set_path,
            board_info,
            furrow_exec,
            watch_start
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
