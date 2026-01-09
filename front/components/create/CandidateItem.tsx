'use client';

import React from 'react';
import {
    HStack,
    Text,
    IconButton,
    Button,
    Checkbox,
    useColorModeValue,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    PopoverHeader,
    PopoverCloseButton,
    VStack,
    Select,
    useDisclosure,
} from '@chakra-ui/react';
import { Trash2, Copy, Edit2 } from 'lucide-react';
import { DurationPresetChips } from './DurationPresetChips';

interface CandidateItemProps {
    candidate: {
        start_at: string;
        end_at: string;
    };
    index: number;
    isSelected: boolean;
    onSelectionChange: (index: number, selected: boolean) => void;
    onEdit: (index: number, startTime: string, endTime: string) => void;
    onDuplicate: (index: number) => void;
    onDelete: (index: number) => void;
}

export function CandidateItem({
    candidate,
    index,
    isSelected,
    onSelectionChange,
    onEdit,
    onDuplicate,
    onDelete,
}: CandidateItemProps) {
    const bgColor = useColorModeValue('gray.50', 'gray.700');
    const selectedBgColor = useColorModeValue('brand.50', 'brand.900');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const selectedBorderColor = useColorModeValue('brand.300', 'brand.600');
    const { isOpen, onOpen, onClose } = useDisclosure();

    // Parse candidate times
    const startDate = new Date(candidate.start_at);
    const endDate = new Date(candidate.end_at);
    
    const dateStr = startDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
    });
    
    const startTimeStr = startDate.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    
    const endTimeStr = endDate.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

    // Edit state
    const [editStartHour, setEditStartHour] = React.useState(startDate.getHours());
    const [editStartMinute, setEditStartMinute] = React.useState(startDate.getMinutes());
    const [editDuration, setEditDuration] = React.useState<number | 'custom'>(
        [30, 60, 90, 120].includes(durationMinutes) ? durationMinutes : 'custom'
    );
    const [editCustomDuration, setEditCustomDuration] = React.useState(durationMinutes);

    const handleSaveEdit = () => {
        const duration = editDuration === 'custom' ? editCustomDuration : editDuration;
        const newStart = new Date(startDate);
        newStart.setHours(editStartHour, editStartMinute, 0, 0);
        
        const newEnd = new Date(newStart.getTime() + duration * 60000);
        
        onEdit(index, newStart.toISOString(), newEnd.toISOString());
        onClose();
    };

    const hourOptions = Array.from({ length: 24 }, (_, i) => i);
    const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    return (
        <HStack
            p={3}
            bg={isSelected ? selectedBgColor : bgColor}
            borderRadius="md"
            border="1px solid"
            borderColor={isSelected ? selectedBorderColor : borderColor}
            justify="space-between"
            transition="all 0.2s"
        >
            {/* Checkbox */}
            <Checkbox
                isChecked={isSelected}
                onChange={(e) => onSelectionChange(index, e.target.checked)}
                colorScheme="brand"
                size="md"
            />

            <Text fontSize="sm" fontWeight="medium" flex={1} ml={2}>
                {dateStr} {startTimeStr}–{endTimeStr}（{durationMinutes}分）
            </Text>
            
            <HStack spacing={1}>
                {/* Edit Popover */}
                <Popover isOpen={isOpen} onOpen={onOpen} onClose={onClose} placement="left">
                    <PopoverTrigger>
                        <IconButton
                            aria-label="編集"
                            icon={<Edit2 size={14} />}
                            size="xs"
                            variant="ghost"
                        />
                    </PopoverTrigger>
                    <PopoverContent w="300px">
                        <PopoverHeader fontWeight="semibold" fontSize="sm">
                            候補を編集
                        </PopoverHeader>
                        <PopoverCloseButton />
                        <PopoverBody>
                            <VStack spacing={3} align="stretch">
                                <HStack>
                                    <Text fontSize="sm" w="40px">開始</Text>
                                    <Select
                                        size="sm"
                                        w="70px"
                                        value={editStartHour}
                                        onChange={(e) => setEditStartHour(parseInt(e.target.value))}
                                    >
                                        {hourOptions.map(h => (
                                            <option key={h} value={h}>
                                                {h.toString().padStart(2, '0')}
                                            </option>
                                        ))}
                                    </Select>
                                    <Text>:</Text>
                                    <Select
                                        size="sm"
                                        w="70px"
                                        value={editStartMinute}
                                        onChange={(e) => setEditStartMinute(parseInt(e.target.value))}
                                    >
                                        {minuteOptions.map(m => (
                                            <option key={m} value={m}>
                                                {m.toString().padStart(2, '0')}
                                            </option>
                                        ))}
                                    </Select>
                                </HStack>
                                
                                <VStack align="stretch" spacing={1}>
                                    <Text fontSize="sm">所要時間</Text>
                                    <DurationPresetChips
                                        value={editDuration}
                                        customValue={editCustomDuration}
                                        onChange={setEditDuration}
                                        onCustomChange={setEditCustomDuration}
                                    />
                                </VStack>
                                
                                <HStack justify="flex-end" pt={2}>
                                    <Button size="sm" variant="ghost" onClick={onClose}>
                                        キャンセル
                                    </Button>
                                    <Button size="sm" colorScheme="brand" onClick={handleSaveEdit}>
                                        保存
                                    </Button>
                                </HStack>
                            </VStack>
                        </PopoverBody>
                    </PopoverContent>
                </Popover>
                
                <IconButton
                    aria-label="複製"
                    icon={<Copy size={14} />}
                    size="xs"
                    variant="ghost"
                    onClick={() => onDuplicate(index)}
                />
                
                <IconButton
                    aria-label="削除"
                    icon={<Trash2 size={14} />}
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => onDelete(index)}
                />
            </HStack>
        </HStack>
    );
}
