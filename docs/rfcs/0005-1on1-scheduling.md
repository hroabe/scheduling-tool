# RFC-0005: 1対1日程調整モード（Calendly風）

## Summary
- 幹事（ホスト）が空き枠を公開し、参加者が1枠を予約→確定するモード。

## Core
- Host availability を生成（Google/Outlook連携があると強い）
- Booking = finalize（冪等性と二重予約防止が最重要）

## Plan
- Phase1: 手動で空き枠登録→予約
- Phase2: カレンダーから空き自動生成
- Phase3: 課金プラン（公開枠数、連携数、通知チャネル等）
