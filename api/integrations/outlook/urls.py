"""
URLs for Outlook Calendar Integration
"""

from django.urls import path
from .views import (
    OutlookConnectView,
    OutlookCallbackView,
    OutlookDisconnectView,
    OutlookCalendarView,
    OutlookStatusView,
)

urlpatterns = [
    path('connect/', OutlookConnectView.as_view(), name='outlook-connect'),
    path('callback/', OutlookCallbackView.as_view(), name='outlook-callback'),
    path('disconnect/', OutlookDisconnectView.as_view(), name='outlook-disconnect'),
    path('calendarView/', OutlookCalendarView.as_view(), name='outlook-calendarview'),
    path('status/', OutlookStatusView.as_view(), name='outlook-status'),
]
