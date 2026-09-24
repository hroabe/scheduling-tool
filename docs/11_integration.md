# 統合設計書: MVP ブランチ × origin/main（v3.0）

> 2026-09-24 作成。`feature/mvp-docs-implementation`（docs 00〜10 に基づく MVP 実装）と
> `origin/main`（RFC-0001〜0013: 認証・カレンダー連携・1on1・i18n・かわいいモード・モバイル等）を統合した際の
> 設計判断と仕様変更をまとめる。以降はこの文書が両系統のドキュメントより優先する。

---

## 1. 統合方針

| 領域 | 採用 | 理由 |
|------|------|------|
| DB スキーマ | origin/main（`edit_key_hash` / `edit_token_hash` / `owner_user` / `finalized_at` / `closed_at` / `meeting_*`） | MVP 側の上位互換 |
| API ロジック | MVP 側を土台に origin/main の機能（close/reopen・確定時カレンダー登録・回答通知・所有者）を統合 | MVP 側のセキュリティ修正（一覧API無効化・annotate集計・CSV/ICSサニタイズ等）を維持 |
| 非同期処理 | Celery を**任意**化（`REDIS_URL` 未設定時は同期実行＋LocMemCache） | 小規模デプロイでは Redis 不要のまま通知・連携を動かす |
| 認証 | Session（CSRF）＋ DRF Token（モバイル）＋ Keycloak Bearer（`KEYCLOAK_URL` 設定時のみ） | origin/main では Keycloak トークンが検証されていなかった |
| フロント UI | ページごとに優れた方を土台にし、もう一方の機能を合流 | 下表 |
| i18n | origin/main の 8 言語を維持しつつ **SSR 対応**（ja を静的同梱、他言語は遅延ロード、欠落キーは ja にフォールバック） | origin/main は SSR の HTML に翻訳キーがそのまま出ていた（SEO 上致命的） |
| テーマ | origin/main の light / dark / cute ＋ MVP の semantic token（ダークモード対応） | |
| SEO / PWA | MVP 側（metadata・JSON-LD・sitemap・noindex・SW・アイコン） | origin/main はプレースホルダードメイン・SW インストール失敗 |
| デプロイ | 本番: Caddy（自動 HTTPS）構成、開発: Nginx 構成（RFC-0007）を併存 | |

### フロント画面の土台

| 画面 | 土台 | 合流する機能 |
|------|------|-------------|
| `/` トップ | MVP（SEO 構成・JSON-LD） | origin: モード選択（グループ / 1on1）、i18n |
| `/create` | origin（RFC-0013 の作成 UX） | MVP: ISO タイムゾーン送信、編集キー保存→作成完了モーダル、流入計測、アクセシビリティ |
| `/event/[uuid]` | MVP（SSR メタデータ・CSV/ICS・作成完了/回答完了モーダル・Google カレンダー登録） | origin: 候補サマリー（おすすめ理由）、確定モーダル、リマインダー、自分の回答の編集/削除、会議 URL |
| `/event/[uuid]/edit` | MVP | origin: 締切 / 再開（close / reopen） |
| `/login` `/register` `/callback` `/account/*` `/booking/*` | origin | バグ修正（下記）、i18n、PageShell |

---

## 2. API 仕様の変更（docs/04_api.md・docs/api/api-spec.md に対する差分）

### 2.1 認可ルール（Schedule 管理系）

`PATCH/DELETE /schedules/{uuid}/`、`finalize`、`close`、`reopen`、候補日の追加・更新・削除、参加者削除は
**作成者（ログインユーザー `owner_user`）または正しい編集キー**で許可する。

- 編集キーは `X-Edit-Key` ヘッダー（推奨）またはボディ `edit_key`。クエリパラメータは受け付けない。
- 編集キー未設定の旧データは作成者のみ管理可能（origin/main の「hash のみ」方針を採用）。
- `verify_edit_key` は `{valid: true, is_owner: bool}` を返す。
- 詳細レスポンスに `is_owner`・`status`（open/closed/fixed）・`closed_at`・`finalized_at`・`meeting_url` を追加。

