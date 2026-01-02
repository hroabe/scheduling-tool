# RFC-0004: Meeting URL 自動発行（Zoom/Teams/Meet）

## Summary
- 確定時に会議URLを自動生成し、通知/表示する。

## Notes
- Google Meet は「Googleカレンダーイベント作成」で自然にURLが付与される場合が多い（まずはこれを最短で狙う）。
- Teams は Outlook連携が前提。
- Zoom はZoom OAuth + meeting create。

## Design
- 確定後 Celery で発行（外部API）
- 成功/失敗をNotificationLogに残す
- URLは表示/メールに載せるが、管理キー等は載せない
