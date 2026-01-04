"""
1-on-1 Scheduling Views
RFC-0005: 1対1日程調整モード
"""

from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView

from .models import AvailabilityPage, AvailabilitySlot, Booking
from .serializers import (
    AvailabilityPageListSerializer,
    AvailabilityPageDetailSerializer,
    AvailabilityPageCreateSerializer,
    AvailabilityPagePublicSerializer,
    AvailabilitySlotSerializer,
    AvailabilitySlotCreateSerializer,
    BookingSerializer,
    BookingCreateSerializer,
    BookingCancelSerializer,
)


class AvailabilityPageViewSet(viewsets.ModelViewSet):
    """
    予約ページ管理
    
    オーナーの予約ページCRUD操作
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AvailabilityPage.objects.filter(owner=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AvailabilityPageListSerializer
        elif self.action in ('create', 'update', 'partial_update'):
            return AvailabilityPageCreateSerializer
        return AvailabilityPageDetailSerializer
    
    @action(detail=True, methods=['post'])
    def add_slots(self, request, pk=None):
        """
        空き枠を一括追加
        
        POST /api/v1/oneonone/pages/{id}/add_slots/
        """
        page = self.get_object()
        
        slots_data = request.data.get('slots', [])
        if not slots_data:
            return Response(
                {'error': 'slots フィールドが必要です'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_slots = []
        errors = []
        
        for i, slot_data in enumerate(slots_data):
            serializer = AvailabilitySlotCreateSerializer(data=slot_data)
            if serializer.is_valid():
                slot = AvailabilitySlot.objects.create(
                    page=page,
                    **serializer.validated_data
                )
                created_slots.append(slot)
            else:
                errors.append({'index': i, 'errors': serializer.errors})
        
        return Response({
            'created': AvailabilitySlotSerializer(created_slots, many=True).data,
            'errors': errors,
        }, status=status.HTTP_201_CREATED if created_slots else status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def bookings(self, request, pk=None):
        """
        予約一覧（ホスト向け）
        
        GET /api/v1/oneonone/pages/{id}/bookings/
        """
        page = self.get_object()
        bookings = Booking.objects.filter(
            slot__page=page
        ).select_related('slot').order_by('-created_at')
        
        status_filter = request.query_params.get('status')
        if status_filter:
            bookings = bookings.filter(status=status_filter)
        
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)


class AvailabilitySlotViewSet(viewsets.ModelViewSet):
    """
    空き枠管理（ページ配下）
    """
    permission_classes = [IsAuthenticated]
    serializer_class = AvailabilitySlotSerializer
    
    def get_queryset(self):
        page_id = self.kwargs.get('page_pk')
        return AvailabilitySlot.objects.filter(
            page_id=page_id,
            page__owner=self.request.user
        )
    
    def perform_create(self, serializer):
        page_id = self.kwargs.get('page_pk')
        page = get_object_or_404(
            AvailabilityPage,
            id=page_id,
            owner=self.request.user
        )
        serializer.save(page=page)


class PublicAvailabilityPageView(APIView):
    """
    公開予約ページ（ゲスト向け）
    
    GET /api/v1/oneonone/p/{slug}/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, slug):
        page = get_object_or_404(
            AvailabilityPage,
            slug=slug,
            is_public=True,
            is_active=True
        )
        
        # Parse date range from query params
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        
        context = {'request': request}
        if from_date:
            try:
                context['from_date'] = timezone.datetime.fromisoformat(
                    from_date.replace('Z', '+00:00')
                )
            except ValueError:
                pass
        if to_date:
            try:
                context['to_date'] = timezone.datetime.fromisoformat(
                    to_date.replace('Z', '+00:00')
                )
            except ValueError:
                pass
        
        serializer = AvailabilityPagePublicSerializer(page, context=context)
        return Response(serializer.data)


class BookingCreateView(generics.CreateAPIView):
    """
    予約作成（ゲスト向け）
    
    POST /api/v1/oneonone/p/{slug}/book/
    """
    permission_classes = [AllowAny]
    serializer_class = BookingCreateSerializer
    
    def create(self, request, *args, **kwargs):
        slug = self.kwargs.get('slug')
        page = get_object_or_404(
            AvailabilityPage,
            slug=slug,
            is_public=True,
            is_active=True
        )
        
        # Validate slot belongs to this page
        data = request.data.copy()
        slot_id = data.get('slot')
        
        if slot_id:
            slot = get_object_or_404(AvailabilitySlot, id=slot_id, page=page)
            data['slot'] = slot.id
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        
        # Return booking with cancel token (only shown once)
        return Response({
            'booking': BookingSerializer(booking).data,
            'cancel_token': booking.cancel_token,
            'message': '予約が完了しました'
        }, status=status.HTTP_201_CREATED)


class BookingDetailView(APIView):
    """
    予約詳細・キャンセル（ゲスト向け）
    
    GET /api/v1/oneonone/bookings/{uuid}/
    POST /api/v1/oneonone/bookings/{uuid}/cancel/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, uuid):
        booking = get_object_or_404(Booking, uuid=uuid)
        serializer = BookingSerializer(booking)
        return Response(serializer.data)
    
    def post(self, request, uuid):
        """Cancel booking"""
        booking = get_object_or_404(Booking, uuid=uuid)
        
        serializer = BookingCancelSerializer(
            data=request.data,
            context={'booking': booking}
        )
        serializer.is_valid(raise_exception=True)
        
        if booking.status not in ('pending', 'confirmed'):
            return Response(
                {'error': 'この予約はキャンセルできません'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        booking.cancel()
        
        return Response({
            'message': '予約をキャンセルしました',
            'booking': BookingSerializer(booking).data
        })


class HostBookingViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ホストの予約一覧
    """
    permission_classes = [IsAuthenticated]
    serializer_class = BookingSerializer
    lookup_field = 'uuid'
    
    def get_queryset(self):
        return Booking.objects.filter(
            slot__page__owner=self.request.user
        ).select_related('slot', 'slot__page').order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, uuid=None, pk=None):
        """予約を確定"""
        booking = self.get_object()
        if booking.status != 'pending':
            return Response(
                {'error': '確認中の予約のみ確定できます'},
                status=status.HTTP_400_BAD_REQUEST
            )
        booking.confirm()
        return Response({
            'message': '予約を確定しました',
            'booking': BookingSerializer(booking).data
        })
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, uuid=None, pk=None):
        """予約をキャンセル（ホスト側）"""
        booking = self.get_object()
        if booking.status not in ('pending', 'confirmed'):
            return Response(
                {'error': 'この予約はキャンセルできません'},
                status=status.HTTP_400_BAD_REQUEST
            )
        booking.cancel()
        return Response({
            'message': '予約をキャンセルしました',
            'booking': BookingSerializer(booking).data
        })
