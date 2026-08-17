---
name: investigation-only
description: Use for diagnosis/research/verification requests that must not modify code, Git, or data.
---

# Investigation Only

- No file/config edits, commits, pushes, PRs, ref changes, or data mutations.
- No IndexedDB/localStorage/Firebase/Firestore/production writes.
- Read code/history/logs and run non-destructive tests/checks only.
- Treat official card/ruling evidence separately from hypotheses; never invent missing facts.
- Report reproduction/result, likely root cause, affected scope, unknowns, smallest safe fix, and verification plan.
- If evidence is insufficient, state what additional evidence would resolve it instead of guessing.
