# データベース設計書

## 1. ER図

```
Schedule (イベント)
  │── 1:N ──→ Candidate (候補日)
  │                │── N:1 ←── Attendance (出欠) ──→ N:1 ── Participant (参加者)
  │── 1:N ──→ Participant (参加者)
  │── 1:N ──→ Notification (通知ログ) ※Phase 0で凍結
  │── N:1 ──→ Candidate (finalized_candidate)
```

---

## 2. モデル定義

### Schedule（イベント）

| フィールド | 型 | 制約 | 備考 |
|-----------|-----|------|------|
| id | AutoField | PK | |
| uuid | UUIDField | unique, indexed | 公開URL用識別子 |
| name | CharField(200) | required, min_length=1 | イベント名 |
| description | TextField | optional | 説明 |
| owner_name | CharField(100) | required | 主催者名 |
| owner_email | EmailField | optional | 通知用（APIレスポンスに含めない） |
| department | CharField(200) | optional | 所属（APIに残すがフロントでは非表示） |
| edit_key | CharField(**256**) | optional | **ハッシュ化保存**（Phase 0で変更） |
| deadline | DateTimeField | optional | 回答期限 |
| timezone_name | CharField(50) | default="Asia/Tokyo" | |
| is_active | BooleanField | default=True | |
| allow_maybe | BooleanField | default=True | △回答を許可 |
| show_participant_count | BooleanField | default=True | **APIレスポンスから除外** |
| notify_on_response | BooleanField | default=False | **APIレスポンスから除外**（通知凍結） |
| is_finalized | BooleanField | default=False | 日程確定済みか |
| finalized_candidate | FK(Candidate) | nullable, SET_NULL | 確定した候補日 |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**インデックス**: `uuid`（unique）, `['is_active', 'is_finalized']`（複合）, `created_at`

**プロパティ**: `is_expired` (deadline過ぎたか), `can_respond` (回答可能か)

**メソッド**:
- `set_edit_key(raw_key)`: `make_password()`でハッシュ化して保存
- `check_edit_key(raw_key)`: `check_password()`で検証。edit_key未設定時はTrue

### Candidate（候補日）

| フィールド | 型 | 制約 | 備考 |
|-----------|-----|------|------|
| id | AutoField | PK | |
| schedule | FK(Schedule) | CASCADE, related_name="candidates" | |
| start_at | DateTimeField | required | 開始日時 |
| end_at | DateTimeField | required | 終了日時 |
| note | CharField(200) | optional | 備考 |
| order | PositiveIntegerField | default=0 | 表示順 |
| created_at | DateTimeField | auto_now_add | |

**注意**: `ok_count`, `maybe_count`, `ng_count`はモデルプロパティとして定義されているが、
ViewSetでは**annotateによる一括集計を使用**すること（N+1回避）。

### Participant（参加者）

| フィールド | 型 | 制約 | 備考 |
|-----------|-----|------|------|
| id | AutoField | PK | |
| schedule | FK(Schedule) | CASCADE, related_name="participants" | |
| name | CharField(100) | required | 参加者名 |
| comment | TextField | optional | コメント |
| edit_token | UUIDField | auto, unique | 回答編集用トークン |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**ユニーク制約**: `(schedule, name)`

### Attendance（出欠）

| フィールド | 型 | 制約 | 備考 |
|-----------|-----|------|------|
| id | AutoField | PK | |
| schedule | FK(Schedule) | CASCADE | |
| participant | FK(Participant) | CASCADE | |
| candidate | FK(Candidate) | CASCADE | |
| status | CharField(10) | choices: ok/maybe/ng/pending | 出欠ステータス |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**ユニーク制約**: `(participant, candidate)`

### Notification（通知ログ）- **Phase 0で凍結**

| フィールド | 型 | 制約 | 備考 |
|-----------|-----|------|------|
| id | AutoField | PK | |
| schedule | FK(Schedule) | CASCADE | |
| notification_type | CharField(20) | choices | new_response/deadline_reminder/finalized |
| recipient_email | EmailField | required | |
| subject | CharField(200) | | |
| body | TextField | | |
| sent_at | DateTimeField | auto_now_add | |
| is_sent | BooleanField | | |
| error_message | TextField | optional | |

**凍結理由**: Celery削除に伴いメール通知機能を停止。テーブルとモデル定義は残すが、
APIレスポンスには含めず、新規レコードも作成しない。

---

## 3. Phase 0 マイグレーション

### Migration 1: edit_key max_length変更

```python
# ハッシュ値（make_password出力）を格納するため100→256に拡張
AlterField(
    model_name='schedule',
    name='edit_key',
    field=models.CharField(max_length=256, blank=True, null=True),
)
```

### Migration 2: 既存edit_keyデータのハッシュ化

```python
# RunPythonで既存の平文edit_keyを一括ハッシュ化
# make_password() を使用
# 可逆: RunPython.noop（ハッシュ→平文は不可逆なので逆方向は何もしない）
```

---

## 4. クエリ最適化パターン

### Before（N+1問題あり）

```python
# summaryアクション: 候補日ごとにcount()が3回実行
for candidate in schedule.candidates.all():  # 1クエリ
    ok = candidate.ok_count      # +1クエリ（各候補日で）
    maybe = candidate.maybe_count # +1クエリ
    ng = candidate.ng_count       # +1クエリ
# → N候補日で 1 + 3N クエリ
```

### After（annotateで1クエリ）

```python
candidates = Candidate.objects.filter(
    schedule=schedule
).annotate(
    annotated_ok_count=Count('attendances', filter=Q(attendances__status='ok')),
    annotated_maybe_count=Count('attendances', filter=Q(attendances__status='maybe')),
    annotated_ng_count=Count('attendances', filter=Q(attendances__status='ng')),
).order_by('order', 'start_at')
# → 1クエリ
```

### export_csvの最適化

```python
# Before: participant x candidate ごとにattendance.get() → O(N*M)クエリ
# After: 全Attendanceを一括取得してdictルックアップ → 1クエリ
attendances = Attendance.objects.filter(schedule=schedule).select_related('participant', 'candidate')
attendance_map = {(a.participant_id, a.candidate_id): a.get_status_display() for a in attendances}
```
