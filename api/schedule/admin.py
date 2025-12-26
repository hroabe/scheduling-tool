"""
Admin configuration for Schedule models
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import Schedule, Candidate, Participant, Attendance, Notification


class CandidateInline(admin.TabularInline):
    """候補日程のインライン"""
    model = Candidate
    extra = 1
    fields = ['start_at', 'end_at', 'note', 'order']
    ordering = ['order', 'start_at']


class ParticipantInline(admin.TabularInline):
    """参加者のインライン"""
    model = Participant
    extra = 0
    fields = ['name', 'comment', 'created_at']
    readonly_fields = ['created_at']
    show_change_link = True


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    """スケジュール管理"""
    list_display = [
        'name',
        'owner_name',
        'department',
        'participant_count',
        'candidate_count',
        'is_active',
        'is_finalized',
        'deadline',
        'created_at',
    ]
    list_filter = ['is_active', 'is_finalized', 'created_at']
    search_fields = ['name', 'owner_name', 'department', 'uuid']
    readonly_fields = ['uuid', 'created_at', 'updated_at']
    
    fieldsets = (
        ('基本情報', {
            'fields': ('uuid', 'name', 'description', 'owner_name', 'owner_email', 'department')
        }),
        ('設定', {
            'fields': ('edit_key', 'deadline', 'timezone_name', 'allow_maybe', 'show_participant_count')
        }),
        ('通知', {
            'fields': ('notify_on_response',)
        }),
        ('状態', {
            'fields': ('is_active', 'is_finalized', 'finalized_candidate')
        }),
        ('日時', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [CandidateInline, ParticipantInline]
    
    def participant_count(self, obj):
        return obj.participants.count()
    participant_count.short_description = '参加者数'
    
    def candidate_count(self, obj):
        return obj.candidates.count()
    candidate_count.short_description = '候補日数'


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    """候補日程管理"""
    list_display = ['schedule', 'start_at', 'end_at', 'note', 'ok_count', 'maybe_count', 'ng_count']
    list_filter = ['schedule', 'start_at']
    search_fields = ['schedule__name', 'note']
    ordering = ['schedule', 'order', 'start_at']
    
    def ok_count(self, obj):
        return obj.ok_count
    ok_count.short_description = '◯'
    
    def maybe_count(self, obj):
        return obj.maybe_count
    maybe_count.short_description = '△'
    
    def ng_count(self, obj):
        return obj.ng_count
    ng_count.short_description = '×'


class AttendanceInline(admin.TabularInline):
    """出欠のインライン"""
    model = Attendance
    extra = 0
    fields = ['candidate', 'status']


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    """参加者管理"""
    list_display = ['name', 'schedule', 'comment', 'created_at']
    list_filter = ['schedule', 'created_at']
    search_fields = ['name', 'schedule__name', 'comment']
    readonly_fields = ['edit_token', 'created_at', 'updated_at']
    
    inlines = [AttendanceInline]


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    """出欠管理"""
    list_display = ['participant', 'candidate', 'status_display', 'updated_at']
    list_filter = ['status', 'schedule', 'candidate']
    search_fields = ['participant__name', 'schedule__name']
    
    def status_display(self, obj):
        colors = {
            'ok': 'green',
            'maybe': 'orange',
            'ng': 'red',
            'pending': 'gray',
        }
        return format_html(
            '<span style="color: {};">{}</span>',
            colors.get(obj.status, 'black'),
            obj.get_status_display()
        )
    status_display.short_description = '出欠'


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """通知管理"""
    list_display = ['schedule', 'notification_type', 'recipient_email', 'is_sent', 'sent_at']
    list_filter = ['notification_type', 'is_sent', 'sent_at']
    search_fields = ['schedule__name', 'recipient_email', 'subject']
    readonly_fields = ['sent_at']