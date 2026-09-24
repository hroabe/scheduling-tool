# 実装ロードマップ

## 全体タイムライン

```
2026年
  4月         5月         6月         7月
  ├──Phase 0──┤                              (2週間)
              ├───────Phase 1a───────┤        (6週間)
                                    ├─P1b─┤  (3週間)
                                          ↑
                                       MVPリリース
```

---

## Phase 0: セキュリティ・品質基盤（2週間）

### Week 1: セキュリティ修正 + インフラ簡素化

| Day | タスク | 対象ファイル | 詳細 |
|-----|--------|-------------|------|
| Day 1 | edit_keyハッシュ化 | `models.py`, `serializers.py`, `views.py` | `make_password`/`check_password`導入、max_length 100→256、**finalize/destroyも対応** |
| Day 1 | マイグレーション | 新規migration 2本 | AlterField + RunPython(既存データハッシュ化) |
| Day 2 | 一覧API無効化 | `views.py` | ModelViewSet→Mixin分解、listアクション除去 |
| Day 2 | owner_email非公開 | `serializers.py` | DetailSerializer.fieldsから除外 |
| Day 2 | show_participant_count除外 | `serializers.py` | Detail/Create/Updateのfieldsから除外 |
| Day 2 | notify_on_response除外 | `serializers.py`, `create/page.tsx` | serializer fields除外、フロント通知Switch削除 |
| Day 3 | CSVインジェクション対策 | `views.py` | `_sanitize_csv_value()`追加、Content-Dispositionサニタイズ |
| Day 3 | views.py通知コード除去 | `views.py` L158-160 | `send_response_notification.delay()`呼び出し削除 |
| Day 3 | tasks.py凍結 | `schedule/tasks.py` | 中身をコメントに置換 |
| Day 4 | settings.py変更 | `api/settings.py` | CELERY_*, EMAIL_*, Redis CACHES削除、LocMemCacheに統一 |
| Day 4 | Celeryインフラ削除 | `__init__.py`, `celery.py`, `requirements.txt` | celery app import削除、celery.py削除、パッケージ削除 |
| Day 4 | Docker簡素化 | `docker-compose.yml` | redis/celery/celery-beat サービス削除 |
| Day 5 | 不要物削除 | `mobile/`, `init_mobile.bat`, `serializer.py` | ディレクトリ・ファイル削除 |
| Day 5 | Pillow削除 | `requirements.txt` | OGP画像生成不要のため |

### Week 2: N+1修正 + テスト + プライバシーポリシー

| Day | タスク | 対象ファイル | 詳細 |
|-----|--------|-------------|------|
| Day 6 | summaryのannotate化 | `views.py` | forループ内count()→annotateで1クエリ化 |
| Day 6 | export_csvのannotate化 | `views.py` | attendance一括取得→dictルックアップ |
| Day 7 | テスト:Schedule CRUD正常系 | `tests.py` | create/retrieve/update/delete |
| Day 7 | テスト:respond正常系 | `tests.py` | 回答送信、edit_token返却 |
| Day 8 | テスト:export_csv正常系 | `tests.py` | CSV出力、Content-Type確認 |
| Day 8 | テスト:edit_key異常系 | `tests.py` | 間違ったedit_keyで更新/削除拒否 |
| Day 9 | CandidateViewSetアクセス制御 | `views.py` | create/update/destroyにedit_key検証追加 |
| Day 9 | プライバシーポリシー | `front/app/privacy/page.tsx` | 最低限の個人情報取扱い明記 |
| Day 10 | Phase 0動作確認 | 全体 | Docker起動、全エンドポイント手動テスト |

### Phase 0 完了基準

- [ ] edit_keyがハッシュ化保存されている
- [ ] 一覧API(`GET /api/v1/schedules/`)が405を返す
- [ ] owner_emailがAPIレスポンスに含まれない
- [ ] CSVエクスポートで数式インジェクションが無効化されている
- [ ] Celery/Redis/Pillow が削除されている
- [ ] mobile/ が削除されている
- [ ] summaryとexport_csvがannotateクエリを使用している
- [ ] 4カテゴリのテストが全てパスしている
- [ ] CandidateViewSetにedit_key検証がある
- [ ] プライバシーポリシーページが存在する

---

## Phase 1a: コア機能強化（6週間）

### Week 3-4: UX簡素化

