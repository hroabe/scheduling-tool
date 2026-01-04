"""
Admin for 1-on-1 Scheduling
"""

from django.contrib import admin
from .models import AvailabilityPage, AvailabilitySlot, Booking


class AvailabilitySlotInline(admin.TabularInline):
    model = AvailabilitySlot
    extra = 0
    readonly_fields = ['is_booked', 'created_at']


@admin.register(AvailabilityPage)
class AvailabilityPageAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'owner', 'duration_minutes', 'is_public', 'is_active', 'created_at']
    list_filter = ['is_public', 'is_active', 'created_at']
    search_fields = ['title', 'slug', 'owner__username']
    prepopulated_fields = {'slug': ('title',)}
    inlines = [AvailabilitySlotInline]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ['page', 'start_at', 'end_at', 'is_booked', 'created_at']
    list_filter = ['is_booked', 'page', 'created_at']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['guest_name', 'guest_email', 'slot', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['guest_name', 'guest_email', 'uuid']
    readonly_fields = ['uuid', 'cancel_token', 'confirmed_at', 'cancelled_at', 'created_at', 'updated_at']
    
    fieldsets = (
        (None, {
            'fields': ('uuid', 'slot', 'status')
        }),
        ('ゲスト情報', {
            'fields': ('guest_name', 'guest_email', 'guest_message')
        }),
        ('会議', {
            'fields': ('meeting_url',),
            'classes': ('collapse',)
        }),
        ('管理', {
            'fields': ('cancel_token', 'confirmed_at', 'cancelled_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
