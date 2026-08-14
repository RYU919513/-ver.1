// Firebase Authentication
// デュエマ デッキ管理アプリ

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

// ログイン状態
onAuthStateChanged(auth, (user) => {
  window.currentFirebaseUser = user || null;

  if (typeof window.updateFirebaseAuthUI === "function") {
    window.updateFirebaseAuthUI(user || null);
  }
});

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
