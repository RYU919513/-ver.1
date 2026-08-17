# Duel Masters Main App — Codex Instructions

## Identity and mission
This is the main app repository `RYU919513/-ver.1`. Build a trustworthy Duel Masters deck-management/support app. Accuracy and user-data safety outrank speed.

Follow the product direction documented in `README.md` and `DEVELOPMENT_ROADMAP.md`: official information is the reference; AI must not invent card information or rulings; card data, rulings, battle history, and deck-change history must remain distinguishable and auditable.

## Before work
1. Confirm repository, branch, HEAD, `git status`, relevant files/tests, and runtime prerequisites.
2. Record the starting commit as a recovery baseline and prefer a dedicated branch for substantive changes.
3. Inspect existing import, validation, staging, approval, rollback, IndexedDB, authentication, and Firestore behavior before editing.
4. Never assume package/config/support files exist. Verify first; create missing project infrastructure when justified.

## Work modes
### Normal implementation
Make the smallest coherent change that fully satisfies the request and add/update tests.

### Enhanced / autonomous mode ("狂")
You may create/delete files, folders, configs, tests, tools, and dependencies when justified, and may choose a better approach than the initial idea. Continue through ordinary implementation obstacles without repeated confirmation. Still:
- do not leave any app broken;
- protect decks, cards, user data, IndexedDB, Firebase/Firestore, import history, and backups;
- do not weaken validation/approval/rollback safeguards simply to make tests pass;
- keep unrelated repositories untouched unless a minimal cross-repo compatibility change is essential;
- preserve a Git recovery path;
- ephemeral workspace edits are not completion: commit/push/open a PR when possible and report real Git state truthfully.

### Investigation-only mode
Strictly no file/config changes, commits, pushes, PRs, ref changes, or data mutations. Read, run non-destructive checks/tests, diagnose, and report evidence plus a proposed safe fix.

## Domain correctness
- Prefer official Duel Masters sources and preserve provenance/verification state.
- Never invent unknown card fields, card text, rulings, legality, tournament facts, or missing source data.
- Keep rule/card data separate so future judge/AI systems can cite and update each independently.
- Imported data must pass staging/validation/explicit approval rules; do not silently write malformed, duplicate, conflicting, or unverified records into trusted data.
- Preserve edition/printing identity separately from rules-level card identity when relevant.

## Data safety
- Never clear IndexedDB/localStorage/site data as a cleanup shortcut; it can destroy decks and other state.
- Do not write test fixtures into production `cards.json` or production Firestore.
- Production/Firebase/Firestore writes require explicit task authorization.
- Never log or commit credentials, auth tokens, passwords, or unnecessary personal information.
- Prefer reversible migrations/imports with backups/rollback and explicit validation.

## Verification
Run the strongest relevant automated checks. The repository provides Node tests through `npm test` after the project-quality files in this branch are present. Run syntax checks, `git diff --check`, inspect status/diff, and use the read-only reviewer subagent for substantial work.

## Project helpers
- `.agents/skills/safe-autonomous-development/SKILL.md`
- `.agents/skills/investigation-only/SKILL.md`
- `.agents/skills/verified-finish/SKILL.md`
- `.codex/agents/investigator.toml`
- `.codex/agents/reviewer.toml`

## Completion report
State exactly what changed, what checks actually ran and their results, unresolved risks, and exact branch/commit/push/PR/CI state. Never claim a push, PR, deployment, or passing test that did not happen.
