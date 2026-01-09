# docs/booking-1on1-spec.md
# 1on1予約（ログイン不要・メール認証）仕様書 v1

## 0. ゴール
主催者がログイン不要で「空き枠を公開」し、ゲストが「1枠を選んで予約確定」できる。
公開前に主催者メール認証を必須とし、管理はhost管理リンク（token）で行う。

- 対象：Next.js App Router + Chakra UI（既存プロジェクト）
- 対応：Web（ワイドPC）/ モバイル（SP）レスポンシブ
- 優先：最短で動くMVP（ただし悪用対策の最低限は入れる）

---

## 1. 用語
- BookingPage：1on1予約ページ（主催者が作成）
- Slot：空き枠（startAt/endAt）
- Reservation：予約（ゲストの確定情報）
- hostToken：主催者管理URLに付与する秘密トークン
- verifyToken：主催者メール認証用トークン

---

## 2. 状態
### 2.1 BookingPage.status
- DRAFT：作成画面で入力中（保存はしない or 一時保存）
- PENDING_VERIFY：作成API実行後、メール認証待ち（未公開）
- PUBLISHED：公開中（ゲスト予約可能）
- UNPUBLISHED：非公開（ゲストには「非公開」表示）

### 2.2 Slot.status
- OPEN：予約可能
- HELD：予約処理中（TTLで解放）
- RESERVED：予約済み（確定）

### 2.3 Reservation.status
- CONFIRMED
- CANCELLED（任意）

---

## 3. ルーティング（App Router）
### 3.1 主催者
- GET  /booking/new
  - 1on1作成（かんたん/詳細タブ。v1はかんたん中心）
- POST /api/booking
  - BookingPage + Slot群を作成し status=PENDING_VERIFY
  - verifyメール送信（verify link）
  - host管理リンクもメール送付（verify後に有効でもOK）
- GET  /booking/verify?token=...
  - verifyTokenを検証し status=PUBLISHED
  - 成功後 `/booking/[slug]/host?token=...` へ誘導
- GET  /booking/[slug]/host?token=...
  - 主催者管理（共有URL・枠追加/削除・予約一覧）
- POST /api/booking/[slug]/slots (auth: hostToken)
- DELETE /api/booking/[slug]/slots/[slotId] (auth: hostToken)
- POST /api/booking/[slug]/resend-verify（任意）
- POST /api/booking/[slug]/resend-host-link（任意）
- POST /api/booking/[slug]/unpublish（任意）

### 3.2 ゲスト
- GET  /booking/[slug]
  - 公開ページ（空き枠選択 + 予約フォーム）
- POST /api/booking/[slug]/reserve
  - slotをOPEN→HELD→RESERVEDへ（競合防止）
  - Reservation作成
- GET  /booking/[slug]/done?rid=...
  - 完了ページ
- GET  /booking/cancel?token=...（任意）

---

## 4. UI仕様（ページごと）

## 4.1 主催者：1on1作成 /booking/new
### 目的
- 1分で「枠を追加」→「公開（メール認証へ）」まで進める
- 既存のイベント作成UI（左：入力/カレンダー、右：一覧）を流用

### レイアウト
- PC（lg以上）：2カラム
  - 左：基本情報 + カレンダー + 枠生成
  - 右：空き枠一覧
- SP：縦積み（右カラムは下へ）

推奨Grid:
- PC: templateColumns={{ base:"1fr", lg:"1fr 420px" }}
- gap={{ base:6, lg:8 }}

### コンポーネント（MVP）
- BookingBasicInfoCard
  - 予約タイトル*（例：1on1）
  - 主催者名*（例：あ）
  - 主催者メール*（認証用）
  - 所要時間*：15/30/45/60/カスタム
  - マイクロコピー：
    - 「公開するにはメール認証が必要です（1分で完了）」
- CalendarPicker（既存流用）
  - 複数日選択OK（Shift+クリックで範囲）
- SlotGenerator
  - 開始時刻（select）
  - 終了時刻（select）
  - 刻み（15/30）トグル
  - 「枠を生成して追加」
  - 選択した日付へ生成（複数選択時は全日へ適用でもOK）
