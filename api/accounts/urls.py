"""
URLs for Accounts API
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    MeView,
    PasswordChangeView,
    MySchedulesView,
    IntegrationViewSet,
)
from .check_email import CheckEmailView

router = DefaultRouter()
router.register(r'integrations', IntegrationViewSet, basename='integration')

urlpatterns = [
    # Authentication
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('check-email/', CheckEmailView.as_view(), name='check-email'),
    
    # Profile
    path('me/', MeView.as_view(), name='me'),
    path('me/schedules/', MySchedulesView.as_view(), name='my-schedules'),
    path('password/change/', PasswordChangeView.as_view(), name='password-change'),
    
    # Integrations
    path('', include(router.urls)),
]

