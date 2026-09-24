# テスト計画書

## 1. テスト戦略

### テストピラミッド

```
         /\
        /  \        E2E (Playwright)
       /    \       - 主要ユーザーフロー
      /──────\
     /        \     API統合テスト (pytest + DRF)
    /          \    - エンドポイント正常系/異常系
   /────────────\
  /              \  ユニットテスト (pytest)
 /________________\ - モデルメソッド、サニタイズ関数
```

### ツール

| レイヤー | ツール | 設定 |
|---------|--------|------|
| Backend | pytest + pytest-django | `api/` 内で `python manage.py test schedule` |
| Frontend | Vitest | `front/` 内で `npx vitest` |
| E2E | Playwright | `front/` 内で `npx playwright test` |

---

## 2. Phase 0 テストスコープ

### カテゴリ1: Schedule CRUD正常系

```python
class ScheduleCRUDTests(TestCase):
    def test_create_schedule()          # 201, UUID返却, DB反映
    def test_create_with_candidates()   # 候補日も同時作成
    def test_retrieve_by_uuid()         # UUID指定で詳細取得
    def test_update_without_edit_key()  # edit_key未設定イベントの更新
    def test_delete_schedule()          # 204, DB削除
```

### カテゴリ2: respond正常系

```python
class RespondTests(TestCase):
    def test_submit_response()          # 201, edit_token返却
    def test_response_creates_attendance()  # Attendance/Participantレコード作成確認
```

### カテゴリ3: export_csv正常系

```python
class ExportCsvTests(TestCase):
    def test_export_returns_csv()       # Content-Type: text/csv
    def test_csv_contains_bom()         # UTF-8 BOM付き
```

### カテゴリ4: edit_key異常系

```python
class EditKeyTests(TestCase):
    def test_update_with_wrong_key()    # 400 Bad Request
    def test_update_with_correct_key()  # 200 OK
    def test_delete_with_wrong_key()    # 403 Forbidden
    def test_finalize_with_wrong_key()  # 400 Bad Request
```

### カバレッジ目標: Phase 0完了時 50%

---

## 3. Phase 1a テストスコープ

### ICSエクスポート

```python
class ExportIcsTests(TestCase):
    def test_export_all_candidates()     # 全候補をVEVENTとして出力
    def test_export_single_candidate()   # candidate_id指定で1件出力
    def test_export_finalized()          # 確定済みはCONFIRMEDステータス
    def test_ics_content_type()          # Content-Type: text/calendar
    def test_ics_sanitization()          # 特殊文字のエスケープ
```

### おすすめバッジ

```python
class SummaryTests(TestCase):
    def test_is_recommended_flag()       # 最高スコア候補にis_recommended=True
    def test_single_candidate()          # 候補1件の場合もis_recommended=True
    def test_tie_score()                 # 同スコアの場合の挙動確認
```

### CandidateViewSet edit_key検証

```python
class CandidateEditKeyTests(TestCase):
    def test_add_candidate_with_correct_key()   # 201
    def test_add_candidate_with_wrong_key()     # 403
    def test_delete_candidate_with_correct_key() # 204
    def test_delete_candidate_with_wrong_key()   # 403
    def test_add_candidate_no_edit_key_schedule() # edit_key未設定イベントは自動生成keyが必要
```

### フロントエンド (Vitest)

```typescript
// CandidatePicker.test.tsx
test('日付クリックで候補が追加される')
test('候補の削除ボタンで候補が除去される')
test('時間のデフォルト値が設定される')

// EditKeyModal.test.tsx
test('正しいedit_keyで認証成功')
test('間違ったedit_keyでエラー表示')
```

---

## 4. Phase 1b テストスコープ

### E2E（Playwright）

```typescript
// e2e/create-respond-flow.spec.ts
test('イベント作成→URL共有→回答→集計確認', async ({ page }) => {
    // 1. /create でイベント作成
    // 2. 生成されたURLに遷移
    // 3. 回答フォームで回答送信
    // 4. 回答完了CTAモーダル表示確認
    // 5. 回答状況タブで回答が表示される
    // 6. 集計タブでおすすめバッジ確認
});

// e2e/export-flow.spec.ts
test('CSV出力のダウンロード', async ({ page }) => {
    // CSVボタンクリック→ファイルダウンロード確認
});

test('ICS出力のダウンロード', async ({ page }) => {
    // ICSボタンクリック→ファイルダウンロード確認
});

// e2e/edit-flow.spec.ts
test('edit_key認証→イベント編集→候補日追加', async ({ page }) => {
    // 1. イベント作成（edit_key付き）
    // 2. /event/{uuid}/edit に遷移
    // 3. edit_key入力→認証
    // 4. イベント名変更→保存
    // 5. 候補日追加
    // 6. 日程確定
});

// e2e/viral-loop.spec.ts
test('回答完了後にCTAモーダルが表示される', async ({ page }) => {
    // 回答送信→モーダル表示→「イベントを作成する」リンクの存在確認
});

test('Powered byリンクがフッターにある', async ({ page }) => {
    // フッターのリンク確認
});
```

### PWAテスト（手動チェックリスト）

- [ ] Androidの Chrome で「ホーム画面に追加」が表示される
- [ ] iOSの Safari で「ホーム画面に追加」が機能する
- [ ] PWAとして起動後、スタンドアロンモードで動作する
- [ ] オフライン時にキャッシュ済みページが表示される

### ICSインポートテスト（手動チェックリスト）

- [ ] Googleカレンダー: ICSファイルインポート→予定が表示される
- [ ] Outlook: ICSファイルインポート→予定が表示される
- [ ] Apple Calendar (macOS): ICSファイルインポート→予定が表示される
- [ ] Apple Calendar (iOS): ICSファイルダウンロード→カレンダーに追加される

---

## 5. 品質基準

| 指標 | Phase 0 | Phase 1a | Phase 1b (MVP) |
|------|---------|----------|----------------|
| バックエンドテストカバレッジ | 50% | 60% | 65% |
| フロントエンドテストカバレッジ | - | 30% | 40% |
| E2Eシナリオ数 | - | - | 5本以上 |
| Lighthouse Performance | - | - | 90+ |
| Lighthouse Accessibility | - | - | 90+ |
| 既知バグ数 | 0 critical | 0 critical | 0 critical, 0 major |
