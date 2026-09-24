"""
Serializers for Schedule API

DRF serializers with validation and nested representations.
Fields that must not be public (owner_email, edit_key, notification settings)
are intentionally excluded from every read serializer.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import Attendance, Candidate, Participant, Schedule


def get_edit_key(request):
    """リクエストから編集キーを取得（X-Edit-Keyヘッダー または ボディ）"""
    header_key = request.headers.get('X-Edit-Key')
    if header_key:
        return header_key
    data = getattr(request, 'data', None)
    if hasattr(data, 'get'):
        return data.get('edit_key') or None
    return None


def _validate_time_range(data):
    start_at = data.get('start_at')
    end_at = data.get('end_at')
    if start_at and end_at and end_at <= start_at:
        raise serializers.ValidationError({
            'end_at': '終了時刻は開始時刻より後である必要があります。'
        })
    return data


class AttendanceSerializer(serializers.ModelSerializer):
    """出欠シリアライザー"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'id',
            'candidate',
            'participant',
            'status',
            'status_display',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class AttendanceCreateSerializer(serializers.Serializer):
    """出欠作成用シリアライザー"""
    candidate = serializers.IntegerField()
    status = serializers.ChoiceField(choices=Attendance.Status.choices)


class CandidateSerializer(serializers.ModelSerializer):
    """候補日程シリアライザー（集計値はannotate済みの値を優先して使用）"""
    ok_count = serializers.SerializerMethodField()
    maybe_count = serializers.SerializerMethodField()
    ng_count = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = [
            'id',
            'start_at',
            'end_at',
            'note',
            'order',
            'ok_count',
            'maybe_count',
            'ng_count',
            'created_at',
        ]
        read_only_fields = ['created_at']

    @staticmethod
    def _count(obj, name):
        annotated = getattr(obj, f'annotated_{name}', None)
        return annotated if annotated is not None else getattr(obj, name)

    def get_ok_count(self, obj) -> int:
        return self._count(obj, 'ok_count')

    def get_maybe_count(self, obj) -> int:
        return self._count(obj, 'maybe_count')

    def get_ng_count(self, obj) -> int:
        return self._count(obj, 'ng_count')

    def validate(self, data):
        return _validate_time_range(data)


class CandidateCreateSerializer(serializers.ModelSerializer):
    """候補日程作成用シリアライザー"""
    class Meta:
        model = Candidate
        fields = ['id', 'start_at', 'end_at', 'note', 'order']
        read_only_fields = ['id']

    def validate(self, data):
        return _validate_time_range(data)


