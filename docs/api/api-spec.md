# API Spec (v1)

## Base
- `/api/v1`

## Endpoints（README記載）
- `GET /schedules/` イベント一覧
- `POST /schedules/` イベント作成
- `GET /schedules/{uuid}/` イベント詳細
- `POST /schedules/{uuid}/respond/` 回答送信
- `POST /schedules/{uuid}/finalize/` 日程確定
- `GET /schedules/{uuid}/export_csv/` CSV出力
- `GET /schedules/{uuid}/summary/` 集計結果

## 認可モデル（現状想定）
- 共有URL: 読み取り/回答が可能
- 回答編集: `edit_token` による
- 確定/編集: `admin_edit_key` による

## 代表スキーマ（提案）
### Create Schedule
Request:
- title
- description?
- candidates: [{start_at, end_at, label?}]
- response_deadline_at?
- organizer_email?

Response:
- uuid
- share_url
- admin_edit_key (初回のみ表示)
- ...

### Respond
Request:
- participant_display_name?
- participant_email?
- items: [{candidate_id, availability}]

Response:
- edit_token（初回のみ表示 or クッキー保存）

## エラー設計（提案）
- 400: validation error（フィールド単位で返す）
- 401/403: token/key 不正
- 404: uuid 不正
- 409: 期限切れ、確定済み等
