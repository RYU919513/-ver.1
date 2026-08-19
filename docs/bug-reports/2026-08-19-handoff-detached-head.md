# Handoff restore checkpoint rejected detached HEAD

- **Symptom:** Temporary restore stopped at `npm run codex:check` with “Checkpoint targetBranch does not match current branch”.
- **Conditions / reproducibility:** Reproducible when cloning `source.bundle`; a bundle created from `HEAD` restores at a detached HEAD rather than a named local branch.
- **Steps:** Create a handoff, run `npm run codex:handoff:restore`, and observe the restored Codex check.
- **Cause:** Checkpoint validation required the current branch name to equal `targetBranch`, including a legitimate detached restore where the current branch name is empty.
- **Impact:** Source repository and archive verification passed, but temporary restore could not complete its restored checks. No application, card, user, Firebase, or Firestore data was affected.
- **Fix:** Enforce target-branch equality when Git reports a named branch; permit detached HEAD and continue commit identity/integrity checks.
- **Before / after:** Before, detached restore was always rejected. After, named-branch mismatches remain rejected while detached recovery is accepted.
- **Regression test:** The complete `npm run codex:handoff:restore` path now runs restored `codex:check`, syntax checks, all tests, Git fsck, and exact commit matching.
- **Prevention:** Keep restore validation in the release checklist and distinguish branch identity from commit identity in recovery environments.
- **Other features / known limitations:** No runtime behavior changes. Detached mode intentionally has no branch identity; exact restored commit matching remains mandatory.
- **Human check:** None beyond reviewing the restore output and artifact checksum.
