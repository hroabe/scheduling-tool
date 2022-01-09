from rest_framework import serializers
from .models import Schedule, Candidate, Attendance, Participant

class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = "__all__"

class CandidateSerializer(serializers.ModelSerializer):

    schedule = ScheduleSerializer()

    class Meta:
        model = Candidate
        fields = "__all__"

class ParticipantSerializer(serializers.ModelSerializer):

    schedule = ScheduleSerializer()

    class Meta:
        model = Participant
        fields = "__all__"
        
class AttendanceSerializer(serializers.ModelSerializer):

    schedule    = ScheduleSerializer()
    participant = ParticipantSerializer()
    candidate   = CandidateSerializer()

    class Meta:
        model = Attendance
        fields = "__all__"
