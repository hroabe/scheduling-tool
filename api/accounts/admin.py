"""
Admin configuration for Accounts
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import UserProfile, UserIntegration


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'プロファイル'


class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]


@admin.register(UserIntegration)
class UserIntegrationAdmin(admin.ModelAdmin):
    list_display = ['user', 'provider', 'is_active', 'expires_at', 'last_used_at', 'created_at']
    list_filter = ['provider', 'is_active']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at', 'last_used_at']
    
    fieldsets = (
        (None, {
            'fields': ('user', 'provider', 'is_active')
        }),
        ('トークン情報', {
            'fields': ('expires_at', 'scopes'),
            'classes': ('collapse',)
        }),
        ('状態', {
            'fields': ('revoked_at', 'last_used_at', 'last_error', 'error_count'),
            'classes': ('collapse',)
        }),
        ('日時', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)
