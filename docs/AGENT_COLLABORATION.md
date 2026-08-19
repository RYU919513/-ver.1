# GPT・Codex・GitHub・Copilot 協業運用

## 役割

- **GPT:** ユーザーとの仕様整理、ロードマップと優先順位、Codexへの実装指示、報告評価、次工程・複数アプリ判断、人間操作の説明。Git操作主体ではない。
- **Codex:** 主実装者。リポジトリ調査、実装、テスト、回帰試験、diff、commit、checkpoint、handoff、restore、END CHECK、技術・バグ報告を担当する。
- **GitHub:** canonical repository、branch、commit、Issue、PR、レビュー履歴、CI、協業記録の共有面。実際のcanonical remoteは人間が確認して設定する。
- **Copilot / Agent:** 明確なIssueに分離できる小～中規模作業、テスト・docs・定型修正、PR/レビュー補助。無条件の第二主実装者ではない。

## 最小ブランチ・レビュー規則

安定ブランチから作業ブランチを作り、PR、CI、diff、人間またはCodexレビューを通してからmergeする。既存規則がなければ Codexは `codex/<task>`、CopilotはGitHubが作る専用ブランチ（手動なら `copilot/<task>`）を使う。同一ブランチへ同時実装しない。

1. 1作業・1担当・1 Issue・1 branch・1 PRを原則とする。
2. Issueにexecutor、base commit、対象/非対象、acceptance criteria、tests、安全影響を記録する。
3. 同じ機能を複数Agentへ重複依頼しない。Copilotはcheckpoint/handoffを変更しない。
4. 取り込み前にPRのbase commitと現在の対象branchの共通祖先・差分を確認する。古いbaseならrebase/update後に再検証する。
5. CodexはCopilot PRの全diffとCI/testsを確認し、自動・無条件mergeしない。
6. checkpointのexecutor/Issue/PRを更新し、完了時は `NONE` に戻す。

## checkpoint と handoff

Checkpointは「現在誰が、どのbaseから、何を担当しているか」を次回STARTへ伝える。GitHubは日常共有、handoffはworkspace消失・移行・独立復元の災害対策であり、併用する。handoff内のbundle、manifest、report、restore手順、checksums、auditを維持する。

## Copilotへ適した最初の候補

1. `card-validator.js` の境界値に対する独立した回帰テスト追加（production dataを変更せず、既存挙動を仕様化）。
2. import管理画面の手動アクセシビリティ確認表をdocsへ追加（runtime・データ変更なし）。
3. CI設定ファイルの静的検証テスト追加（deploy/write権限を追加せず、read-only制約を検査）。
