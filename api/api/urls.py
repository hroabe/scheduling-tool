"""api URL Configuration

Updated for Django 5.1+ with DRF Spectacular API documentation.
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

from schedule.views import (
    ScheduleViewSet,
    CandidateViewSet,
    ParticipantViewSet,
    AttendanceViewSet,
)


# Main router
router = DefaultRouter()
router.register(r'schedules', ScheduleViewSet, basename='schedule')

# Nested routers for schedule-related endpoints
# These are handled through custom URL patterns below


urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API v1
    path('api/v1/', include([
        # Main API routes
        path('', include(router.urls)),
        
        # Accounts API
        path('accounts/', include('accounts.urls')),
        
        # Integrations API (RFC-0001, RFC-0002)
        path('integrations/google/', include('integrations.google.urls')),
        path('integrations/outlook/', include('integrations.outlook.urls')),
        
        # 1-on-1 Scheduling API (RFC-0005)
        path('oneonone/', include('oneonone.urls')),
        
        # Nested routes for candidates
        path(
            'schedules/<uuid:schedule_uuid>/candidates/',
            CandidateViewSet.as_view({'get': 'list', 'post': 'create'}),
            name='schedule-candidates-list'
        ),
        path(
            'schedules/<uuid:schedule_uuid>/candidates/<int:pk>/',
            CandidateViewSet.as_view({
                'get': 'retrieve',
                'put': 'update',
                'patch': 'partial_update',
                'delete': 'destroy'
            }),
            name='schedule-candidates-detail'
        ),
        
        # Nested routes for participants
        path(
            'schedules/<uuid:schedule_uuid>/participants/',
            ParticipantViewSet.as_view({'get': 'list'}),
            name='schedule-participants-list'
        ),
        path(
            'schedules/<uuid:schedule_uuid>/participants/<int:pk>/',
            ParticipantViewSet.as_view({
                'get': 'retrieve',
                'delete': 'destroy'
            }),
            name='schedule-participants-detail'
        ),
        
        # Nested routes for attendances
        path(
            'schedules/<uuid:schedule_uuid>/attendances/',
            AttendanceViewSet.as_view({'get': 'list'}),
            name='schedule-attendances-list'
        ),
    ])),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
