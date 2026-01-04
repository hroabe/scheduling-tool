# Security & Privacy

## 脅威モデル（最低限）
- 共有URLの漏洩
- edit_token/edit_key の漏洩（ログ/Referer/スクショ）
- メール通知先の誤送信
- OAuth連携後: refresh token 流出

## 対策
- token/key は **将来hash保存へ移行**（移行手順は data-model.md）
- URLクエリに token/key を載せない
- ログに PII / token を出さない
- rate limit（総当たり対策）
- CSRF/CORS を適切に
- OAuthトークンは暗号化 at rest（KMS等は将来）

## データ最小化
- participant email は任意。不要なら保持しない設計を優先
- エラーログに個人情報を含めない

## 削除/保持
- 自動削除の保持期間を docs と実装で一致させる
