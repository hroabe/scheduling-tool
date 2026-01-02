# Agent.md — scheduling-tool (AI Agent Driven Development)

## 目的
このリポジトリは「日程調整ツール v2.0」です。AIエージェントが開発タスクを進める際は、
**仕様 → 設計(RFC/技術仕様) → 実装 → テスト → ドキュメント → PR** の順で進めます。

## プロダクト概要（要約）
- 登録不要: 共有URLで誰でも回答
- UI: レスポンシブ / ダークモード
- 集計・確定・CSV出力
- メール通知（回答通知、期限リマインダー、通知ログ保存）
- 技術: Backend Django/DRF + Celery/Redis、Frontend Next.js/React、DB PostgreSQL（SQLiteでも可）

## リポジトリ構成（高レベル）
- `api/` : Django API（REST）
- `front/`: Next.js (App Router) + Chakra UI + TanStack Query + Zustand
- `mobile/`: React Native（基本実装）
- `docs/` : 開発仕様・品質・RFC
- `docker-compose.yml`, `Dockerfile.api` : 開発/デプロイ用

## 最重要ルール（AIエージェントの行動規範）
1. **仕様を先に更新**  
   仕様が無い/曖昧なら `docs/rfcs/0000-template.md` でRFCを起票してから実装する。
2. **後方互換**  
   既存API/画面の挙動を壊さない。破壊的変更はRFCで合意し、移行手順を docs に追記する。
3. **DoD（Definition of Done）**
   - テスト（最低: 重要ロジックの単体 + 主要経路の統合）
   - 失敗ケース（バリデーション/権限/期限切れ）を含む
   - OpenAPI/README/仕様 docs の更新
   - ログ/監視/運用（通知・リトライ・レート制限）に配慮
4. **秘密情報禁止**
   - `.env` や OAuth トークン、APIキーをコミットしない
   - 例外ログに個人情報/トークンを出さない

## 開発コマンド（README準拠）
### Docker（推奨）
- `docker-compose up -d`

### Backend
- `pip install -r requirements.txt`
- `cd api && python manage.py migrate`
- `cd api && python manage.py runserver`
- `cd api && pytest`

### Frontend
- `cd front && npm install`
- `cd front && npm run dev`
- `cd front && npm run test`
- `cd front && npm run test:e2e`

## 実装スタイル（指針）
### Backend（Django/DRF）
- APIは `/api/v1/...` に統一（既存に合わせる）
- 入力検証: serializer で厳密に
- 例外: DRFの例外ハンドラで統一
- 非同期: メール/外部API/OAuth更新などはCeleryで実行（再試行前提）

### Frontend（Next.js）
- データ取得: TanStack Query（cache / invalidation設計）
- 状態: グローバルは Zustand、フォームは局所状態
- UI: Chakra UI（アクセシビリティを優先）
- 重要: URL共有・トークン等の扱いは漏洩防止（referer/ログ）

## PR作法
- PRテンプレに従う（`.github/PULL_REQUEST_TEMPLATE.md`）
- 仕様差分がある場合、先に docs を更新し、PRにリンクを貼る
- 変更は小さく分割（1PR 1テーマ）

## 参照ドキュメント
- `docs/README.md` : docs索引
- `docs/product/requirements.md` : 要求仕様
- `docs/standards/quality-standards.md` : 品質基準
- `docs/rfcs/*` : 追加機能のRFC
