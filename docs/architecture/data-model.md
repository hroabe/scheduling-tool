# Data Model（概念 / 実装準拠）

この文書は **現状の実装（models.py）に合わせた命名** を採用しつつ、将来的な改善（hash保存）も併記します。

---

## 1. 命名対応（ドキュメント ↔ 実装）
- Schedule(Event)
  - `id`（DBの内部ID）とは別に、共有URL用の **`uuid` フィールド**を持つ
  - 表示名: `name`（旧ドキュメントの `title` に相当）
  - 幹事メール: `owner_email`（旧ドキュメントの `organizer_email` に相当）
  - 編集キー: `edit_key_hash`（hash保存。平文 `edit_key` は移行済みで常に空）
- CandidateSlot → **Candidate**
- ParticipantResponse → **Participant**
- ResponseItem → **Attendance**
- 回答編集トークン: `edit_token_hash`（hash保存。トークン形式は `<participant_id>.<secret>`）

---

## 2. 現状の実装モデル（概念）
※正確なフィールド一覧はコードを正とします。ここでは「契約として重要なもの」を記載します。

### Schedule
- `id` : DB内部ID
- `uuid` : 共有URL識別子（推測困難）
- `name` : イベント名
- `owner_email` : 幹事メール
- `edit_key_hash` : 管理編集キー（hash。旧 `edit_key` 列は移行済み）
- `response_deadline_at` : 回答期限（任意）
- `finalized_candidate` : 確定候補（任意）
- `created_at`, `updated_at`

### Candidate
- `id`
- `schedule` (FK → Schedule)
- `start_at`, `end_at`
- `created_at`

### Participant
- `id`
- `schedule` (FK → Schedule)
- `display_name`（または `name`）
- `email`（任意）
- `edit_token_hash`（hash。旧 `edit_token` UUID は hash 化して互換維持）
- `created_at`, `updated_at`

### Attendance（候補×回答）
- `id`
- `participant` (FK)
- `candidate` (FK)
- `availability`（◯△× 相当。enum/string）
- `created_at`, `updated_at`

### NotificationLog（※名称は実装依存）
- 通知種別、宛先、成功/失敗、送信時刻、エラー情報（PIIを含めない）

---

## 3. セキュリティ改善（差異を許容し、将来の改善として実施）
**完了済み（2026-09, docs/11_integration.md）**: 以下の計画はマイグレーション `schedule.0003_hash_legacy_credentials` で実施済みです。  
本プロジェクトでは **hashで保存する改善を推奨**し、この差異は「現状→改善」の移行前提として許容します。

### 3.1 目標状態（Target）
- Schedule: `edit_key_hash`（平文 `edit_key` は保存しない）
- Participant: `edit_token_hash`（平文 `edit_token` は保存しない）
- いずれも比較は **hash一致** で行う

### 3.2 移行計画（安全なマイグレーション案）
1. **新カラム追加**: `edit_key_hash` / `edit_token_hash`（nullable）
2. **バックフィル**: 既存平文からhashを作成して埋める
3. **二重判定**: hashがあればhashで判定、無ければ平文で判定（移行期間）
4. **新規発行はhashのみ**: 平文返却は「初回のみ」、DBはhashのみ
5. **平文カラム削除**: 旧カラムをdrop、または完全無効化

### 3.3 ハッシュ方式（推奨）
- `bcrypt` / `argon2` のような **password-hash** を利用（単純SHAは避ける）
- Djangoの `make_password` / `check_password` を流用するのが実装コスト低

