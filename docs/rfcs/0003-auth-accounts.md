# RFC-0003: ユーザー認証/アカウント機能

## Summary
- ログイン/マイページ（イベント一覧・履歴・連携設定）を提供する。

## Key Decisions（提案）
- 認証方式: (A) Django標準 + セッション、(B) JWT、(C) NextAuth（要検討）
- 「URL共有で回答」はログイン無しでも維持（ここが価値）

## UX
- 幹事: ログインするとイベント管理ができる
- 参加者: これまで通りURLで回答可能（任意でログイン）

## Data Model
- User
- OwnedSchedules
- Integrations（google/outlook）
