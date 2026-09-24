# デプロイ・運用ガイド

MVP（Phase 1b）を本番公開するための手順書。推奨構成は **Docker Compose + Caddy（単一ドメイン）**。
PaaS を使う場合は Render Blueprint（`render.yaml`）も用意している。

---

## 1. 本番構成

```
                 https://example.com
                        │
                 ┌──────▼──────┐  自動HTTPS (Let's Encrypt), gzip/zstd, www→apex
                 │   Caddy     │
                 └──┬───────┬──┘
   /api/* /admin/*  │       │  それ以外
   /static/*        │       │
          ┌─────────▼─┐   ┌─▼──────────────┐
          │ Django API │◄──┤ Next.js        │  SSRのメタデータ取得は
          │ Gunicorn   │   │ (standalone)   │  http://api:8000 を直接参照
          └─────┬──────┘   └────────────────┘  (X-Internal-Token でレート制限除外)
                │
          ┌─────▼──────┐
          │ PostgreSQL │
          └────────────┘
```

- フロントとAPIを同一ドメインで配信するため CORS は実質不要（設定は念のため残している）
- `robots.txt` / `sitemap.xml` は Next.js が配信する

## 2. 事前準備

1. Linux サーバー（Docker Engine + Compose v2 がインストール済み、メモリ 1GB 以上推奨）
2. ドメインの A/AAAA レコードをサーバーのIPに向ける（`www` も同じIPへ）
3. ファイアウォールで 80 / 443 (TCP) と 443 (UDP, HTTP/3) を開放

## 3. 初回デプロイ

```bash
git clone <repository-url> scheduling-tool && cd scheduling-tool
cp .env.production.example .env.production
```

`.env.production` を編集する（シークレットは `python -c "import secrets; print(secrets.token_urlsafe(50))"` で生成）。

| 変数 | 必須 | 説明 |
|------|:---:|------|
| `DOMAIN` | ○ | 公開ドメイン（例: `chousei.example.com`） |
| `DJANGO_SECRET_KEY` | ○ | Django の SECRET_KEY |
| `POSTGRES_PASSWORD` | ○ | DB パスワード |
| `INTERNAL_API_TOKEN` | ○ | Next.js → Django の内部リクエスト用共有シークレット |
| `DJANGO_ADMIN_URL` | | 管理画面のパス（推測されにくい値を推奨。例: `manage-3f9a/`） |
| `SITE_NAME` / `CONTACT_EMAIL` / `TWITTER_HANDLE` | | サイト名・問い合わせ先・X アカウント（ビルド時に埋め込み） |
| `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` | | Search Console / Bing の所有権確認コード |

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

API コンテナは起動時に `migrate` を自動実行する。管理ユーザーの作成:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec api python manage.py createsuperuser
```

## 4. 動作確認（リリースチェックリスト）

- [ ] `https://DOMAIN/` が表示され、証明書が有効
- [ ] `https://DOMAIN/api/health/` が `{"status": "ok"}`
- [ ] イベント作成 → 回答 → CSV / ICS ダウンロード → 編集 → 日程確定 が一通り動く
- [ ] `GET https://DOMAIN/api/v1/schedules/` が 405
- [ ] `https://DOMAIN/robots.txt` と `https://DOMAIN/sitemap.xml` のURLが本番ドメイン
- [ ] イベントページのレスポンスヘッダーに `X-Robots-Tag: noindex, nofollow`
- [ ] ICS を Google カレンダー / Outlook / Apple カレンダーに取り込める（手動）
- [ ] Android Chrome / iOS Safari で「ホーム画面に追加」できる（手動）
- [ ] LINE / Slack / X にURLを貼るとOGP画像とイベント名が表示される

## 5. 更新・ロールバック

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

ロールバックは `git checkout <前のタグ>` の後に同じコマンドを実行する。DB マイグレーションを伴うリリースの前には必ずバックアップを取る。

## 6. バックアップ

```bash
# ダンプ
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db \
  pg_dump -U scheduling scheduling_db | gzip > backup-$(date +%F).sql.gz

# リストア
gunzip -c backup-YYYY-MM-DD.sql.gz | docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db \
  psql -U scheduling scheduling_db
```

cron で日次ダンプを取り、サーバー外（オブジェクトストレージ等）へ転送することを推奨。

## 7. 運用メモ

- **レート制限**: 匿名 100 req/時/IP（`THROTTLE_ANON_RATE`）、編集キー検証 30 req/時/IP。キャッシュは LocMemCache のため Gunicorn ワーカーごとに独立して数える（実効上限はワーカー数倍）。厳密にしたい場合は Redis キャッシュを再導入する
- **クライアントIP**: Caddy 経由のため `NUM_PROXIES=1`。プロキシ段数を変えたら合わせて変更する
- **ログ**: `docker compose ... logs -f api front caddy`。Gunicorn のアクセスログに `?ref=` / `?utm_source=` が残るので、バイラル施策（docs/01_strategy.md §6 の検証項目）の集計に使える
- **静的ファイル**: Django admin / API ドキュメントの静的ファイルはイメージビルド時に `collectstatic` 済み（WhiteNoise で配信）

## 8. 代替: Render へのデプロイ

1. リポジトリを GitHub に push し、Render の **Blueprints → New Blueprint Instance** で `render.yaml` を読み込む
2. 作成後、`sync: false` の環境変数を設定する
   - `scheduling-api`: `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` / `FRONTEND_URL` = フロントのURL
   - `scheduling-front`: `NEXT_PUBLIC_API_URL` = APIのURL、`NEXT_PUBLIC_SITE_URL` = フロントのURL（独自ドメイン推奨）
3. `NEXT_PUBLIC_*` はビルド時に埋め込まれるため、設定後に `scheduling-front` を再デプロイする

## 9. SEO 公開後の作業

1. Google Search Console / Bing Webmaster Tools にサイトを登録（`GOOGLE_SITE_VERIFICATION` 等を設定して再ビルド）
2. `https://DOMAIN/sitemap.xml` を送信
3. リッチリザルトテスト（https://search.google.com/test/rich-results）で構造化データを確認
4. PageSpeed Insights で実環境のスコアを確認

### 実装済みのSEO対策

| 項目 | 実装 |
|------|------|
| メタデータ | ページごとの title / description / canonical、`metadataBase`、キーワード（`front/lib/site.ts`） |
| OGP / X カード | 1200×630 の OGP 画像、`summary_large_image`。イベントページはイベント名入りのタイトル・説明をSSRで生成 |
| 構造化データ | WebSite / Organization（全ページ）、WebApplication / HowTo（トップ）、FAQPage / BreadcrumbList（FAQ）、BreadcrumbList（作成ページ） |
| クロール制御 | `robots.txt`、`sitemap.xml`、イベント・編集ページは `noindex, nofollow`（meta + `X-Robots-Tag`）、API ドメインの robots は全拒否 |
| コンテンツ | トップに機能・使い方・利用シーン・FAQ、`/faq` ページ（「日程調整 登録不要」「CSV」「Googleカレンダー」等の検索意図に対応） |
| 技術的SEO | `lang="ja"`、見出し階層（h1 は1ページ1つ）、セマンティックな landmark、SSR/SSG、PWA マニフェスト、favicon / apple-touch-icon |
| 表示速度 | 日本語 Web フォントを使わずOSフォント、CSSインライン化、standalone 出力。Lighthouse（ローカル計測）: デスクトップ Performance 100、モバイル 86〜94（SEO / Best Practices 100、Accessibility 100） |
