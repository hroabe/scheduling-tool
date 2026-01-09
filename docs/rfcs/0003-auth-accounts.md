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
- 幹事用ログイン（メール+パスワード or SSO）
- マイページ（owned events、履歴）
- Integrations（Google/Outlook）の保存先をUserに統一
- 既存の共有URL回答機能はそのまま動く

### Non-Goals
- 参加者の強制アカウント化
- 大規模組織のSAML/SCIM（将来）

## 4. User Experience

### 統一認証フロー（2026-01更新）
```
[ログイン/サインアップ クリック]
        │
        ▼
┌─────────────────────────────┐
│  G  Google でログイン        │  ← Keycloak + Google IdP
└─────────────────────────────┘
        │
        ▼
  Googleアカウント選択/認証
        │
        ▼
  Keycloakでユーザー作成/紐付け
        │
        ▼
  /callback でトークン取得
        │
        ▼
  アプリ利用可能
```

**注**: Keycloakのパスワード認証は無効化。Google認証のみ。

### 従来フロー（参加者向け）
- 参加者: URLを開いて回答（ログイン不要）
- 幹事: 確定後にカレンダー登録/会議URL発行が自動化される

## 5. Design

### Auth方式
- **Keycloak (RFC-0011)**: SSO/OIDC 認証（推奨）
- **Django セッション**: レガシー認証（移行期間中も対応）

### Backend
- `User` 導入
- `Schedule.owner_user`（nullable）追加し、ログイン幹事のイベントを紐づける
- 既存 `owner_email` は通知用として残す

### Frontend エンドポイント
| パス | 機能 |
|-----|------|
| `/login` | 統一ログイン（SSO + メール） |
| `/register` | 新規登録 |
| `/callback` | OIDCコールバック |
| `/account` | マイページ |

### API エンドポイント
| エンドポイント | 機能 |
|---------------|------|
| `POST /api/v1/accounts/login/` | レガシーログイン |
| `POST /api/v1/accounts/register/` | 登録 |
| `POST /api/v1/accounts/check-email/` | メール存在確認 |
| `GET /api/v1/accounts/me/` | ユーザー情報取得 |

### Security/Privacy
- パスワードはDjango標準hash
- Keycloakトークンはブラウザ/ストレージに保存
- 共有URLに認証情報を載せない

## 6. Alternatives
- 認証を後回しにしてGoogle連携を先にやる（ただしトークン保存先が難しい）

## 7. Rollout Plan
- Phase1: ✅ ログイン + owned events の一覧
- Phase2: ✅ 連携設定（Google/Outlook）画面
- Phase3: ✅ Keycloak SSO 統合 (RFC-0011)
- Phase4: 課金プラン導入（別RFC）

## 8. Test Plan
- unit: 認証、権限、check-email
- integration: owned events の取得、未ログインの挙動
- e2e: ログイン→作成→一覧に出る

## 9. Implementation Status
- ✅ Django セッション認証
- ✅ 統一ログインフロー（SSO + メール）
- ✅ check-email API
- ✅ Keycloak 連携（RFC-0011）

