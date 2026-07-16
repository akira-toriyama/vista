use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;
use std::process::Command;

use crate::error::CoreError;

/// GUI apps don't inherit the login-shell PATH (design doc: ホスト furrow の
/// 解決), so ask zsh -lc where the binary lives.
pub fn resolve_via_login_shell(name: &str) -> Result<PathBuf, CoreError> {
    let output = Command::new("zsh")
        .args(["-lc", &format!("command -v -- {name}")])
        .output()
        .map_err(|e| CoreError::new("furrow-not-found", format!("failed to run zsh: {e}")))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    // profile scripts may print noise before the answer — take the last non-empty line
    let candidate = stdout
        .lines()
        .rev()
        .map(str::trim)
        .find(|l| !l.is_empty())
        .ok_or_else(|| {
            CoreError::new(
                "furrow-not-found",
                format!("`{name}` not found on the login-shell PATH"),
            )
        })?;
    if !candidate.starts_with('/') {
        // an alias/function answer is not a spawnable path
        return Err(CoreError::new(
            "furrow-not-found",
            format!("`{name}` resolved to `{candidate}`, not an absolute path"),
        ));
    }
    validate_binary(candidate)
}

/// Manual override from settings — must be an existing executable file.
pub fn validate_binary(path: &str) -> Result<PathBuf, CoreError> {
    let meta = std::fs::metadata(path)
        .map_err(|e| CoreError::new("furrow-path-invalid", format!("{path}: {e}")))?;
    if !meta.is_file() || meta.permissions().mode() & 0o111 == 0 {
        return Err(CoreError::new(
            "furrow-path-invalid",
            format!("{path} is not an executable file"),
        ));
    }
    PathBuf::from(path)
        .canonicalize()
        .map_err(|e| CoreError::new("furrow-path-invalid", format!("{path}: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn resolves_a_real_command() {
        let p = resolve_via_login_shell("ls").unwrap();
        assert!(p.is_absolute());
        assert!(p.ends_with("ls"));
    }

    #[test]
    fn unknown_command_is_furrow_not_found() {
        let err = resolve_via_login_shell("vista-test-no-such-cmd").unwrap_err();
        assert_eq!(err.code, "furrow-not-found");
    }

    #[test]
    fn validates_an_executable() {
        assert_eq!(validate_binary("/bin/ls").unwrap(), PathBuf::from("/bin/ls"));
    }

    #[test]
    fn rejects_missing_path() {
        assert_eq!(validate_binary("/no/such/file").unwrap_err().code, "furrow-path-invalid");
    }

    #[test]
    fn rejects_non_executable_file() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("plain.txt");
        std::fs::File::create(&file).unwrap().write_all(b"x").unwrap();
        let err = validate_binary(file.to_str().unwrap()).unwrap_err();
        assert_eq!(err.code, "furrow-path-invalid");
    }

    #[test]
    fn rejects_directory() {
        assert_eq!(validate_binary("/tmp").unwrap_err().code, "furrow-path-invalid");
    }
}
