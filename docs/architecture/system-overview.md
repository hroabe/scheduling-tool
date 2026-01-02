# System Overview

## 技術スタック（README要約）
### Backend
- Python 3.11+
- Django 5.1 / Django REST Framework
- PostgreSQL（SQLiteでも動作）
- Redis（キャッシュ・Celeryブローカー）
- Celery（非同期タスク）

### Frontend
- Next.js 15（App Router）
- React 19 / TypeScript
- Chakra UI v2
- TanStack Query / Zustand / Framer Motion

## コンポーネント
- Web UI（Next.js）: イベント作成・回答・集計閲覧・確定
- API（Django/DRF）: イベント/候補/回答/確定/集計/CSV/通知ログ
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

## 将来拡張ポイント
- OAuthトークン/連携設定（Userに紐づけ）
- 1対1モード: availabilityスロット生成、予約=確定
- WebSocket: 回答状況のライブ更新
