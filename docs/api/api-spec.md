# API Spec (v1) — 実装整合版（契約ドキュメント）

> 目的: APIの「契約」を明文化し、Frontend/Mobile/外部連携が安全に実装できるようにする。  
> **注意:** 実装のserializer/responseが最終的な真実（source of truth）です。本書はそれと同期します。

---

## Base
- `/api/v1`

## 共通仕様
### Content-Type
- Request/Response: `application/json`（CSVは例外）

### 日時
- ISO-8601（例: `2026-01-03T12:34:56+09:00`）

### 認可モデル（現状）
- 共有URL（Scheduleの `uuid`）で閲覧/回答が可能
- 幹事操作（確定など）は `edit_key`（将来はhash化）
- 回答編集は `edit_token`（将来はhash化）

### エラー形式（DRFの一般形）
- **認可/認証エラー**:  
  - `{"detail": "Authentication credentials were not provided."}` など
- **バリデーションエラー**:  
  - `{"field_name": ["error message"]}`
- **存在しない**:  
  - `{"detail": "Not found."}`
- **不正状態（期限切れ/確定済み等）**:  
  - `{"detail": "..."}`（将来 `{"code": "...", "detail": "..."}` 形式へ統一推奨）

---

## 1) Schedules

### GET `/schedules/`
イベント一覧（公開一覧か管理用途かは実装依存）

**Response（例）**
```json
[
  {
    "id": 1,
    "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "name": "案件A 日程調整",
    "owner_email": "owner@example.com",
    "response_deadline_at": "2026-01-10T23:59:00+09:00",
    "created_at": "2026-01-03T08:00:00+09:00",
    "updated_at": "2026-01-03T08:00:00+09:00"
  }
]
```

### POST `/schedules/`
イベント作成

**Request（例）**
```json
{
  "name": "案件A 日程調整",
  "owner_email": "owner@example.com",
  "response_deadline_at": "2026-01-10T23:59:00+09:00",
  "candidates": [
    { "start_at": "2026-01-12T10:00:00+09:00", "end_at": "2026-01-12T11:00:00+09:00" }
  ]
}
```

**Response（例）**
```json
{
  "id": 1,
  "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "name": "案件A 日程調整",
  "owner_email": "owner@example.com",
  "edit_key": "ONLY_RETURN_ON_CREATE",
  "response_deadline_at": "2026-01-10T23:59:00+09:00",
  "candidates": [
    { "id": 10, "start_at": "2026-01-12T10:00:00+09:00", "end_at": "2026-01-12T11:00:00+09:00" }
  ],
  "created_at": "2026-01-03T08:00:00+09:00",
  "updated_at": "2026-01-03T08:00:00+09:00"
}
```

> `edit_key` は **作成時のみ返却** を推奨（実装と同期して調整）。

### GET `/schedules/{uuid}/`
イベント詳細

**Response（例）**
```json
{
  "id": 1,
  "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "name": "案件A 日程調整",
  "owner_email": "owner@example.com",
  "response_deadline_at": "2026-01-10T23:59:00+09:00",
  "finalized_candidate": null,
  "candidates": [
    { "id": 10, "start_at": "2026-01-12T10:00:00+09:00", "end_at": "2026-01-12T11:00:00+09:00" }
  ]
}
```

### POST `/schedules/{uuid}/respond/`
回答送信（参加者の作成/更新 + Attendanceの更新）

**Request（例）**
```json
{
  "display_name": "田中",
  "email": "tanaka@example.com",
  "items": [
    { "candidate_id": 10, "availability": "OK" },
    { "candidate_id": 11, "availability": "NG" }
  ],
  "edit_token": "OPTIONAL_ON_UPDATE"
}
```

**Response（例）**
```json
{
  "participant_id": 100,
  "edit_token": "ONLY_RETURN_ON_CREATE_OR_ROTATE",
  "updated": true
}
```

### POST `/schedules/{uuid}/finalize/`
日程確定（幹事操作）

**Request（例）**
```json
{
  "candidate_id": 10,
  "edit_key": "ADMIN_EDIT_KEY"
}
```

**Response（例）**
```json
{
  "finalized_candidate": 10,
  "status": "finalized"
}
```

### GET `/schedules/{uuid}/summary/`
集計結果

**Response（例）**
```json
{
  "schedule_uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "candidates": [
    {
      "candidate_id": 10,
      "ok": 3,
      "maybe": 1,
      "ng": 0,
      "participants_total": 4
    }
  ],
  "participants": {
    "total": 4,
    "responded": 4,
    "pending": 0
  }
}
```

### GET `/schedules/{uuid}/export_csv/`
CSV出力  
- `text/csv` を返す  
- 文字コード/ヘッダ/カラム順は契約化し、回帰テストで固定する

---

## 2) 契約の同期方法（推奨）
- serializer 変更時は **この md を更新**し、PRで差分をレビューできるようにする
- 可能なら OpenAPI（drf-spectacular等）を導入し、本mdは「仕様の要約」とする
