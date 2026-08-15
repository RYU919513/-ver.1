// Card database validator
// Ver.1: 正確性優先のカードDB検査

(function () {
  "use strict";

  const VALID_CIVILIZATIONS = new Set([
    "光",
    "水",
    "闇",
    "火",
    "自然",
    "ゼロ"
  ]);

  const VALID_VERIFICATION_STATUS = new Set([
    "verified",
    "needs_verification",
    "needs_source_check",
    "ruling_check_pending"
  ]);

  function pushIssue(list, level, code, message, cardIndex, cardId) {
    list.push({
      level,
      code,
      message,
      cardIndex,
      cardId: cardId || null
    });
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function isStringArray(value) {
    return Array.isArray(value) && value.every((item) => isNonEmptyString(item));
  }

  function validateCardDatabase(cards) {
    const issues = [];

    if (!Array.isArray(cards)) {
      return {
        ok: false,
        cardCount: 0,
        errorCount: 1,
        warningCount: 0,
        issues: [
          {
            level: "error",
            code: "database_not_array",
            message: "cards.json の最上位は配列である必要があります。",
            cardIndex: null,
            cardId: null
          }
        ]
      };
    }

    const seenIds = new Map();
    const seenPrintKeys = new Map();

    cards.forEach((card, index) => {
      if (!card || typeof card !== "object" || Array.isArray(card)) {
        pushIssue(
          issues,
          "error",
          "card_not_object",
          "カードデータがオブジェクトではありません。",
          index,
          null
        );
        return;
      }

      const cardId = isNonEmptyString(card.id) ? card.id : null;

      if (!cardId) {
        pushIssue(issues, "error", "missing_id", "固有IDがありません。", index, null);
      } else if (seenIds.has(cardId)) {
        pushIssue(
          issues,
          "error",
          "duplicate_id",
          `固有ID「${cardId}」が重複しています。`,
          index,
          cardId
        );
      } else {
        seenIds.set(cardId, index);
      }

      if (!isNonEmptyString(card.name)) {
        pushIssue(issues, "error", "missing_name", "カード名がありません。", index, cardId);
      }

      if (!isStringArray(card.civilization) || card.civilization.length === 0) {
        pushIssue(
          issues,
          "error",
          "invalid_civilization",
          "文明は1つ以上の文字列配列で指定してください。",
          index,
          cardId
        );
      } else {
        card.civilization.forEach((civilization) => {
          if (!VALID_CIVILIZATIONS.has(civilization)) {
            pushIssue(
              issues,
              "warning",
              "unknown_civilization",
              `未登録の文明「${civilization}」が使われています。特殊カードなら仕様確認が必要です。`,
              index,
              cardId
            );
          }
        });
      }

      if (!isNonEmptyString(card.type)) {
        pushIssue(issues, "error", "missing_type", "カード種類がありません。", index, cardId);
      }

      if (!Array.isArray(card.race)) {
        pushIssue(issues, "error", "invalid_race", "種族は配列で指定してください。", index, cardId);
      } else if (!card.race.every((race) => typeof race === "string")) {
        pushIssue(
          issues,
          "error",
          "invalid_race_value",
          "種族配列に文字列以外の値があります。",
          index,
          cardId
        );
      }

      if (!Number.isFinite(card.cost) || card.cost < 0) {
        pushIssue(issues, "error", "invalid_cost", "コストが不正です。", index, cardId);
      }

      if (card.power !== null && card.power !== undefined) {
        if (!Number.isFinite(card.power) || card.power < 0) {
          pushIssue(issues, "error", "invalid_power", "パワーが不正です。", index, cardId);
        }
      }

      if (typeof card.text !== "string") {
        pushIssue(issues, "error", "invalid_text", "能力テキストが文字列ではありません。", index, cardId);
      }

      if (!isNonEmptyString(card.number)) {
        pushIssue(issues, "warning", "missing_number", "カード番号がありません。", index, cardId);
      }

      if (isNonEmptyString(card.name) && isNonEmptyString(card.number)) {
        const printKey = `${card.name}@@${card.number}`;
        if (seenPrintKeys.has(printKey)) {
          pushIssue(
            issues,
            "warning",
            "duplicate_print",
            `カード名とカード番号の組み合わせ「${card.name} / ${card.number}」が重複しています。`,
            index,
            cardId
          );
        } else {
          seenPrintKeys.set(printKey, index);
        }
      }

      if (!card.ai || typeof card.ai !== "object" || Array.isArray(card.ai)) {
        pushIssue(issues, "warning", "missing_ai", "AI用データがありません。", index, cardId);
      } else {
        if (card.ai.breaker !== undefined && (!Number.isInteger(card.ai.breaker) || card.ai.breaker < 0)) {
          pushIssue(issues, "warning", "invalid_ai_breaker", "AI用breaker値が不正です。", index, cardId);
        }

        if (card.ai.effects !== undefined && !isStringArray(card.ai.effects)) {
          pushIssue(issues, "warning", "invalid_ai_effects", "AI用effectsは文字列配列にしてください。", index, cardId);
        }
      }

      if (card.source === undefined || card.source === null || card.source === "") {
        pushIssue(
          issues,
          "warning",
          "missing_source",
          "開発者管理用のデータ確認元が未登録です。",
          index,
          cardId
        );
      }

      if (card.checkedAt === undefined || card.checkedAt === null || card.checkedAt === "") {
        pushIssue(
          issues,
          "warning",
          "missing_checked_at",
          "開発者管理用のデータ確認日が未登録です。",
          index,
          cardId
        );
      }

      if (!isNonEmptyString(card.verificationStatus)) {
        pushIssue(
          issues,
          "warning",
          "missing_verification_status",
          "確認状態が未登録です。",
          index,
          cardId
        );
      } else if (!VALID_VERIFICATION_STATUS.has(card.verificationStatus)) {
        pushIssue(
          issues,
          "warning",
          "unknown_verification_status",
          `確認状態「${card.verificationStatus}」は未定義です。`,
          index,
          cardId
        );
      }
    });

    const errorCount = issues.filter((issue) => issue.level === "error").length;
    const warningCount = issues.filter((issue) => issue.level === "warning").length;

    return {
      ok: errorCount === 0,
      cardCount: cards.length,
      errorCount,
      warningCount,
      issues
    };
  }

  async function validateCardsJson() {
    try {
      const response = await fetch("cards.json", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`cards.json HTTP ${response.status}`);
      }

      const cards = await response.json();
      const result = validateCardDatabase(cards);

      window.cardDatabaseValidation = result;

      if (result.ok && result.warningCount === 0) {
        console.info("[カードDB検査] OK", result);
      } else if (result.ok) {
        console.warn("[カードDB検査] 警告あり", result);
      } else {
        console.error("[カードDB検査] エラーあり", result);
      }

      window.dispatchEvent(
        new CustomEvent("dm-card-database-validated", {
          detail: result
        })
      );

      return result;
    } catch (error) {
      const result = {
        ok: false,
        cardCount: 0,
        errorCount: 1,
        warningCount: 0,
        issues: [
          {
            level: "error",
            code: "cards_json_load_failed",
            message: `cards.json の検査読み込みに失敗しました: ${error.message}`,
            cardIndex: null,
            cardId: null
          }
        ]
      };

      window.cardDatabaseValidation = result;
      console.error("[カードDB検査] 読み込み失敗", error);

      window.dispatchEvent(
        new CustomEvent("dm-card-database-validated", {
          detail: result
        })
      );

      return result;
    }
  }

  window.validateCardDatabase = validateCardDatabase;
  window.validateCardsJson = validateCardsJson;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", validateCardsJson, { once: true });
  } else {
    validateCardsJson();
  }
})();