### 2.2 回答編集トークン

- 形式を `"<participant_id>.<secret>"` に変更（ハッシュ照合を 1 件に限定するため）。旧 UUID トークンは
  マイグレーション `schedule.0003` でハッシュ化され、引き続き利用可能。
- 送信は `X-Edit-Token` ヘッダーまたはボディ `edit_token`。新規回答のレスポンスでのみ返却。

### 2.3 作成

- 作成レスポンスは詳細レスポンス＋自動生成時のみ `_edit_key`（origin/main の `edit_key_response` は廃止）。
- ログイン中の作成は `owner_user` を設定し、`owner_email` 未指定ならアカウントのメールを使う。
- `owner_email` ＋ `notify_on_response=true` で回答通知メール（メール無しの場合は自動で無効）。

### 2.4 一覧

`GET /schedules/` は引き続き 405。自分のイベントは `GET /accounts/me/schedules/`（要ログイン）。

### 2.5 アカウント

| 追加/変更 | 内容 |
|----------|------|
| `GET /accounts/csrf/` | CSRF cookie を発行（SPA が `X-CSRFToken` に設定） |
| `POST /accounts/login/` | ユーザー名**またはメールアドレス**（大文字小文字無視）。`issue_token: true` で DRF トークンも返す（モバイル用）。レート制限 `THROTTLE_LOGIN_RATE` |
| `POST /accounts/logout/` | トークン認証ならトークンも失効 |
| `register` / `me` | メール重複は大文字小文字を無視 |
| Keycloak | `KEYCLOAK_URL` 設定時のみ Bearer を検証（userinfo、60 秒キャッシュ）。ユーザーは `kc_<sub>` または検証済みメールで紐付け |

### 2.6 カレンダー連携（RFC-0001/0002）

- OAuth state をサーバー側キャッシュに保存（セッション非依存）→ Bearer ユーザーも連携可能。
- コールバックは JSON ではなく `FRONTEND_URL/account/integrations?provider=google&status=connected|error&reason=...` へリダイレクト。
- `status/` は `configured`（サーバーに Client ID があるか）を返す。未設定時 `connect/` は 503。
- 外部 API 呼び出しにタイムアウト（`EXTERNAL_API_TIMEOUT`）、確定時の予定作成は冪等（重複作成しない）。
- 作成した Google Meet / Teams の URL は `meeting_url` としてイベント詳細・ICS（LOCATION）に反映。

### 2.7 1on1 予約（RFC-0005 v2、ログイン不要）

```
POST   /api/v1/oneonone/booking/                                   ページ作成 → {slug, status, host_token, host_url, (DEBUG時) verify_url}
POST   /api/v1/oneonone/booking/verify/                            {slug, token} メール認証 → PUBLISHED（冪等）
GET    /api/v1/oneonone/booking/{slug}/host/                       管理情報（X-Host-Token）
PATCH  /api/v1/oneonone/booking/{slug}/host/                       title/description/is_active/notify_on_booking
POST   /api/v1/oneonone/booking/{slug}/host/slots/                 枠追加（重複は errors に返す）
DELETE /api/v1/oneonone/booking/{slug}/host/slots/{id}/            枠削除（予約済みは不可）
POST   /api/v1/oneonone/booking/{slug}/host/resend-verification/   認証メール再送
POST   /api/v1/oneonone/booking/{slug}/host/bookings/{uuid}/cancel/ 主催者によるキャンセル
GET    /api/v1/oneonone/booking/{slug}/                            公開ページ（PUBLISHED かつ受付中のみ）
POST   /api/v1/oneonone/booking/{slug}/reserve/                    予約 → {booking, cancel_token}
GET    /api/v1/oneonone/booking/{uuid}/                            予約確認
POST   /api/v1/oneonone/booking/{uuid}/cancel/                     {cancel_token} ゲストによるキャンセル
```

