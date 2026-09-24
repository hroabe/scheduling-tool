"""
URLs for Google Calendar Integration
"""

from django.urls import path
from .views import (
    GoogleConnectView,
    GoogleCallbackView,
    GoogleDisconnectView,
    GoogleFreeBusyView,
    GoogleStatusView,
)

urlpatterns = [
    path('connect/', GoogleConnectView.as_view(), name='google-connect'),
    path('callback/', GoogleCallbackView.as_view(), name='google-callback'),
    path('disconnect/', GoogleDisconnectView.as_view(), name='google-disconnect'),
    path('freebusy/', GoogleFreeBusyView.as_view(), name='google-freebusy'),
    path('status/', GoogleStatusView.as_view(), name='google-status'),
]
