"""
URLs for 1-on-1 Scheduling
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AvailabilityPageViewSet,
    AvailabilitySlotViewSet,
    PublicAvailabilityPageView,
    BookingCreateView,
    BookingDetailView,
    HostBookingViewSet,
)

router = DefaultRouter()
router.register(r'pages', AvailabilityPageViewSet, basename='availability-page')
router.register(r'bookings', HostBookingViewSet, basename='host-booking')

urlpatterns = [
    # Authenticated routes
    path('', include(router.urls)),
    
    # Nested slots under pages
    path(
        'pages/<int:page_pk>/slots/',
        AvailabilitySlotViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='page-slots-list'
    ),
    path(
        'pages/<int:page_pk>/slots/<int:pk>/',
        AvailabilitySlotViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='page-slots-detail'
    ),
    
    # Public routes for guests
    path('p/<slug:slug>/', PublicAvailabilityPageView.as_view(), name='public-page'),
    path('p/<slug:slug>/book/', BookingCreateView.as_view(), name='public-book'),
    path('booking/<uuid:uuid>/', BookingDetailView.as_view(), name='booking-detail'),
    path('booking/<uuid:uuid>/cancel/', BookingDetailView.as_view(), name='booking-cancel'),
]
