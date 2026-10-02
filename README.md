# 🧾 AI 経費精算ツール (AI Expense Settlement Tool)

<img width="1916" height="1080" alt="ho1me" src="https://github.com/user-attachments/assets/00b55a01-9b1a-4fa1-999e-36220a81e03d" />



日本の「インボイス制度」および「電子帳簿保存法」に完全対応した、B2B SaaS型のAI領収書解析・経費精算システムです。

https://japan-receipt-saas.vercel.app/

## 🎯 プロジェクトの背景・目的
実際のB2B経理業務における「手入力の負荷」と「法対応の複雑さ」を解決するため、Google Gemini AIのマルチモーダル解析を活用し、領収書から必須項目（T番号、税率、金額、日付等）を瞬時に抽出・データ化するシステムを開発しました。

## ✨ コア機能 (Key Features)

*   **🤖 AI 自動解析 & Human-in-the-loop UX:**
    *   Gemini 1.5/3.x Flashモデルを活用し、領収書の6大必須項目を自動抽出。
    *   画面を左右分割（Split View）にし、原本画像と解析結果をユーザーが瞬時に照合・修正できるUIを実装。
*   **⚡ バックグラウンド非同期キュー処理 (Zero-Latency UX):**
    *   複数枚の一括アップロードに対応。
    *   ユーザーが1枚目を確認している裏で、バックグラウンドワーカーが次以降の画像を事前解析(Pre-fetching)。待ち時間を極限まで削減。
*   **🛡️ レジリエンス設計 (自動フォールバック):**
    *   AI APIのサーバー過負荷(503)時、動的に稼働中の代替モデル（例: `3.8-flash` -> `3.6-flash`）へ切り替えるフォールバック処理を実装。
*   **☁️ インフラ・コスト最適化:**
    *   フロントエンドでの画像圧縮（ブラウザ側圧縮）により、アップロード時間を短縮しストレージ費用を節約。
    *   データ削除時、DBのレコードだけでなくStorage上の画像ファイルも同時削除し、孤立ファイル（Orphaned File）を防止。
*   **📊 日本向けCSVエクスポート:**
    *   日本の経理担当者がExcelで開くことを前提とし、文字化け防止のため **UTF-8 BOM** 付きの会計用CSVエクスポート機能を実装。

## 🛠️ 技術スタック (Tech Stack)

*   **Frontend & Backend:** Next.js (App Router), React, TypeScript, Tailwind CSS
*   **Database & Storage:** Supabase (PostgreSQL, Storage)
*   **AI API:** Google Gen AI SDK (Gemini Flash series)
*   **Deployment:** Vercel

## 🏛️ アーキテクチャ設計の工夫
*   **Task.Run / BackgroundService** の概念をReactの `useEffect` キュー管理に応用。
*   **Polly (Resilience Strategy)** の概念をAIモデルの再試行・代替呼び出しに適用。

## 🚀 今後の改善予定
- [ ] NextAuth.js (Auth.js) を用いたマルチテナント(企業別)ログイン機能の追加
- [ ] AIによる勘定科目（Expense Category）の自動推論機能
