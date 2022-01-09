import django_filters
from .models import Schedule
from django_filters import rest_framework as filters 

class ScheduleFilter(django_filters.rest_framework.FilterSet):
    """
    Scheduleのfilter
    """

    name  = filters.CharFilter(lookup_expr='contains')
    owner = filters.CharFilter(lookup_expr='contains')
    department = filters.CharFilter(lookup_expr='contains')

    class Meta:
        model = Schedule
        fields = ['name','owner','department']
