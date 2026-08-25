# DUELIX CFL Card Vault / Special Print Gacha

## 目的

公開リポジトリにカード情報を平文で置かず、DUELIX CFL から必要なときだけブラウザ内で開いて検索できる Card Vault を用意する。

同時に、通常カードのルール情報と、金トレジャー・シークレット・プロモ等の特殊版を分離して管理し、将来のコレクション/ガチャ機能へ接続できる基盤を置く。

## Card Vault の安全境界

- カードデータは AES-256-GCM で暗号化する。
- 鍵導出は PBKDF2-SHA256 を使用する。
- 解除キーは GitHub リポジトリへ保存しない。
- 暗号文は `data/card-vault.ct.01.txt` ～ `05.txt` に分割し、`data/card-vault.meta.json` から読み込む。
- 復号後は SHA-256 を確認し、整合性が一致しなければ利用しない。
- 解除はブラウザ内でのみ行い、解除済みデータを自動で GitHub/Firebase 等へ送信しない。
- `file://` 直開きではなく HTTP(S) で配信して使用する。

## 現在の Vault データ範囲

現在の初期 Vault は、既存の機械可読 MASTER から回収できた **622件 / No.689～1310** を収録している。

これは DUELIX CFL の完全カードDBではない。No.1～688 および No.1311 以降を含む全カードを収録済みという意味ではない。

また暗号化はカード情報の正しさを保証する処理ではない。元データの `verification_status` や、未収録の `official_text` はそのまま保持する。正式DBへ利用する際は従来の検証・staging・conflict・human approval の境界を維持する。

## 使い方

1. リポジトリを HTTP(S) で起動する。
2. `card-vault.html` を開く。
3. GitHub 外で保管している解除キーを入力する。
4. 整合性検証に成功するとカード情報を検索できる。
5. 必要な場合のみ、解除済み JSON を手動で書き出す。

解除キーを README、ソースコード、issue、PR、Actions log、Firebase設定、GitHub上のJSON等へ記録しないこと。

## Special Print Gacha

`gacha.html` / `gacha-engine.js` は、カード本体と特殊版を分離した将来用の抽選基盤。

対象候補:

- 金トレジャー
- シークレット
- プロモ
- 神アート
- その他、将来正式採用する希少版/特殊printing

現在の `data/special-print-catalog.json` は意図的に無効・空。ユーザー方針により、金トレジャーとシークレットは通常カード回収から一旦後回しにしているため、確認していない特殊版を架空データで埋めない。

特殊版を追加するときは、通常カードのルール上の identity と、printing / variant identity を分離する。ガチャ結果によってカード能力・デッキ合法性・基本カード identity を変更しない。

## ガチャの現在の制約

- 課金なし。
- 換金なし。
- 現実の商品・賞品との交換なし。
- 抽選カタログは確認済みデータを後から投入する。
- 重み/確率はデータで明示的に設定し、未決定なら有効化しない。

## 更新時チェック

Card Vault 更新時は最低限以下を確認する。

1. 元カードデータの出典と範囲を記録。
2. 暗号化前 plaintext SHA-256 を記録。
3. 暗号文生成後、復号→展開→SHA-256一致を確認。
4. GitHubへ置いた暗号文パーツがローカル生成物と byte-for-byte 一致することを確認。
5. 解除キーが Git diff / GitHub / logs に混入していないことを確認。
6. カード情報の検証状態を暗号化処理によって勝手に VERIFIED へ昇格させない。
