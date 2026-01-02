# RFC-0002: Outlookカレンダー連携（Microsoft Graph）

## Summary
- Microsoft Graphで予定取得/確定登録（Teams連携の足場）。

## Design（提案）
- OAuth (MS Entra) 連携
- freebusy相当: `calendarView` 等で取得し推定
- 確定登録: event create
- 失敗時: Celery retry + NotificationLog に記録
