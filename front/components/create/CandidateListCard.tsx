'use client';

import {
    Box,
    VStack,
    HStack,
    Text,
    Badge,
    Button,
    IconButton,
    useColorModeValue,
} from '@chakra-ui/react';
import { CandidateItem } from './CandidateItem';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckSquare, Square, Trash2 } from 'lucide-react';

const MotionBox = motion(Box);

interface Candidate {
    start_at: string;
    end_at: string;
}

interface CandidateListCardProps {
    candidates: Candidate[];
    selectedIndices: Set<number>;
    onSelectionChange: (index: number, selected: boolean) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onDeleteSelected: () => void;
    onEdit: (index: number, startTime: string, endTime: string) => void;
    onDuplicate: (index: number) => void;
    onDelete: (index: number) => void;
}

export function CandidateListCard({
    candidates,
    selectedIndices,
    onSelectionChange,
    onSelectAll,
    onDeselectAll,
    onDeleteSelected,
    onEdit,
    onDuplicate,
    onDelete,
}: CandidateListCardProps) {
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.400', 'gray.500');

    const selectedCount = selectedIndices.size;
    const allSelected = candidates.length > 0 && selectedCount === candidates.length;
    const someSelected = selectedCount > 0;

    return (
        <Box
            bg={cardBg}
            borderRadius="lg"
            border="1px solid"
            borderColor={borderColor}
            p={4}
            h="full"
        >
            <VStack spacing={4} align="stretch" h="full">
                {/* Header */}
                <HStack justify="space-between" flexWrap="wrap" gap={2}>
                    <HStack spacing={2}>
                        <Text fontSize="md" fontWeight="semibold">
                            候補一覧
                        </Text>
                        <Badge colorScheme={candidates.length > 0 ? 'brand' : 'gray'} fontSize="sm">
                            {candidates.length}件
                        </Badge>
                    </HStack>
                    
                    {/* Batch action buttons */}
                    {candidates.length > 0 && (
                        <HStack spacing={1}>
                            {/* Select all / Deselect all toggle */}
                            <Button
                                size="xs"
                                variant="ghost"
                                leftIcon={allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                onClick={allSelected ? onDeselectAll : onSelectAll}
                                color="gray.600"
                            >
                                {allSelected ? '選択解除' : '全選択'}
                            </Button>
                            
                            {/* Delete selected button */}
                            {someSelected && (
                                <IconButton
                                    aria-label="選択を削除"
                                    icon={<Trash2 size={14} />}
                                    size="xs"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={onDeleteSelected}
                                    title={`${selectedCount}件を削除`}
                                />
                            )}
                        </HStack>
                    )}
                </HStack>

                {/* Selection info */}
                {someSelected && (
                    <Text fontSize="xs" color="gray.500">
                        {selectedCount}件選択中
                    </Text>
                )}

                {/* Empty state or list */}
                {candidates.length === 0 ? (
                    <Box
                        flex={1}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexDirection="column"
                        py={8}
                    >
                        <Text color="gray.500" fontSize="sm" textAlign="center">
                            まだ候補がありません
                        </Text>
                        <Text color="gray.400" fontSize="xs" textAlign="center" mt={1}>
                            日付と時間を選んで「追加」してください
                        </Text>
                    </Box>
                ) : (
                    <VStack spacing={2} align="stretch" flex={1} overflowY="auto">
                        <AnimatePresence>
                            {candidates.map((candidate, index) => (
                                <MotionBox
                                    key={`${candidate.start_at}-${index}`}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <CandidateItem
                                        candidate={candidate}
                                        index={index}
                                        isSelected={selectedIndices.has(index)}
                                        onSelectionChange={onSelectionChange}
                                        onEdit={onEdit}
                                        onDuplicate={onDuplicate}
                                        onDelete={onDelete}
                                    />
                                </MotionBox>
                            ))}
                        </AnimatePresence>
                    </VStack>
                )}
            </VStack>
        </Box>
    );
}
