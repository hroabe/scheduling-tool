# RFC-0003: ユーザー認証/アカウント機能

## 1. Summary
ログイン/アカウント機能を導入し、幹事が以下を行えるようにする：
- 自分が作成したイベント一覧/履歴の閲覧
- 連携設定（Google/Outlook等）の管理
- 期限/通知設定の管理（将来）

**重要:** 参加者の「URL共有で回答」体験は維持する（ログイン必須にしない）。

## 2. Motivation
- 継続利用・収益化（課金プラン、連携機能）を成立させる基盤が必要
- 「過去イベントを探せない」課題を解消し、リピートを増やす

## 3. Goals / Non-Goals
### Goals
- 幹事用ログイン（メール+パスワード or OAuth）
- マイページ（owned events、履歴）
- Integrations（Google/Outlook）の保存先をUserに統一
- 既存の共有URL回答機能はそのまま動く

### Non-Goals
- 参加者の強制アカウント化
- 大規模組織のSAML/SCIM（将来）

## 4. User Experience
- 幹事: ログイン→「イベント一覧」→「イベント作成」→共有URL発行
- 参加者: URLを開いて回答（必要なら edit_token で編集）
- 幹事: 確定後にカレンダー登録/会議URL発行が自動化される

## 5. Design
### Auth方式（候補）
A. Django標準（セッション）  
B. JWT（SimpleJWT等）  
C. NextAuth（フロント主導）

> 推奨: まずは **Djangoセッション** or **JWT** を選ぶ（モバイル要件で最終決定）。

### Backend
- `User` 導入
- `Schedule.owner_user`（nullable）追加し、ログイン幹事のイベントを紐づける
- 既存 `owner_email` は通知用として残す（最小化は要検討）

### Frontend
- `/account`（ログイン/設定）
- `/account/events`（一覧）

### Security/Privacy
- パスワードはDjango標準hash
- 共有URLに認証情報を載せない
- `edit_key/edit_token` の hash化（別タスク）と整合

### Migration
- 既存イベントは `owner_user=null` のまま
- 既存イベントの「引き取り」機能は別途検討

## 6. Alternatives
- 認証を後回しにしてGoogle連携を先にやる（ただしトークン保存先が難しい）

## 7. Rollout Plan
- Phase1: ログイン + owned events の一覧
- Phase2: 連携設定（Google/Outlook）画面
- Phase3: 課金プラン導入（別RFC）

## 8. Test Plan
- unit: 認証、権限
- integration: owned events の取得、未ログインの挙動
- e2e: ログイン→作成→一覧に出る

## 9. Open Questions
- 認証方式の最終決定（セッション vs JWT）
- モバイルのログイン導線（WebView or ネイティブ）
