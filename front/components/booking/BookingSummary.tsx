'use client';

import { useState } from 'react';
import {
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    Link as ChakraLink,
    SimpleGrid,
    Text,
    useToast,
} from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDateRange } from '@/lib/date';
import { removeCancelToken } from '@/lib/hostTokens';
import { useI18n } from '@/providers/I18nProvider';
import type { Booking } from '@/types';
import { apiErrorMessage } from '@/components/account/utils';
import { ConfirmDialog } from './ConfirmDialog';

export const bookingQueryKey = (uuid: string) => ['booking', uuid] as const;

const STATUS_COLORS: Record<string, string> = { pending: 'orange', confirmed: 'green', cancelled: 'gray', completed: 'blue' };

/** Details of one reservation (guest-facing) */
export function BookingSummary({ booking }: { booking: Booking }) {
    const { t } = useI18n();
    const rows: { label: string; value: React.ReactNode }[] = [
        { label: t('booking.summary.title'), value: booking.page_title },
        {
            label: t('booking.summary.when'),
            value: booking.slot_info ? formatDateRange(booking.slot_info.start_at, booking.slot_info.end_at) : '-',
        },
        { label: t('booking.summary.organizer'), value: booking.host_name },
        { label: t('booking.summary.guest'), value: `${booking.guest_name} (${booking.guest_email})` },
        {
            label: t('booking.summary.status'),
            value: (
                <Badge colorScheme={STATUS_COLORS[booking.status] ?? 'gray'} data-testid="booking-status">
                    {t(`booking.bookingStatus.${booking.status}`)}
                </Badge>
            ),
        },
    ];
    if (booking.meeting_url) {
        rows.push({
            label: t('booking.summary.meeting'),
            value: (
                <ChakraLink href={booking.meeting_url} isExternal color="brand.fg" wordBreak="break-all">
                    {booking.meeting_url}
                </ChakraLink>
            ),
        });
    }
    if (booking.guest_message) rows.push({ label: t('booking.summary.message'), value: booking.guest_message });

    return (
        <Card>
            <CardBody>
                <SimpleGrid as="dl" columns={{ base: 1, sm: 3 }} spacingX={4} spacingY={{ base: 1, sm: 3 }}>
                    {rows.map((row) => (
                        <Box key={row.label} display="contents">
                            <Text as="dt" color="text.muted" fontSize="sm" pt={{ base: 2, sm: 0 }}>
                                {row.label}
                            </Text>
                            <Box as="dd" gridColumn={{ sm: 'span 2' }} m={0} whiteSpace="pre-wrap" fontWeight="medium">
                                {row.value}
                            </Box>
                        </Box>
                    ))}
                </SimpleGrid>
            </CardBody>
        </Card>
    );
}

/** "Cancel this booking" button + confirmation, for the guest holding the cancel token */
export function CancelBookingButton({ booking, cancelToken }: { booking: Booking; cancelToken: string }) {
    const { t } = useI18n();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const cancel = async () => {
        setIsCancelling(true);
        try {
            const result = await api.cancelBooking(booking.uuid, cancelToken);
            removeCancelToken(booking.uuid);
            queryClient.setQueryData(bookingQueryKey(booking.uuid), result.booking);
            setIsOpen(false);
            toast({ title: t('booking.cancel.done'), status: 'success', duration: 4000 });
        } catch (err) {
            toast({ title: t('booking.cancel.failed'), description: apiErrorMessage(err, t), status: 'error', duration: 6000 });
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <>
            <Button colorScheme="red" variant="outline" onClick={() => setIsOpen(true)} data-testid="cancel-booking">
                {t('booking.cancel.button')}
            </Button>
            <ConfirmDialog
                isOpen={isOpen}
                title={t('booking.cancel.confirmTitle')}
                body={t('booking.cancel.confirmBody')}
                confirmLabel={t('booking.cancel.button')}
                onConfirm={cancel}
                onClose={() => setIsOpen(false)}
                isLoading={isCancelling}
            />
        </>
    );
}
