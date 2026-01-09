'use client';

import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    Button,
    VStack,
    HStack,
    Text,
    Box,
    Badge,
    useColorModeValue,
} from '@chakra-ui/react';
import { Calendar, Check, AlertCircle } from 'lucide-react';
import type { CandidateSummary } from '@/types';
import { formatDate, formatTime } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import { getAvailabilitySymbols } from '@/lib/availabilitySymbols';

interface FixDecisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    candidate: CandidateSummary | null;
    onConfirm: () => void;
    isLoading?: boolean;
}

export function FixDecisionModal({
    isOpen,
    onClose,
    candidate,
    onConfirm,
    isLoading = false,
}: FixDecisionModalProps) {
    const { locale } = useI18n();
    const symbols = getAvailabilitySymbols(locale);
    const bgColor = useColorModeValue('white', 'gray.800');
    const dateBg = useColorModeValue('blue.50', 'blue.900');

    if (!candidate) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay bg="blackAlpha.600" />
            <ModalContent bg={bgColor} mx={4}>
                <ModalHeader>
                    <HStack>
                        <Calendar size={20} />
                        <Text>この日時で確定しますか？</Text>
                    </HStack>
                </ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        {/* Selected date/time */}
                        <Box
                            bg={dateBg}
                            p={4}
                            borderRadius="lg"
                            textAlign="center"
                        >
                            <Text fontSize="xl" fontWeight="bold">
                                {formatDate(candidate.start_at, 'M月d日')}（{formatDate(candidate.start_at, 'E')}）
                            </Text>
                            <Text color="gray.600">
                                {formatTime(candidate.start_at)} - {formatTime(candidate.end_at)}
                            </Text>
                        </Box>

                        {/* Response breakdown */}
                        <Box>
                            <Text fontSize="sm" color="gray.500" mb={2}>
                                回答内訳
                            </Text>
                            <HStack justify="center" spacing={4}>
                                <Badge colorScheme="green" px={3} py={1}>
                                    {symbols.yes} {candidate.ok_count}
                                </Badge>
                                <Badge colorScheme="yellow" px={3} py={1}>
                                    {symbols.maybe} {candidate.maybe_count}
                                </Badge>
                                <Badge colorScheme="red" px={3} py={1}>
                                    {symbols.no} {candidate.ng_count}
                                </Badge>
                            </HStack>
                        </Box>

                        {/* Warning */}
                        <HStack
                            bg="orange.50"
                            color="orange.700"
                            p={3}
                            borderRadius="md"
                            fontSize="sm"
                        >
                            <AlertCircle size={16} />
                            <Text>確定後は回答を受け付けません</Text>
                        </HStack>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <HStack spacing={3}>
                        <Button variant="ghost" onClick={onClose} isDisabled={isLoading}>
                            キャンセル
                        </Button>
                        <Button
                            colorScheme="brand"
                            leftIcon={<Check size={18} />}
                            onClick={onConfirm}
                            isLoading={isLoading}
                        >
                            確定する
                        </Button>
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
