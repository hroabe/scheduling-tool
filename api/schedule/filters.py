"""
Filters for Schedule API
"""

from django_filters import rest_framework as filters
from .models import Schedule


class ScheduleFilter(filters.FilterSet):
    """スケジュールのフィルター"""
    
    name = filters.CharFilter(lookup_expr='icontains', label='イベント名')
    owner_name = filters.CharFilter(lookup_expr='icontains', label='主催者名')
    department = filters.CharFilter(lookup_expr='icontains', label='所属')
    
    is_active = filters.BooleanFilter(label='有効')
    is_finalized = filters.BooleanFilter(label='確定済み')
    
    created_after = filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='gte',
        label='作成日時（以降）'
    )
    created_before = filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='lte',
        label='作成日時（以前）'
    )
    
    deadline_after = filters.DateTimeFilter(
        field_name='deadline',
        lookup_expr='gte',
        label='回答期限（以降）'
    )
    deadline_before = filters.DateTimeFilter(
        field_name='deadline',
        lookup_expr='lte',
        label='回答期限（以前）'
    )
    
    class Meta:
        model = Schedule
        fields = [
            'name',
            'owner_name',
            'department',
            'is_active',
            'is_finalized',
        ]