- 作成時に**認証リンクと管理リンクをメールで送付**。管理トークンは作成レスポンスで 1 回だけ返り、作成者のブラウザに保存される
  （origin/main では管理トークンが標準出力に出るだけで管理画面に到達できなかった）。
- slug は英数字＋ランダム接尾辞（日本語タイトルから日本語 slug が生成され URL が 404 になるバグを修正）。
- 予約時: 主催者へ通知、ゲストへ確認メール（キャンセルリンク `/booking/cancel?booking=<uuid>&token=<token>`）。
  キャンセル時: 相手側へ通知。
- キャンセル後の枠は再予約可能（`Booking.slot` を FK＋有効予約の一意制約に変更）。キャンセルトークンは SHA-256 で保存。
- ログインユーザーの `pages/` API で作成したページは作成時点で公開（`status=PUBLISHED`）。

---

## 3. フロントエンド規約（統合後）

- **ページ構成**: `app/**/page.tsx` はサーバーコンポーネントで `metadata` / JSON-LD を出力し、UI はクライアントコンポーネントに分離。
  共通枠は `components/layout/PageShell`（Header + `<main id="main">` + Footer）。
- **i18n**: 画面に表示する文字列はすべて `useI18n().t('namespace.key', vars)`。辞書は `messages/<locale>/<namespace>.json`
  （`ja` が原本）。`node scripts/check-messages.mjs` で全言語のキー一致を検証、`node scripts/gen-messages-index.mjs` で索引を再生成。
- **テーマ**: 色は semantic token（`bg.card` `bg.page` `bg.subtle` `border.default` `text.muted` `brand.fg` `brand.subtle`）を使う。
  出欠記号は `useAvailabilitySymbols()`（かわいいモード / 言語で切替、意味は必ずテキストでも提供）。
- **API**: `lib/api.ts` の `api` を使う。秘密情報（編集キー・回答トークン・管理トークン）は URL に載せない。
- **状態**: 編集キーは `useEditKeyStore`（sessionStorage）、自分の回答トークンは `useMyResponsesStore`（localStorage、
  旧 `tokenStorage` の値は移行）、1on1 管理トークンは作成者のブラウザ（localStorage）。
- **認証**: `useAuthStore`。Keycloak ボタンは `isKeycloakEnabled` の時のみ表示。
- **アクセシビリティ**: フック呼び出しをループ・条件分岐内に置かない、アイコンボタンに `aria-label`、見出し階層、`h1` は 1 ページ 1 つ。

---

## 4. 修正した origin/main の不具合（抜粋）

| 領域 | 不具合 | 対応 |
|------|--------|------|
| 認証 | Keycloak トークンを API が検証していない／Bearer を送っていない | `KeycloakAuthentication` を設定で有効化、API クライアントが Bearer 付与・更新 |
| 認証 | OIDC `state` 未検証 | コールバックで検証 |
| セキュリティ | 一覧 API 公開、整数 ID 参照、候補日を誰でも編集、owner_email 公開、CSV インジェクション、クエリに秘密情報 | MVP 側の対策を維持 |
| セキュリティ | Fernet 鍵がリポジトリに固定値 | 未設定時は SECRET_KEY から導出 |
| セキュリティ | `SECRET_KEY=` が空でも本番起動 | 空文字も拒否 |
| 1on1 | 管理画面に到達不可、メール認証をレスポンスで迂回可能、再予約で 500、日本語 slug で 404、slug 更新不可、ログインユーザーのページが公開されない | §2.7 |
| 連携 | コールバックが JSON を表示、タイムアウト無し、リトライで予定が重複 | §2.6 |
| 通知 | `FRONTEND_URL` 未定義でメール内リンクが相対パス | 設定追加・絶対 URL |
| フロント | ビルド失敗（lint・型・Suspense）、SSR に翻訳キー、SW インストール失敗、確定ボタンが全員に表示／編集キー未送信 | 統合時に修正 |
| リポジトリ | `.env`・`nohup.out`・`celerybeat-schedule`・`Zone.Identifier` のコミット | 追跡解除・`.gitignore` |
