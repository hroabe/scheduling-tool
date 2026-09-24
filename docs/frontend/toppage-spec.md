# docs/top-page.md
# トップページ実装仕様（最終案 / Next.js App Router + Chakra UI）

## 1. 目的
- 「登録不要 / URL共有 / ○△× / 自動集計」を1秒で理解できるトップページを作る
- 主CTA「無料でイベントを作成する」へのクリックを最大化する
- “プロが作ったような洗練”を、**Chakra UIで実装しやすい構造**で実現する

## 2. 技術前提
- Next.js App Router（`app/`）
- Chakra UI（`@chakra-ui/react`）
- 既存プロジェクトの `Providers`（ChakraProvider）を利用
- アイコンは `lucide-react` または Chakraアイコン（既存方針に従う）
- 画像は `next/image` を優先（Chakraの `Image` でも可）

## 3. 対象範囲
- トップページ（`app/page.tsx` 相当）および必要なコンポーネント
- Header / Hero / 3ステップ / UseCases / Features(6) / FAQ / FinalCTA / Footer
- Hero右側は **DeviceMock（CSS+Chakra）** でスクショ1枚を枠にはめる（合成画像不要）

## 4. 非目標（スコープ外）
- 課金導線・価格表・導入事例の作成
- 多言語の完全対応（ただし文言は定数化してi18nしやすくする）

---

## 5. 情報設計（セクション構成）
上から順に以下を実装する。

1) Header
2) Hero（左：コピー&CTA / 右：DeviceMock+スクショ）
3) StepsStrip（薄灰背景の3ステップ）
4) UseCases（「こんな時に便利」3カード）
5) Features（「基本機能」6カード）
6) FAQ（4項目のアコーディオン）
7) FinalCTA（薄い背景＋ボタン1つ）
8) Footer

---

## 6. Chakra UI 実装ガイド（レイアウト・トークン）

### 6.1 コンテナ
- 全体の横幅：`Container maxW="6xl"`
- セクション余白：
  - `py={{ base: 10, md: 14 }}` を基本にする
- セクション間のギャップ：`Stack spacing={{ base: 10, md: 14 }}`

### 6.2 タイポ（目安）
- H1：`fontSize={{ base: "3xl", md: "5xl" }}`, `fontWeight="bold"`, `lineHeight="1.1"`
- Sub：`fontSize={{ base: "md", md: "lg" }}`, `color="gray.600"`, `lineHeight="1.7"`
- セクション見出し：`fontSize={{ base: "xl", md: "2xl" }}`, `fontWeight="semibold"`

### 6.3 カラー/背景（目安）
- Hero背景：`bgGradient="linear(to-r, blue.50, blue.100)"`
  - 既存テーマに合わせて変更可
- StepsStrip背景：`bg="gray.50"`
- カード背景：`bg="white"`, `borderWidth="1px"`, `borderColor="gray.200"`, `rounded="xl"`, `shadow="sm"`

---

## 7. 各セクション仕様（UI要件 + 文言）

### 7.1 Header
**構成**
- 左：ロゴ（アイコン＋「日程調整」）
- 中：ナビ（`機能 / 使い方 / FAQ`）※SPは非表示でも可
- 右：言語（`日本語▼`）、主CTA、ログイン

**Chakra例**
- `Flex align="center" justify="space-between"`
- ナビ：`HStack`（SPで `display={{ base: "none", md: "flex" }}`）
- 右：`HStack`
- 主CTAボタン：`colorScheme="blue"`

**ボタン文言**
- 主CTA：`無料でイベントを作成する`
- ログイン：`ログイン`

**遷移**
- 主CTA：`/events/new`（プロジェクトの実際の新規作成ページに合わせて変更可）
- ナビはページ内アンカーでOK（`#features`, `#steps`, `#faq`）

---

### 7.2 Hero（最重要）
**狙い**
- 視線を「左コピー」「右DeviceMock」に集中させ、情報の喧嘩を避ける

**レイアウト**
- `Grid templateColumns={{ base: "1fr", md: "5fr 7fr" }}`（または `1fr 1fr`）
- 左：`VStack align="start"`
- 右：`DeviceMock`（固定アスペクト比でCLS防止）

**固定文言**
- H1：日程調整を　もっとシンプルに
- Sub：登録不要。候補日を作ってURLを送るだけ。○△×回答が集まり、最適な日程がすぐ分かります。
- バッジ（5つ）：登録不要 / かんたん共有 / ○△× / 自動集計 / 多言語対応
- Primary CTA：無料でイベントを作成する
- Secondary CTA：デモを見る
- Microcopy：※主催者も参加者も、ログインなしで使えます（無料）