| タスク | 対象ファイル | 詳細 |
|--------|-------------|------|
| CandidatePickerコンポーネント | `components/create/CandidatePicker.tsx` [新規] | react-day-pickerベースのカレンダー日付選択 |
| 作成フォーム簡素化 | `app/create/page.tsx` | 3フィールド+Accordion詳細設定に書き換え |
| zodスキーマ修正 | `app/create/page.tsx` | 必須フィールドの絞り込み |
| types更新 | `types/index.ts` | owner_email, show_participant_count等の削除 |
| Zustandストア更新 | `stores/index.ts` | notify_on_response削除 |

### Week 5-6: ICSエクスポート + おすすめバッジ

| タスク | 対象ファイル | 詳細 |
|--------|-------------|------|
| export_icsアクション追加 | `views.py` | ICS生成ロジック、RFC5545準拠 |
| ICSサニタイズ関数 | `views.py` | `_sanitize_ics_value()` |
| APIクライアント拡張 | `lib/api.ts` | `exportIcs()`メソッド追加 |
| Reactフック追加 | `hooks/useApi.ts` | `useExportIcs()` mutation |
| ICSボタンUI | `app/event/[uuid]/page.tsx` | ヘッダーにICSダウンロードボタン |
| summaryにis_recommended追加 | `views.py` | 最高スコア候補にフラグ付与 |
| おすすめバッジUI | `components/event/ResponseTable.tsx` | 候補列ヘッダーにBadge表示 |
| SummaryChart連携 | `components/event/SummaryChart.tsx` | APIフラグ使用に変更 |

### Week 7-8: 作成後の編集UI

| タスク | 対象ファイル | 詳細 |
|--------|-------------|------|
| 編集ページ | `app/event/[uuid]/edit/page.tsx` [新規] | edit_key認証→編集フォーム |
| EditKeyModal | `components/edit/EditKeyModal.tsx` [新規] | edit_key入力・検証UI |
| CandidateManager | `components/edit/CandidateManager.tsx` [新規] | 候補日の追加・削除UI |
| APIクライアント拡張 | `lib/api.ts` | `addCandidate()`, `deleteCandidate()` |
| Reactフック追加 | `hooks/useApi.ts` | `useAddCandidate()`, `useDeleteCandidate()` |
| 編集ボタン | `app/event/[uuid]/page.tsx` | ヘッダーに「編集」ボタン追加 |
| 候補削除時の確認 | `components/edit/CandidateManager.tsx` | 回答がある場合の確認ダイアログ |

### Phase 1a 完了基準

- [ ] 作成フォームが3フィールド+折りたたみ詳細設定になっている
- [ ] ICSエクスポートが動作する
- [ ] おすすめバッジが最高スコア候補に表示される
- [ ] 編集ページでedit_key認証後にイベント情報・候補日を変更できる
- [ ] 日程確定が編集ページから実行できる
- [ ] E2Eテスト（Playwright）で主要フローが検証済み

---

## Phase 1b: グロース施策（3週間）

### Week 9: バイラルループ

| タスク | 対象ファイル | 詳細 |
|--------|-------------|------|
| 回答完了モーダル | `components/event/ResponseSuccessModal.tsx` [新規] | CTA付きモーダル |
| モーダル組み込み | `app/event/[uuid]/page.tsx` | ResponseForm成功時に表示 |
| Powered byリンク | `components/layout/Footer.tsx` | フッターにブランドリンク追加 |
| UTM取得ロジック | `app/page.tsx` | `?ref=`パラメータをlocalStorageに保存 |
| 共有URLにUTM | `app/event/[uuid]/page.tsx` | `utm_source=share` 付与 |

### Week 10: PWA最適化

| タスク | 対象ファイル | 詳細 |
|--------|-------------|------|
| manifest.json更新 | `public/manifest.json` | PWA設定強化 |
| Service Worker更新 | `public/sw.js` | stale-while-revalidate + network-first |
| PWAアイコン生成 | `public/icon-192.png`, `icon-512.png` | SVGから生成 |
| layout.tsx meta強化 | `app/layout.tsx` | viewport分離、OGP meta、Apple Web App |
| next.config.js更新 | `next.config.js` | SW用ヘッダー追加 |

### Week 11: 最終テスト + リリース準備

