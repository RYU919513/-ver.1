// Ver.1 deck data compatibility, validation, and backup helpers.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DMDeckCore = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const SCHEMA_VERSION = 1;
  const DEFAULT_MAX_CARDS = 40;
  const DEFAULT_COPY_LIMIT = 4;

  function safeDate(value, fallback) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
  }

  function createId() {
    return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeDeck(raw, options) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const now = options?.now || new Date().toISOString();
    const quantities = new Map();
    const sourceCards = Array.isArray(raw.cards) ? raw.cards : [];

    sourceCards.forEach((item) => {
      const cardId = String(item?.cardId || item?.card?.id || "").trim();
      const qty = Number(item?.qty);
      if (!cardId || !Number.isInteger(qty) || qty <= 0) return;
      quantities.set(cardId, (quantities.get(cardId) || 0) + qty);
    });

    return {
      id: String(raw.id || createId()),
      name: String(raw.name || raw.deckName || "無題のデッキ").trim() || "無題のデッキ",
      cards: Array.from(quantities, ([cardId, qty]) => ({ cardId, qty })),
      updatedAt: safeDate(raw.updatedAt, now),
      schemaVersion: SCHEMA_VERSION
    };
  }

  function getDeckTotal(deck) {
    return Array.isArray(deck?.cards)
      ? deck.cards.reduce((sum, item) => sum + (Number.isInteger(item?.qty) && item.qty > 0 ? item.qty : 0), 0)
      : 0;
  }

  function validateDeck(deck, cards, rules) {
    const maxCards = rules?.maxCards ?? DEFAULT_MAX_CARDS;
    const defaultCopyLimit = rules?.defaultCopyLimit ?? DEFAULT_COPY_LIMIT;
    const cardMap = new Map((Array.isArray(cards) ? cards : []).map((card) => [String(card.id), card]));
    const errors = [];
    const warnings = [];
    const total = getDeckTotal(deck);

    if (total !== maxCards) errors.push({ code: "deck_size", message: `デッキは${maxCards}枚必要です（現在${total}枚）。` });
    (Array.isArray(deck?.cards) ? deck.cards : []).forEach((item) => {
      const card = cardMap.get(String(item.cardId));
      if (!card) {
        warnings.push({ code: "unknown_card", cardId: item.cardId, message: `カードID「${item.cardId}」はカードDBで確認できません。` });
        return;
      }
      const status = card.legality?.status || card.legalityStatus || "unrestricted";
      const limit = status === "premium_banned" ? 0
        : status === "restricted" ? 1
        : Number.isInteger(card.legality?.maxCopies) ? card.legality.maxCopies
        : defaultCopyLimit;
      if (item.qty > limit) errors.push({ code: "copy_limit", cardId: item.cardId, message: `「${card.name || item.cardId}」は${limit}枚までです。` });
    });

    return { ok: errors.length === 0, total, errors, warnings };
  }

  function createBackup(decks, now) {
    return {
      format: "dm-deck-backup",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: now || new Date().toISOString(),
      decks: (Array.isArray(decks) ? decks : []).map((deck) => normalizeDeck(deck)).filter(Boolean)
    };
  }

  function parseBackup(value) {
    const data = typeof value === "string" ? JSON.parse(value) : value;
    if (!data || data.format !== "dm-deck-backup" || !Array.isArray(data.decks)) {
      throw new Error("対応していないバックアップ形式です。");
    }
    const decks = data.decks.map((deck) => normalizeDeck(deck)).filter(Boolean);
    if (decks.length !== data.decks.length) throw new Error("壊れたデッキデータが含まれています。");
    return decks;
  }

  function mergeDecks(current, incoming) {
    const byId = new Map();
    [...(current || []), ...(incoming || [])].map((deck) => normalizeDeck(deck)).filter(Boolean).forEach((deck) => {
      const existing = byId.get(deck.id);
      if (!existing || Date.parse(deck.updatedAt) >= Date.parse(existing.updatedAt)) byId.set(deck.id, deck);
    });
    return Array.from(byId.values());
  }

  // 1人回し用の保存形式。カード定義は複製せずIDで参照し、重なりはstackで表す。
  function createSoloGameState(deck, options) {
    const normalized = normalizeDeck(deck);
    if (!normalized) throw new Error("デッキ形式が不正です。");
    let serial = 0;
    const deckZone = normalized.cards.flatMap(({ cardId, qty }) =>
      Array.from({ length: qty }, () => ({ instanceId: `i_${++serial}`, cardId, stack: [] }))
    );
    return {
      schemaVersion: SCHEMA_VERSION,
      gameId: options?.gameId || `g_${Date.now().toString(36)}`,
      sourceDeckId: normalized.id,
      sourceDeckUpdatedAt: normalized.updatedAt,
      createdAt: options?.now || new Date().toISOString(),
      turn: 0,
      activePlayer: "player",
      zones: { deck: deckZone, hand: [], mana: [], battle: [], graveyard: [], shields: [] }
    };
  }

  return { SCHEMA_VERSION, normalizeDeck, getDeckTotal, validateDeck, createBackup, parseBackup, mergeDecks, createSoloGameState };
});
