# Card Vault implementation status

- Branch: `feature/card-vault-special-gacha`
- Public repository contains ciphertext only; passphrase is not committed.
- Ciphertext is split into 5 parts and loaded by `card-vault-data.js`.
- Local round-trip verification passed: AES-GCM decrypt -> gzip decompress -> plaintext SHA-256 -> JSON parse.
- GitHub blob SHA for all 5 ciphertext parts matches the locally verified source byte-for-byte.
- Initial vault contains 622 records, collection range 689-1310. It is not the complete DUELIX CFL card database.
- Verification flags and missing ability text remain unchanged from source; encryption does not imply card-data verification.
- Special-print gacha catalog is intentionally empty/disabled until gold treasure, secret, promo, or other variants are verified and later enabled.
