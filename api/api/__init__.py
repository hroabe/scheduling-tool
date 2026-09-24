"""
API package initialization

The Celery app is loaded when Django starts so that @shared_task binds to it.
"""

from .celery import app as celery_app

__all__ = ('celery_app',)
