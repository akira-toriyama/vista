use std::path::PathBuf;
use std::sync::Mutex;

use crate::board::{self, BoardPaths};
use crate::error::CoreError;
use crate::exec::{self, ExecResult};
use crate::locate;
use crate::watch::WatchHandle;

pub const TASKS_CHANGED_EVENT: &str = "tasks://changed";

#[derive(Default)]
pub struct AppState {
    pub furrow: Mutex<Option<PathBuf>>,
    pub board: Mutex<Option<BoardPaths>>,
    pub watcher: Mutex<Option<WatchHandle>>,
}

pub(crate) fn furrow_resolve_impl(state: &AppState) -> Result<PathBuf, CoreError> {
    if let Some(cached) = state.furrow.lock().unwrap().clone() {
        return Ok(cached);
    }
    let path = locate::resolve_via_login_shell("furrow")?;
    *state.furrow.lock().unwrap() = Some(path.clone());
    Ok(path)
}

pub(crate) fn furrow_set_path_impl(state: &AppState, path: &str) -> Result<PathBuf, CoreError> {
    let validated = locate::validate_binary(path)?;
    *state.furrow.lock().unwrap() = Some(validated.clone());
    Ok(validated)
}

pub(crate) fn board_paths_impl(state: &AppState) -> Result<BoardPaths, CoreError> {
    if let Some(cached) = state.board.lock().unwrap().clone() {
        return Ok(cached);
    }
    let paths = board::load_board_paths(&board::default_config_path()?)?;
    *state.board.lock().unwrap() = Some(paths.clone());
    Ok(paths)
}

pub(crate) fn furrow_exec_impl(state: &AppState, args: &[String]) -> Result<ExecResult, CoreError> {
    let bin = furrow_resolve_impl(state)?;
    let paths = board_paths_impl(state)?;
    exec::run(&bin, args, &paths.root)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state_with(furrow: &str, board_root: &std::path::Path) -> AppState {
        let state = AppState::default();
        *state.furrow.lock().unwrap() = Some(PathBuf::from(furrow));
        *state.board.lock().unwrap() = Some(BoardPaths {
            root: board_root.to_path_buf(),
            furrow_dir: board_root.join(".furrow"),
        });
        state
    }

    #[test]
    fn resolve_returns_cached_path_without_shelling_out() {
        let state = state_with("/fake/cached/furrow", std::path::Path::new("/"));
        assert_eq!(
            furrow_resolve_impl(&state).unwrap(),
            PathBuf::from("/fake/cached/furrow")
        );
    }

    #[test]
    fn set_path_validates_and_caches() {
        let state = AppState::default();
        let p = furrow_set_path_impl(&state, "/bin/echo").unwrap();
        assert_eq!(p, PathBuf::from("/bin/echo"));
        assert_eq!(*state.furrow.lock().unwrap(), Some(PathBuf::from("/bin/echo")));
    }

    #[test]
    fn set_path_rejects_garbage_and_leaves_cache_empty() {
        let state = AppState::default();
        assert!(furrow_set_path_impl(&state, "/no/such/furrow").is_err());
        assert_eq!(*state.furrow.lock().unwrap(), None);
    }

    #[test]
    fn board_paths_returns_cached_value() {
        let dir = tempfile::tempdir().unwrap();
        let state = state_with("/bin/echo", dir.path());
        assert_eq!(board_paths_impl(&state).unwrap().root, dir.path());
    }

    #[test]
    fn exec_runs_cached_furrow_in_board_root() {
        let dir = tempfile::tempdir().unwrap();
        let state = state_with("/bin/echo", &dir.path().canonicalize().unwrap());
        let r = furrow_exec_impl(&state, &["board".into(), "--json".into()]).unwrap();
        assert_eq!(r.code, 0);
        assert_eq!(r.stdout, "board --json\n");
    }
}
