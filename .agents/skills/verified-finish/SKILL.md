---
name: verified-finish
description: Use before declaring implementation complete.
---

# Verified Finish

1. Re-read the request, `AGENTS.md`, README, and roadmap constraints relevant to the change.
2. Inspect final diff/status and unexpected generated/untracked files.
3. Run `npm test`, `npm run check`, focused checks, and `git diff --check`.
4. Check for accidental production/Firebase/Firestore writes, storage wipes, secrets, debug code, invented card/ruling data, weakened import validation/rollback, and unrelated changes.
5. Use the reviewer subagent for substantial work and address blocking findings.
6. Confirm branch, commit, pushed/not pushed, PR number/status, and CI if available.
7. Report unrun checks and residual risks explicitly. Never call unverified work complete.
