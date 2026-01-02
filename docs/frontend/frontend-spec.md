# Frontend Spec（Next.js）

## 技術
- Next.js (App Router), React, TypeScript
- Chakra UI, TanStack Query, Zustand, Framer Motion

## 画面（提案）
- `/` トップ（説明・作成導線）
- `/new` イベント作成（候補追加、期限設定）
- `/s/{uuid}` 回答ページ（候補一覧、◯△×、送信）
- `/s/{uuid}/summary` 集計ページ（候補ランキング、未回答者、CSV）
- `/s/{uuid}/finalize` 確定ページ（管理キー入力）

## 状態管理方針
- サーバー状態: TanStack Query
  - invalidate: respond/finalize 後に summary を更新
- UI状態: Zustand（ダークモード、トースト抑制など）
- セキュリティ:
  - edit_token/admin_key をURLクエリに載せない（ログ/Referer漏洩防止）
  - 保存するなら HttpOnly Cookie / secure storage を優先
