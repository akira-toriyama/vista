use std::path::Path;
use std::time::Duration;

use notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{new_debouncer, DebounceEventResult, Debouncer, RecommendedCache};

use crate::error::CoreError;

pub type WatchHandle = Debouncer<RecommendedWatcher, RecommendedCache>;

/// Editor saves are multi-event bursts; coalesce them (task body:
/// debouncer-full で coalesce).
const DEBOUNCE: Duration = Duration::from_millis(400);

/// Watch `dir` recursively; call `on_change` once per coalesced burst.
/// The dir is canonicalized before watching so macOS FSEvents' /private-
/// prefixed event paths can't diverge from the configured path (design doc
/// note) — and we never compare event paths anyway: any event in the tree
/// fires the callback, the webview just re-reads via furrow.
pub fn start(dir: &Path, on_change: impl Fn() + Send + 'static) -> Result<WatchHandle, CoreError> {
    let dir = dir
        .canonicalize()
        .map_err(|e| CoreError::new("watch-failed", format!("{}: {e}", dir.display())))?;
    let mut debouncer = new_debouncer(DEBOUNCE, None, move |result: DebounceEventResult| {
        if matches!(result, Ok(ref events) if !events.is_empty()) {
            on_change();
        }
    })
    .map_err(|e| CoreError::new("watch-failed", e.to_string()))?;
    debouncer
        .watch(&dir, RecursiveMode::Recursive)
        .map_err(|e| CoreError::new("watch-failed", e.to_string()))?;
    Ok(debouncer)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;

    #[test]
    fn burst_of_writes_fires_change() {
        let dir = tempfile::tempdir().unwrap();
        let (tx, rx) = mpsc::channel::<()>();
        let _handle = start(dir.path(), move || {
            let _ = tx.send(());
        })
        .unwrap();
        // FSEvents needs a beat to arm before events are captured
        std::thread::sleep(Duration::from_millis(300));
        for i in 0..5 {
            std::fs::write(dir.path().join(format!("t-{i}.json")), b"{}").unwrap();
        }
        assert!(
            rx.recv_timeout(Duration::from_secs(5)).is_ok(),
            "expected a tasks-changed callback within 5s"
        );
    }

    #[test]
    fn missing_dir_is_watch_failed() {
        let err = start(Path::new("/no/such/dir"), || {}).unwrap_err();
        assert_eq!(err.code, "watch-failed");
    }
}
