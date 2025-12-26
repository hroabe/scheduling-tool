"""
Serializers for Schedule API

Modern DRF serializers with validation and nested representations.
"""

from rest_framework import serializers
from django.utils import timezone
from .models import Schedule, Candidate, Participant, Attendance


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
        read_only_fields = ['created_at', 'updated_at']


class AttendanceCreateSerializer(serializers.ModelSerializer):
    """出欠作成用シリアライザー"""
    class Meta:
        model = Attendance
        fields = ['candidate', 'status']


class CandidateSerializer(serializers.ModelSerializer):
    """候補日程シリアライザー"""
    ok_count = serializers.IntegerField(read_only=True)
    maybe_count = serializers.IntegerField(read_only=True)
    ng_count = serializers.IntegerField(read_only=True)
    
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
    
    def validate(self, data):
        """終了時刻が開始時刻より後であることを確認"""
        if data.get('end_at') and data.get('start_at'):
            if data['end_at'] <= data['start_at']:
                raise serializers.ValidationError({
                    'end_at': '終了時刻は開始時刻より後である必要があります。'
                })
        return data


class CandidateCreateSerializer(serializers.ModelSerializer):
    """候補日程作成用シリアライザー"""
    class Meta:
        model = Candidate
        fields = ['start_at', 'end_at', 'note', 'order']
    
    def validate(self, data):
        """終了時刻が開始時刻より後であることを確認"""
        if data.get('end_at') and data.get('start_at'):
            if data['end_at'] <= data['start_at']:
                raise serializers.ValidationError({
                    'end_at': '終了時刻は開始時刻より後である必要があります。'
                })
        return data


class ParticipantSerializer(serializers.ModelSerializer):
    """参加者シリアライザー"""
    attendances = AttendanceSerializer(many=True, read_only=True)
    edit_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Participant
        fields = [
            'id',
            'name',
            'comment',
            'attendances',
            'edit_url',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'edit_url']
    
    def get_edit_url(self, obj):
        """編集用URLを生成（編集トークンは本人にのみ公開）"""
        request = self.context.get('request')
        if request and request.query_params.get('include_edit_token'):
            return f"/event/{obj.schedule.uuid}/respond?token={obj.edit_token}"
        return None


class ParticipantCreateSerializer(serializers.ModelSerializer):
    """参加者作成用シリアライザー（回答含む）"""
    attendances = AttendanceCreateSerializer(many=True, write_only=True)
    edit_token = serializers.UUIDField(read_only=True)
    
    class Meta:
        model = Participant
        fields = ['name', 'comment', 'attendances', 'edit_token']
    
    def validate_name(self, value):
        """同じスケジュール内で名前が重複していないか確認"""
        schedule = self.context.get('schedule')
        if schedule:
            existing = Participant.objects.filter(
                schedule=schedule,
                name=value
            )
            # 更新時は自分自身を除外
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError(
                    'この名前は既に登録されています。別の名前を使用してください。'
                )
        return value
    
    def create(self, validated_data):
        attendances_data = validated_data.pop('attendances', [])
        schedule = self.context.get('schedule')
        
        participant = Participant.objects.create(
            schedule=schedule,
            **validated_data
        )
        
        # 出欠を作成
        for attendance_data in attendances_data:
            Attendance.objects.create(
                schedule=schedule,
                participant=participant,
                **attendance_data
            )
        
        return participant
    
    def update(self, instance, validated_data):
        attendances_data = validated_data.pop('attendances', [])
        
        # 参加者情報を更新
        instance.name = validated_data.get('name', instance.name)
        instance.comment = validated_data.get('comment', instance.comment)
        instance.save()
        
        # 出欠を更新
        for attendance_data in attendances_data:
            Attendance.objects.update_or_create(
                participant=instance,
                candidate=attendance_data['candidate'],
                defaults={'status': attendance_data['status']}
            )
        
        return instance


class ScheduleListSerializer(serializers.ModelSerializer):
    """スケジュール一覧用シリアライザー"""
    participant_count = serializers.SerializerMethodField()
    candidate_count = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()
    
    class Meta:
        model = Schedule
        fields = [
            'id',
            'uuid',
            'name',
            'owner_name',
            'department',
            'deadline',
            'is_active',
            'is_finalized',
            'participant_count',
            'candidate_count',
            'url',
            'created_at',
        ]
    
    def get_participant_count(self, obj):
        return obj.participants.count()
    
    def get_candidate_count(self, obj):
        return obj.candidates.count()
    
    def get_url(self, obj):
        return f"/event/{obj.uuid}"