**バッジ**
- `Wrap` + `Tag`（`variant="subtle"`）
- 回答記号：日本語・韓国語は「○△×」、その他言語は「✓?×」

**CTA**
- Primary：`Button colorScheme="blue" size="lg"`
- Secondary：`Button variant="outline" size="lg"`
- `デモを見る` は DeviceMock へ `scrollIntoView({behavior:"smooth"})`

**右ビジュアル（DeviceMock）**
- スクショ1枚で成立する（合成画像不要）
- 画像パス：`/images/hero-screenshot.png`（仮）
- `AspectRatio` を使って固定比率（例：16/10）
- 枠（ノートPC風）を `Box` で作る：
  - 外枠：`rounded="2xl"`, `shadow="lg"`, `borderWidth="1px"`
  - 上部バー：薄いグレーの帯 + 3つの小丸（任意）
  - 中身：`overflow="hidden"` でスクショをクリップ

---

### 7.3 StepsStrip（使い方は3ステップ）
**配置**
- Hero直下
- `bg="gray.50"` の帯

**文言**
- 見出し：使い方は3ステップ
- 1：作成（候補日）
- 2：URL共有
- 3：集計→決定
- 補助：最短1分。あとは回答を待つだけ。

**実装**
- `Stack`（PCは `HStack`, SPは `VStack`）
- 区切りは矢印アイコン（`→`）でもOK
- 各ステップは `VStack`（アイコン＋テキスト）

---

### 7.4 UseCases（こんな時に便利）
**構成**
- 見出し：こんな時に便利
- 3カード（`SimpleGrid columns={{ base: 1, md: 3 }}`）

**固定文言**
- チームMTG：チームMTGなど、グループの予定をかんたんに調整できます。
- 飲み会・イベント：候補日を作り、参加者の都合を○△×で集計・確認。
- 1on1・面談：候補日を提示して、スムーズに日程を確定できます。

---

### 7.5 Features（基本機能：6カード）
**構成**
- 見出し：基本機能
- 6カード（`SimpleGrid columns={{ base: 1, md: 3 }}` で2行）

**タイトル（固定）**
- URL共有で即回答
- ○△×の3段階
- リアルタイム集計&提案
- 期限設定&リマインダー
- 多言語対応
- セキュア設計

**カード**
- `Icon` + `Heading size="sm"` + `Text`（1行あると親切。無くてもOK）

---

### 7.6 FAQ（アコーディオン）
**構成**
- 見出し：FAQ
- `Accordion allowToggle`（初期は閉）

**質問（固定・微調整可）**
1. 登録は必要ですか？
2. 候補日程を変更できますか？
3. 回答画面はかんたんですか？
4. 締切日時は決められますか？

**回答（例）**
- 登録は必要ですか？：不要です。主催者も参加者もログインなしで使えます。
- 候補日程を変更できますか？：作成後も候補の追加・削除ができます（編集キーで保護）。
- 回答画面はかんたんですか？：○△×で直感的に回答できます。スマホでも操作しやすい設計です。
- 締切日時は決められますか？：期限を設定して、リマインド通知で回答漏れを防げます。

---

### 7.7 FinalCTA
- 背景：Heroより弱い淡色
- 文言は短く：
  - 見出し：今すぐ始めましょう
  - 補助：無料で日程調整を始めて、チームの生産性を向上させましょう。
  - ボタン：無料でイベントを作成する

---

### 7.8 Footer
- 左：リンク（`機能 / 使い方 / FAQ`）
- 右：© Copyright 2023（年は方針に合わせて）
- `Divider` で上と区切る

---

## 8. インタラクション要件
- `デモを見る` クリックで DeviceMock（またはStepsStrip）へスムーズスクロール
- 主CTAクリックで `/events/new` へ遷移
- ナビの `機能/使い方/FAQ` はページ内アンカーでスクロール（`#features`, `#steps`, `#faq`）

---

## 9. アクセシビリティ（最低限）
- `Button` と `Link` のフォーカス可視
- スクショ画像に `alt="日程調整ツールの画面プレビュー"`
- FAQはChakra Accordion標準のariaに準拠

---

## 10. パフォーマンス/品質
- スクショは適切に圧縮（WebP推奨）
- DeviceMockは `AspectRatio` で高さを確保しCLS回避
- Hero画像は `priority` も検討（LCP次第）

---

## 11. 受け入れ基準（Done）
- セクション順が仕様どおり
- CTA文言がすべて「無料でイベントを作成する」に統一
- SP/PCで崩れず、横スクロールなし
- FAQが開閉でき、キーボード操作できる
- DeviceMockがスクショ1枚で成立（合成不要）
