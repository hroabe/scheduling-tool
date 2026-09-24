# docs/top-page-improvement.md
# トップページ改善仕様（Desktop + Mobile / Next.js App Router + Chakra UI）

## 0. 目的
- トップページの「プロっぽさ」と「CV（イベント作成クリック）」を改善する
- Desktop/Mobile の両方で「読みにくい折返し」「主従の曖昧さ」を解消する
- Chakra UI で実装しやすい形に落とす（props中心、過度なCSSは避ける）

## 1. 現状課題（観測）
### 1.1 Mobile
- H1が単語の途中で分割され「シンプ / ルに」に見える
- 基本機能カードのタイトルが不自然に折返し（例：リマイン / ダー）
- Heroにスクショが表示されず、プロダクト体験が想像しづらい
- CTAが横並びで主従が弱い（押すべきボタンが迷う）

### 1.2 Desktop
- HeroのH1が折返しで読みにくくなる可能性（環境幅に依存）
- Headerの主CTAとHeroの主CTAが同格に見え、視線が分散しうる
- 「デモを見る」の行き先が弱い（体験に繋がる導線が薄い）

## 2. 改善方針（優先度順）
P0：テキスト折返し問題を消し、読みやすさを改善  
P0：CTAの主従を明確化し、迷いを減らす  
P1：モバイルでもHeroにプロダクト画面を見せ、不安を減らす  
P1：「デモを見る」をプロダクト体験に繋げる  
P2：カード内の行数・余白・タイポを統一し“整列感”を上げる  

---

## 3. 改善要件（実装仕様）

### 3.1 H1の改行制御（Desktop/Mobile共通：P0）
**要件**
- H1が単語途中で分割されない
- Mobileでは意図した改行（2行）で読みやすい
- Desktopでは自然改行でもOKだが、崩れにくいよう maxW を持たせる

**実装案（推奨）**
- `whiteSpace="pre-line"` を利用し、意図した改行に固定する

**指定文言**
- H1：`日程調整を\nもっとシンプルに`
- もし短縮する場合：`日程調整をシンプルに`

**受け入れ**
- 375px幅で「シンプ / ルに」のような途中分割が発生しない

---

### 3.2 HeroのCTA主従（Mobile最優先：P0）
**要件**
- Mobileでは主CTAを1stで強く（全幅）
- 副CTAは主CTAより弱く（outline/ghost、またはテキストリンク寄り）

**仕様**
- `Stack direction={{ base: "column", sm: "row" }}` に変更
- Primary：`w={{ base: "full", sm: "auto" }}` / `colorScheme="blue"`
- Secondary：`variant="outline"` もしくは `variant="ghost"`

**受け入れ**
- Mobileで主CTAが明確に目立つ
- 2ボタンが同格に見えない

---

### 3.3 Mobile HeroにDeviceMockを表示（P1）
**要件**
- MobileのHero内で、コピー/CTAの直後にプロダクト画面が見える
- 合成画像は不要。スクショ1枚を `DeviceMock` に入れる
- CLSを避ける（`AspectRatio` 必須）

**仕様**
- `display={{ base: "block", md: "none" }}` でMobileのみ表示
- `AspectRatio ratio={16/10}` を使用
- 画像は `public/images/hero-screenshot.png`（仮）を参照

**受け入れ**
- MobileでもHero内にスクショが見え、安心感が増える

---

### 3.4 Header CTAの優先度調整（Desktop中心：P1）
**要件**
- Heroを主役にするため、Header CTAは“やや弱め”に見せる
- ただし常時作成導線は残す

**仕様（いずれか）**
- A：Header CTA を `variant="outline"` に変更
- B：Header CTA を `size="sm"` にする（Hero CTA は `lg` のまま）

**受け入れ**
- Desktopで視線がHero CTAへ流れる

---

### 3.5 「デモを見る」の導線を強化（P1）
**要件**
- 「デモを見る」は、視覚的に“体験”が分かる要素へスクロール
- できればHeroスクショ（DeviceMock）付近へスクロール

**仕様**
- `ref` を DeviceMock セクションに付け、`scrollIntoView({behavior:"smooth"})`
- Mobile/Desk共通で動く

**受け入れ**
- 「デモを見る」で視線がスクショ（またはデモ領域）へ移動する

---

### 3.6 基本機能カード：モバイル見出し短縮（P0）
**要件**
- タイトルの不自然な折返しをなくす
- Mobileでは短いタイトル、Desktopではフルタイトルを使う

**仕様（推奨）**
- `useBreakpointValue` でタイトルを切り替える
- 例：
  - Desktop：`期限設定&リマインダー`
  - Mobile：`期限&リマインド`

**受け入れ**
- 375px幅でカードタイトルが不自然に割れない

---

### 3.7 基本機能カード：補助1行（任意：P2）
**要件**
- 各カードに1行だけ説明を追加（価値の理解を速くする）
- 2行以上は不要、`noOfLines={1}` を推奨

**受け入れ**
- “何が嬉しいか”がカードだけで分かる

---

## 4. 追加推奨（任意）
- UseCases/Featuresカードの説明文を `noOfLines` で揃え、整列感を上げる
- DeviceMockの shadow を強すぎない値に（`shadow="lg"` 程度）

---

## 5. Done（受け入れ基準）
- Mobile(375px)で H1/カード見出しの途中改行がない
- Mobileで主CTAが全幅で明確に主役
- Mobile Heroでスクショ（DeviceMock）が表示される
- 「デモを見る」で適切な位置へスクロールする
- DesktopでHeader CTAの主張が抑えられ、Hero CTAが主役に見える
