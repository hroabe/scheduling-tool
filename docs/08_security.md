# セキュリティ修正ガイド

Phase 0で対応する全セキュリティ修正の詳細手順書。

---

## S1: edit_keyのハッシュ化

### 問題

`api/schedule/models.py` L67: `edit_key`がプレーンテキストの`CharField(max_length=100)`で保存されている。
DBが侵害された場合、全イベントの編集キーが漏洩する。

### 影響箇所（全5箇所）

1. `models.py` L67: フィールド定義
2. `serializers.py` L324-336: `ScheduleUpdateSerializer.validate` 平文比較
3. `serializers.py` L353-361: `ScheduleFinalizeSerializer.validate` 平文比較
4. `views.py` L102-112: `perform_destroy` 平文比較
5. `views.py` L351-373: `ParticipantViewSet.perform_destroy` 平文比較

### 修正手順

1. `models.py`: `set_edit_key()`と`check_edit_key()`メソッド追加、max_length=256に変更
2. 全5箇所の`==`比較を`check_edit_key()`呼び出しに変更
3. マイグレーション: AlterField + RunPython（既存データのハッシュ化）
4. フロント(`lib/api.ts` L84): edit_keyをクエリパラメータではなくリクエストボディで送信するよう変更を推奨

---

## S2: 一覧API無効化

### 問題

`api/schedule/views.py` L46: `ScheduleViewSet`が`ModelViewSet`を継承しており、
`GET /api/v1/schedules/`で全イベントが認証なしで閲覧可能。

### 修正

`ModelViewSet`をMixin分解し、`ListModelMixin`を除外:

```python
class ScheduleViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet
):
```

不要になるもの: `ScheduleListSerializer`, `pagination_class`, `filter_backends`, `filterset_class`, `search_fields`, `ordering_fields`

---

## S3: owner_email非公開

### 問題

`api/schedule/serializers.py` L223: `ScheduleDetailSerializer`の`fields`に`owner_email`が含まれ、
APIレスポンスで全ユーザーに公開されている。

### 修正

`ScheduleDetailSerializer.Meta.fields`から`owner_email`を削除。
`owner_email`はDBには保持する（将来のメール通知復活に備え）。

---

## S4: CSVインジェクション対策

### 問題

`api/schedule/views.py` L220-234: ユーザー入力値（`participant.name`, `participant.comment`）が
そのままCSVセルに出力される。Excel数式インジェクションが可能。

### 修正

サニタイズ関数を追加:

```python
def _sanitize_csv_value(value: str) -> str:
    """先頭文字が=, +, -, @, \t, \r の場合プレフィクスを付与"""
    if value and value[0] in ('=', '+', '-', '@', '\t', '\r'):
        return f"'{value}"
    return value
```

全ユーザー入力をこの関数で囲む。

---

## S5: Content-Dispositionサニタイズ

### 問題

`api/schedule/views.py` L248: `schedule.name`がサニタイズ無しで`Content-Disposition`ヘッダーに挿入。
ヘッダーインジェクションが可能。

### 修正

```python
safe_name = schedule.name.replace('"', '').replace('\n', '').replace('\r', '')
response['Content-Disposition'] = f'attachment; filename="{safe_name}.csv"'
```

---

## S6: N+1クエリ修正

### 問題

`api/schedule/views.py` L265-293: `summary`アクションで各候補日の`ok_count`/`maybe_count`/`ng_count`が
モデルプロパティ経由で個別クエリを発行（`models.py` L217-229）。
10候補日で31クエリ以上。

### 修正

`annotate`による一括集計で1クエリに削減。
同様に`export_csv`アクション（L199-250）も`select_related` + dictルックアップで最適化。

---

## S7: CandidateViewSetアクセス制御

### 問題

`api/schedule/views.py` L297-325: `CandidateViewSet`にアクセス制御がなく、
候補日の追加・削除が認証なしで可能。

### 修正

`perform_create`, `perform_update`, `perform_destroy`にedit_key検証を追加。
Schedule側のedit_keyを`check_edit_key()`で検証する。

---

## 対応チェックリスト

| ID | 修正 | 優先度 | 作業日 |
|----|------|--------|--------|
| S1 | edit_keyハッシュ化（全5箇所） | 最高 | Day 1 |
| S2 | 一覧API無効化 | 最高 | Day 2 |
| S3 | owner_email非公開 | 高 | Day 2 |
| S4 | CSVインジェクション対策 | 高 | Day 3 |
| S5 | Content-Dispositionサニタイズ | 中 | Day 3 |
| S6 | N+1クエリ修正 | 中 | Day 6 |
| S7 | CandidateViewSetアクセス制御 | 高 | Day 9 |
