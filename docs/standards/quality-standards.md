# Quality Standards

## 品質ゲート（PRで満たす条件）
1. 仕様 docs が更新されている（必要な場合）
2. Backend: テストが追加され、主要経路が担保されている
3. Frontend: 主要UIの回帰が無い（最低: 重要ロジックのテスト or e2e）
4. セキュリティ: トークン/キー/PIIの漏洩が無い
5. 監視性: 通知/外部連携はログ・リトライ・失敗時の扱いが明記

## Backend テスト指針
- ドメインロジック: unit
- API: integration（期限切れ、編集トークン不正、確定後など）
- CSV/summary: 整合性テスト（同一データから同一結果）

## Frontend テスト指針
- hooks（Query）や計算ロジックのunit
- 重要導線: create → respond → summary → finalize のe2e（可能なら）

## 可観測性
- 通知ログ: success/failed/retry を記録
- 外部API: rate limit / timeout / retry / circuit-breaker検討（RFCに記載）

## パフォーマンス
- summary集計はNが増えても破綻しない（DB集計 or キャッシュ）
