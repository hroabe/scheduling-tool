"""
Views for Schedule API

ViewSets with full CRUD, response submission, finalization, and CSV export.
"""

import csv
from io import StringIO

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q, Prefetch
from django.utils import timezone

from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Schedule, Candidate, Participant, Attendance
from .serializers import (
    ScheduleListSerializer,
    ScheduleDetailSerializer,
    ScheduleCreateSerializer,
    ScheduleUpdateSerializer,
    ScheduleFinalizeSerializer,
    CandidateSerializer,
    CandidateCreateSerializer,
    ParticipantSerializer,
    ParticipantCreateSerializer,
    AttendanceSerializer,
)
from .filters import ScheduleFilter


class StandardPagination(PageNumberPagination):
    """標準ページネーション"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ScheduleViewSet(viewsets.ModelViewSet):
    """
    スケジュール（イベント）のViewSet
    
    list: イベント一覧を取得
    retrieve: イベント詳細を取得（UUIDで取得可能）
    create: 新規イベントを作成
    update: イベントを更新（編集キーが必要）
    destroy: イベントを削除（編集キーが必要）
    """
    permission_classes = [AllowAny]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ScheduleFilter
    search_fields = ['name', 'owner_name', 'department']
    ordering_fields = ['created_at', 'name', 'deadline']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """候補日と参加者をプリフェッチ"""
        return Schedule.objects.prefetch_related(
            Prefetch(
                'candidates',
                queryset=Candidate.objects.order_by('order', 'start_at')
            ),
            Prefetch(
                'participants',
                queryset=Participant.objects.prefetch_related('attendances').order_by('created_at')
            )
        ).filter(is_active=True)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ScheduleListSerializer
        elif self.action == 'create':
            return ScheduleCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ScheduleUpdateSerializer
        return ScheduleDetailSerializer
    
    def get_object(self):
        """UUIDまたはIDでオブジェクトを取得"""
        lookup_value = self.kwargs.get(self.lookup_field)
        queryset = self.get_queryset()
        
        # Try UUID first
        try:
            import uuid
            uuid.UUID(str(lookup_value))
            obj = get_object_or_404(queryset, uuid=lookup_value)
        except (ValueError, AttributeError):
            obj = get_object_or_404(queryset, pk=lookup_value)
        
        self.check_object_permissions(self.request, obj)
        return obj
    
    def perform_destroy(self, instance):
        """削除時に編集キーを確認"""
        if instance.edit_key:
            edit_key = (
                self.request.data.get('edit_key') or 
                self.request.query_params.get('edit_key')
            )
            if edit_key != instance.edit_key:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('編集キーが正しくありません。')
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """
        イベントに回答を送信
        
        新規参加者として回答を登録、または既存の回答を更新
        """
        schedule = self.get_object()
        
        if not schedule.can_respond:
            return Response(
                {'error': 'このイベントは回答を受け付けていません。'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check for edit token (for updating existing response)
        edit_token = request.data.get('edit_token') or request.query_params.get('token')
        
        if edit_token:
            # Update existing response
            try:
                participant = schedule.participants.get(edit_token=edit_token)
                serializer = ParticipantCreateSerializer(
                    participant,
                    data=request.data,
                    context={'request': request, 'schedule': schedule},
                    partial=True
                )
            except Participant.DoesNotExist:
                return Response(
                    {'error': '無効な編集トークンです。'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Create new response
            serializer = ParticipantCreateSerializer(
                data=request.data,
                context={'request': request, 'schedule': schedule}
            )
        
        if serializer.is_valid():
            participant = serializer.save()
            
            # Send notification if enabled
            if schedule.notify_on_response and schedule.owner_email:
                from .tasks import send_response_notification
                send_response_notification.delay(schedule.id, participant.id)
            
            return Response(
                ParticipantSerializer(participant, context={'request': request}).data,
                status=status.HTTP_201_CREATED if not edit_token else status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        """
        日程を確定
        
        最も多くの参加者が参加可能な日程を確定する
        """
        schedule = self.get_object()
        
        serializer = ScheduleFinalizeSerializer(
            data=request.data,
            context={'request': request, 'schedule': schedule}
        )
        
        if serializer.is_valid():
            candidate = Candidate.objects.get(
                id=serializer.validated_data['candidate_id'],
                schedule=schedule
            )
            
            schedule.is_finalized = True
            schedule.finalized_candidate = candidate
            schedule.save()
            
            return Response(
                ScheduleDetailSerializer(schedule, context={'request': request}).data
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def export_csv(self, request, pk=None):
        """
        回答結果をCSVでエクスポート
        """
        schedule = self.get_object()
        
        # Create CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Header row
        header = ['参加者']
        for candidate in schedule.candidates.all():
            header.append(f"{candidate.start_at.strftime('%Y/%m/%d %H:%M')}")
        
        if request.query_params.get('include_comments', 'true').lower() == 'true':
            header.append('コメント')
        
        writer.writerow(header)
        
        # Data rows
        for participant in schedule.participants.all():
            row = [participant.name]
            
            for candidate in schedule.candidates.all():
                try:
                    attendance = participant.attendances.get(candidate=candidate)
                    row.append(attendance.get_status_display())
                except Attendance.DoesNotExist:
                    row.append('未回答')
            
            if request.query_params.get('include_comments', 'true').lower() == 'true':
                row.append(participant.comment)
            
            writer.writerow(row)
        
        # Summary row
        summary = ['集計']
        for candidate in schedule.candidates.all():
            summary.append(f"◯:{candidate.ok_count} △:{candidate.maybe_count} ×:{candidate.ng_count}")
        writer.writerow(summary)
        
        # Response
        output.seek(0)
        response = HttpResponse(
            output.getvalue().encode('utf-8-sig'),  # BOM for Excel compatibility
            content_type='text/csv; charset=utf-8-sig'
        )
        response['Content-Disposition'] = f'attachment; filename="{schedule.name}.csv"'
        
        return response
    
    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """
        回答の集計結果を取得
        
        各候補日の◯/△/×の数と、最も参加者が多い候補を返す
        """
        schedule = self.get_object()
        
        candidates_summary = []
        best_candidate = None
        best_score = -1
        
        for candidate in schedule.candidates.all():
            ok_count = candidate.ok_count
            maybe_count = candidate.maybe_count
            ng_count = candidate.ng_count
            
            # Score: OK=2, Maybe=1, NG=0
            score = ok_count * 2 + maybe_count
            
            summary = {
                'candidate_id': candidate.id,
                'start_at': candidate.start_at,
                'end_at': candidate.end_at,
                'ok_count': ok_count,
                'maybe_count': maybe_count,
                'ng_count': ng_count,
                'score': score,
            }
            candidates_summary.append(summary)
            
            if score > best_score:
                best_score = score
                best_candidate = summary
        
        return Response({
            'schedule_id': schedule.id,
            'schedule_name': schedule.name,
            'total_participants': schedule.participants.count(),
            'candidates': candidates_summary,
            'recommended_candidate': best_candidate,
        })


class CandidateViewSet(viewsets.ModelViewSet):
    """
    候補日程のViewSet
    
    スケジュールに紐づく候補日の管理
    """
    serializer_class = CandidateSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardPagination
    
    def get_queryset(self):
        schedule_uuid = self.kwargs.get('schedule_uuid')
        if schedule_uuid:
            return Candidate.objects.filter(
                schedule__uuid=schedule_uuid
            ).order_by('order', 'start_at')
        return Candidate.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CandidateCreateSerializer
        return CandidateSerializer
    
    def perform_create(self, serializer):
        schedule = get_object_or_404(
            Schedule,
            uuid=self.kwargs.get('schedule_uuid')
        )
        serializer.save(schedule=schedule)


class ParticipantViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet
):
    """
    参加者のViewSet
    
    参加者の一覧・詳細・削除（回答の送信は ScheduleViewSet.respond を使用）
    """
    serializer_class = ParticipantSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardPagination
    
    def get_queryset(self):
        schedule_uuid = self.kwargs.get('schedule_uuid')
        if schedule_uuid:
            return Participant.objects.filter(
                schedule__uuid=schedule_uuid
            ).prefetch_related('attendances').order_by('created_at')
        return Participant.objects.none()
    
    def perform_destroy(self, instance):
        """削除時に編集トークンを確認"""
        edit_token = (
            self.request.data.get('edit_token') or
            self.request.query_params.get('token')
        )
        
        # Allow deletion with participant's own token or schedule's edit key
        if edit_token:
            if str(instance.edit_token) == str(edit_token):
                instance.delete()
                return
        
        schedule_edit_key = (
            self.request.data.get('edit_key') or
            self.request.query_params.get('edit_key')
        )
        
        if instance.schedule.edit_key and schedule_edit_key != instance.schedule.edit_key:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('削除権限がありません。')
        
        instance.delete()


class AttendanceViewSet(
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet
):
    """
    出欠のViewSet
    
    出欠の一覧・更新
    """
    serializer_class = AttendanceSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardPagination
    
    def get_queryset(self):
        schedule_uuid = self.kwargs.get('schedule_uuid')
        if schedule_uuid:
            return Attendance.objects.filter(
                schedule__uuid=schedule_uuid
            ).select_related('participant', 'candidate')
        return Attendance.objects.none()
