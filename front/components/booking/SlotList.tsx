'use client';

import { Badge, Box, Flex, HStack, IconButton, Text, VStack } from '@chakra-ui/react';
import { CalendarDays, X } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import { groupByDay } from './slotUtils';

export interface SlotListItem {
    key: string;
    start_at: string;
    end_at: string;
    booked?: boolean;
}

interface SlotListProps {
    slots: SlotListItem[];
    onRemove?: (key: string) => void;
    removingKey?: string | null;
}

/** Slots grouped by day, each removable unless already booked */
export function SlotList({ slots, onRemove, removingKey }: SlotListProps) {
    const { t } = useI18n();

    if (slots.length === 0) {
        return (
            <VStack py={8} spacing={3} color="text.muted" textAlign="center" data-testid="slot-list-empty">
                <CalendarDays size={36} aria-hidden />
                <Text fontSize="sm">{t('booking.slots.empty')}</Text>
            </VStack>
        );
    }

    return (
        <VStack align="stretch" spacing={4} data-testid="slot-list">
            {groupByDay(slots, (slot) => slot.start_at).map((group) => (
                <Box key={group.dayKey}>
                    <Text as="h3" fontWeight="bold" fontSize="sm" color="text.muted" mb={2}>
                        {formatDate(group.date, 'yyyy/MM/dd (E)')}
                    </Text>
                    <Flex as="ul" wrap="wrap" gap={2} listStyleType="none" m={0}>
                        {group.items.map((slot) => {
                            const label = `${formatTime(slot.start_at)} - ${formatTime(slot.end_at)}`;
                            return (
                                <HStack
                                    as="li"
                                    key={slot.key}
                                    spacing={1}
                                    pl={3}
                                    pr={onRemove && !slot.booked ? 1 : 3}
                                    py={1}
                                    borderRadius="md"
                                    bg={slot.booked ? 'bg.subtle' : 'brand.subtle'}
                                    border="1px solid"
                                    borderColor="border.default"
                                    data-testid="slot-item"
                                >
                                    <Text fontSize="sm" fontWeight="medium">
                                        {label}
                                    </Text>
                                    {slot.booked && (
                                        <Badge colorScheme="green" fontSize="2xs">
                                            {t('booking.slots.booked')}
                                        </Badge>
                                    )}
                                    {onRemove && !slot.booked && (
                                        <IconButton
                                            aria-label={t('booking.slots.remove', {
                                                slot: `${formatDate(group.date, 'M/d')} ${label}`,
                                            })}
                                            icon={<X size={14} />}
                                            size="xs"
                                            variant="ghost"
                                            colorScheme="red"
                                            onClick={() => onRemove(slot.key)}
                                            isLoading={removingKey === slot.key}
                                        />
                                    )}
                                </HStack>
                            );
                        })}
                    </Flex>
                </Box>
            ))}
        </VStack>
    );
}