class ScheduleDetailSerializer(serializers.ModelSerializer):
    """スケジュール詳細シリアライザー"""
    candidates = CandidateSerializer(many=True, read_only=True)
    participants = ParticipantSerializer(many=True, read_only=True)
    can_respond = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    url = serializers.SerializerMethodField()
    
    class Meta:
        model = Schedule
        fields = [
            'id',
            'uuid',
            'name',
            'description',
            'owner_name',
            'owner_email',
            'department',
            'deadline',
            'timezone_name',
            'is_active',
            'allow_maybe',
            'show_participant_count',
            'is_finalized',
            'finalized_candidate',
            'can_respond',
            'is_expired',
            'candidates',
            'participants',
            'url',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['uuid', 'created_at', 'updated_at']
    
    def get_url(self, obj):
        return f"/event/{obj.uuid}"


class ScheduleCreateSerializer(serializers.ModelSerializer):
    """スケジュール作成用シリアライザー"""
    candidates = CandidateCreateSerializer(many=True, write_only=True)
    uuid = serializers.UUIDField(read_only=True)
    url = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Schedule
        fields = [
            'uuid',
            'name',
            'description',
            'owner_name',
            'owner_email',
            'department',
            'edit_key',
            'deadline',
            'timezone_name',
            'allow_maybe',
            'show_participant_count',
            'notify_on_response',
            'candidates',
            'url',
        ]
    
    def get_url(self, obj):
        return f"/event/{obj.uuid}"
    
    def validate_candidates(self, value):
        """最低1つの候補日が必要"""
        if not value or len(value) == 0:
            raise serializers.ValidationError(
                '少なくとも1つの候補日を追加してください。'
            )
        return value
    
    def validate_deadline(self, value):
        """期限は未来の日時であること"""
        if value and value <= timezone.now():
            raise serializers.ValidationError(
                '回答期限は未来の日時を指定してください。'
            )
        return value
    
    def create(self, validated_data):
        candidates_data = validated_data.pop('candidates', [])
        
        schedule = Schedule.objects.create(**validated_data)
        
        # 候補日を作成
        for i, candidate_data in enumerate(candidates_data):
            Candidate.objects.create(
                schedule=schedule,
                order=candidate_data.get('order', i),
                **{k: v for k, v in candidate_data.items() if k != 'order'}
            )
        
        return schedule


class ScheduleUpdateSerializer(serializers.ModelSerializer):
    """スケジュール更新用シリアライザー"""
    
    class Meta:
        model = Schedule
        fields = [
            'name',
            'description',
            'owner_name',
            'owner_email',
            'department',
            'deadline',
            'is_active',
            'allow_maybe',
            'show_participant_count',
            'notify_on_response',
        ]
    
    def validate(self, data):
        """編集キーの検証"""
        request = self.context.get('request')
        instance = self.instance
        
        if instance and instance.edit_key:
            edit_key = request.data.get('edit_key') or request.query_params.get('edit_key')
            if edit_key != instance.edit_key:
                raise serializers.ValidationError({
                    'edit_key': '編集キーが正しくありません。'
                })
        
        return data


class ScheduleFinalizeSerializer(serializers.Serializer):
    """日程確定用シリアライザー"""
    candidate_id = serializers.IntegerField()
    edit_key = serializers.CharField(required=False, allow_blank=True)
    
    def validate_candidate_id(self, value):
        """候補日が存在するか確認"""
        schedule = self.context.get('schedule')
        if not Candidate.objects.filter(id=value, schedule=schedule).exists():
            raise serializers.ValidationError(
                '指定された候補日は存在しません。'
            )
        return value
    
    def validate(self, data):
        """編集キーの検証"""
        schedule = self.context.get('schedule')
        if schedule and schedule.edit_key:
            if data.get('edit_key') != schedule.edit_key:
                raise serializers.ValidationError({
                    'edit_key': '編集キーが正しくありません。'
                })
        return data


class CSVExportSerializer(serializers.Serializer):
    """CSV出力用シリアライザー"""
    include_comments = serializers.BooleanField(default=True)
    include_timestamps = serializers.BooleanField(default=False)
