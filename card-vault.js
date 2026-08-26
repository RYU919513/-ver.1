(() => {
  'use strict';

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function b64ToBytes(value) {
    const binary = atob(value);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  }

  async function sha256Hex(bytes) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function decryptVault(container, passphrase) {
    if (!container || container.format !== 'DUELIX-CARD-VAULT' || container.version !== 1) {
      throw new Error('未対応のCard Vault形式です。');
    }
    if (!passphrase) throw new Error('解除キーを入力してください。');

    const salt = b64ToBytes(container.kdf.salt);
    const iv = b64ToBytes(container.cipher.iv);
    const cipherBytes = b64ToBytes(container.ciphertext);
    const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: container.kdf.iterations, hash: container.kdf.hash },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    let plain;
    try {
      plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, additionalData: encoder.encode(container.cipher.aad) },
        key,
        cipherBytes
      );
    } catch {
      throw new Error('解除に失敗しました。キーが違うか、保管庫が破損しています。');
    }

    let decodedBytes = new Uint8Array(plain);
    if (container.compression === 'gzip') {
      if (typeof DecompressionStream !== 'function') {
        throw new Error('このブラウザはgzip復号に対応していません。');
      }
      const stream = new Blob([decodedBytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      decodedBytes = new Uint8Array(await new Response(stream).arrayBuffer());
    }

    const actualHash = await sha256Hex(decodedBytes);
    if (container.plaintextSha256 && actualHash !== container.plaintextSha256) {
      throw new Error('復号後の整合性チェックに失敗しました。');
    }

    const payload = JSON.parse(decoder.decode(decodedBytes));
    if (!Array.isArray(payload.records)) throw new Error('records が見つかりません。');
    return payload;
  }

  window.DuelixCardVault = { decryptVault };
})();
