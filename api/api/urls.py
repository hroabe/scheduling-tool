"""api URL Configuration

Django 5.2 + DRF with DRF Spectacular API documentation.
"""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.routers import DefaultRouter

from schedule.views import (
    AttendanceViewSet,
    CandidateViewSet,
    ParticipantViewSet,
    ScheduleViewSet,
    health,
    robots_txt,
)

# Main router (list endpoint is intentionally not provided)
router = DefaultRouter(trailing_slash=True)
router.include_root_view = False
router.register(r'schedules', ScheduleViewSet, basename='schedule')


urlpatterns = [
    # Admin
    path(settings.ADMIN_URL, admin.site.urls),

    # Infrastructure
    path('api/health/', health, name='health'),
    path('robots.txt', robots_txt, name='robots'),

    # API v1
    path('api/v1/', include([
        path('', include(router.urls)),

        # Nested routes for candidates
        path(
            'schedules/<uuid:schedule_uuid>/candidates/',
            CandidateViewSet.as_view({'get': 'list', 'post': 'create'}),
            name='schedule-candidates-list',
        ),
        path(
            'schedules/<uuid:schedule_uuid>/candidates/<int:pk>/',
            CandidateViewSet.as_view({
                'get': 'retrieve',
                'put': 'update',
                'patch': 'partial_update',
                'delete': 'destroy',
            }),
            name='schedule-candidates-detail',
        ),

        # Nested routes for participants
        path(
            'schedules/<uuid:schedule_uuid>/participants/',
            ParticipantViewSet.as_view({'get': 'list'}),
            name='schedule-participants-list',
        ),
        path(
            'schedules/<uuid:schedule_uuid>/participants/<int:pk>/',
            ParticipantViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'}),
            name='schedule-participants-detail',
        ),

        # Nested routes for attendances
        path(
            'schedules/<uuid:schedule_uuid>/attendances/',
            AttendanceViewSet.as_view({'get': 'list'}),
            name='schedule-attendances-list',
        ),
    ])),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
