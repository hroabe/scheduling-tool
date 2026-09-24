# RFC-0001: Googleカレンダー連携

## Summary
- OAuthでGoogle Calendarに連携し、(a) 空き時間の自動取得、(b) 確定日程の自動登録を行う。

## Motivation
- 幹事の候補作成負荷を減らし、確定までの時間を短縮する（差別化/有料化の核）。

## Goals
- Google OAuth（最初は個人アカウント）で連携
- FreeBusy相当の空き取得（またはイベント取得からの推定）
- 確定時にGoogleカレンダーへイベント作成

## Non-Goals
- 複数カレンダーの高度な競合解消（まずは基本）
- 組織/ドメイン制限（後続）

## Design（提案）
### Backend
- `POST /api/v1/integrations/google/connect`（OAuth開始URL発行）
- `GET /api/v1/integrations/google/callback`（code交換、token保存）
- `GET /api/v1/integrations/google/freebusy?range=...`
- `POST /api/v1/schedules/{uuid}/finalize` の後続で「Google登録」ジョブをCelery投入

### Data Model
- User導入後は `UserIntegration` にrefresh token（暗号化 at rest）を保存
- User無しで始めるなら「幹事メール + 一時トークン」でも可能だが、長期的にはUserが必要

### Security
- refresh tokenは暗号化、ログ禁止
- OAuth state/nonce の検証

## Rollout
- Phase1: 確定後のGoogle登録のみ
- Phase2: 空き取得→候補提案（UIで候補生成）
