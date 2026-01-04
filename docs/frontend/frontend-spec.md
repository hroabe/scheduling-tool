# Frontend Spec（Next.js）— 実装整合版

## 技術
- Next.js (App Router), React, TypeScript
- Chakra UI, TanStack Query, Zustand, Framer Motion

## ルーティング（実装に合わせる）
- `/` トップ（説明・作成導線）
- `/create` イベント作成（候補追加、期限設定）
- `/event/[uuid]` 回答ページ（候補一覧、◯△×、送信）
- `/event/[uuid]/summary` 集計ページ（候補ランキング、未回答者、CSV）
- `/event/[uuid]/finalize` 確定ページ（管理キー入力）

> ルート名を変更する場合は、docsと実装を必ず同期する。

## 状態管理方針
- サーバー状態: TanStack Query
  - invalidate: respond/finalize 後に summary を更新
- UI状態: Zustand（ダークモード、トースト抑制など）
- セキュリティ:
  - edit_token/edit_key をURLクエリに載せない（ログ/Referer漏洩防止）
  - 保存するなら HttpOnly Cookie / secure storage を優先（WebはCookie設計が有利）

## UX上の注意
- 共有URL「だけ」で回答が完結する体験を最優先（ログイン導入後も維持）
- 期限切れ/確定済みの状態での表示（編集不可/閲覧のみ等）を一貫させる
