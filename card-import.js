(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CardImport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DB_NAME = "dm_card_database";
  const DB_VERSION = 2;
  const STORES = { cards: "cards", staging: "importStaging", audits: "importAudits" };
  const VERIFICATION = new Set(["verified", "needs_verification", "needs_source_check", "ruling_check_pending"]);
  const FIELDS = ["name", "civilization", "type", "race", "cost", "power", "text", "number", "source", "checkedAt", "verificationStatus"];

  function csvRows(text) {
    const rows = []; let row = []; let value = ""; let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted && c === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (c === '"') quoted = !quoted;
      else if (!quoted && c === ",") { row.push(value); value = ""; }
      else if (!quoted && (c === "\n" || c === "\r")) {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(value); value = ""; if (row.some(v => v !== "")) rows.push(row); row = [];
      } else value += c;
    }
    row.push(value); if (row.some(v => v !== "")) rows.push(row);
    return rows;
  }

  function csvValue(key, value) {
    const v = String(value || "").trim();
    if (key === "civilization" || key === "race") return v ? v.split(/[|／;]/).map(x => x.trim()).filter(Boolean) : [];
    if (key === "cost" || key === "power") return v === "" ? null : Number(v);
    if (key === "ai") { try { return JSON.parse(v || "{}"); } catch (_) { return {}; } }
    return v;
  }

  function parse(text, kind) {
    if (kind === "json") {
      const data = JSON.parse(text); const cards = Array.isArray(data) ? data : data.cards;
      if (!Array.isArray(cards)) throw new Error("JSONの最上位（またはcards）は配列にしてください。");
      return cards;
    }
    const rows = csvRows(text); if (rows.length < 2) throw new Error("CSVにヘッダーとデータ行が必要です。");
    const headers = rows.shift().map(x => x.trim());
    return rows.map(row => Object.fromEntries(headers.map((key, i) => [key, csvValue(key, row[i])])));
  }

  function stable(value) {
    if (Array.isArray(value)) return JSON.stringify(value.map(String).sort());
    return JSON.stringify(value == null ? null : value);
  }
  function changes(oldCard, card) {
    return FIELDS.filter(field => stable(oldCard[field]) !== stable(card[field])).map(field => ({ field, oldValue: oldCard[field], newValue: card[field] }));
  }
  function fallbackValidation(card) {
    const errors = [], warnings = [];
    if (!card || typeof card !== "object") errors.push("カード形式が不正です");
    if (!String(card?.id || "").trim()) errors.push("idが必要です");
    if (!String(card?.name || "").trim()) errors.push("nameが必要です");
    if (!Array.isArray(card?.civilization) || !card.civilization.length) errors.push("civilizationは配列で必要です");
    if (!String(card?.type || "").trim()) errors.push("typeが必要です");
    if (!Array.isArray(card?.race)) errors.push("raceは配列にしてください");
    if (!Number.isFinite(card?.cost) || card.cost < 0) errors.push("costが不正です");
    if (card?.power != null && (!Number.isFinite(card.power) || card.power < 0)) errors.push("powerが不正です");
    if (typeof card?.text !== "string") errors.push("textが不正です");
    if (!card?.source) warnings.push("sourceがありません");
    if (!VERIFICATION.has(card?.verificationStatus)) warnings.push("verificationStatusが未設定または不正です");
    return { errors, warnings };
  }
  function validatorResult(card, validator) {
    if (!validator) return fallbackValidation(card);
    const result = validator([card]);
    return {
      errors: result.issues.filter(x => x.level === "error").map(x => x.message),
      warnings: result.issues.filter(x => x.level === "warning").map(x => x.message)
    };
  }

  function stage(cards, master, validator) {
    const ids = new Map(), prints = new Map();
    cards.forEach((c, i) => {
      if (c?.id) ids.set(c.id, [...(ids.get(c.id) || []), i]);
      if (c?.name && c?.number) { const key = `${c.name}@@${c.number}`; prints.set(key, [...(prints.get(key) || []), i]); }
    });
    const masterIds = new Map(master.map(c => [c.id, c]));
    const masterPrints = new Map(master.filter(c => c.name && c.number).map(c => [`${c.name}@@${c.number}`, c]));
    return cards.map((card, index) => {
      const validation = validatorResult(card, validator); const oldCard = masterIds.get(card?.id); const delta = oldCard ? changes(oldCard, card) : [];
      const duplicate = (card?.id && ids.get(card.id)?.length > 1) || (card?.name && card?.number && prints.get(`${card.name}@@${card.number}`)?.length > 1);
      const printOwner = card?.name && card?.number ? masterPrints.get(`${card.name}@@${card.number}`) : null;
      const conflict = printOwner && printOwner.id !== card.id;
      let status = validation.errors.length ? "invalid" : conflict ? "conflict" : duplicate ? "duplicate" : oldCard ? (delta.length ? "update" : "match") : "new";
      if (!validation.errors.length && !conflict && !duplicate && validation.warnings.length && status !== "match") status = "review";
      return { rowId: `${index}:${card?.id || "missing"}`, card, status, changes: delta, errors: validation.errors, warnings: validation.warnings, approved: false };
    });
  }

  async function hash(text) {
    if (globalThis.crypto?.subtle) {
      const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");
    }
    let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return `fnv1a-${(h >>> 0).toString(16)}`;
  }
  function exportable(audit) {
    return (audit.entries || []).filter(x => x.approved && !x.errors?.length && x.card?.source && x.card?.verificationStatus === "verified" && x.card?.usageAllowed !== false).map(x => x.card);
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORES.cards)) db.createObjectStore(STORES.cards, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.staging)) db.createObjectStore(STORES.staging, { keyPath: "importId" });
        if (!db.objectStoreNames.contains(STORES.audits)) db.createObjectStore(STORES.audits, { keyPath: "importId" });
      };
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
  }
  async function transaction(storeNames, mode, action) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, mode); let result;
      try { result = action(tx); } catch (error) { db.close(); reject(error); return; }
      tx.oncomplete = () => { db.close(); resolve(result); }; tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }
  const req = request => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
  async function all(store) { const db = await openDb(); const result = await req(db.transaction(store).objectStore(store).getAll()); db.close(); return result; }
  async function saveStaging(data) { return transaction([STORES.staging], "readwrite", tx => tx.objectStore(STORES.staging).put(data)); }
  async function audits() { return all(STORES.audits); }
  async function cards() { return all(STORES.cards); }
  async function apply(staged) {
    const entries = staged.entries.filter(x => x.approved && !x.errors.length && x.status !== "conflict" && x.status !== "duplicate");
    if (!entries.length) throw new Error("安全に反映できる承認済みカードがありません。");
    const current = await cards(); const map = new Map(current.map(c => [c.id, c]));
    const backups = entries.map(x => ({ id: x.card.id, existed: map.has(x.card.id), card: map.get(x.card.id) || null }));
    const audit = { ...staged, entries, backups, approvedCount: staged.entries.filter(x => x.approved).length, appliedCount: entries.length, rollbackStatus: "active" };
    await transaction([STORES.cards, STORES.audits, STORES.staging], "readwrite", tx => {
      entries.forEach(x => tx.objectStore(STORES.cards).put(x.card)); tx.objectStore(STORES.audits).put(audit); tx.objectStore(STORES.staging).delete(staged.importId);
    }); return audit;
  }
  async function rollback(importId) {
    const db = await openDb(); const audit = await req(db.transaction(STORES.audits).objectStore(STORES.audits).get(importId)); db.close();
    if (!audit || audit.rollbackStatus === "rolled_back") throw new Error("ロールバック可能な監査情報がありません。");
    audit.rollbackStatus = "rolled_back"; audit.rolledBackAt = new Date().toISOString();
    await transaction([STORES.cards, STORES.audits], "readwrite", tx => {
      audit.backups.forEach(x => x.existed ? tx.objectStore(STORES.cards).put(x.card) : tx.objectStore(STORES.cards).delete(x.id)); tx.objectStore(STORES.audits).put(audit);
    }); return audit;
  }
  return { parse, stage, hash, exportable, openDb, saveStaging, audits, cards, apply, rollback, constants: { DB_NAME, DB_VERSION, STORES, VERIFICATION } };
});
