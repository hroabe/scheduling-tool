# Agent.md — scheduling-tool (AI Agent Driven Development)

## 目的
このリポジトリは「日程調整ツール v2.0」です。AIエージェントが開発タスクを進める際は、
**仕様 → 設計(RFC/技術仕様) → 実装 → テスト → ドキュメント → PR** の順で進めます。

## 技術スタック（推奨: 5系/15系の最新パッチ）
- Backend: **Django 5.2.9（5.2 LTS 最新パッチ）**
- Frontend: **Next.js 15.5.9（15系 最新パッチ）**
- Worker: Celery + Redis
- DB: PostgreSQL（SQLiteでも可）

## プロダクト概要（要約）
- 登録不要: 共有URLで誰でも回答
- UI: レスポンシブ / ダークモード
- 集計・確定・CSV出力
- メール通知（回答通知、期限リマインダー、通知ログ保存）

## 最重要ルール（AIエージェントの行動規範）
1. **仕様を先に更新**  
   仕様が無い/曖昧なら `docs/rfcs/0000-template.md` でRFCを起票してから実装する。
2. **後方互換**  
   既存API/画面の挙動を壊さない。破壊的変更はRFCで合意し、移行手順を docs に追記する。
3. **DoD（Definition of Done）**
   - テスト（最低: 重要ロジックの単体 + 主要経路の統合）
   - 失敗ケース（バリデーション/権限/期限切れ）を含む
   - 仕様/ドキュメント（md）の更新
   - ログ/監視/運用（通知・リトライ・レート制限）に配慮
4. **秘密情報禁止**
   - `.env` や OAuth トークン、APIキーをコミットしない
   - 例外ログに個人情報/トークンを出さない
5. **トークン/キーは将来的にhash保存へ移行**
   - 現状の `edit_key` / `edit_token` 平文保存は改善対象（詳細は `docs/architecture/data-model.md`）

## 参照ドキュメント
- `docs/README.md` : docs索引
- `docs/product/requirements.md` : 要求仕様
- `docs/standards/quality-standards.md` : 品質基準
- `docs/rfcs/*` : 追加機能のRFC
