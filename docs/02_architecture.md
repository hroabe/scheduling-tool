# アーキテクチャ設計書

## 1. システム構成図

### Phase 0完了後の構成

```
┌─────────────────────────────────────────┐
│                Browser                   │
│  Next.js 15 (React 19 + Chakra UI v2)   │
│  Zustand (状態) + React Query (通信)     │
│  PWA (Service Worker)                    │
└─────────────┬───────────────────────────┘
              │ HTTPS (REST API)
              ▼
┌─────────────────────────────────────────┐
│            Django 5.1 + DRF              │
│  Gunicorn (WSGI)                         │
│  LocMemCache                             │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│          PostgreSQL 15                   │
│  (SQLite for local development)          │
└─────────────────────────────────────────┘
```

### Docker Compose構成（Phase 0後）

```yaml
services:
  db:         # PostgreSQL 15
  api:        # Django + Gunicorn
  front:      # Next.js dev server
```

**削除対象**: redis, celery, celery-beat の3サービス

---

## 2. バックエンド アーキテクチャ

### レイヤー構造

```
api/
├── api/                    # プロジェクト設定
│   ├── settings.py         # Django設定（Celery/Redis設定は削除）
│   ├── urls.py             # URLルーティング（DRF Router）
│   ├── wsgi.py             # WSGIエントリーポイント
│   └── asgi.py             # ASGIエントリーポイント（将来用）
│
└── schedule/               # メインアプリ
    ├── models.py           # データモデル（5モデル）
    ├── serializers.py      # シリアライザー（入力検証 + 出力整形）
    ├── views.py            # ViewSet（ビジネスロジック）
    ├── filters.py          # フィルター定義（list無効化後は未使用）
    ├── admin.py            # Django管理画面
    └── tests.py            # テスト
```

### APIルーティング

```python
# api/urls.py のルーター構成
router = DefaultRouter()
router.register(r'schedules', ScheduleViewSet)
# schedules/{uuid}/candidates/ → CandidateViewSet (nested)
# schedules/{uuid}/participants/ → ParticipantViewSet (nested)
# schedules/{uuid}/attendances/ → AttendanceViewSet (nested)
```

### ViewSet設計方針

- `ScheduleViewSet`: Create/Retrieve/Update/Destroy のみ（**listは無効化**）
- カスタムアクション: `respond`, `finalize`, `export_csv`, `export_ics`, `summary`
- `CandidateViewSet`: Phase 1でedit_key検証を追加
- 認証: `AllowAny`（登録不要の原則維持）。保護はedit_key（ハッシュ化）とedit_tokenで実施

---

## 3. フロントエンド アーキテクチャ

### ディレクトリ構造

```
front/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # ルートレイアウト + メタデータ
│   ├── page.tsx                  # ランディングページ
│   ├── providers.tsx             # Chakra UI + React Query プロバイダ
│   ├── globals.css               # グローバルCSS
│   ├── create/
│   │   └── page.tsx              # イベント作成（Phase 1aで簡素化）
│   └── event/
│       └── [uuid]/
│           ├── page.tsx          # イベント詳細
│           └── edit/
│               └── page.tsx      # イベント編集（Phase 1a新規）
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Footer.tsx            # Phase 1bでPowered byリンク追加
│   ├── event/
│   │   ├── ResponseTable.tsx     # おすすめバッジ追加
│   │   ├── ResponseForm.tsx
│   │   ├── SummaryChart.tsx
│   │   └── ResponseSuccessModal.tsx  # Phase 1b新規
│   ├── create/
│   │   └── CandidatePicker.tsx   # Phase 1a新規
│   └── edit/
│       ├── EditKeyModal.tsx      # Phase 1a新規
│       └── CandidateManager.tsx  # Phase 1a新規
│
├── hooks/
│   └── useApi.ts                 # React Query フック群
│
├── lib/
│   ├── api.ts                    # APIクライアントクラス
│   └── date.ts                   # 日付ユーティリティ
│
├── stores/
│   └── index.ts                  # Zustandストア
│
├── types/
│   └── index.ts                  # TypeScript型定義
│
└── public/
    ├── manifest.json             # PWAマニフェスト
    ├── sw.js                     # Service Worker
    └── icon.svg                  # アプリアイコン
```

