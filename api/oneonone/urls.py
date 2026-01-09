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
    # Anonymous booking views
    AnonymousBookingCreateView,
    AnonymousBookingVerifyView,
    AnonymousBookingHostView,
    AnonymousBookingHostSlotsView,
    PublicBookingPageViewV2,
    ReservationCreateView,
)

router = DefaultRouter()
router.register(r'pages', AvailabilityPageViewSet, basename='availability-page')
router.register(r'bookings', HostBookingViewSet, basename='host-booking')

urlpatterns = [
    # Authenticated routes (legacy)
    path('', include(router.urls)),
    
    # Nested slots under pages (legacy)
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
    
    # Public routes for guests (legacy)
    path('p/<slug:slug>/', PublicAvailabilityPageView.as_view(), name='public-page'),
    path('p/<slug:slug>/book/', BookingCreateView.as_view(), name='public-book'),
    path('booking/<uuid:uuid>/', BookingDetailView.as_view(), name='booking-detail'),
    path('booking/<uuid:uuid>/cancel/', BookingDetailView.as_view(), name='booking-cancel'),
    
    # =========================================================
    # Anonymous Booking Routes (Login-free mode)
    # =========================================================
    
    # Create new booking page (anonymous)
    path('booking/', AnonymousBookingCreateView.as_view(), name='anon-booking-create'),
    
    # Verify email
    path('booking/verify/', AnonymousBookingVerifyView.as_view(), name='anon-booking-verify'),
    
    # Host management
    path('booking/<slug:slug>/host/', AnonymousBookingHostView.as_view(), name='anon-booking-host'),
    path('booking/<slug:slug>/host/slots/', AnonymousBookingHostSlotsView.as_view(), name='anon-booking-host-slots'),
    path('booking/<slug:slug>/host/slots/<int:slot_id>/', AnonymousBookingHostSlotsView.as_view(), name='anon-booking-host-slot-delete'),
    
    # Guest public page and reservation
    path('booking/<slug:slug>/', PublicBookingPageViewV2.as_view(), name='anon-booking-public'),
    path('booking/<slug:slug>/reserve/', ReservationCreateView.as_view(), name='anon-booking-reserve'),
]
