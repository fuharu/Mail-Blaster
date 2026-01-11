# AI Coding Agent Instructions (Email Power Wash)

このリポジトリで AI コーディング支援を行う際の実務的なガイドです。汎用論ではなく、このプロジェクト固有の構成・約束事・ワークフローにフォーカスしています。

## 概要 / 目的
- 未読メールを Pixi.js キャンバス上の「汚れ」として表現し、洗浄操作で Gmail にアーカイブ同期するプロトタイプ。
- 認証は `@react-oauth/google` を利用したクライアントサイド OAuth。バックエンドはありません。
- 2D 実装が標準。3D 実装（React Three Fiber）はオプション。

## 主要構成（読み取りの出発点）
- アプリ UI とフロー: [src/App.tsx](../src/App.tsx)
  - 状態: `accessToken`, `emails`, `cleanedIds`, `status`。
  - フロー: ログイン → 未読ID取得 → 詳細取得 → キャンバス洗浄 → `archiveMessages()` 実行。
- エントリ・認証プロバイダ: [src/main.tsx](../src/main.tsx)
  - `GoogleOAuthProvider` に `VITE_GOOGLE_CLIENT_ID` を供給。
- Gmail API 呼び出し: [src/GmailService.ts](../src/GmailService.ts)
  - `fetchUnreadMessageIds()`, `fetchMessageDetails()`, `archiveMessages()` を `axios` で実装。
- 2D キャンバス（標準）: [src/components/CleaningCanvas.tsx](../src/components/CleaningCanvas.tsx)
  - Pixi v8 の初期化/破棄、洗浄ロジック（`alpha` 減衰、`onCleanComplete()` でID収集）。
- 3D キャンバス（任意）: [src/components/CleaningCanvas3D.tsx](../src/components/CleaningCanvas3D.tsx)
  - React Three Fiber + Drei。`hover` で `opacity` を減らす UI。
- 型定義: [src/types.ts](../src/types.ts)
  - `EmailMessage`, `CleaningMode`, `DirtPhysicsState` 等。
- 補助システム（拡張用）: [src/systems/InteractionSystem.ts](../src/systems/InteractionSystem.ts), [src/systems/ParticleSystem.ts](../src/systems/ParticleSystem.ts)
  - 現状 UI に未統合。将来の当たり判定/粉砕エフェクト分離用。

## 実行・ビルド・Lint
- 開発: `npm run dev`（Vite）
- 本番ビルド: `npm run build`（`tsc -b` → `vite build`）
- プレビュー: `npm run preview`
- Lint: `npm run lint`
- Node.js v18+ 推奨。`.env` に `VITE_GOOGLE_CLIENT_ID` が必須。

## 認証・環境変数（重要）
- `VITE_GOOGLE_CLIENT_ID` を `.env` に設定し、Google Cloud Console の承認済み生成元/リダイレクトURIに `http://localhost:5173` を含める。
- スコープは `https://www.googleapis.com/auth/gmail.modify`。
- テストユーザー登録がないとログインが失敗します（README 記載の手順に準拠）。

## データフロー / 連携の要点
- 認証: `useGoogleLogin()` 成功 → `accessToken` を `App` に保持。
- 取得: `fetchUnreadMessageIds(accessToken)` → `fetchMessageDetails(accessToken, id)` を `Promise.all` で並列取得。
- 表示/操作: キャンバスで「汚れ」を洗浄 → 完了時 `onCleanComplete(cleanedIds)` を介して `App` にID連携。
- 同期: `archiveMessages(accessToken, cleanedIds)` で `INBOX` ラベルを外し、Gmailにアーカイブ反映。

## 2D 実装のパターン（Pixi v8）
- 初期化: `const app = new PIXI.Application(); await app.init({...});` → `container.appendChild(app.canvas)`。
- 図形描画: `graphics.rect(...); graphics.fill(color);`（v8 の API に準拠）。
- インタラクション: `container.eventMode = 'static'`, `pointerdown/up` でフラグ切替、`app.ticker.add()` で毎フレーム処理。
- 破棄: `app.destroy({ removeView: true }, { children: true })`（`useEffect` cleanup）。

## 3D モード切替の約束事
- 使用時は [README.md](../README.md) の記載どおり、[src/App.tsx](../src/App.tsx) の `CleaningCanvas` を `CleaningCanvas3D` に差し替え。
- 依存はすでに `package.json` に含まれています（`three`, `@react-three/fiber`, `@react-three/drei`, `@types/three`）。

## 拡張指針（このプロジェクト固有の慣習）
- Pixi オブジェクトへ物理拡張を行う場合は `dirt.physics: DirtPhysicsState` を付加（例: `InteractionSystem`）。
- 洗浄モードは `CleaningMode`（`ARCHIVE` / `DELETE`）で分岐し、演出は `ParticleSystem`/`InteractionSystem` に委譲予定。
- UI 状態は `App` で集中管理し、キャンバス側は `props` 経由で一方向連携（`onCleanComplete()`）。

## よくある落とし穴 / デバッグ観点
- `npm run dev` の失敗は `.env` 未設定、GCP 設定（承認済み生成元/テストユーザー）不足が原因になりがち。
- Pixi v7 の API で書かない（v8 仕様: `rect`/`fill`/`app.init`）。
- Gmail の `batchModify` は `removeLabelIds: ['INBOX']` を前提（ラベル設計を変更する場合は影響範囲確認）。

---
改善余地や不明点があれば指摘してください。特に `systems/` の統合方針（どのタイミングで `InteractionSystem` を導入するか）について、期待する拡張方向があれば追記します。