### 状態管理戦略

| 状態の種類 | 管理方法 | 用途 |
|-----------|---------|------|
| サーバーデータ | React Query (TanStack Query) | APIレスポンスのキャッシュ・再取得 |
| フォーム状態 | React Hook Form + Zod | バリデーション付きフォーム入力 |
| UI状態 | Zustand (useUIStore) | ダークモード、モーダル開閉 |
| 作成フォーム | Zustand (useCreateScheduleStore) | フォームの一時保存 |
| 回答状態 | Zustand (useResponseStore) | 出欠回答の一時保存 |

### 画面遷移図

```
[/ ランディングページ]
    │
    ├── [/create イベント作成]
    │       │
    │       └── 作成完了 → [/event/{uuid} イベント詳細]
    │
    └── [/event/{uuid} イベント詳細]
            │
            ├── Tab: 回答状況 (ResponseTable + おすすめバッジ)
            ├── Tab: 回答する (ResponseForm)
            │       └── 回答完了 → ResponseSuccessModal (CTA)
            ├── Tab: 集計結果 (SummaryChart)
            │
            ├── [CSV出力] → ファイルダウンロード
            ├── [ICS出力] → ファイルダウンロード
            ├── [URL共有] → クリップボードコピー
            │
            └── [/event/{uuid}/edit 編集] (edit_key認証)
                    ├── イベント情報の編集
                    ├── 候補日の追加/削除
                    ├── 日程確定
                    └── イベント削除
```

---

## 4. 認証・認可モデル

### 3層設計

| レイヤー | 対象者 | 認証方法 | 実装Phase |
|---------|--------|---------|----------|
| Layer 1 | 回答者 | 認証なし（URLアクセスのみ） | 現在 |
| Layer 1+ | 回答編集 | edit_token（UUID、回答時に自動発行） | 現在 |
| Layer 1+ | イベント編集/削除 | edit_key（ハッシュ化保存） | Phase 0 |
| Layer 2 | イベント作成者 | マジックリンク認証（検討段階） | Phase 2 |
| Layer 3 | 組織管理者 | SSO/SAML（検討段階） | Phase 3 |

### edit_keyフロー

```
作成時:
  ユーザー → edit_key入力（任意） → Django make_password() → DB保存（ハッシュ値）
  ← レスポンスでedit_keyは返さない（作成者が記憶）

編集時:
  ユーザー → edit_key入力 → Django check_password() → 一致なら操作許可
  sessionStorageに保持（ページ離脱で消去）

edit_key未設定のイベント:
  サーバーがランダムedit_keyを自動生成 → ハッシュ化してDB保存
  作成レスポンスでのみ平文返却（以降は取得不可）
  → ユーザーには「この編集キーを保存してください」と表示
```

---

## 5. キャッシュ戦略

### バックエンド

- **Phase 0-1**: LocMemCache（Django組み込み、インメモリ）
- 頻繁にアクセスされるsummaryエンドポイントはannotateクエリで最適化済み
- 将来的にRedis再導入の余地あり

### フロントエンド

- **React Query**: `staleTime: 30s`, `gcTime: 5min` でAPIレスポンスをキャッシュ
- **Service Worker**: 静的アセットはstale-while-revalidate、APIはnetwork-first

---

## 6. セキュリティアーキテクチャ

| 対策 | 実装 |
|------|------|
| edit_keyハッシュ化 | `django.contrib.auth.hashers.make_password` / `check_password` |
| 一覧API無効化 | `ScheduleViewSet`からListModelMixin除外 |
| owner_email非公開 | Serializerのfieldsから除外 |
| CSVインジェクション対策 | 先頭文字サニタイズ（`=`, `+`, `-`, `@`, `\t`, `\r`） |
| Content-Dispositionサニタイズ | ファイル名から`"`と改行を除去 |
| N+1クエリ防止 | annotateによる一括集計 |
| レート制限 | DRFスロットル（anon: 100/hour, user: 1000/hour） |
| CORS | django-cors-headersで明示的origin許可 |
| CSRF | DRFのデフォルト対応 |
| Content-Type検証 | DRF JSONパーサー |
