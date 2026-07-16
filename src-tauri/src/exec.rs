use std::path::Path;
use std::process::Command;

use serde::Serialize;

use crate::error::CoreError;

/// Raw result of one furrow invocation. Exit-code semantics (0/1/2/3+) and
/// the stderr {"error":{...}} envelope are interpreted by the TS
/// infrastructure layer, not here.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ExecResult {
    pub code: i32,
    pub stdout: String,
    pub stderr: String,
}

pub fn run(bin: &Path, args: &[String], cwd: &Path) -> Result<ExecResult, CoreError> {
    let output = Command::new(bin)
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| CoreError::new("spawn-failed", format!("{}: {e}", bin.display())))?;
    Ok(ExecResult {
        // None = killed by signal; -1 keeps the i32 contract instead of panicking
        code: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn zsh() -> PathBuf {
        PathBuf::from("/bin/zsh")
    }

    fn args(script: &str) -> Vec<String> {
        vec!["-c".into(), script.into()]
    }

    #[test]
    fn captures_stdout_and_zero_exit() {
        let r = run(&zsh(), &args("echo hello"), Path::new("/")).unwrap();
        assert_eq!(r.code, 0);
        assert_eq!(r.stdout, "hello\n");
        assert_eq!(r.stderr, "");
    }

    #[test]
    fn captures_stderr_and_nonzero_exit() {
        let r = run(&zsh(), &args("echo oops >&2; exit 3"), Path::new("/")).unwrap();
        assert_eq!(r.code, 3);
        assert_eq!(r.stdout, "");
        assert_eq!(r.stderr, "oops\n");
    }

    #[test]
    fn runs_in_given_cwd() {
        let dir = tempfile::tempdir().unwrap();
        let canonical = dir.path().canonicalize().unwrap();
        let r = run(&zsh(), &args("pwd"), &canonical).unwrap();
        assert_eq!(r.stdout.trim(), canonical.to_str().unwrap());
    }

    #[test]
    fn missing_binary_is_spawn_failed() {
        let err = run(Path::new("/no/such/bin"), &[], Path::new("/")).unwrap_err();
        assert_eq!(err.code, "spawn-failed");
    }
}
