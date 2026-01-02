# Data Model（概念）

※現行DBの正確なフィールドはコード側を正とし、この文書は「仕様の基準」です。

## Entity一覧
### Schedule(Event)
- id (UUID)
- title
- description (optional)
- organizer_email (optional)
- admin_edit_key_hash
- response_deadline_at (optional)
- finalized_candidate_id (optional)
- created_at / updated_at
- retention_delete_at（または created_at + 保持期間）

### CandidateSlot
- id
- schedule_id (FK)
- start_at
- end_at
- label (optional)
- created_at

### ParticipantResponse
- id
- schedule_id (FK)
- participant_display_name (optional)
- participant_email (optional)
- edit_token_hash
- created_at / updated_at

### ResponseItem（候補×回答）
- id
- response_id (FK)
- candidate_id (FK)
- availability enum: { OK, MAYBE, NG }

### NotificationLog
- id
- schedule_id (FK)
- type enum: { RESPONSE_EMAIL, DEADLINE_REMINDER, FINALIZED_NOTICE, ... }
- to (email / channel)
- status enum: { SUCCESS, FAILED, RETRYING }
- error_code / error_message (PIIを含めない)
- sent_at
- created_at

## 制約（重要）
- Schedule UUIDは推測困難であること（UUIDv4等）
- edit_token/admin_key は **平文保存しない**（hash化）
- deadline後の書き込み可否ルールを実装と一致させる（docsに明記）
- CSV出力と summary の整合性をテストで担保
