'use client';

/**
 * StatusPill - Event status badge component
 * Displays: 回答受付中 (blue), 回答締切 (orange), 確定 (green)
 */

import { Badge, type BadgeProps } from '@chakra-ui/react';

// Internal status (used by getEventStatus)
export type EventStatus = 'active' | 'expired' | 'finalized' | 'inactive';

// API status format (returned by backend)
export type ApiEventStatus = 'open' | 'closed' | 'fixed';

interface StatusPillProps extends Omit<BadgeProps, 'colorScheme'> {
    status: EventStatus | ApiEventStatus;
}

const statusConfig: Record<EventStatus | ApiEventStatus, { label: string; colorScheme: string }> = {
    // Internal format
    active: { label: '回答受付中', colorScheme: 'blue' },
    expired: { label: '回答締切', colorScheme: 'orange' },
    finalized: { label: '確定', colorScheme: 'green' },
    inactive: { label: '非公開', colorScheme: 'gray' },
    // API format
    open: { label: '回答受付中', colorScheme: 'blue' },
    closed: { label: '回答締切', colorScheme: 'orange' },
    fixed: { label: '確定', colorScheme: 'green' },
};

export function StatusPill({ status, ...props }: StatusPillProps) {
    const config = statusConfig[status] || statusConfig['active'];
    
    return (
        <Badge
            colorScheme={config.colorScheme}
            px={3}
            py={1}
            borderRadius="full"
            fontSize="xs"
            fontWeight="semibold"
            textTransform="none"
            {...props}
        >
            {config.label}
        </Badge>
    );
}

/**
 * Helper function to determine event status from schedule data
 */
export function getEventStatus(schedule: {
    is_finalized?: boolean;
    is_expired?: boolean;
    is_active?: boolean;
    is_closed?: boolean;
    status?: ApiEventStatus;
}): EventStatus | ApiEventStatus {
    // Use API status if available
    if (schedule.status) return schedule.status;
    // Fallback to computed status
    if (schedule.is_finalized) return 'finalized';
    if (schedule.is_closed || schedule.is_expired) return 'expired';
    if (!schedule.is_active) return 'inactive';
    return 'active';
}

