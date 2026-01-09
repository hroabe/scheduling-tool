"""
1-on-1 Scheduling Serializers
RFC-0005: 1対1日程調整モード
"""

from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from .models import AvailabilityPage, AvailabilitySlot, Booking


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    """空き枠シリアライザー"""
    is_available = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = AvailabilitySlot
        fields = [
            'id', 'start_at', 'end_at', 'is_booked', 'is_available',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_booked', 'created_at', 'updated_at']


class AvailabilitySlotCreateSerializer(serializers.ModelSerializer):
    """空き枠作成シリアライザー"""
    
    class Meta:
        model = AvailabilitySlot
        fields = ['start_at', 'end_at']
    
    def validate(self, attrs):
        if attrs['start_at'] >= attrs['end_at']:
            raise serializers.ValidationError({
                'end_at': '終了日時は開始日時より後である必要があります'
            })
        if attrs['start_at'] < timezone.now():
            raise serializers.ValidationError({
                'start_at': '過去の日時は指定できません'
            })
        return attrs


class AvailabilityPageListSerializer(serializers.ModelSerializer):
    """予約ページ一覧シリアライザー"""
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    available_slots_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AvailabilityPage
        fields = [
            'id', 'slug', 'title', 'owner_name', 'duration_minutes',
            'is_public', 'is_active', 'available_slots_count',
            'created_at', 'updated_at'
        ]
    
    def get_available_slots_count(self, obj):
        return obj.get_available_slots().count()


class AvailabilityPageDetailSerializer(serializers.ModelSerializer):
    """予約ページ詳細シリアライザー"""
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    slots = AvailabilitySlotSerializer(many=True, read_only=True)
    available_slots = serializers.SerializerMethodField()
    
    class Meta:
        model = AvailabilityPage
        fields = [
            'id', 'slug', 'title', 'description', 'owner_name',
            'timezone_name', 'duration_minutes', 'buffer_minutes',
            'is_public', 'is_active', 'notify_on_booking',
            'slots', 'available_slots', 'public_url',
            'created_at', 'updated_at'
        ]
    
    def get_available_slots(self, obj):
        slots = obj.get_available_slots()[:50]  # Limit for performance
        return AvailabilitySlotSerializer(slots, many=True).data


class AvailabilityPageCreateSerializer(serializers.ModelSerializer):
    """予約ページ作成シリアライザー"""
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    
    class Meta:
        model = AvailabilityPage
        fields = [
            'slug', 'title', 'description', 'timezone_name',
            'duration_minutes', 'buffer_minutes', 'is_public',
            'notify_on_booking', 'owner_name'
        ]
    
    def validate_slug(self, value):
        if AvailabilityPage.objects.filter(slug=value).exists():
            raise serializers.ValidationError('このスラッグは既に使用されています')
        return value
    
    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class AvailabilityPagePublicSerializer(serializers.ModelSerializer):
    """予約ページ公開シリアライザー（ゲスト向け）"""
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    available_slots = serializers.SerializerMethodField()
    
    class Meta:
        model = AvailabilityPage
        fields = [
            'slug', 'title', 'description', 'owner_name',
            'timezone_name', 'duration_minutes',
            'available_slots'
        ]
    
    def get_available_slots(self, obj):
        from_date = self.context.get('from_date')
        to_date = self.context.get('to_date')
        slots = obj.get_available_slots(from_date, to_date)[:100]
        return AvailabilitySlotSerializer(slots, many=True).data


class BookingSerializer(serializers.ModelSerializer):
    """予約シリアライザー"""
    slot_info = AvailabilitySlotSerializer(source='slot', read_only=True)
    page_title = serializers.CharField(source='page.title', read_only=True)
    host_name = serializers.CharField(source='host.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Booking
        fields = [
            'uuid', 'slot', 'slot_info', 'page_title', 'host_name',
            'guest_name', 'guest_email', 'guest_message',
            'status', 'status_display', 'meeting_url',
            'confirmed_at', 'cancelled_at', 'created_at'
        ]
        read_only_fields = [
            'uuid', 'status', 'meeting_url',
            'confirmed_at', 'cancelled_at', 'created_at'
        ]


class BookingCreateSerializer(serializers.ModelSerializer):
    """予約作成シリアライザー"""
    
    class Meta:
        model = Booking
        fields = ['slot', 'guest_name', 'guest_email', 'guest_message']
    
    def validate_slot(self, slot):
        # Check slot is available
        if slot.is_booked:
            raise serializers.ValidationError('この時間枠は既に予約されています')
        if slot.start_at <= timezone.now():
            raise serializers.ValidationError('過去の時間枠は予約できません')
        # Check page is active
        if not slot.page.is_active or not slot.page.is_public:
            raise serializers.ValidationError('この予約ページは現在利用できません')
        return slot
    
    @transaction.atomic
    def create(self, validated_data):
        slot = validated_data['slot']
        
        # Double-check and lock the slot
        slot = AvailabilitySlot.objects.select_for_update().get(id=slot.id)
        if slot.is_booked:
            raise serializers.ValidationError({
                'slot': 'この時間枠は既に予約されています'
            })
        
        # Mark slot as booked
        slot.is_booked = True
        slot.save(update_fields=['is_booked', 'updated_at'])
        
        # Create booking
        booking = Booking.objects.create(**validated_data)
        
        return booking


class BookingCancelSerializer(serializers.Serializer):
    """予約キャンセルシリアライザー"""
    cancel_token = serializers.CharField(required=True)
    
    def validate_cancel_token(self, value):
        booking = self.context.get('booking')
        if booking and booking.cancel_token != value:
            raise serializers.ValidationError('無効なキャンセルトークンです')
        return value


class AnonymousBookingPageCreateSerializer(serializers.Serializer):
    """
    匿名（ログイン不要）予約ページ作成シリアライザー
    
    主催者がログインなしで予約ページを作成する場合に使用
    """
    title = serializers.CharField(max_length=200)
    organizer_name = serializers.CharField(max_length=100)
    organizer_email = serializers.EmailField()
    duration_minutes = serializers.IntegerField(default=30, min_value=15, max_value=180)
    timezone_name = serializers.CharField(max_length=50, default='Asia/Tokyo')
    slots = AvailabilitySlotCreateSerializer(many=True)
    
    def validate_slots(self, value):
        if not value:
            raise serializers.ValidationError('少なくとも1つの空き枠が必要です')
        if len(value) > 30:
            raise serializers.ValidationError('空き枠は30件までです')
        return value
    
    def validate(self, attrs):
        # Validate all slots
        for slot_data in attrs.get('slots', []):
            if slot_data['start_at'] >= slot_data['end_at']:
                raise serializers.ValidationError({
                    'slots': '終了日時は開始日時より後である必要があります'
                })
            if slot_data['start_at'] < timezone.now():
                raise serializers.ValidationError({
                    'slots': '過去の日時は指定できません'
                })
        return attrs


class AnonymousBookingPageHostSerializer(serializers.ModelSerializer):
    """匿名予約ページ管理シリアライザー（ホスト向け）"""
    slots = AvailabilitySlotSerializer(many=True, read_only=True)
    bookings = serializers.SerializerMethodField()
    
    class Meta:
        model = AvailabilityPage
        fields = [
            'id', 'slug', 'title', 'description', 'organizer_name', 'organizer_email',
            'timezone_name', 'duration_minutes', 'buffer_minutes',
            'status', 'is_active', 'notify_on_booking',
            'slots', 'bookings', 'public_url',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']
    
    def get_bookings(self, obj):
        bookings = Booking.objects.filter(
            slot__page=obj
        ).select_related('slot').order_by('-created_at')
        return BookingSerializer(bookings, many=True).data


class AvailabilityPagePublicSerializerV2(serializers.ModelSerializer):
    """
    予約ページ公開シリアライザー（ゲスト向け）V2
    
    匿名モードにも対応
    """
    organizer = serializers.SerializerMethodField()
    available_slots = serializers.SerializerMethodField()
    
    class Meta:
        model = AvailabilityPage
        fields = [
            'slug', 'title', 'description', 'organizer',
            'timezone_name', 'duration_minutes',
            'available_slots', 'status'
        ]
    
    def get_organizer(self, obj):
        if obj.owner:
            return obj.owner.username
        return obj.organizer_name
    
    def get_available_slots(self, obj):
        from_date = self.context.get('from_date')
        to_date = self.context.get('to_date')
        slots = obj.get_available_slots(from_date, to_date)[:100]
        return AvailabilitySlotSerializer(slots, many=True).data