class ParticipantSerializer(serializers.ModelSerializer):
    """参加者シリアライザー（edit_tokenは含めない）"""
    attendances = AttendanceSerializer(many=True, read_only=True)

    class Meta:
        model = Participant
        fields = [
            'id',
            'name',
            'comment',
            'attendances',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class ParticipantResponseSerializer(ParticipantSerializer):
    """回答送信直後のレスポンス用（本人にのみedit_tokenを返す）"""

    class Meta(ParticipantSerializer.Meta):
        fields = ParticipantSerializer.Meta.fields + ['edit_token']
        read_only_fields = fields


class ParticipantCreateSerializer(serializers.ModelSerializer):
    """参加者作成・更新用シリアライザー（回答含む）"""
    attendances = AttendanceCreateSerializer(many=True, write_only=True)
    edit_token = serializers.UUIDField(read_only=True)
    name = serializers.CharField(max_length=100)
    comment = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    class Meta:
        model = Participant
        fields = ['name', 'comment', 'attendances', 'edit_token']

    def validate_name(self, value):
        """同じスケジュール内で名前が重複していないか確認"""
        value = value.strip()
        if not value:
            raise serializers.ValidationError('お名前を入力してください。')
        schedule = self.context.get('schedule')
        if schedule:
            existing = Participant.objects.filter(schedule=schedule, name=value)
            # 更新時は自分自身を除外
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError(
                    'この名前は既に登録されています。別の名前を使用してください。'
                )
        return value

    def validate_attendances(self, value):
        """候補日がこのイベントのものであること・△の可否を確認"""
        schedule = self.context['schedule']
        candidate_ids = set(schedule.candidates.values_list('id', flat=True))
        seen = set()
        for item in value:
            if item['candidate'] not in candidate_ids:
                raise serializers.ValidationError('指定された候補日は存在しません。')
            if item['candidate'] in seen:
                raise serializers.ValidationError('同じ候補日への回答が重複しています。')
            if item['status'] == Attendance.Status.MAYBE and not schedule.allow_maybe:
                raise serializers.ValidationError('このイベントでは「△」は選択できません。')
            seen.add(item['candidate'])
        return value

    @transaction.atomic
    def create(self, validated_data):
        attendances_data = validated_data.pop('attendances', [])
        schedule = self.context['schedule']

        participant = Participant.objects.create(schedule=schedule, **validated_data)
        Attendance.objects.bulk_create([
            Attendance(
                schedule=schedule,
                participant=participant,
                candidate_id=item['candidate'],
                status=item['status'],
            )
            for item in attendances_data
        ])
        return participant

    @transaction.atomic
    def update(self, instance, validated_data):
        attendances_data = validated_data.pop('attendances', [])

        instance.name = validated_data.get('name', instance.name)
        instance.comment = validated_data.get('comment', instance.comment)
        instance.save()

        for item in attendances_data:
            Attendance.objects.update_or_create(
                participant=instance,
                candidate_id=item['candidate'],
                defaults={'status': item['status'], 'schedule': instance.schedule},
            )
        return instance


class ScheduleDetailSerializer(serializers.ModelSerializer):
    """スケジュール詳細シリアライザー（owner_email等の非公開項目は含めない）"""
    candidates = CandidateSerializer(many=True, read_only=True)
    participants = ParticipantSerializer(many=True, read_only=True)
    can_respond = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    has_edit_key = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = [
            'id',
            'uuid',
            'name',
            'description',
            'owner_name',
            'department',
            'deadline',
            'timezone_name',
            'is_active',
            'allow_maybe',
            'is_finalized',
            'finalized_candidate',
            'can_respond',
            'is_expired',
            'has_edit_key',
            'candidates',
            'participants',
            'url',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_url(self, obj) -> str:
        return f"/event/{obj.uuid}"

    def get_has_edit_key(self, obj) -> bool:
        return bool(obj.edit_key)


class ScheduleCreateSerializer(serializers.ModelSerializer):
    """スケジュール作成用シリアライザー"""
    candidates = CandidateCreateSerializer(many=True, write_only=True)
    edit_key = serializers.CharField(
        write_only=True, required=False, allow_blank=True, allow_null=True,
        min_length=4, max_length=100,
    )
    owner_email = serializers.EmailField(write_only=True, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Schedule
        fields = [
            'name',
            'description',
            'owner_name',
            'owner_email',
            'department',
            'edit_key',
            'deadline',
            'timezone_name',
            'allow_maybe',
            'candidates',
        ]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('イベント名を入力してください。')
        return value

    def validate_owner_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('お名前を入力してください。')
        return value

    def validate_candidates(self, value):
        """最低1つ・最大100の候補日が必要"""
        if not value:
            raise serializers.ValidationError('少なくとも1つの候補日を追加してください。')
        if len(value) > 100:
            raise serializers.ValidationError('候補日は100件までです。')
        return value

    def validate_deadline(self, value):
        """期限は未来の日時であること"""
        if value and value <= timezone.now():
            raise serializers.ValidationError('回答期限は未来の日時を指定してください。')
        return value

    @transaction.atomic
    def create(self, validated_data):
        candidates_data = validated_data.pop('candidates', [])
        raw_edit_key = validated_data.pop('edit_key', None)
        if not validated_data.get('owner_email'):
            validated_data['owner_email'] = None

        # edit_key未入力時はサーバー側で生成し、作成レスポンスでのみ平文を返す
        generated = not raw_edit_key
        if generated:
            raw_edit_key = Schedule.generate_edit_key()

        schedule = Schedule(**validated_data)
        schedule.set_edit_key(raw_edit_key)
        schedule.save()

        Candidate.objects.bulk_create([
            Candidate(
                schedule=schedule,
                start_at=item['start_at'],
                end_at=item['end_at'],
                note=item.get('note', ''),
                order=item.get('order', i),
            )
            for i, item in enumerate(candidates_data)
        ])

        schedule._raw_edit_key = raw_edit_key if generated else None
        return schedule


class ScheduleUpdateSerializer(serializers.ModelSerializer):
    """スケジュール更新用シリアライザー"""

    class Meta:
        model = Schedule
        fields = [
            'name',
            'description',
            'owner_name',
            'department',
            'deadline',
            'is_active',
            'allow_maybe',
        ]

    def validate_deadline(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError('回答期限は未来の日時を指定してください。')
        return value

    def validate(self, data):
        """編集キーの検証"""
        request = self.context.get('request')
        if self.instance and not self.instance.check_edit_key(get_edit_key(request)):
            raise serializers.ValidationError({'edit_key': '編集キーが正しくありません。'})
        return data


class ScheduleFinalizeSerializer(serializers.Serializer):
    """日程確定用シリアライザー（candidate_idにnullを指定すると確定を解除）"""
    candidate_id = serializers.IntegerField(allow_null=True)
    edit_key = serializers.CharField(required=False, allow_blank=True, write_only=True)

    def validate_candidate_id(self, value):
        """候補日が存在するか確認"""
        schedule = self.context.get('schedule')
        if value is not None and not Candidate.objects.filter(id=value, schedule=schedule).exists():
            raise serializers.ValidationError('指定された候補日は存在しません。')
        return value

    def validate(self, data):
        """編集キーの検証"""
        schedule = self.context.get('schedule')
        request = self.context.get('request')
        if schedule and not schedule.check_edit_key(get_edit_key(request)):
            raise serializers.ValidationError({'edit_key': '編集キーが正しくありません。'})
        return data
