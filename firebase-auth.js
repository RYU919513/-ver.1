// Firebase Authentication + Firestore
// デュエマ デッキ管理アプリ

import "./card-validator.js";

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// Firebaseの設定
const firebaseConfig = {
  apiKey: "AIzaSyBeUx8AOPlyDCYwZUDmw_ZSelG3lfJT80U",
  authDomain: "duel-masters-deck-manager.firebaseapp.com",
  projectId: "duel-masters-deck-manager",
  storageBucket: "duel-masters-deck-manager.firebasestorage.app",
  messagingSenderId: "536980406115",
  appId: "1:536980406115:web:734f25019a17ee34c71d56"
};


// Firebaseを初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ログイン状態
onAuthStateChanged(auth, (user) => {
  window.currentFirebaseUser = user || null;

  if (typeof window.updateFirebaseAuthUI === "function") {
    window.updateFirebaseAuthUI(user || null);
  }
});


// ==============================
// Authentication
// ==============================

// メールアドレスで新規登録
window.firebaseRegister = async function(email, password) {
  try {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    return {
      success: true,
      user: result.user
    };
  } catch (error) {
    console.error("Firebase登録エラー:", error);

    return {
      success: false,
      code: error.code,
      message: error.message
    };
  }
};


// メールアドレスでログイン
window.firebaseLogin = async function(email, password) {
  try {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    return {
      success: true,
      user: result.user
    };
  } catch (error) {
    console.error("Firebaseログインエラー:", error);

    return {
      success: false,
      code: error.code,
      message: error.message
    };
  }
};


// ログアウト
window.firebaseLogout = async function() {
  try {
    await signOut(auth);

    return {
      success: true
    };
  } catch (error) {
    console.error("Firebaseログアウトエラー:", error);

    return {
      success: false,
      code: error.code,
      message: error.message
    };
  }
};


// ==============================
// Firestore
// ==============================

// デッキを保存
window.firebaseSaveDeck = async function(deck) {
  const user = window.currentFirebaseUser;

  if (!user) {
    return {
      success: false,
      message: "ログインしていません。"
    };
  }

  try {
    const normalized = window.DMDeckCore?.normalizeDeck(deck);

    if (!normalized || !normalized.id || normalized.id.includes("/")) {
      return {
        success: false,
        message: "保存するデッキの形式が不正です。"
      };
    }

    const deckRef = doc(
      db,
      "users",
      user.uid,
      "decks",
      normalized.id
    );

    await setDoc(deckRef, {
      id: normalized.id,
      name: normalized.name,
      cards: normalized.cards,
      updatedAt: normalized.updatedAt,
      schemaVersion: normalized.schemaVersion
    });

    return {
      success: true
    };
  } catch (error) {
    console.error("デッキ保存エラー:", error);

    return {
      success: false,
      code: error.code,
      message: error.message
    };
  }
};


// 自分のデッキを全部読み込む
window.firebaseLoadDecks = async function() {
  const user = window.currentFirebaseUser;

  if (!user) {
    return {
      success: false,
      decks: [],
      message: "ログインしていません。"
    };
  }

  try {
    const decksRef = collection(
      db,
      "users",
      user.uid,
      "decks"
    );

    const snapshot = await getDocs(decksRef);

    const decks = [];

    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();

      decks.push({
        id: data.id || docSnapshot.id,
        name: data.name || "無題のデッキ",
        cards: Array.isArray(data.cards) ? data.cards : [],
        updatedAt: data.updatedAt || "1970-01-01T00:00:00.000Z",
        schemaVersion: Number.isInteger(data.schemaVersion) ? data.schemaVersion : 1
      });
    });

    return {
      success: true,
      decks
    };
  } catch (error) {
    console.error("デッキ読み込みエラー:", error);

    return {
      success: false,
      decks: [],
      code: error.code,
      message: error.message
    };
  }
};


// デッキを削除
window.firebaseDeleteDeck = async function(deckId) {
  const user = window.currentFirebaseUser;

  if (!user) {
    return {
      success: false,
      message: "ログインしていません。"
    };
  }

  try {
    const deckRef = doc(
      db,
      "users",
      user.uid,
      "decks",
      deckId
    );

    await deleteDoc(deckRef);

    return {
      success: true
    };
  } catch (error) {
    console.error("デッキ削除エラー:", error);

    return {
      success: false,
      code: error.code,
      message: error.message
    };
  }
};
