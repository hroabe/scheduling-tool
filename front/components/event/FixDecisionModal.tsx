'use client';

/**
 * FixDecisionModal - confirmation before the organizer finalizes a candidate
 */

import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    HStack,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    VStack,
} from '@chakra-ui/react';
import { Calendar, Check } from 'lucide-react';
import { useAvailabilitySymbols } from '@/lib/availabilitySymbols';
import { formatDate, formatTime } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import type { CandidateSummary } from '@/types';

interface FixDecisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    candidate: CandidateSummary | null;
    onConfirm: () => void;
    isLoading?: boolean;
    allowMaybe?: boolean;
}

export function FixDecisionModal({ isOpen, onClose, candidate, onConfirm, isLoading = false, allowMaybe = true }: FixDecisionModalProps) {
    const { t } = useI18n();
    const symbols = useAvailabilitySymbols();

    if (!candidate) return null;

    const breakdown = [
        { key: 'ok', symbol: symbols.yes, count: candidate.ok_count, color: 'green' },
        ...(allowMaybe || candidate.maybe_count > 0
            ? [{ key: 'maybe', symbol: symbols.maybe, count: candidate.maybe_count, color: 'yellow' }]
            : []),
        { key: 'ng', symbol: symbols.no, count: candidate.ng_count, color: 'red' },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay />
            <ModalContent mx={4} data-testid="fix-decision-modal">
                <ModalHeader>
                    <HStack>
                        <Calendar size={20} aria-hidden />
                        <Text>{t('event.fix.title')}</Text>
                    </HStack>
                </ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <Box bg="brand.subtle" p={4} borderRadius="lg" textAlign="center">
                            <Text fontSize="xl" fontWeight="bold">
                                {formatDate(candidate.start_at, t('event.format.dayLong'))}
                            </Text>
                            <Text color="text.muted">
                                {formatTime(candidate.start_at)} - {formatTime(candidate.end_at)}
                            </Text>
                        </Box>

                        <Box>
                            <Text fontSize="sm" color="text.muted" mb={2}>
                                {t('event.fix.breakdown')}
                            </Text>
                            <HStack justify="center" spacing={4}>
                                {breakdown.map((item) => (
                                    <Badge
                                        key={item.key}
                                        colorScheme={item.color}
                                        px={3}
                                        py={1}
                                        aria-label={t('response.table.countLabel', {
                                            status: t(`response.status.${item.key}`),
                                            count: item.count,
                                        })}
                                    >
                                        {item.symbol} {item.count}
                                    </Badge>
                                ))}
                            </HStack>
                        </Box>

                        <Alert status="warning" borderRadius="md" fontSize="sm">
                            <AlertIcon />
                            {t('event.fix.warning')}
                        </Alert>
                    </VStack>
                </ModalBody>

                <ModalFooter gap={3}>
                    <Button variant="ghost" colorScheme="gray" onClick={onClose} isDisabled={isLoading}>
                        {t('common.cancel')}
                    </Button>
                    <Button colorScheme="green" leftIcon={<Check size={18} />} onClick={onConfirm} isLoading={isLoading}>
                        {t('event.fix.confirm')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
