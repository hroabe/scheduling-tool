'use client';

import {
    Box,
    VStack,
    HStack,
    Text,
    Select,
    Button,
    FormControl,
    FormLabel,
    useColorModeValue,
} from '@chakra-ui/react';
import { Plus } from 'lucide-react';
import { DateMultiSelectCalendar } from './DateMultiSelectCalendar';
import { DurationPresetChips } from './DurationPresetChips';
import { BuilderOptionsDisclosure } from './BuilderOptionsDisclosure';

interface CandidateBuilderCardProps {
    // Multi-date selection
    selectedDates: string[];
    onSelectDates: (dates: string[]) => void;
    currentMonth: Date;
    onChangeMonth: (date: Date) => void;
    
    // Time settings
    startHour: number;
    startMinute: number;
    onStartTimeChange: (hour: number, minute: number) => void;
    
    // Duration
    durationPreset: number | 'custom';
    customDuration: number;
    onDurationPresetChange: (preset: number | 'custom') => void;
    onCustomDurationChange: (minutes: number) => void;
    
    // Calculated end time
    calculatedEndTimeStr: string;
    
    // Options
    useDirectEndTime: boolean;
    onUseDirectEndTimeChange: (value: boolean) => void;
    endHour: number;
    endMinute: number;
    onEndTimeChange: (hour: number, minute: number) => void;
    minuteStep: 5 | 1;
    onMinuteStepChange: (step: 5 | 1) => void;
    onNudge: (minutes: number) => void;
    
    // Add action
    onAddCandidates: () => void;
    
    // Mode
    isSimpleMode: boolean;
}

export function CandidateBuilderCard({
    selectedDates,
    onSelectDates,
    currentMonth,
    onChangeMonth,
    startHour,
    startMinute,
    onStartTimeChange,
    durationPreset,
    customDuration,
    onDurationPresetChange,
    onCustomDurationChange,
    calculatedEndTimeStr,
    useDirectEndTime,
    onUseDirectEndTimeChange,
    endHour,
    endMinute,
    onEndTimeChange,
    minuteStep,
    onMinuteStepChange,
    onNudge,
    onAddCandidates,
    isSimpleMode,
}: CandidateBuilderCardProps) {
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.400', 'gray.500');
    const inputBorderColor = useColorModeValue('gray.300', 'gray.500');

    const hourOptions = Array.from({ length: 24 }, (_, i) => i);
    const getMinuteOptions = () => {
        if (minuteStep === 1) {
            return Array.from({ length: 60 }, (_, i) => i);
        }
        return [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    };

    const canAdd = selectedDates.length > 0;

    return (
        <Box
            bg={cardBg}
            borderRadius="lg"
            border="1px solid"
            borderColor={borderColor}
            p={3}
        >
            <VStack spacing={2} align="stretch">
                {!isSimpleMode && (
                    <Text fontSize="sm" fontWeight="semibold">
                        候補日を追加
                    </Text>
                )}

                {/* Calendar */}
                <Box>
                    {!isSimpleMode && (
                        <Text fontSize="xs" color="gray.600" mb={1}>
                            日付（複数選択OK）
                        </Text>
                    )}
                    <DateMultiSelectCalendar
                        selectedDates={selectedDates}
                        onSelectDates={onSelectDates}
                        currentMonth={currentMonth}
                        onChangeMonth={onChangeMonth}
                    />
                </Box>

                {/* Time section */}
                <Box>
                    {!isSimpleMode && (
                        <Text fontSize="xs" color="gray.600" mb={1}>
                            時間
                        </Text>
                    )}
                    
                    <VStack spacing={2} align="stretch">
                        {/* Start time */}
                        <HStack>
                            <FormControl flex={1}>
                                <FormLabel fontSize="xs" mb={0.5}>開始</FormLabel>
                                <HStack spacing={1}>
                                    <Select
                                        size="sm"
                                        w="65px"
                                        value={startHour}
                                        onChange={(e) => onStartTimeChange(parseInt(e.target.value), startMinute)}
                                        borderColor={inputBorderColor}
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
                                        w="65px"
                                        value={startMinute}
                                        onChange={(e) => onStartTimeChange(startHour, parseInt(e.target.value))}
                                        borderColor={inputBorderColor}
                                    >
                                        {getMinuteOptions().map(m => (
                                            <option key={m} value={m}>
                                                {m.toString().padStart(2, '0')}
                                            </option>
                                        ))}
                                    </Select>
                                </HStack>
                            </FormControl>

                            {/* End time preview */}
                            <FormControl flex={1}>
                                <FormLabel fontSize="xs" mb={0.5}>終了</FormLabel>
                                <Text fontSize="md" fontWeight="medium" color="gray.600">
                                    {calculatedEndTimeStr}
                                </Text>
                            </FormControl>
                        </HStack>

                        {/* Duration presets */}
                        <Box>
                            <Text fontSize="xs" color="gray.600" mb={0.5}>所要時間</Text>
                            <DurationPresetChips
                                value={durationPreset}
                                customValue={customDuration}
                                onChange={onDurationPresetChange}
                                onCustomChange={onCustomDurationChange}
                            />
                        </Box>
                    </VStack>
                </Box>

                {/* Add button */}
                <Button
                    leftIcon={<Plus size={18} />}
                    colorScheme="brand"
                    onClick={onAddCandidates}
                    isDisabled={!canAdd}
                    w="full"
                >
                    {selectedDates.length > 1
                        ? `選択した${selectedDates.length}日を追加`
                        : '追加'}
                </Button>

                {/* Options (collapsed in both modes) */}
                <BuilderOptionsDisclosure
                    useDirectEndTime={useDirectEndTime}
                    onUseDirectEndTimeChange={onUseDirectEndTimeChange}
                    endTimeHour={endHour}
                    endTimeMinute={endMinute}
                    onEndTimeChange={onEndTimeChange}
                    minuteStep={minuteStep}
                    onMinuteStepChange={onMinuteStepChange}
                    onNudge={onNudge}
                    hourOptions={hourOptions}
                    getMinuteOptions={getMinuteOptions}
                />
            </VStack>
        </Box>
    );
}
