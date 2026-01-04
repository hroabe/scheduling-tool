# RFC-0004: Meeting URL 自動発行（Zoom/Teams/Meet）

## 1. Summary
日程確定時に会議URLを自動生成し、イベント詳細/通知に反映する。

対象:
- Google Meet（Googleカレンダー経由で自動付与される形を優先）
- Microsoft Teams（Outlook/Graph連携が前提）
- Zoom（Zoom OAuth + meeting create）

## 2. Motivation
- 「確定したのに会議URLがない」手間をなくす
- 価値が分かりやすく、有料化の訴求点になる

## 3. Goals / Non-Goals
### Goals
- 確定後に会議URLが生成され、ユーザーに提示される
- 失敗時は再試行し、ログで追える
- URLの漏洩リスクを下げる（表示範囲・ログ・通知内容）

### Non-Goals
- 参加者ごとの個別招待（初期は幹事中心）
- 高度な会議設定（録画/待機室等）は後続

## 4. User Experience
- 幹事が「確定」→ 画面に会議URLが表示される
- メール通知にも会議URLが含まれる（管理キー等は含めない）

## 5. Design
### Approach（推奨）
- Google Meet: RFC-0001（確定→Googleカレンダー登録）で自然に獲得
- Teams: RFC-0002 のOutlook連携で OnlineMeeting/Event 作成時に取得
- Zoom: Zoom APIで meeting create → join_url を保存

### Backend
- `Schedule` に `meeting_provider` / `meeting_url` / `meeting_created_at`（名称は実装で決める）
- finalize 後の Celery タスクとして外部APIを呼ぶ
- 成功/失敗は通知ログに記録

### Idempotency
- `meeting_url` が既に存在する場合は再発行しない
- 再発行ボタンは別途検討（要件が固まってから）

### Security/Privacy
- 管理キー/編集トークンはメールに載せない
- meeting_url を「参加者にも見せるか」は要決定（初期は幹事のみ推奨）

## 6. Alternatives
- Meet/Teamsは「カレンダー登録だけ」に寄せ、Zoomを後回し
- URLを保存しない（再現性/通知の問題がある）

## 7. Rollout Plan
- Phase1: Google（確定→カレンダー登録→Meet URL）
- Phase2: Outlook/Teams
- Phase3: Zoom

## 8. Test Plan
- unit: providerごとのURL保存
- integration: finalize → task enqueue → external mock
- e2e: 確定後にURL表示、ログが残る

## 9. Open Questions
- meeting_url の閲覧権限（参加者/幹事）
- 再発行の要件（URL変更時の通知など）
