use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::error::CoreError;

/// The central board (design doc: 中央ボード固定). `furrow_dir` is the
/// `.furrow` data dir from furrow's own config; `root` (its parent) is the
/// cwd furrow commands run in so furrow's board discovery finds it — the
/// GUI's own cwd (`/`) is outside every configured scope.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardPaths {
    pub root: PathBuf,
    pub furrow_dir: PathBuf,
}

pub fn parse_board_paths(config_toml: &str) -> Result<BoardPaths, CoreError> {
    let value: toml::Table = config_toml
        .parse()
        .map_err(|e| CoreError::new("board-config-invalid", format!("furrow config.toml: {e}")))?;
    let path = value
        .get("board")
        .and_then(|b| b.as_array())
        .and_then(|a| a.first())
        .and_then(|b| b.get("path"))
        .and_then(|p| p.as_str())
        .ok_or_else(|| {
            CoreError::new("board-config-invalid", "no [[board]] with a `path` in furrow config")
        })?;
    let furrow_dir = PathBuf::from(path);
    if !furrow_dir.is_absolute() {
        return Err(CoreError::new(
            "board-config-invalid",
            format!("board path must be absolute: {path}"),
        ));
    }
    let root = furrow_dir
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| {
            CoreError::new("board-config-invalid", format!("board path has no parent: {path}"))
        })?;
    Ok(BoardPaths { root, furrow_dir })
}

pub fn default_config_path() -> Result<PathBuf, CoreError> {
    if let Some(xdg) = std::env::var_os("XDG_CONFIG_HOME") {
        if !xdg.is_empty() {
            return Ok(PathBuf::from(xdg).join("furrow/config.toml"));
        }
    }
    std::env::var_os("HOME")
        .map(|home| PathBuf::from(home).join(".config/furrow/config.toml"))
        .ok_or_else(|| CoreError::new("board-config-not-found", "HOME is not set"))
}

pub fn load_board_paths(config_path: &Path) -> Result<BoardPaths, CoreError> {
    let text = std::fs::read_to_string(config_path).map_err(|e| {
        CoreError::new("board-config-not-found", format!("{}: {e}", config_path.display()))
    })?;
    parse_board_paths(&text)
}

#[cfg(test)]
mod tests {
    use super::*;

    const CONFIG: &str = r#"
[[board]]
path        = "/work/projects/.furrow"
scopes      = ["/work"]
repo        = "auto"
auto_filter = true
"#;

    #[test]
    fn parses_first_board() {
        let b = parse_board_paths(CONFIG).unwrap();
        assert_eq!(b.furrow_dir, PathBuf::from("/work/projects/.furrow"));
        assert_eq!(b.root, PathBuf::from("/work/projects"));
    }

    #[test]
    fn missing_board_table_is_invalid() {
        assert_eq!(parse_board_paths("x = 1").unwrap_err().code, "board-config-invalid");
    }

    #[test]
    fn malformed_toml_is_invalid() {
        assert_eq!(parse_board_paths("[[board").unwrap_err().code, "board-config-invalid");
    }

    #[test]
    fn relative_board_path_is_invalid() {
        let cfg = "[[board]]\npath = \"rel/.furrow\"\n";
        assert_eq!(parse_board_paths(cfg).unwrap_err().code, "board-config-invalid");
    }

    #[test]
    fn missing_config_file_is_not_found() {
        let err = load_board_paths(Path::new("/no/such/config.toml")).unwrap_err();
        assert_eq!(err.code, "board-config-not-found");
    }

    #[test]
    fn loads_from_file() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("config.toml");
        std::fs::write(&file, CONFIG).unwrap();
        assert!(load_board_paths(&file).is_ok());
    }
}
