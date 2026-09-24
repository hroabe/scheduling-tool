"""
Views for Schedule API

ScheduleViewSet (create/retrieve/update/destroy + custom actions),
nested Candidate/Participant/Attendance ViewSets, and a health check.
"""

import csv
from io import StringIO
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import connection
from django.db.models import Count, Prefetch, Q
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.http import content_disposition_header
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .models import Attendance, Candidate, Participant, Schedule
from .serializers import (
    AttendanceSerializer,
    CandidateCreateSerializer,
    CandidateSerializer,
    ParticipantCreateSerializer,
    ParticipantResponseSerializer,
    ParticipantSerializer,
    ScheduleCreateSerializer,
    ScheduleDetailSerializer,
    ScheduleFinalizeSerializer,
    ScheduleUpdateSerializer,
    get_edit_key,
)
from .throttling import EditKeyRateThrottle

EDIT_KEY_ERROR = '編集キーが正しくありません。'
UUID_REGEX = r'[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}'


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sanitize_csv_value(value) -> str:
    """CSVインジェクション対策: 先頭文字が=, +, -, @, \\t, \\r の場合プレフィクスを付与"""
    value = '' if value is None else str(value)
    if value and value[0] in ('=', '+', '-', '@', '\t', '\r'):
        return f"'{value}"
    return value


def _sanitize_filename(name: str) -> str:
    """Content-Dispositionヘッダーインジェクション対策"""
    safe = name.replace('"', '').replace('\n', '').replace('\r', '')
    safe = safe.replace('/', '_').replace('\\', '_').strip()
    return safe or 'schedule'


def _sanitize_ics_value(value) -> str:
    """ICS(RFC5545)のTEXT値エスケープ"""
    value = '' if value is None else str(value)
    return (
        value.replace('\\', '\\\\')
        .replace(';', '\\;')
        .replace(',', '\\,')
        .replace('\r\n', '\\n')
        .replace('\n', '\\n')
        .replace('\r', '\\n')
    )


def _fold_ics_line(line: str) -> str:
    """75オクテットを超える行をRFC5545に従って折り返す（UTF-8の文字境界を維持）"""
    parts = []
    current = ''
    current_len = 0
    for char in line:
        char_len = len(char.encode('utf-8'))
        if current_len + char_len > 75:
            parts.append(current)
            current = ' '
            current_len = 1
        current += char
        current_len += char_len
    parts.append(current)
    return '\r\n'.join(parts)


def _ics_datetime(dt) -> str:
    return dt.astimezone(ZoneInfo('UTC')).strftime('%Y%m%dT%H%M%SZ')


def _schedule_tz(schedule):
    try:
        return ZoneInfo(schedule.timezone_name)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo(settings.TIME_ZONE)


def annotated_candidates(schedule=None):
    """候補日ごとの◯△×集計をannotateで一括取得するQuerySet"""
    queryset = Candidate.objects.annotate(
        annotated_ok_count=Count('attendances', filter=Q(attendances__status='ok')),
        annotated_maybe_count=Count('attendances', filter=Q(attendances__status='maybe')),
        annotated_ng_count=Count('attendances', filter=Q(attendances__status='ng')),
    ).order_by('order', 'start_at')
    if schedule is not None:
        queryset = queryset.filter(schedule=schedule)
    return queryset


def build_summary(schedule):
    """集計結果とおすすめ候補（最高スコア。同点の場合は表示順が先の候補）を計算"""
    candidates_summary = []
    best = None
    for candidate in annotated_candidates(schedule):
        ok_count = candidate.annotated_ok_count
        maybe_count = candidate.annotated_maybe_count
        # Score: OK=2, Maybe=1, NG=0
        score = ok_count * 2 + maybe_count
        item = {
            'candidate_id': candidate.id,
            'start_at': candidate.start_at,
            'end_at': candidate.end_at,
            'note': candidate.note,
            'ok_count': ok_count,
            'maybe_count': maybe_count,
            'ng_count': candidate.annotated_ng_count,
            'score': score,
            'is_recommended': False,
        }
        candidates_summary.append(item)
        if score > 0 and (best is None or score > best['score']):
            best = item
    if best is not None:
        best['is_recommended'] = True
    return candidates_summary, best


