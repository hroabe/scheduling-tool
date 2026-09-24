"""
Helpers for dispatching Celery tasks without ever breaking the HTTP request.

When REDIS_URL is not configured, CELERY_TASK_ALWAYS_EAGER=True and tasks run
synchronously in-process. When a broker is configured but unreachable, the error
is logged and the request still succeeds.
"""

import logging

from django.db import transaction

logger = logging.getLogger(__name__)


def enqueue(task, *args, **kwargs) -> None:
    """Dispatch `task` after the current DB transaction commits; swallow broker errors."""

    def _dispatch():
        try:
            task.delay(*args, **kwargs)
        except Exception as exc:  # broker down, eager task failure, ...
            logger.error('Failed to dispatch task %s: %s', getattr(task, 'name', task), exc)

    transaction.on_commit(_dispatch)
