# UI Refresh v7（イベント管理/詳細ページ）仕様書
対象：日程調整（通常イベント）/ イベント管理ページ群  
実装：Next.js App Router + Chakra UI（既存プロジェクトに適用）  
参照：scheduling_mockups_v7_png.zip（Desktop/Mobile 各4画面の最終モック）

---

## 0. 目的（Why）
- 既存機能を維持したまま、見た目を「プロっぽく」「安心感のあるSaaS品質」に引き上げる
- 重要アクション（開く/共有/CSV/回答）までの導線を短くし、迷いを減らす
- モバイルでも操作が破綻しない（ボタンはみ出し、文字詰まり、要素の崩れをゼロに）

---

## 1. スコープ（What）
### 1.1 対象画面（必須：8画面）
**Desktop**
1) My Events（イベント一覧）  
2) Event Status（回答状況）  
3) Respond（回答フォーム）  
4) Summary（集計結果）

**Mobile**
5) My Events（イベント一覧）  
6) Event Status（回答状況）  
7) Respond（回答フォーム）  
8) Summary（集計結果）

### 1.2 非スコープ（やらない）
- API仕様変更 / DB変更 / 認証方式変更
- 既存の「回答ロジック」「集計ロジック」の変更
- i18n設計の刷新（既存の多言語対応の枠組みは維持）

---

## 2. デザイン原則（How it should feel）
- **余白 > 線**：罫線で区切りすぎず、Card/Shadow/Spacingで階層を作る
- **状態が一目**：受付中/締切/確定などの状態は Pill で強く表示
- **Primary CTA は1つ**：画面内で主導線を明確化（サブはoutline）
- **モバイルは縦積み + Sticky**：長いフォームは下部CTA固定などで完走率を上げる
- **アクセシビリティ**：フォーカス可視 / ボタンサイズ / コントラスト / ARIA

---

## 3. フォント（文字化け防止）
- UI全体のfont-familyは必ず日本語対応（Noto Sans CJK / Noto Sans JP相当）を使用
- Chakraのtheme.fonts.body/heading を統一
- **DoD**：日本語の見出し/ラベル/ボタンが全画面で「□」や崩れがない

推奨（例）：
- body: `"Noto Sans JP","Noto Sans CJK JP",system-ui,-apple-system,"Segoe UI",sans-serif`
- heading: 同上

---

## 4. 情報設計（共通コンポーネント）
### 4.1 EventHeaderCard（共通）
- 左：イベント名、状態Pill（例：回答受付中）
- 下：メタ情報（主催 / 候補数 / 回答数 / 作成日時）
- 右：アクション（共有、CSV）※モバイルはアイコン+テキスト or メニュー化

### 4.2 Tabs（共通）
- 「回答状況」「回答する」「集計結果」
- Desktop：横並びタブ
- Mobile：横スクロール or コンパクトタブ（折り返さない）

### 4.3 StatusPill（共通）
- 状態：受付中 / 締切 / 確定
- colorSchemeを統一（例：受付中=blue、締切=orange、確定=green）

### 4.4 ProgressBar（共通）
- **必須修正**：楕円形にならないこと（角丸は小さめ）
- track：薄いグレー、fill：ブランドブルー
- 高さ：6px程度、角丸：2px程度（丸薬にしない）

---

## 5. 画面仕様（Desktop）

## 5.1 Desktop：My Events（イベント一覧）
### レイアウト
- ページ見出し：`マイイベント`
- サブテキスト：`作成したイベントを一覧で管理できます`
- 上部ツールバー：
  - 検索入力（placeholder：`イベント名で検索…`）
  - 状態フィルタ（chips）：`すべて / 受付中 / 締切 / 確定`
  - 並び替え（Select）：`新しい順 / 古い順 / 回答が多い順`

### 一覧表示（Card Grid）
- Desktop：2カラム（広ければ3カラムでもOKだが、まず2カラムで崩れない実装を優先）
- 各Card（EventListCard）要素：
  - イベント名（太字）
  - 状態Pill（例：回答受付中）
  - メタ：`候補: X ・ 回答: Y人 ・ 作成: 〜`
  - `回答進捗`ラベル + **長方形ProgressBar**
  - 右下または右：Primaryボタン `開く`
  - **修正必須**：開くボタンがカード外にはみ出さないこと（overflow/幅計算を調整）

### デモデータ（カードのイベント名は4件すべて別名）
- 山田さん歓迎会
- プロジェクト定例MTG
- 採用面談（候補者A）
- 新年会（友人グループ）

---

## 5.2 Desktop：Event Status（回答状況）
### ヘッダ
- EventHeaderCard（共有/CSVあり）

### 本文（回答状況タブ）
- テーブル形式（既存仕様を維持しつつ見た目改善）
- Columns（候補日）：
  - **必須修正**：候補を 1/7, 1/8, 1/9 の3列にする（時間は例：10:00-11:00）
  - 例：`1/7(水) 10:00-11:00` / `1/8(木) 10:00-11:00` / `1/9(金) 10:00-11:00`
