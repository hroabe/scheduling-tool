# Frontend Spec（Next.js）— 実装整合版

## 技術
- Next.js (App Router), React, TypeScript
- Chakra UI, TanStack Query, Zustand, Framer Motion

## ルーティング（実装に合わせる）
- `/` トップ（説明・作成導線）
- `/create` イベント作成（候補追加、期限設定）
- `/event/[uuid]` 回答ページ（候補一覧、◯△×、送信）
- `/event/[uuid]` 内のタブ「集計結果」（候補ランキング、おすすめ、CSV/ICS）
- `/event/[uuid]/edit` 管理ページ（作成者ログイン or 編集キー: 情報編集・候補日管理・締切/再開・確定・削除）
- `/booking/new` `/booking/verify` `/booking/[slug]` `/booking/[slug]/host` `/booking/[slug]/done` `/booking/cancel` 1on1予約（RFC-0005 v2）
- `/login` `/register` `/callback` `/account` `/account/events` `/account/integrations` アカウント

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
