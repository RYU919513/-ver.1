const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../deck-core.js");

test("legacy and exported deck shapes normalize without losing card quantities", () => {
  const deck = core.normalizeDeck({ deckName: "旧形式", cards: [
    { cardId: "a", qty: 2 }, { card: { id: "a" }, qty: 1 }, { cardId: "b", qty: 0 }
  ], updatedAt: "invalid" }, { now: "2026-01-01T00:00:00.000Z" });
  assert.equal(deck.name, "旧形式");
  assert.deepEqual(deck.cards, [{ cardId: "a", qty: 3 }]);
  assert.equal(deck.updatedAt, "2026-01-01T00:00:00.000Z");
});

test("legality reports size, restricted cards, and unknown card ids", () => {
  const result = core.validateDeck({ cards: [{ cardId: "a", qty: 2 }, { cardId: "missing", qty: 38 }] }, [
    { id: "a", name: "制限カード", legality: { status: "restricted" } }
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, "copy_limit");
  assert.equal(result.warnings[0].code, "unknown_card");
});

test("backup round-trip is versioned and merge keeps the newest deck", () => {
  const older = { id: "d1", name: "旧", cards: [], updatedAt: "2026-01-01T00:00:00Z" };
  const newer = { id: "d1", name: "新", cards: [], updatedAt: "2026-02-01T00:00:00Z" };
  const backup = core.createBackup([newer], "2026-03-01T00:00:00.000Z");
  assert.equal(backup.schemaVersion, 1);
  assert.equal(core.parseBackup(JSON.stringify(backup))[0].name, "新");
  assert.equal(core.mergeDecks([newer], [older])[0].name, "新");
  assert.throws(() => core.parseBackup({ decks: [] }), /バックアップ形式/);
});

test("solo play state uses card references and supports stacked cards", () => {
  const state = core.createSoloGameState({ id: "d1", cards: [{ cardId: "a", qty: 2 }] }, {
    gameId: "g1", now: "2026-01-01T00:00:00.000Z"
  });
  assert.equal(state.zones.deck.length, 2);
  assert.notEqual(state.zones.deck[0].instanceId, state.zones.deck[1].instanceId);
  assert.deepEqual(state.zones.deck[0].stack, []);
  assert.equal(state.sourceDeckId, "d1");
});
