(() => {
  'use strict';
  async function loadEncryptedContainer() {
    const meta = await fetch('data/card-vault.meta.json', { cache:'no-store' }).then(r => {
      if (!r.ok) throw new Error('Card Vaultメタデータを取得できません。');
      return r.json();
    });
    if (!Array.isArray(meta.ciphertextParts) || !meta.ciphertextParts.length) {
      throw new Error('暗号文パーツ定義がありません。');
    }
    const parts = await Promise.all(meta.ciphertextParts.map(name =>
      fetch(`data/${name}`, { cache:'no-store' }).then(r => {
        if (!r.ok) throw new Error(`暗号文パーツを取得できません: ${name}`);
        return r.text();
      })
    ));
    return { ...meta, ciphertext: parts.join('') };
  }
  window.DuelixCardVaultData = { loadEncryptedContainer };
})();