| タスク | 詳細 |
|--------|------|
| E2Eテスト | Playwright: 作成→共有→回答→CSV/ICS出力→編集 |
| モバイルUXテスト | 主要ブラウザ(Chrome/Safari/Firefox)でレスポンシブ確認 |
| PWAインストールテスト | Android Chrome + iOS Safari |
| ICSインポートテスト | Googleカレンダー/Outlook/Apple Calendar |
| パフォーマンス確認 | Lighthouse: Performance 90+, Accessibility 90+ |
| SEO確認 | meta tags, OGP, robots.txt |
| デプロイ準備 | 環境変数確認、本番設定 |

### Phase 1b 完了基準 = MVPリリース基準

- [ ] 回答完了CTAモーダルが表示される
- [ ] Powered byリンクがフッターにある
- [ ] PWAとしてホーム画面に追加できる
- [ ] 全E2Eテストがパスしている
- [ ] Lighthouse Performance 90+
- [ ] ICSファイルが主要カレンダーアプリで読み込める

---

## Phase 2以降（検討段階）

| 候補施策 | 前提条件 |
|---------|---------|
| Googleカレンダー連携 | ユーザー100人達成後 |
| テンプレート/繰り返し | ユーザーフィードバックで需要確認後 |
| マジックリンク認証 | マネタイズ検討開始時 |
| Chakra UI v3移行 | v2の互換性問題発生時 |
| SEO/ランディング強化 | オーガニック流入データ分析後 |
| 多言語対応 | 海外からのアクセス増加時 |

---

## ファイル変更一覧（Phase 0 + 1a + 1b）

### 新規作成ファイル

| ファイル | Phase |
|---------|-------|
| `front/components/create/CandidatePicker.tsx` | 1a |
| `front/app/event/[uuid]/edit/page.tsx` | 1a |
| `front/components/edit/EditKeyModal.tsx` | 1a |
| `front/components/edit/CandidateManager.tsx` | 1a |
| `front/components/event/ResponseSuccessModal.tsx` | 1b |
| `front/app/privacy/page.tsx` | 0 |

### 編集ファイル

| ファイル | Phase | 変更概要 |
|---------|-------|---------|
| `api/schedule/models.py` | 0 | edit_key max_length変更、ヘルパーメソッド追加 |
| `api/schedule/serializers.py` | 0 | ハッシュ検証、フィールド除外 |
| `api/schedule/views.py` | 0+1a | list無効化、通知除去、annotate、ICS/edit_key検証追加 |
| `api/schedule/tasks.py` | 0 | 中身をコメントに |
| `api/schedule/tests.py` | 0 | テストコード追加 |
| `api/api/settings.py` | 0 | Celery/Redis/Email設定削除 |
| `api/api/__init__.py` | 0 | Celery import削除 |
| `docker-compose.yml` | 0 | 3サービス削除 |
| `requirements.txt` | 0 | 3パッケージ削除 + Pillow削除 |
| `front/app/create/page.tsx` | 0+1a | 通知Switch削除、3フィールド簡素化 |
| `front/app/event/[uuid]/page.tsx` | 1a+1b | ICS/編集ボタン、CTA、UTM |
| `front/types/index.ts` | 0+1a | フィールド削除、is_recommended追加 |
| `front/stores/index.ts` | 0 | notify_on_response削除 |
| `front/lib/api.ts` | 1a | exportIcs, addCandidate, deleteCandidate追加 |
| `front/hooks/useApi.ts` | 1a | 対応フック追加 |
| `front/components/event/ResponseTable.tsx` | 1a | おすすめバッジ |
| `front/components/event/SummaryChart.tsx` | 1a | APIフラグ使用 |
| `front/components/layout/Footer.tsx` | 1b | Powered by |
| `front/app/page.tsx` | 1b | UTM取得 |
| `front/app/layout.tsx` | 1b | viewport/meta強化 |
| `front/public/manifest.json` | 1b | PWA強化 |
| `front/public/sw.js` | 1b | キャッシュ戦略更新 |
| `front/next.config.js` | 1b | SWヘッダー |

### 削除ファイル/ディレクトリ

| 対象 | Phase |
|------|-------|
| `api/api/celery.py` | 0 |
| `api/schedule/serializer.py` (旧ファイル) | 0 |
| `mobile/` (ディレクトリ全体) | 0 |
| `init_mobile.bat` | 0 |
