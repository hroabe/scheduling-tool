# System Overview（実装整合版 / セキュリティ更新反映）

> 目的: リポジトリの全体像と、運用上の重要ポイント（通知/外部連携/セキュリティ）を共有する。

## 技術スタック（推奨: 5系/15系の最新パッチ）
### Backend
- Python 3.10+（※Django 5.2 LTS 対応範囲）
- Django **5.2.9**（5.2 LTS 最新パッチ）
- Django REST Framework
- PostgreSQL（SQLiteでも動作）
- Redis（キャッシュ・Celeryブローカー）
- Celery（非同期タスク）

### Frontend
- Next.js **15.5.9**（15系 最新パッチ / 2025-12 のRSC脆弱性修正込み）
- Node.js 18.18+ / 20+（Next.js 15の要件に合わせる）
- React / TypeScript
- Chakra UI
- TanStack Query / Zustand / Framer Motion

## コンポーネント
- Web UI（Next.js）: イベント作成・回答・集計閲覧・確定
- API（Django/DRF）: イベント/候補/参加者/回答/確定/集計/CSV/通知ログ
- Worker（Celery）: メール通知、期限リマインド、外部連携（将来）
- Redis: キュー/キャッシュ
- DB: 永続化（イベント/回答/ログ）

## 主要フロー
### 1. イベント作成
UI → API `POST /api/v1/schedules/` → DBに保存 → UUID共有URL返却

### 2. 回答
UI → API `POST /api/v1/schedules/{uuid}/respond/` → DB保存  
必要なら Celery で幹事へメール通知 → Notification Log

### 3. 集計
UI → API `GET /api/v1/schedules/{uuid}/summary/` → 集計結果返却

### 4. 確定
UI → API `POST /api/v1/schedules/{uuid}/finalize/`（管理キー）  
→ 確定通知 +（将来）カレンダー登録・Meeting URL発行

## 運用メモ（重要）
- **Next.js App Router (RSC)** はセキュリティアドバイザリに従い、15系は **15.5.9 以上**を維持する
- 通知/外部API（カレンダー/会議URL）は Celery で実行し、失敗は通知ログに残して再試行する
- edit_key / edit_token の **hash保存移行**（別途タスク）を前提とする
