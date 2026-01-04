# RFC-0007: Nginx リバースプロキシの導入

## 1. Summary
- 全ての外部通信を Nginx リバースプロキシ経由にする
- DB/Redis のポートを外部に公開しない
- フロントエンド・バックエンドを統一エンドポイントで提供

## 2. Motivation
- **セキュリティ**: DB/Redis への直接アクセスを防止
- **運用性**: SSL 終端、ロードバランシング、アクセスログの一元化
- **シンプルさ**: 単一ポート (80/443) での提供

## 3. Goals / Non-Goals
### Goals
- Nginx をリバースプロキシとして導入
- DB (5432) / Redis (6379) を外部に公開しない
- `/` → Frontend、`/api` → Backend のルーティング

### Non-Goals
- SSL 証明書の自動取得（別途 RFC または手動設定）
- ロードバランシング（単一構成が前提）

## 4. User Experience
- ユーザーは `http://localhost` (開発) または `https://your-domain.com` (本番) でアクセス
- API は `/api/v1/...` でアクセス（変更なし）

## 5. Design

### Backend
- 変更なし（`docker-compose.yml` でポート 8000 を内部ネットワークのみに）

### Frontend
- 変更なし（`docker-compose.yml` でポート 3000 を内部ネットワークのみに）

### Infrastructure

#### nginx.conf
```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://front:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### docker-compose.yml 変更点
- `db`: `ports` を削除（または `127.0.0.1:5432:5432`）
- `redis`: `ports` を削除（または `127.0.0.1:6379:6379`）
- `api`: `ports` を `expose` に変更（内部のみ）
- `front`: `ports` を `expose` に変更（内部のみ）
- `nginx`: 新サービス追加、`ports: 80:80` で外部公開

### Security/Privacy
- 外部からは Nginx (port 80) のみアクセス可能
- 内部サービス間は Docker ネットワークで通信

### Migration
- 既存の `localhost:3000` / `localhost:8000` アクセスは不可になる
- `localhost` (port 80) に統一

## 6. Alternatives
- **Traefik**: より高機能だが設定が複雑
- **Caddy**: 自動 SSL が便利だが Nginx の方が普及

## 7. Rollout Plan
1. `nginx.conf` / `Dockerfile.nginx` 作成
2. `docker-compose.yml` 更新
3. ドキュメント更新
4. 動作確認

## 8. Test Plan
- `docker-compose up` で起動
- `http://localhost` でフロントエンド確認
- `http://localhost/api/v1/schedules/` で API 確認
- `localhost:5432` / `localhost:6379` に接続不可を確認

## 9. Open Questions
- SSL (HTTPS) の対応は別途 RFC にするか、ホスト側のリバースプロキシ（Cloudflare, AWS ALB 等）に委ねるか
