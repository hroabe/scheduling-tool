# API設計書

## 1. ベースURL

```
/api/v1/
```

---

## 2. エンドポイント一覧

### Schedule（イベント）

| Method | Path | 説明 | 認証 | Phase |
|--------|------|------|------|-------|
| ~~GET~~ | ~~`/api/v1/schedules/`~~ | ~~一覧~~ | - | **Phase 0で無効化** |
| POST | `/api/v1/schedules/` | イベント作成 | なし | 現在 |
| GET | `/api/v1/schedules/{uuid}/` | イベント詳細取得 | なし | 現在 |
| PATCH | `/api/v1/schedules/{uuid}/` | イベント更新 | edit_key | 現在 |
| DELETE | `/api/v1/schedules/{uuid}/` | イベント削除 | edit_key | 現在 |

### カスタムアクション

| Method | Path | 説明 | 認証 | Phase |
|--------|------|------|------|-------|
| POST | `/api/v1/schedules/{uuid}/respond/` | 出欠回答の送信/更新 | なし (edit_tokenで更新) | 現在 |
| POST | `/api/v1/schedules/{uuid}/finalize/` | 日程確定（`candidate_id: null` で確定解除） | edit_key | 現在 |
| POST | `/api/v1/schedules/{uuid}/verify_edit_key/` | 編集キーの検証（200 / 403、30回/時/IP） | edit_key | **実装時追加** |
| GET | `/api/v1/schedules/{uuid}/export_csv/` | CSV出力 | なし | 現在（Phase 0で強化） |
| GET | `/api/v1/schedules/{uuid}/export_ics/` | ICS出力 | なし | **Phase 1a 新規** |
| GET | `/api/v1/schedules/{uuid}/summary/` | 集計結果+おすすめ | なし | 現在（Phase 1aで拡張） |

### Candidate（候補日）

| Method | Path | 説明 | 認証 | Phase |
|--------|------|------|------|-------|
| GET | `/api/v1/schedules/{uuid}/candidates/` | 候補日一覧 | なし | 現在 |
| POST | `/api/v1/schedules/{uuid}/candidates/` | 候補日追加 | **edit_key** | Phase 1a |
| DELETE | `/api/v1/schedules/{uuid}/candidates/{id}/` | 候補日削除 | **edit_key** | Phase 1a |

### Participant（参加者）

| Method | Path | 説明 | 認証 | Phase |
|--------|------|------|------|-------|
| GET | `/api/v1/schedules/{uuid}/participants/` | 参加者一覧 | なし | 現在 |
| DELETE | `/api/v1/schedules/{uuid}/participants/{id}/` | 参加者削除 | edit_key or edit_token | 現在 |

### ドキュメント

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/schema/` | OpenAPIスキーマ (JSON) |
| GET | `/api/docs/` | Swagger UI |
| GET | `/api/redoc/` | ReDoc |

---

## 3. API詳細仕様

### POST `/api/v1/schedules/` - イベント作成

**Request:**
```json
{
    "name": "チームミーティング",
    "owner_name": "山田太郎",
    "description": "週次定例会議",
    "edit_key": "secret123",
    "deadline": "2026-04-10T23:59:00+09:00",
    "allow_maybe": true,
    "candidates": [
        {
            "start_at": "2026-04-01T10:00:00+09:00",
            "end_at": "2026-04-01T11:00:00+09:00",
            "note": ""
        },
        {
            "start_at": "2026-04-02T14:00:00+09:00",
            "end_at": "2026-04-02T15:00:00+09:00",
            "note": ""
        }
    ]
}
```

**Response: 201 Created**
```json
{
    "id": 1,
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "チームミーティング",
    "owner_name": "山田太郎",
    "description": "週次定例会議",
    "deadline": "2026-04-10T23:59:00+09:00",
    "allow_maybe": true,
    "is_active": true,
    "is_finalized": false,
    "candidates": [...],
    "url": "/event/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "created_at": "2026-03-24T10:00:00+09:00"
}
```

**注意**: `edit_key`はレスポンスに含めない。edit_key未入力時はサーバーがランダム生成し、
作成レスポンスの`_edit_key`フィールドで**1回だけ**平文返却する。

---

### POST `/api/v1/schedules/{uuid}/respond/` - 出欠回答

**Request:**
```json
{
    "name": "佐藤花子",
    "comment": "午後なら参加できます",
    "attendances": [
        {"candidate": 1, "status": "ok"},
        {"candidate": 2, "status": "maybe"}
    ]
}
```

**Response: 201 Created**
```json
{
    "id": 1,
    "name": "佐藤花子",
    "comment": "午後なら参加できます",
    "edit_token": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "attendances": [
        {"candidate": 1, "status": "ok"},
        {"candidate": 2, "status": "maybe"}
    ],
    "created_at": "2026-03-24T11:00:00+09:00"
}
```

**更新時**: 同じリクエストに`edit_token`を含めて送信すると、既存回答を更新。

---

### GET `/api/v1/schedules/{uuid}/export_ics/` - ICSエクスポート **[Phase 1a 新規]**

**Query Params:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| candidate_id | int | No | 指定時はその候補のみ出力。省略時は全候補 |

**Response: 200 OK**
```
Content-Type: text/calendar; charset=utf-8
Content-Disposition: attachment; filename="チームミーティング.ics"

BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SchedulingTool//JP
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:a1b2c3d4-1@scheduling-tool
DTSTART:20260401T010000Z
DTEND:20260401T020000Z
DTSTAMP:20260324T010000Z
SUMMARY:チームミーティング
DESCRIPTION:週次定例会議\n\n回答状況: ◯4 △1 ×0\n主催: 山田太郎
STATUS:TENTATIVE
END:VEVENT
END:VCALENDAR
```

**仕様**:
- 確定済み(`is_finalized=true`)の場合、`finalized_candidate`のみをSTATUS:CONFIRMEDで出力
- 未確定の場合、全候補をSTATUS:TENTATIVEで出力
- DESCRIPTIONに回答状況サマリーを含める
- ICSフィールドのエスケープ: `\`, `;`, `,` → `\\`, `\;`, `\,`

---

### GET `/api/v1/schedules/{uuid}/summary/` - 集計結果 **[Phase 1aで拡張]**

**Response: 200 OK**
```json
{
    "schedule_id": 1,
    "schedule_name": "チームミーティング",
    "total_participants": 5,
    "candidates": [
        {
            "candidate_id": 1,
            "start_at": "2026-04-01T10:00:00+09:00",
            "end_at": "2026-04-01T11:00:00+09:00",
            "ok_count": 4,
            "maybe_count": 1,
            "ng_count": 0,
            "score": 9,
            "is_recommended": true
        },
        {
            "candidate_id": 2,
            "start_at": "2026-04-02T14:00:00+09:00",
            "end_at": "2026-04-02T15:00:00+09:00",
            "ok_count": 2,
            "maybe_count": 2,
            "ng_count": 1,
            "score": 6,
            "is_recommended": false
        }
    ],
    "recommended_candidate": {
        "candidate_id": 1,
        "start_at": "2026-04-01T10:00:00+09:00",
        "end_at": "2026-04-01T11:00:00+09:00",
        "ok_count": 4,
        "maybe_count": 1,
        "ng_count": 0,
        "score": 9,
        "is_recommended": true
    }
}
```

**拡張内容**: 各candidateに`is_recommended`フラグ（最高スコアの候補にtrue）を追加。

---

## 4. 編集キーの送信方法

編集キーが必要なエンドポイントでは `X-Edit-Key` ヘッダー（推奨）またはリクエストボディの `edit_key` で送信する。
クエリパラメータ（アクセスログに残る）は受け付けない。

```
PATCH /api/v1/schedules/{uuid}/
X-Edit-Key: secret123
Content-Type: application/json

{"name": "新しいイベント名"}
```

その他の運用エンドポイント:

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/health/` | ヘルスチェック（DB接続確認） |
| GET | `/robots.txt` | APIドメインのクロール拒否 |

---

## 5. エラーレスポンス形式

```json
{
    "detail": "編集キーが正しくありません。"
}
```

| HTTPステータス | 用途 |
|--------------|------|
| 400 Bad Request | バリデーションエラー（edit_key不一致含む） |
| 403 Forbidden | 削除時のedit_key不一致 |
| 404 Not Found | 存在しないUUID |
| 429 Too Many Requests | レート制限超過 |

---

## 6. Phase 0で無効化されるAPI

| Method | Path | 対応 |
|--------|------|------|
| GET | `/api/v1/schedules/` | 405 Method Not Allowed を返す |
| - | `search_fields`, `ordering_fields`, `filterset_class` | ViewSetから削除 |
