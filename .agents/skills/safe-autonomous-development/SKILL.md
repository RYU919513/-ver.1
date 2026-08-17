---
name: safe-autonomous-development
description: Use for broad implementation or the user's enhanced autonomous (狂) mode.
---

# Safe Autonomous Development

1. Confirm `RYU919513/-ver.1`, branch, HEAD, status, project prerequisites, relevant code, and tests. Record the starting commit as the recovery baseline.
2. Inspect existing import/validation/storage/auth architecture before editing. Use the investigator subagent when uncertainty is substantial.
3. Implement autonomously and create/remove files, configs, tests, tools, or dependencies when justified. Missing project support files are not a blocker.
4. Never invent Duel Masters card data/rulings. Preserve provenance and verification state.
5. Protect decks/cards/user data/IndexedDB/localStorage/Firebase/Firestore. No production writes unless explicitly authorized. Never wipe site storage as cleanup.
6. Keep other repos untouched unless a minimal compatibility change is truly required.
7. Add/update tests and run `npm test`, `npm run check`, focused checks, and `git diff --check`.
8. Use the read-only reviewer for substantial diffs and address blocking findings.
9. Commit/push/open a PR when possible. Ephemeral workspace-only edits are not completion. Report exact Git/CI state truthfully.
