# 日程調整ツール v2.0

会議やイベントの日程調整を簡単に行えるモダンなWebアプリケーションです。

![日程調整ツール](docs/app.png)

## 🚀 特徴

- **登録不要**: URLを共有するだけで誰でも回答可能
- **直感的なUI**: モダンでレスポンシブなデザイン
- **リアルタイム集計**: 最適な日程を自動提案
- **メール通知**: 回答があった際に自動通知
- **CSV出力**: 結果をダウンロード可能
- **ダークモード**: 目に優しいダークモード対応

## 🛠 技術スタック

### バックエンド
- **Python 3.11+**
- **Django 5.1** - Webフレームワーク
- **Django REST Framework 3.15** - REST API
- **PostgreSQL** - データベース
- **Redis** - キャッシュ・Celeryブローカー
- **Celery** - 非同期タスク処理

### フロントエンド
- **Next.js 15** - Reactフレームワーク (App Router)
- **React 19** - UIライブラリ
- **TypeScript** - 型安全性
- **Chakra UI v2** - コンポーネントライブラリ
- **TanStack Query** - データフェッチング
- **Zustand** - 状態管理
- **Framer Motion** - アニメーション

### モバイル (実験的)
- **React Native / Expo** - クロスプラットフォームアプリ
- 詳細は [mobile/README.md](mobile/README.md) を参照

### インフラ
- **Nginx** - リバースプロキシ (RFC-0007)
- **Docker Compose** - コンテナオーケストレーション

## 📦 セットアップ

### 必要条件

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose (推奨)
- PostgreSQL 15+ (Docker不使用時)
- Redis (Docker不使用時)

### Docker (推奨)

```bash
# 環境変数ファイルの作成
cp .env.docker.example .env

# .env を編集して SECRET_KEY と POSTGRES_PASSWORD を設定
# SECRET_KEY生成: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# 起動
docker-compose up -d

# アクセス: http://localhost (Nginx経由)
```

> ⚠️ **重要**: `SECRET_KEY` と `POSTGRES_PASSWORD` は必須です。未設定の場合は起動に失敗します。

### バックエンド (個別起動)

```bash
# Python仮想環境の作成
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係のインストール
pip install -r requirements.txt

# 環境変数の設定
cp api/.env.example api/.env
# .envファイルを編集

# データベースマイグレーション
cd api
python manage.py migrate

# 開発サーバー起動
python manage.py runserver
```

### フロントエンド (個別起動)

```bash
cd front

# 環境変数の設定
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# 依存関係のインストール
yarn install

# 開発サーバー起動
yarn dev
```

## 🔧 環境変数

### Docker Compose (.env)

```env
# 必須
SECRET_KEY=your-secret-key-here
POSTGRES_PASSWORD=your-secure-password-here

# オプション
DEBUG=True
POSTGRES_DB=scheduling_db
POSTGRES_USER=scheduling
```

### バックエンド (.env)

```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgres://user:password@localhost:5432/scheduling_db
REDIS_URL=redis://localhost:6379/0
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### フロントエンド (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> ⚠️ `NEXT_PUBLIC_API_URL` は必須です。未設定の場合はビルドエラーになります。

## 📚 API ドキュメント

開発サーバー起動後、以下のURLでAPIドキュメントを確認できます：

- Swagger UI: http://localhost/api/docs/ (Docker) または http://localhost:8000/api/docs/
- ReDoc: http://localhost/api/redoc/

### 主要エンドポイント

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/api/v1/schedules/` | イベント一覧 |
| POST | `/api/v1/schedules/` | イベント作成 |
| GET | `/api/v1/schedules/{uuid}/` | イベント詳細 |
| POST | `/api/v1/schedules/{uuid}/respond/` | 回答送信 |
| POST | `/api/v1/schedules/{uuid}/finalize/` | 日程確定 |
| GET | `/api/v1/schedules/{uuid}/export_csv/` | CSV出力 |
| GET | `/api/v1/schedules/{uuid}/summary/` | 集計結果 |

## 🧪 テスト

```bash
# バックエンド
cd api
python manage.py test

# フロントエンド
cd front
yarn test
yarn test:e2e
```

## 🚀 デプロイ

### 本番環境設定

1. `DEBUG=False` に設定
2. `SECRET_KEY` を安全な値に変更（**必須**）
3. `ALLOWED_HOSTS` を設定
4. PostgreSQLを使用
5. 静的ファイルを収集: `python manage.py collectstatic`
6. Gunicornで起動

### Vercel (フロントエンド)

```bash
cd front
vercel
```

### HTTPS/SSL (本番環境)

1. 証明書を取得 (Let's Encrypt/certbot):
   ```bash
   sudo apt install certbot
   sudo certbot certonly --standalone -d your-domain.com
   ```

2. SSL設定を適用:
   ```bash
   cp nginx.ssl.conf nginx.conf
   # nginx.conf 内の your-domain.com を実際のドメインに置換
   ```

3. Docker再起動:
   ```bash
   docker compose down && docker compose up -d
   ```

> 📁 `nginx.ssl.conf` には HSTS、TLS 1.2/1.3、セキュリティヘッダーが設定済みです。

## 📝 ライセンス

MIT License

## 🤝 コントリビューション

プルリクエストを歓迎します。大きな変更の場合は、まずissueを作成してください。

## 📧 お問い合わせ

質問や提案があれば、issueを作成してください。
