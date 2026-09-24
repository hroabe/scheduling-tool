'use client';

/**
 * StatusPill - event status badge
 * open/active: accepting responses (blue), closed: responses closed (orange),
 * expired: deadline passed (red), fixed/finalized: date decided (green), inactive: paused (gray)
 */

import { Badge, type BadgeProps } from '@chakra-ui/react';
import { useI18n } from '@/providers/I18nProvider';

// Internal status (used by getEventStatus)
export type EventStatus = 'active' | 'expired' | 'finalized' | 'inactive';

// API status format (returned by backend)
export type ApiEventStatus = 'open' | 'closed' | 'fixed';

interface StatusPillProps extends Omit<BadgeProps, 'colorScheme'> {
    status: EventStatus | ApiEventStatus;
}

const statusConfig: Record<EventStatus | ApiEventStatus, { key: string; colorScheme: string }> = {
    active: { key: 'open', colorScheme: 'blue' },
    open: { key: 'open', colorScheme: 'blue' },
    closed: { key: 'closed', colorScheme: 'orange' },
    expired: { key: 'expired', colorScheme: 'red' },
    finalized: { key: 'fixed', colorScheme: 'green' },
    fixed: { key: 'fixed', colorScheme: 'green' },
    inactive: { key: 'inactive', colorScheme: 'gray' },
};

export function StatusPill({ status, ...props }: StatusPillProps) {
    const { t } = useI18n();
    const config = statusConfig[status] ?? statusConfig.active;

    return (
        <Badge
            colorScheme={config.colorScheme}
            px={3}
            py={1}
            borderRadius="full"
            fontSize="xs"
            fontWeight="semibold"
            textTransform="none"
            data-status={status}
            {...props}
        >
            {t(`schedule.status.${config.key}`)}
        </Badge>
    );
}

/**
 * Determine the status of an event from list/detail data.
 * The API `status` is used when present ('closed' covers both "closed by the organizer"
 * and "deadline passed").
 */
export function getEventStatus(schedule: {
    is_finalized?: boolean;
    is_expired?: boolean;
    is_active?: boolean;
    is_closed?: boolean;
    status?: ApiEventStatus;
}): EventStatus | ApiEventStatus {
    if (schedule.status) return schedule.status;
    if (schedule.is_finalized) return 'finalized';
    if (schedule.is_closed || schedule.is_expired) return 'expired';
    if (!schedule.is_active) return 'inactive';
    return 'active';
}

/**
 * Detailed status for the event page: distinguishes "closed by the organizer"
 * from "deadline passed" and "paused".
 */
export function getDetailStatus(schedule: {
    is_finalized: boolean;
    is_closed?: boolean;
    closed_at?: string | null;
    is_expired: boolean;
    is_active: boolean;
    status?: ApiEventStatus;
}): 'fixed' | 'closed' | 'expired' | 'inactive' | 'open' {
    if (schedule.is_finalized || schedule.status === 'fixed') return 'fixed';
    if (schedule.is_closed || schedule.closed_at) return 'closed';
    if (schedule.is_expired) return 'expired';
    if (!schedule.is_active) return 'inactive';
    return 'open';
}
