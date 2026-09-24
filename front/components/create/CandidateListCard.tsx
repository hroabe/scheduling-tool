'use client';

import { useId } from 'react';
import { Badge, Box, Button, Flex, HStack, Heading, IconButton, Text, VStack } from '@chakra-ui/react';
import { CheckSquare, Square, Trash2 } from 'lucide-react';
import { useI18n } from '@/providers/I18nProvider';
import { CandidateItem } from './CandidateItem';
import type { CandidateDraft } from './candidates';

interface CandidateListCardProps {
    candidates: CandidateDraft[];
    selectedIds: Set<string>;
    onSelectionChange: (id: string, selected: boolean) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onDeleteSelected: () => void;
    onEdit: (id: string, startTime: string, endTime: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
    /** Validation message (e.g. no candidates) */
    error?: string | null;
}

/** Candidate list with select / bulk delete (RFC-0013 §2.6) */
export function CandidateListCard({
    candidates,
    selectedIds,
    onSelectionChange,
    onSelectAll,
    onDeselectAll,
    onDeleteSelected,
    onEdit,
    onDuplicate,
    onDelete,
    error,
}: CandidateListCardProps) {
    const { t } = useI18n();
    const headingId = useId();
    const errorId = useId();
    const selectedCount = candidates.filter((c) => selectedIds.has(c.id)).length;
    const allSelected = candidates.length > 0 && selectedCount === candidates.length;

    return (
        <Box
            as="section"
            aria-labelledby={headingId}
            aria-describedby={error ? errorId : undefined}
            bg="bg.card"
            borderRadius="xl"
            border="1px solid"
            borderColor={error ? 'red.400' : 'border.default'}
            p={{ base: 3, md: 4 }}
        >
            <VStack spacing={3} align="stretch">
                <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                    <HStack spacing={2}>
                        <Heading as="h2" size="sm" id={headingId}>
                            {t('create.candidateList')}
                        </Heading>
                        <Badge colorScheme={candidates.length > 0 ? 'brand' : 'gray'} data-testid="candidate-count">
                            {t('create.candidateCount', { count: candidates.length })}
                        </Badge>
                    </HStack>

                    {candidates.length > 0 && (
                        <HStack spacing={1}>
                            <Button
                                size="xs"
                                variant="ghost"
                                colorScheme="gray"
                                leftIcon={allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                onClick={allSelected ? onDeselectAll : onSelectAll}
                            >
                                {allSelected ? t('create.deselectAll') : t('create.selectAll')}
                            </Button>
                            {selectedCount > 0 && (
                                <IconButton
                                    aria-label={t('create.deleteSelected', { count: selectedCount })}
                                    title={t('create.deleteSelected', { count: selectedCount })}
                                    icon={<Trash2 size={14} />}
                                    size="xs"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={onDeleteSelected}
                                />
                            )}
                        </HStack>
                    )}
                </Flex>

                {selectedCount > 0 && (
                    <Text fontSize="xs" color="text.muted" aria-live="polite">
                        {t('create.selectedCount', { count: selectedCount })}
                    </Text>
                )}

                {error && (
                    <Text id={errorId} fontSize="sm" color="red.500" role="alert">
                        {error}
                    </Text>
                )}

                {candidates.length === 0 ? (
                    <Box py={8} textAlign="center">
                        <Text color="text.muted" fontSize="sm">
                            {t('create.emptyTitle')}
                        </Text>
                        <Text color="text.muted" fontSize="xs" mt={1}>
                            {t('create.emptyHint')}
                        </Text>
                    </Box>
                ) : (
                    <VStack
                        as="ul"
                        spacing={2}
                        align="stretch"
                        listStyleType="none"
                        aria-label={t('create.candidateList')}
                        maxH={{ lg: '60vh' }}
                        overflowY={{ lg: 'auto' }}
                    >
                        {candidates.map((candidate) => (
                            <CandidateItem
                                key={candidate.id}
                                candidate={candidate}
                                isSelected={selectedIds.has(candidate.id)}
                                onSelectionChange={onSelectionChange}
                                onEdit={onEdit}
                                onDuplicate={onDuplicate}
                                onDelete={onDelete}
                            />
                        ))}
                    </VStack>
                )}
            </VStack>
        </Box>
    );
}
