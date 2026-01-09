# RFC-0011: Keycloak認証統合

## 1. Summary

ユーザー認証をKeycloakに移行し、以下を実現する：
- 統一されたアイデンティティ管理
- OAuth2/OpenID Connect標準プロトコル対応
- SSO（シングルサインオン）基盤の構築
- 外部IdP連携の容易化（Google, Outlook等）

## 2. Motivation

### 現状の課題
- Django標準認証はエンタープライズ向け機能（SSO, SAML, SCIM）が不足
- 外部OAuth連携（Google/Outlook）を個別実装している
- ユーザー管理UIがない
- パスワードポリシー、2FA等のセキュリティ機能が限定的

### Keycloak導入のメリット
- 業界標準のOIDC/OAuth2/SAMLサポート
- 管理コンソールでユーザー管理が容易
- Google/Outlook等の外部IdP連携が設定のみで可能
- ロール/権限管理機能内蔵

## 3. Goals / Non-Goals

### Goals
- Keycloakをdocker-composeに追加
- バックエンド認証をKeycloakトークン検証に変更
- フロントエンドをOIDCフローに変更
- 既存ユーザーの移行パス提供

### Non-Goals
- 参加者（ゲスト回答者）の認証強制
- 高度なIDフェデレーション（SAML, SCIM）- 将来対応

## 4. Design

### 4.1 インフラ構成

```
┌─────────┐    ┌──────────┐    ┌─────────┐
│ Browser │───▶│  Nginx   │───▶│  Next.js │
└─────────┘    └──────────┘    └─────────┘
                    │
                    ▼
              ┌──────────┐    ┌──────────┐
              │ Keycloak │◀──▶│ Postgres │
              └──────────┘    └──────────┘
                    │
                    ▼
              ┌──────────┐
              │  Django  │
              └──────────┘
```

### 4.2 認証フロー

1. ユーザーが「ログイン」クリック
2. フロントエンドがKeycloakのAuthorizationエンドポイントにリダイレクト
3. Keycloakでログイン（または外部IdP経由）
4. コールバックでaccess_token/id_tokenを取得
5. フロントエンドがトークンを保存
6. APIリクエスト時にAuthorizationヘッダーにトークン付与
7. DjangoがKeycloak公開鍵でトークン検証

### 4.3 変更ファイル

| コンポーネント | ファイル | 変更内容 |
|--------------|---------|---------|
| Docker | `docker-compose.yml` | Keycloakサービス追加 |
| Nginx | `nginx.conf` | /auth/* をKeycloakにプロキシ |
| Backend | `api/settings.py` | OIDC認証設定追加 |
| Backend | `api/middleware/` | トークン検証ミドルウェア |
| Frontend | `front/lib/auth.ts` | OIDCクライアント実装 |
| Frontend | `front/stores/authStore.ts` | OIDC対応に変更 |
| Frontend | `front/app/callback/` | OIDCコールバック処理 |

### 4.4 Keycloak設定

**Realm設定:**
- Realm名: `scheduling-tool`
- クライアント: `scheduling-frontend` (public client)
- クライアント: `scheduling-backend` (confidential)
- パスワード認証: **無効**
- 登録: **無効**（Googleログイン時に自動作成）

**IdP設定（実装済み）:**
- ✅ Google Identity Provider
  - 環境変数: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - realm-export.json に設定済み

## 5. Migration Plan

### Phase 1: Keycloak基盤構築
1. docker-compose.ymlにKeycloak追加
2. Realmとクライアント設定
3. Nginx設定更新

### Phase 2: バックエンド対応
1. DjangoにOIDC認証ミドルウェア追加
2. 既存セッション認証との並行稼働

### Phase 3: フロントエンド対応
1. next-auth または oidc-client-ts 導入
2. 新ログインフローに切り替え

### Phase 4: 移行完了
1. 既存ユーザーのKeycloak移行スクリプト
2. 旧認証エンドポイント廃止

## 6. Rollout Plan

| Phase | 期間 | 内容 |
|-------|------|------|
| Phase 1 | 1週目 | Keycloak追加、基本設定 |
| Phase 2 | 2週目 | バックエンド対応 |
| Phase 3 | 3週目 | フロントエンド対応 |
| Phase 4 | 4週目 | 移行・テスト・リリース |

## 7. Test Plan

- Unit: トークン検証ロジック
- Integration: ログインフロー全体
- E2E: ブラウザでログイン→API呼び出し→ログアウト

## 8. Security Considerations

- Keycloak管理コンソールは内部ネットワークのみ公開
- 本番環境ではHTTPS必須
- トークンリフレッシュの適切な実装

## 9. Open Questions

- 既存ユーザーのパスワード移行方法（再設定 vs ハッシュ移行）
- Google/Outlook連携トークンの管理方法

## 10. Implementation Status (2026-01更新)

- ✅ Phase 1: Keycloak基盤構築
  - `docker-compose.yml`: Keycloak + keycloak-db 追加
  - `nginx.conf`: /auth プロキシ設定
  - `keycloak/realm-export.json`: Realm自動インポート
- ✅ Phase 2: バックエンド対応
  - `api/accounts/keycloak.py`: OIDC認証ミドルウェア
- ✅ Phase 3: フロントエンド対応
  - `front/lib/keycloak.ts`: OIDCクライアント
  - `front/app/callback/page.tsx`: コールバック処理
  - `front/stores/authStore.ts`: Keycloakトークン対応
  - `front/app/login/page.tsx`: 統一ログイン（SSO + メール）
- [ ] Phase 4: 移行完了（未着手）