def health(request):
    """デプロイ先のヘルスチェック用エンドポイント"""
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
    except Exception:  # pragma: no cover - depends on infrastructure
        return JsonResponse({'status': 'error'}, status=503)
    return JsonResponse({'status': 'ok'})


def robots_txt(request):
    """APIドメインは検索エンジンにインデックスさせない"""
    return HttpResponse('User-agent: *\nDisallow: /\n', content_type='text/plain')


# ---------------------------------------------------------------------------
# ViewSets
# ---------------------------------------------------------------------------

class ScheduleViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    スケジュール（イベント）のViewSet

    一覧(list)は情報漏洩防止のため提供しない。
    retrieve: イベント詳細を取得（UUIDで取得）
    create: 新規イベントを作成
    partial_update: イベントを更新（編集キーが必要）
    destroy: イベントを削除（編集キーが必要）
    """
    lookup_field = 'uuid'
    lookup_value_regex = UUID_REGEX

    def get_queryset(self):
        if self.action == 'retrieve':
            return self.detail_queryset()
        return Schedule.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return ScheduleCreateSerializer
        if self.action in ('update', 'partial_update'):
            return ScheduleUpdateSerializer
        return ScheduleDetailSerializer

    def _detail_response(self, schedule, status_code=status.HTTP_200_OK, extra=None):
        schedule = self.detail_queryset().get(pk=schedule.pk)
        data = ScheduleDetailSerializer(schedule, context=self.get_serializer_context()).data
        if extra:
            data.update(extra)
        return Response(data, status=status_code)

    @staticmethod
    def detail_queryset():
        """詳細表示用: 候補日の集計と参加者の回答を一括取得"""
        return Schedule.objects.prefetch_related(
            Prefetch('candidates', queryset=annotated_candidates()),
            Prefetch(
                'participants',
                queryset=Participant.objects.prefetch_related('attendances').order_by('created_at'),
            ),
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        schedule = serializer.save()
        extra = {}
        if schedule._raw_edit_key:
            # 自動生成した編集キーはこのレスポンスでのみ平文で返す
            extra['_edit_key'] = schedule._raw_edit_key
        return self._detail_response(schedule, status.HTTP_201_CREATED, extra)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        schedule = serializer.save()
        return self._detail_response(schedule)

    def perform_destroy(self, instance):
        """削除時に編集キーを確認"""
        if not instance.check_edit_key(get_edit_key(self.request)):
            raise PermissionDenied(EDIT_KEY_ERROR)
        instance.delete()

    @action(detail=True, methods=['post'], throttle_classes=[EditKeyRateThrottle])
    def verify_edit_key(self, request, uuid=None):
        """編集キーが正しいか確認する（編集画面の認証用）"""
        schedule = self.get_object()
        if not schedule.check_edit_key(get_edit_key(request)):
            raise PermissionDenied(EDIT_KEY_ERROR)
        return Response({'valid': True})

    @action(detail=True, methods=['post'])
    def respond(self, request, uuid=None):
        """
        イベントに回答を送信

        新規参加者として回答を登録、またはedit_token付きで既存の回答を更新
        """
        schedule = self.get_object()

        if not schedule.can_respond:
            return Response(
                {'detail': 'このイベントは回答を受け付けていません。'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        edit_token = request.data.get('edit_token')
        context = {'request': request, 'schedule': schedule}

        if edit_token:
            try:
                participant = schedule.participants.get(edit_token=edit_token)
            except (Participant.DoesNotExist, DjangoValidationError, ValueError):
                return Response(
                    {'detail': '無効な編集トークンです。'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer = ParticipantCreateSerializer(
                participant, data=request.data, context=context, partial=True
            )
        else:
            serializer = ParticipantCreateSerializer(data=request.data, context=context)

        serializer.is_valid(raise_exception=True)
        participant = serializer.save()
        participant = Participant.objects.prefetch_related('attendances').get(pk=participant.pk)

        return Response(
            ParticipantResponseSerializer(participant).data,
            status=status.HTTP_200_OK if edit_token else status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def finalize(self, request, uuid=None):
        """日程を確定（candidate_id=nullで確定解除）"""
        schedule = self.get_object()
        serializer = ScheduleFinalizeSerializer(
            data=request.data,
            context={'request': request, 'schedule': schedule},
        )
        serializer.is_valid(raise_exception=True)

        candidate_id = serializer.validated_data['candidate_id']
        schedule.is_finalized = candidate_id is not None
        schedule.finalized_candidate_id = candidate_id
        schedule.save(update_fields=['is_finalized', 'finalized_candidate', 'updated_at'])

        return self._detail_response(schedule)

    @action(detail=True, methods=['get'])
    def export_csv(self, request, uuid=None):
        """回答結果をCSV（UTF-8 BOM付き / Excel互換）でエクスポート"""
        schedule = self.get_object()
        tz = _schedule_tz(schedule)
        include_comments = request.query_params.get('include_comments', 'true').lower() == 'true'

        candidates = list(annotated_candidates(schedule))
        participants = list(schedule.participants.order_by('created_at'))
        attendance_map = {
            (a.participant_id, a.candidate_id): a.get_status_display()
            for a in Attendance.objects.filter(schedule=schedule)
        }

        output = StringIO()
        writer = csv.writer(output)

        header = ['参加者']
        for candidate in candidates:
            start = timezone.localtime(candidate.start_at, tz)
            end = timezone.localtime(candidate.end_at, tz)
            header.append(f"{start:%Y/%m/%d %H:%M}-{end:%H:%M}")
        if include_comments:
            header.append('コメント')
        writer.writerow(header)

        for participant in participants:
            row = [_sanitize_csv_value(participant.name)]
            for candidate in candidates:
                row.append(attendance_map.get((participant.id, candidate.id), '未回答'))
            if include_comments:
                row.append(_sanitize_csv_value(participant.comment))
            writer.writerow(row)

        summary = ['集計']
        for candidate in candidates:
            summary.append(
                f"◯:{candidate.annotated_ok_count} "
                f"△:{candidate.annotated_maybe_count} "
                f"×:{candidate.annotated_ng_count}"
            )
        writer.writerow(summary)

        response = HttpResponse(
            output.getvalue().encode('utf-8-sig'),  # BOM for Excel compatibility
            content_type='text/csv; charset=utf-8',
        )
        response['Content-Disposition'] = content_disposition_header(
            True, f"{_sanitize_filename(schedule.name)}.csv"
        )
        return response

    @action(detail=True, methods=['get'])
    def export_ics(self, request, uuid=None):
        """候補日（確定済みの場合は確定日程）をICS形式でエクスポート"""
        schedule = self.get_object()

        candidate_id = request.query_params.get('candidate_id')
        if candidate_id:
            try:
                candidate_id = int(candidate_id)
            except ValueError:
                return Response({'detail': 'candidate_idが不正です。'}, status=status.HTTP_400_BAD_REQUEST)
            candidates = [get_object_or_404(annotated_candidates(schedule), pk=candidate_id)]
        elif schedule.is_finalized and schedule.finalized_candidate_id:
            candidates = list(annotated_candidates(schedule).filter(pk=schedule.finalized_candidate_id))
        else:
            candidates = list(annotated_candidates(schedule))

        event_url = f"{settings.FRONTEND_URL.rstrip('/')}/event/{schedule.uuid}"
        dtstamp = _ics_datetime(timezone.now())

        lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//SchedulingTool//JP',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            f'X-WR-CALNAME:{_sanitize_ics_value(schedule.name)}',
        ]
        for candidate in candidates:
            is_confirmed = schedule.is_finalized and candidate.id == schedule.finalized_candidate_id
            description_parts = []
            if schedule.description:
                description_parts.append(schedule.description)
                description_parts.append('')
            description_parts.append(
                f"回答状況: ◯{candidate.annotated_ok_count} "
                f"△{candidate.annotated_maybe_count} ×{candidate.annotated_ng_count}"
            )
            description_parts.append(f"主催: {schedule.owner_name}")
            if candidate.note:
                description_parts.append(f"備考: {candidate.note}")
            description_parts.append(event_url)

            lines.extend([
                'BEGIN:VEVENT',
                f'UID:{schedule.uuid}-{candidate.id}@scheduling-tool',
                f'DTSTART:{_ics_datetime(candidate.start_at)}',
                f'DTEND:{_ics_datetime(candidate.end_at)}',
                f'DTSTAMP:{dtstamp}',
                f'SUMMARY:{_sanitize_ics_value(schedule.name)}',
                f"DESCRIPTION:{_sanitize_ics_value(chr(10).join(description_parts))}",
                f'URL:{event_url}',
                f"STATUS:{'CONFIRMED' if is_confirmed else 'TENTATIVE'}",
                'END:VEVENT',
            ])
        lines.append('END:VCALENDAR')

        body = '\r\n'.join(_fold_ics_line(line) for line in lines) + '\r\n'
        response = HttpResponse(body.encode('utf-8'), content_type='text/calendar; charset=utf-8')
        response['Content-Disposition'] = content_disposition_header(
            True, f"{_sanitize_filename(schedule.name)}.ics"
        )
        return response

    @action(detail=True, methods=['get'])
    def summary(self, request, uuid=None):
        """各候補日の◯/△/×の数と、おすすめ候補（最高スコア）を返す"""
        schedule = self.get_object()
        candidates_summary, best = build_summary(schedule)
        return Response({
            'schedule_id': schedule.id,
            'schedule_name': schedule.name,
            'total_participants': schedule.participants.count(),
            'candidates': candidates_summary,
            'recommended_candidate': best,
        })


class ScheduleChildMixin:
    """/schedules/{uuid}/... 配下のネストしたリソース用の共通処理"""

    def get_schedule(self):
        if not hasattr(self, '_schedule'):
            self._schedule = get_object_or_404(Schedule, uuid=self.kwargs['schedule_uuid'])
        return self._schedule

    def require_edit_key(self):
        if not self.get_schedule().check_edit_key(get_edit_key(self.request)):
            raise PermissionDenied(EDIT_KEY_ERROR)


class CandidateViewSet(ScheduleChildMixin, viewsets.ModelViewSet):
    """
    候補日程のViewSet

    閲覧は誰でも可能。追加・更新・削除にはイベントの編集キーが必要。
    """
    serializer_class = CandidateSerializer
    pagination_class = None

    def get_queryset(self):
        return annotated_candidates(self.get_schedule())

    def get_serializer_class(self):
        if self.action == 'create':
            return CandidateCreateSerializer
        return CandidateSerializer

    def perform_create(self, serializer):
        self.require_edit_key()
        schedule = self.get_schedule()
        order = serializer.validated_data.get('order')
        if order is None:
            last = schedule.candidates.order_by('-order').first()
            order = (last.order + 1) if last else 0
        serializer.save(schedule=schedule, order=order)

    def perform_update(self, serializer):
        self.require_edit_key()
        serializer.save()

    def perform_destroy(self, instance):
        self.require_edit_key()
        schedule = self.get_schedule()
        if schedule.candidates.count() <= 1:
            raise ValidationError({'detail': '候補日は最低1つ必要です。'})
        if schedule.finalized_candidate_id == instance.id:
            schedule.is_finalized = False
            schedule.finalized_candidate = None
            schedule.save(update_fields=['is_finalized', 'finalized_candidate', 'updated_at'])
        instance.delete()


class ParticipantViewSet(
    ScheduleChildMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    参加者のViewSet

    参加者の一覧・詳細・削除（回答の送信は ScheduleViewSet.respond を使用）
    """
    serializer_class = ParticipantSerializer
    pagination_class = None

    def get_queryset(self):
        return (
            Participant.objects.filter(schedule=self.get_schedule())
            .prefetch_related('attendances')
            .order_by('created_at')
        )

    def perform_destroy(self, instance):
        """回答者本人のedit_token または イベントの編集キーで削除可能"""
        edit_token = self.request.data.get('edit_token') if hasattr(self.request.data, 'get') else None
        if edit_token and str(instance.edit_token) == str(edit_token):
            instance.delete()
            return

        schedule = instance.schedule
        if not schedule.edit_key or not schedule.check_edit_key(get_edit_key(self.request)):
            raise PermissionDenied('削除権限がありません。')
        instance.delete()


class AttendanceViewSet(ScheduleChildMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    """出欠の一覧（読み取り専用）"""
    serializer_class = AttendanceSerializer
    pagination_class = None

    def get_queryset(self):
        return Attendance.objects.filter(
            schedule=self.get_schedule()
        ).select_related('participant', 'candidate')
