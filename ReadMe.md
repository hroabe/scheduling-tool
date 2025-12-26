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

## 📦 セットアップ

### 必要条件

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ (オプション、SQLiteでも動作)
- Redis (オプション、通知機能使用時)

### バックエンド

```bash
# プロジェクトのクローン
git clone <repository-url>
cd scheduling-tool

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

### フロントエンド

```bash
cd front

# 依存関係のインストール
npm install  # または yarn

# 開発サーバー起動
npm run dev
```

### Docker (推奨)

```bash
docker-compose up -d
```

## 🔧 環境変数

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

### フロントエンド

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📚 API ドキュメント

開発サーバー起動後、以下のURLでAPIドキュメントを確認できます：

- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/

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
pytest

# フロントエンド
cd front
npm run test
npm run test:e2e
```

## 🚀 デプロイ

### 本番環境設定

1. `DEBUG=False` に設定
2. `SECRET_KEY` を安全な値に変更
3. `ALLOWED_HOSTS` を設定
4. PostgreSQLを使用
5. 静的ファイルを収集: `python manage.py collectstatic`
6. Gunicornで起動

### Vercel (フロントエンド)

```bash
cd front
vercel
```

## 📝 ライセンス

MIT License

## 🤝 コントリビューション

プルリクエストを歓迎します。大きな変更の場合は、まずissueを作成してください。

## 📧 お問い合わせ

質問や提案があれば、issueを作成してください。
