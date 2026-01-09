# RFC-0005: 1対1日程調整モード（Calendly風）

## 1. Summary
ホスト（幹事）が空き枠を公開し、ゲストが1枠を予約すると確定する「1対1モード」を追加する。

## 2. Motivation
- 個人/営業/面談用途の強いニーズがあり、収益化しやすい
- Google/Outlook連携と相性がよく、差別化の核になる

## 3. Goals / Non-Goals
### Goals
- ホストが「空き枠（Availability）」を作成/公開できる
- ゲストは公開URLから1枠を予約できる（ログイン不要）
- 予約は二重予約を防ぎ、確定通知/カレンダー登録まで行う

### Non-Goals
- 複数ホストの調整（ラウンドロビン等）
- 大規模チームのシフト管理

## 4. User Experience
- ホスト: 「1対1ページを作成」→ 公開URLを共有
- ゲスト: URLを開く→空き枠を選ぶ→予約→確定
- ホスト/ゲスト: メール通知（将来: LINE/Slack）

## 5. Design
### Data Model（概念）
- `AvailabilityPage`（ホスト、タイムゾーン、公開設定）
- `AvailabilitySlot`（開始/終了、予約可否）
- `Booking`（ゲスト情報、slot、状態）

### Bookingの競合防止
- DBの一意制約 or トランザクションで「同一slotに予約は1件」を保証
- APIは idempotency key をサポートすると安全

### Calendar連携
- Phase2以降で、Google/Outlookから空き枠を自動生成
- 確定後にカレンダーへ書き込み（RFC-0001/0002を流用）

### Frontend
- `/oneonone`（ダッシュボード - 予約ページ一覧・作成）
- `/oneonone/p/[slug]`（公開ページ）
- `/oneonone/pages/[id]`（ページ管理）

> **実装済み**: Chakra UI ベースのモダンなUIで実装。Header/Footer統合により、サイト全体と一貫したナビゲーションを提供。

- 予約フローはできるだけ短く

### Security/Privacy
- ゲスト入力（名前/メール）は最小化
- 予約URLに秘密情報を載せない

## 6. Alternatives
- まずは「手動空き枠」だけで開始し、連携は後から
- 既存のScheduleモデルに無理に統合せず、別モードとして独立

## 7. Rollout Plan
- Phase1: 手動で空き枠登録→予約→確定通知
- Phase2: Google連携で空き枠自動生成
- Phase3: Outlook連携、課金プラン（枠数/連携数制限）

## 8. Test Plan
- unit: 予約の競合防止、状態遷移
- integration: 予約→確定→通知ログ
- load: 人気枠への同時予約（競合テスト）

## 9. Open Questions
- タイムゾーンの扱い（ホスト基準かゲスト基準か）
- キャンセル/変更の要件