- SlotListPanel（右）
  - 見出し「空き枠一覧（n件）」
  - 空状態文言：
    - 「まだ空き枠がありません。日付と時間を選んで追加してください」
  - SlotItem：
    - 日付 + 時間（例：2026/01/16 10:00-10:30） + 削除
  - 日付ごとの全削除（任意）
- StickyBottomCTA（SPは下固定が望ましい）
  - Primary：「公開してリンクをコピー」
  - Secondary：「公開する（管理画面へ）」
  - disabled条件：
    - 必須未入力、空き枠0件
  - 実行：
    - POST /api/booking → PENDING_VERIFY
    - 次の画面へ（sent or toast + 안내）

### 送信後UI（/booking/new上のモーダルでも可）
- 見出し：「認証メールを送信しました」
- 説明：「メールのリンクを開くと公開されます」
- 再送：「メールを再送する」（任意）

---

## 4.2 主催者：メール認証 /booking/verify?token=...
### 目的
- 認証して公開、管理画面へ遷移

UI:
- loading
- success：「公開しました」→自動遷移（2秒）
- error：「リンクが無効です」+ 再送導線（任意）

---

## 4.3 主催者：管理 /booking/[slug]/host?token=...
### 目的
- 共有URLのコピー
- 空き枠の追加/削除
- 予約一覧の確認

### レイアウト
- PC：上部ShareBar + 下にTabs
- SP：ShareBarを縦、Tabsは上固定可

### コンポーネント
- ShareBar
  - 「ゲスト用URL」表示 + コピー
  - 注意：「管理リンクは主催者だけが使えるURLです」
  - ボタン：「ゲスト画面を見る」
- Tabs: [空き枠] [予約]
  - 空き枠タブ
    - SlotGenerator（/booking/newと同UIを再利用）
    - SlotList（RESERVEDは削除不可）
  - 予約タブ
    - ReservationCard：日時/氏名/メール/メモ/ステータス

---

## 4.4 ゲスト：公開ページ /booking/[slug]
### 目的
- 空き枠を探しやすく、予約確定まで一直線
- PCは横幅を活かして探索を高速化

### レイアウト（推奨）
- PC（lg以上）：3カラム
  - 左：Calendar（枠がある日が分かる）
  - 中：TimeSlotGrid（その日の枠）
  - 右：ReservationForm（常時表示、未選択はdisabled）
  - templateColumns={{ base:"1fr", lg:"360px 1fr 420px" }}
- SP：縦積み
  - Header → 日付チップ → 時間枠 → 予約フォーム（選択後に展開）

### コンポーネント
- BookingHeader
  - title
  - 「主催者：{organizerName} / {duration}分」
  - 「タイムゾーン：Asia/Tokyo」
- DatePicker
  - PC：Calendar
  - SP：DateChips（枠がある日のみ）
- TimeSlotGrid
  - OPENはボタン、RESERVEDはdisabled
  - 選択状態の強調
- ReservationForm
  - 氏名*、メール*、メモ（任意）
  - submit：「この枠で予約する」
  - submit中：loading + 二重送信防止
- 競合エラー
  - 文言：「その枠はすでに予約されました。別の枠を選んでください」
  - 枠一覧を再取得して更新

---

## 4.5 ゲスト：完了 /booking/[slug]/done?rid=...
- 見出し：「予約が確定しました」
- 予約内容カード（日付/時間/所要/主催者/場所）
- 任意：
  - 「カレンダーに追加（.ics）」
  - 「キャンセルする」

---

## 5. バリデーション & 制限（MVP最小）
- 主催者作成：
  - title, organizerName, organizerEmail 必須
  - slots >= 1
  - slot最大 30（暫定）
- ゲスト予約：
  - guestName, guestEmail 必須
  - slotはOPENのみ予約可
- レート制限（推奨）
  - 作成：IP/日
  - 予約：IP/分
  - captchaはv1では任意だが、簡易レート制限は必須

---

## 6. 受け入れ条件（Done）
- 主催者がログインなしで /booking/new から枠を作り、メール認証後に公開できる
- ゲストは /booking/[slug] で枠を選び、予約できる
- 二重予約が発生しない（競合時はUIがエラー表示し再選択できる）
- PCでは探索しやすい3カラム、SPでは縦導線で破綻しない
- host管理URLはtokenなしでは閲覧不可（403 or リダイレクト）
