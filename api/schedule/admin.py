from django.contrib import admin

from django.contrib.admin.options import InlineModelAdmin

from .models import Schedule, Participant, Candidate, Attendance

class ScheduleAdmin(admin.ModelAdmin):
    list_display  = ["id", "name", "owner", "department", "url", "create", "update", "password", "is_enable", ]
    search_fields = ["name", "owner",]
    list_editable = ["name", "owner", "department",]
    list_filter   = ["name", "name", "owner", "department", "url", "create", "update", "password", "is_enable", ]

class ParticipantAdmin(admin.ModelAdmin):
    list_display  = ["id", "schedule", "name",]
    search_fields = ["name",]
    list_editable = ["name",]
    list_filter   = ["name",]

class CandidateAdmin(admin.ModelAdmin):
    list_display  = ["id", "schedule", "start_at","end_at",]
    list_filter   = ["start_at", "end_at",]

class AttendanceAdmin(admin.ModelAdmin):
    list_display  = ["id", "schedule", "participant","attendance","comment",]
    list_editable = ["attendance","comment",]
    list_editable = ["attendance","comment",]

admin.site.register(Schedule   , ScheduleAdmin)
admin.site.register(Participant, ParticipantAdmin)
admin.site.register(Candidate  , CandidateAdmin)
admin.site.register(Attendance , AttendanceAdmin)