- Rows：
  - 参加者（例：太郎 / 次郎）
  - 各セルは回答状態（○/△/×）をアイコン+淡色背景で表示
  - コメント列（右端）を維持（編集/削除アイコンは控えめ）

### 右下リマインド（Card）
- タイトル：`未回答の人にリマインド`
- 説明：`リンクを再送して回答を促せます。`
- ボタン：`リマインド`

---

## 5.3 Desktop：Respond（回答する）
- EventHeaderCard（簡易でOK、共有は不要でも良い）
- フォーム：
  - お名前（必須）
  - 候補日ごとに「○ △ ×」の3択（ボタングループ）
  - コメント（任意）
- Primary CTA：`回答を送信する`（アイコン任意）
- バリデーション：
  - 名前必須
  - 候補が複数ある場合、未選択があっても送れるかは既存仕様に合わせる（変更しない）

---

## 5.4 Desktop：Summary（集計結果）
- KPI Cards（3つ）：
  - 回答者数
  - 最大「○」数
  - 候補日数
- 候補日ごとの集計：
  - おすすめ候補に`おすすめ`バッジ
  - 棒グラフ風（Stacked bar）で○△×比率を表示（ChakraのProgress複数でもOK）
- 決定アクション（既存にあれば）：
  - `この候補で決定`（Primary）
  - 決定後の状態変化は既存仕様に準拠

---

## 6. 画面仕様（Mobile）

## 6.1 Mobile：My Events
- 1カラムカード
- 検索/フィルタ/並び替えは縦積み or 折りたたみ（まず崩れない実装）
- Card内の`開く`ボタンは **100%幅** or 右寄せ固定、いずれでも **はみ出し禁止**
- ProgressBarは同じく「長方形」

---

## 6.2 Mobile：Event Status
- EventHeaderCard：アクションは右上メニュー（共有/CSV）でもOK
- 候補日が3つあるため、テーブルをそのまま出すと潰れる：
  - 推奨：候補日を横スクロール（tabs/segmented）で切替
  - 表示例：上に候補日セレクタ（1/7, 1/8, 1/9）
  - 下に参加者リスト（各行：名前 + ○△× + コメント）
- リマインドCard：下部に配置、CTAは押しやすいサイズ

---

## 6.3 Mobile：Respond
- フォームは縦積み
- ○△×は3つ並びボタン（タップ領域を広く）
- **推奨**：下部に Sticky CTA（`回答を送信する`）  
  ※Stickyが難しければ、通常配置でもOKだが押しやすさ優先

---

## 6.4 Mobile：Summary（※必須追加）
- Desktopと同等の情報を縦積み
- KPIカードは縦に3枚（または横スクロール）
- 候補日ごとの集計カード（おすすめバッジ付き）
- 文字サイズ/余白を増やし、視認性優先

---

## 7. コンポーネント分割（推奨）
- components/event/
  - EventHeaderCard.tsx
  - StatusPill.tsx
  - ProgressBarRect.tsx（角丸小のProgressラッパー）
  - EventListCard.tsx
  - ResponseChoiceGroup.tsx（○△×ボタングループ）
  - CandidateDateSelector.tsx（Mobile用：候補日切替）
  - SummaryKpiCards.tsx
  - SummaryCandidateCard.tsx
- app/(routes)/events/page.tsx（My Events）
- app/(routes)/events/[id]/page.tsx（detail shell + tabs）
  - or app/(routes)/events/[id]/status/page.tsx など既存に合わせる（変更最小）

---

## 8. 実装制約（重要）
- Chakra UI のみで実装（追加ライブラリ原則なし）
- 既存ルーティング/データ取得/イベントID体系を壊さない
- 既存機能のボタン動作（共有/CSV/回答/集計）を維持
- 日本語フォント適用を「全ページ」で保証

---

## 9. 受け入れ条件（DoD）
- [ ] Desktop/Mobile 8画面が仕様通りに表示される
- [ ] 日本語が文字化けしない（見出し/本文/ボタン/ピル/タブ全て）
- [ ] 進捗バーが楕円形でなく、長方形のバーとして見える
- [ ] Event Status に候補日 1/7, 1/8, 1/9 が表示される
- [ ] My Events のカード4件はそれぞれ別のイベント名
- [ ] 「開く」ボタンがカードからはみ出さない（Desktop/Mobile両方）
- [ ] Mobile Summary 画面が存在し、情報が欠落しない
- [ ] Lighthouse/基本A11y：ボタンにaria-label、フォーカス可視、タップ領域44px目安

---

## 10. QA観点（チェックリスト）
- 320px幅でも崩れない（iPhone SE相当）
- 長いイベント名（例：`山田さん歓迎会（第一回：関係者全員）`）でもレイアウトが壊れない
- 参加者が増えても表が崩れない（スクロール/折返し/省略）
- CSV/共有がモバイルでも押せる（メニュー化含む）
