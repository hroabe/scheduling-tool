# Upgrade Guide: Django 5.x / Next.js 15.x 最新パッチへ（2026-01-03）

## 目的
- Django: 5.1.x → **5.2.9（5.2 LTS 最新パッチ）**
- Next.js: 15.2.x → **15.5.9（15系 最新パッチ / 2025-12 RSC脆弱性修正込み）**

---

## 1) Frontend（Next.js 15.5.9）
### 手順
```bash
cd front
npm install next@15.5.9
npm install
npm run test
npm run test:e2e  # ある場合
```

### 重要チェック
- App Router の `Server Actions` / `RSC` を使っている場合は必ずe2e（作成→回答→集計→確定）を回す
- 依存（react/react-dom 等）も脆弱性対応版へ追随（npm audit / GitHub Security Alerts）

---

## 2) Backend（Django 5.2.9）
### 手順
```bash
pip install "Django==5.2.9"
cd api
python manage.py check
pytest
```

### 重要チェック
- マイグレーションの差分
- メール通知・期限リマインダー（Celery）の回帰
- 例外ログに PII/トークンが出ていないか

---

## 3) 回帰チェック（最小）
- create → respond → summary → finalize の主要導線
- 期限切れ、確定済み、トークン不正などの失敗系
- 通知ログが残ること（失敗時も含む）
