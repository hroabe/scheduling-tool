# RFC-0008: かわいいモード（テーマ切り替え機能）

## 1. Summary

ユーザーが「かわいいモード」と「プロフェッショナルモード」を切り替えられるテーマ機能を追加する。かわいいモードではパステルカラー、丸みのあるUI、アイコン表情、装飾要素でフレンドリーな雰囲気を演出する。

## 2. Motivation

- **差別化**: 他の日程調整ツールにはないユニークな機能
- **ターゲット層拡大**: カジュアルな用途（友人間、趣味の集まり）へのアピール
- **ユーザー体験向上**: 好みに応じたパーソナライズで長期利用を促進

## 3. Goals / Non-Goals

### Goals
- ダーク/ライト/かわいいモードの3テーマを提供
- ワンクリックでテーマを切り替え可能
- 設定はローカルストレージに保存（ログイン不要で維持）
- Web / モバイルアプリ両対応

### Non-Goals
- カスタムカラー選択（Phase 2以降）
- テーマのAPI保存（ログインユーザー向けは後続）
- アニメーション差し替え（初期は静的なスタイルのみ）

## 4. User Experience

### テーマ切り替え
- ヘッダーのアイコンボタンでモード選択（🌙 / ☀️ / 🌸）
- 選択すると即座にUI全体が切り替わる
- ブラウザ再読み込み後も設定を維持

### かわいいモードのデザイン要素
| 要素 | 通常モード | かわいいモード |
|------|-----------|---------------|
| **カラー** | ブルー / パープルグラデーション | パステルピンク / ラベンダー / ミントグリーン |
| **角丸** | 8px - 16px | 16px - 24px (より丸く) |
| **フォント** | Inter / Noto Sans | 丸ゴシック系 (M PLUS Rounded 1c など) |
| **アイコン** | ◯ △ × | 😊 🤔 😢 (絵文字) |
| **装飾** | なし | 小さな星 / ハート / きらきらエフェクト |
| **ボタン** | シャープ | ぷにぷに感のある影 |

## 5. Design

### Frontend (Web)

#### テーマコンテキスト
```typescript
// stores/themeStore.ts
type ThemeMode = 'light' | 'dark' | 'cute';

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}
```

#### Chakra UIテーマ拡張
```typescript
// providers/theme.ts
const cuteTheme = extendTheme({
  colors: {
    brand: {
      50: '#FFF0F5',   // lavender blush
      500: '#FF69B4',  // hot pink
      // ...
    }
  },
  fonts: {
    heading: "'M PLUS Rounded 1c', sans-serif",
    body: "'M PLUS Rounded 1c', sans-serif",
  },
  radii: {
    md: '16px',
    lg: '24px',
  },
  // ...
});
```

#### 絵文字アイコン切り替え
```typescript
const attendanceIcons = {
  normal: { ok: '◯', maybe: '△', ng: '×' },
  cute: { ok: '😊', maybe: '🤔', ng: '😢' },
};
```

### Mobile (React Native / Expo)

#### テーマプロバイダー
```typescript
// mobile/src/theme/ThemeContext.tsx
const themes = {
  light: lightTheme,
  dark: darkTheme,
  cute: cuteTheme,
};
```

#### NativeWind / StyleSheet対応
- `cute` クラスまたはスタイル変数でテーマを適用
- アイコンはプラットフォームネイティブの絵文字を使用

### 保存
- Web: `localStorage.setItem('theme', 'cute')`
- Mobile: `AsyncStorage.setItem('theme', 'cute')`

## 6. Alternatives

1. **CSS Variables のみ**: Chakraテーマを使わず、CSS変数で切り替え → 保守性が低い
2. **プリセット選択式**: 複数のプリセット提供 → 初期は3つで十分
3. **サーバーサイド保存**: ログイン必須になる → 初期はローカル保存で実装

## 7. Rollout Plan

| Phase | 内容 |
|-------|------|
| **Phase 1** | Web: テーマ切り替えUI + cuteテーマ実装 |
| **Phase 2** | Mobile: テーマ対応 |
| **Phase 3** | アニメーション / きらきらエフェクト追加 |
| **Phase 4** | ログインユーザーのテーマ同期 |

## 8. Test Plan

- **unit**: テーマストアの状態管理
- **integration**: テーマ切り替え → UI反映確認
- **e2e**: テーマ選択 → リロード → 維持確認
- **visual**: スクリーンショット比較テスト

## 9. Open Questions

1. かわいいモードのアニメーション（星がキラキラなど）は必要か？
2. 装飾要素（ハート、星）の量はどの程度が適切か？
3. モバイルでのフォント（M PLUS Rounded）のバンドルサイズ影響
