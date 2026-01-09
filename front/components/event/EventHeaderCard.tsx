'use client';

/**
 * EventHeaderCard - Common header for event detail pages
 * Displays: event name, status, meta info, and action buttons
 */

import {
    Box,
    Flex,
    Heading,
    Text,
    HStack,
    VStack,
    Button,
    IconButton,
    Tooltip,
    useClipboard,
    useColorModeValue,
    Icon,
} from '@chakra-ui/react';
import { Share2, Copy, Check, Download, Users, Calendar, Clock } from 'lucide-react';
import { StatusPill, getEventStatus } from './StatusPill';
import { formatDateTime, formatRelative } from '@/lib/date';
import type { Schedule } from '@/types';

interface EventHeaderCardProps {
    schedule: Schedule;
    shareUrl: string;
    onExportCsv?: () => void;
    isExporting?: boolean;
}

export function EventHeaderCard({
    schedule,
    shareUrl,
    onExportCsv,
    isExporting,
}: EventHeaderCardProps) {
    const { hasCopied, onCopy } = useClipboard(shareUrl);
    const canShare = typeof navigator !== 'undefined' && !!navigator.share;

    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.300', 'gray.600');
    const metaColor = useColorModeValue('gray.600', 'gray.400');

    const handleShare = async () => {
        if (canShare) {
            try {
                await navigator.share({
                    title: schedule.name,
                    text: `${schedule.name} - 日程調整に回答してください`,
                    url: shareUrl,
                });
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    onCopy();
                }
            }
        } else {
            onCopy();
        }
    };

    const status = getEventStatus(schedule);

    return (
        <Box
            bg={cardBg}
            borderRadius="xl"
            border="1px solid"
            borderColor={borderColor}
            p={{ base: 4, md: 6 }}
            boxShadow="sm"
        >
            <Flex
                direction={{ base: 'column', md: 'row' }}
                justify="space-between"
                align={{ base: 'stretch', md: 'start' }}
                gap={4}
            >
                {/* Left side: Event info */}
                <VStack align="start" spacing={3} flex="1">
                    <HStack spacing={3} flexWrap="wrap">
                        <Heading size={{ base: 'md', md: 'lg' }} noOfLines={2}>
                            {schedule.name}
                        </Heading>
                        <StatusPill status={status} />
                    </HStack>

                    {schedule.description && (
                        <Text color={metaColor} fontSize="sm">
                            {schedule.description}
                        </Text>
                    )}

                    {/* Meta info */}
                    <HStack
                        spacing={{ base: 3, md: 6 }}
                        flexWrap="wrap"
                        color={metaColor}
                        fontSize="sm"
                    >
                        <HStack spacing={1}>
                            <Icon as={Users} boxSize={4} />
                            <Text>主催: {schedule.owner_name}</Text>
                        </HStack>
                        <HStack spacing={1}>
                            <Icon as={Calendar} boxSize={4} />
                            <Text>候補: {schedule.candidates.length}件</Text>
                        </HStack>
                        <HStack spacing={1}>
                            <Icon as={Users} boxSize={4} />
                            <Text>回答: {schedule.participants.length}名</Text>
                        </HStack>
                        <HStack spacing={1}>
                            <Icon as={Clock} boxSize={4} />
                            <Text>作成: {formatRelative(schedule.created_at)}</Text>
                        </HStack>
                    </HStack>
                </VStack>

                {/* Right side: Actions */}
                <HStack spacing={2} flexShrink={0}>
                    <Tooltip label={canShare ? '共有' : hasCopied ? 'コピーしました' : 'URLをコピー'}>
                        <Button
                            leftIcon={
                                canShare ? (
                                    <Share2 size={16} />
                                ) : hasCopied ? (
                                    <Check size={16} />
                                ) : (
                                    <Copy size={16} />
                                )
                            }
                            variant="outline"
                            size="sm"
                            onClick={handleShare}
                        >
                            {canShare ? '共有' : hasCopied ? 'コピー済み' : 'URLをコピー'}
                        </Button>
                    </Tooltip>
                    {onExportCsv && (
                        <Tooltip label="CSVでダウンロード">
                            <IconButton
                                aria-label="CSV出力"
                                icon={<Download size={16} />}
                                variant="outline"
                                size="sm"
                                onClick={onExportCsv}
                                isLoading={isExporting}
                            />
                        </Tooltip>
                    )}
                </HStack>
            </Flex>
        </Box>
    );
}
