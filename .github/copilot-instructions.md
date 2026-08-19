# DUELIX CFL repository instructions

This repository is **DUELIX CFL** (`duel-masters-deck-manager`), not DM Safe Admin or DM Card Collector. Accuracy and user-data safety take priority over speed.

## Safety boundaries

- Never invent card data, rules, rulings, legality, tournament facts, or provenance. Do not casually edit `cards.json`.
- Do not change Firebase projects, authentication providers, Firestore/Storage rules, credentials, or production data. Never perform production writes, bulk updates, deletion, or migrations without explicit human approval.
- Never commit credentials, tokens, private keys, `.env` secrets, or personal data.
- Never clear all IndexedDB or localStorage, delete user decks, or use destructive reset as cleanup.
- Preserve import staging, validation, explicit approval, audit history, and rollback boundaries.
- Do not force-push, rewrite history, destructively reset/clean Git, guess a remote, or push directly to a protected/stable branch.
- Do not change unknown production assets or either out-of-scope application.

## Agent collaboration

- One task has one executor. Use a dedicated Issue, branch, and PR for Copilot work; do not implement concurrently on a Codex branch.
- Record `CODEX`, `COPILOT`, or `HUMAN` as executor in the Issue and PR, together with the base commit. Confirm that the base is not stale before integration.
- Do not edit `.codex/checkpoint.json`, the checkpoint schema, handoff archives, or handoff formats unless the Issue explicitly assigns workflow maintenance.
- Codex remains the primary implementer and must review Copilot diffs and tests before integration. Never merge agent output automatically.
- Split large changes into separately reviewable Issues/PRs. Do not duplicate a task already owned by another executor.

## Quality

- Read `AGENTS.md`, `README.md`, `DEVELOPMENT_ROADMAP.md`, and `docs/AGENT_COLLABORATION.md` before editing.
- Make the smallest coherent change. Run `npm run codex:check`, `npm run check`, `npm test`, and `git diff --check`.
- Add a regression test for a bug when practical and create a bug report using the repository template.
- Keep the existing Codex START/CHECK/END, checkpoint, handoff, verification, restore, and secret-protection workflows compatible.
