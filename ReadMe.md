# 日程調整ツール v3.0

登録不要・URL共有で使える、結果を **CSV・ICS で持ち出せる** モダンな日程調整ツールです。
グループの日程調整に加えて、Calendly 風の **1on1 予約ページ**、アカウント・カレンダー連携、8 言語対応、かわいいモード、
モバイルアプリ（Expo）を備えています。

![日程調整ツール](docs/app.png)

## 特徴

**グループ日程調整（登録不要）**
- URL を共有するだけで ◯△× の出欠を集め、自動集計と「おすすめ」日程を表示
- 結果を CSV（Excel 互換）・ICS（Google / Outlook / Apple カレンダー）で持ち出し、確定日程は Google カレンダーへワンクリック登録
- 作成後の編集（候補日の追加・削除、締切 / 再開、日程確定 / 解除、削除）を編集キーまたは作成者アカウントで
- 回答者は自分の回答を後から修正・削除可能、主催者は回答通知メールを受け取れる

**1on1 予約（ログイン不要）**
- 空き枠を公開して相手に予約してもらう予約ページを作成（メール認証で公開）
- 予約・キャンセル時のメール通知、キャンセルリンク、キャンセル後の再予約

**アカウント（任意）**
- メール / パスワード、または Keycloak による SSO（Google 等）
- マイイベント一覧、Google カレンダー / Outlook 連携（確定時に予定と Meet / Teams URL を自動作成）

**UI / その他**
- 8 言語（日本語・英語・中国語・韓国語・スペイン語・フランス語・ドイツ語・ポルトガル語）、ライト / ダーク / かわいいモード
- PWA、SEO（メタデータ・OGP・構造化データ・sitemap）、アクセシビリティ配慮
- モバイルアプリ（Expo / React Native）

## 技術スタック

| 層 | 技術 |
|----|------|
| Backend | Python 3.12+, Django 5.2 LTS, Django REST Framework 3.18, Celery（任意）, drf-spectacular, Gunicorn, WhiteNoise |
| DB / Cache | PostgreSQL 15（開発は SQLite 可）, Redis（任意） |
| Auth | Django セッション + CSRF, DRF Token（モバイル）, Keycloak OIDC（任意） |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Chakra UI v2, TanStack Query, Zustand, React Hook Form + Zod |
| Mobile | Expo / React Native |
| Test | Django TestCase + coverage / Vitest + Testing Library / Playwright |
| Deploy | Docker, Caddy（本番・自動 HTTPS）, Nginx（開発, RFC-0007）, GitHub Actions |

設計ドキュメントは [docs/00_index.md](docs/00_index.md)、統合時の設計判断は [docs/11_integration.md](docs/11_integration.md) を参照してください。

## ローカル開発

### Docker（推奨）

```bash
cp .env.docker.example .env        # SECRET_KEY と POSTGRES_PASSWORD を設定
docker compose up --build          # nginx + db + redis + api + celery + front
docker compose --profile sso up    # Keycloak も起動（http://localhost/keycloak）
```

- フロント: http://localhost / API ドキュメント: http://localhost/api/docs/
- メールはコンソール出力（`docker compose logs -f api celery`）

### 個別起動

```bash
# バックエンド
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp api/.env.example api/.env                        # DEBUG=True, SECRET_KEY
cd api && python manage.py migrate && python manage.py runserver   # http://localhost:8000

# フロントエンド
cd front && cp .env.example .env.local && npm install && npm run dev   # http://localhost:3000

# モバイル
cd mobile && npm install && npm start
```

Redis を設定しない場合、通知メールやカレンダー登録はリクエスト内で同期実行されます（`REDIS_URL` を設定すると Celery ワーカーで非同期実行）。

## テスト

```bash
cd api && python manage.py test                      # バックエンド
cd front && npm run lint && npm run type-check && npm test
node front/scripts/check-messages.mjs                # 8 言語の翻訳キー整合性
cd front && npm run build && npx playwright install chromium && E2E_PYTHON=../.venv/bin/python npx playwright test
cd mobile && npm run type-check && npm test
```

## デプロイ

手順は **[docs/10_deployment.md](docs/10_deployment.md)** を参照してください。

```bash
cp .env.production.example .env.production   # DOMAIN と各シークレットを設定
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
# 任意: --profile worker（Redis + Celery）, --profile sso（Keycloak）
```

## API

- Swagger UI: `/api/docs/`、ReDoc: `/api/redoc/`
- 仕様: [docs/04_api.md](docs/04_api.md)（MVP）、[docs/11_integration.md §2](docs/11_integration.md)（統合後の変更点）

秘密情報（編集キー・回答編集トークン・1on1 管理トークン）は URL に載せず、`X-Edit-Key` / `X-Edit-Token` / `X-Host-Token` ヘッダーで送信します。

## ライセンス

MIT License
