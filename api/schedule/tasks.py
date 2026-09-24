"""
Async tasks (FROZEN in Phase 0)

Celery/Redis were removed in Phase 0 to minimise infrastructure cost, and the
e-mail notification features (new-response notification, deadline reminder,
old-schedule cleanup) are frozen along with them.

The Notification model and its table are kept so the features can be revived
later (see docs/03_database.md). When reviving, re-introduce a task runner and
implement:

- send_response_notification(schedule_id, participant_id)
- send_deadline_reminders()
- cleanup_old_schedules()
"""
