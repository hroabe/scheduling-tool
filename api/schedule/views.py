from rest_framework import mixins
from rest_framework import viewsets

from .models import Schedule, Attendance, Candidate, Participant
from .filters import ScheduleFilter
from .serializer import ScheduleSerializer, AttendanceSerializer, CandidateSerializer, ParticipantSerializer

from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend


class SetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class ScheduleListViewSet(viewsets.ModelViewSet):
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer
    pagination_class = SetPagination

    filter_backends = (DjangoFilterBackend,)
    filterset_class = ScheduleFilter
    #filterset_fields = ('name', 'owner', 'department')

    search_fields = ('name', 'owner', 'department')

class AttendanceListViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    pagination_class = SetPagination

class CandidateListViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.all()
    serializer_class = CandidateSerializer
    pagination_class = SetPagination

class ParticipantListViewSet(viewsets.ModelViewSet):
    queryset = Participant.objects.all()
    serializer_class = ParticipantSerializer
    pagination_class = SetPagination
    
