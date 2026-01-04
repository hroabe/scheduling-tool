# RFC-0002: Outlookカレンダー連携（Microsoft Graph）

## 1. Summary
Microsoft Graph API を用いて Outlook（Microsoft 365）の予定連携を行い、以下を提供する：
- 空き時間（予定）取得
- 確定日程の自動登録
- （将来）Teams会議URLの自動発行の土台

## 2. Motivation
- 法人利用を狙う上でOutlook/Teamsは必須級
- 幹事の候補作成負荷・確定後の登録作業を削減し、継続利用の価値を上げる

## 3. Goals / Non-Goals
### Goals
- OAuth 2.0（MS Entra）での連携
- 個人カレンダーの予定取得（最小スコープ）
- 確定日程のOutlook登録（1イベント作成）
- 失敗時の再試行・ログ（NotificationLog）

### Non-Goals
- Exchangeの高度な権限/共有カレンダー操作（初期は対象外）
- 組織ポリシーでブロックされるケースの完全吸収（FAQ/ガイドで対応）

## 4. User Experience
- ログインユーザー（幹事）が「Outlook連携」ボタンを押す
- 連携済みの場合、確定時に自動でOutlookへ登録
- 予定取得は「候補生成」の補助として段階導入（後続フェーズ）

## 5. Design
### Backend
- `POST /api/v1/integrations/outlook/connect` : OAuth開始URLを返す
- `GET /api/v1/integrations/outlook/callback` : code→token交換、保存
- `GET /api/v1/integrations/outlook/calendarView?start=...&end=...` : 予定取得（候補生成用）
- finalize 後に Celery で「Outlookイベント作成」ジョブ投入

#### 失敗設計
- Graph API: timeout / 429 / 5xx を想定し Celery retry（指数バックオフ）
- 永続的失敗（403/invalid_grant）は Integration を無効化し、UIへ再連携を促す

### Data model
- `UserIntegration`（Userに紐づく）
  - provider: outlook
  - access_token（短命）
  - refresh_token（暗号化 at rest 推奨）
  - expires_at
  - scopes
  - revoked_at

### Security/Privacy
- refresh token はログ禁止、暗号化
- state 検証、リダイレクトURI固定
- 最小スコープ（予定の読み取り/書き込みに限定）

### Migration
- 既存イベントの自動登録は「確定後から」を基本（過去のイベントへの遡及はしない）

## 6. Alternatives
- 予定取得をしないで「登録のみ」から始める（Phase1）
- Teams URLは Graph の OnlineMeeting API を別RFCで扱う

## 7. Rollout Plan
- Phase1: 確定後のOutlook登録のみ（最短）
- Phase2: 予定取得→候補提案（UX改善）
- Phase3: Teams会議URLの自動発行（RFC-0004 と統合検討）

## 8. Test Plan
- unit: token保存/更新、エラーハンドリング
- integration: finalize → Celery job enqueue → Graph mock
- e2e: 連携済みユーザーで finalize が成功し、ログに成功が残る

## 9. Open Questions
- Graphの利用スコープ（Calendars.Read / Calendars.ReadWrite）の最小はどこか
- マルチテナント対応の要否（まずは個人向けで良いか）
