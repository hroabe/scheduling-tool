'use client';

import { useMemo, useCallback } from 'react';
import {
    Box,
    Grid,
    Text,
    Button,
    VStack,
    HStack,
    IconButton,
    useColorModeValue,
    Badge,
} from '@chakra-ui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateMultiSelectCalendarProps {
    selectedDates: string[]; // YYYY-MM-DD format array
    onSelectDates: (dates: string[]) => void;
    currentMonth: Date;
    onChangeMonth: (date: Date) => void;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function DateMultiSelectCalendar({
    selectedDates,
    onSelectDates,
    currentMonth,
    onChangeMonth,
}: DateMultiSelectCalendarProps) {
    const bgColor = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.400', 'gray.500');
    const todayBg = useColorModeValue('blue.50', 'blue.900');
    const selectedBg = useColorModeValue('brand.500', 'brand.400');
    const weekendColor = useColorModeValue('red.500', 'red.300');
    const saturdayColor = useColorModeValue('blue.500', 'blue.300');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const { days, year, month } = useMemo(() => {
        const y = currentMonth.getFullYear();
        const m = currentMonth.getMonth();
        
        // First day of month
        const firstDay = new Date(y, m, 1);
        const startDayOfWeek = firstDay.getDay();
        
        // Last day of month
        const lastDay = new Date(y, m + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        // Build calendar grid
        const result: (number | null)[] = [];
        
        // Empty cells before first day
        for (let i = 0; i < startDayOfWeek; i++) {
            result.push(null);
        }
        
        // Days of month
        for (let d = 1; d <= daysInMonth; d++) {
            result.push(d);
        }
        
        return { days: result, year: y, month: m };
    }, [currentMonth]);

    const handlePrevMonth = () => {
        onChangeMonth(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        onChangeMonth(new Date(year, month + 1, 1));
    };

    const formatDateStr = (day: number): string => {
        const m = (month + 1).toString().padStart(2, '0');
        const d = day.toString().padStart(2, '0');
        return `${year}-${m}-${d}`;
    };

    const toggleDate = useCallback((dateStr: string) => {
        if (selectedDates.includes(dateStr)) {
            onSelectDates(selectedDates.filter(d => d !== dateStr));
        } else {
            onSelectDates([...selectedDates, dateStr].sort());
        }
    }, [selectedDates, onSelectDates]);

    const handleDateClick = useCallback((day: number, event: React.MouseEvent) => {
        const dateStr = formatDateStr(day);
        
        // Shift+click for range selection
        if (event.shiftKey && selectedDates.length > 0) {
            const lastSelected = selectedDates[selectedDates.length - 1];
            const lastDate = new Date(lastSelected);
            const clickedDate = new Date(dateStr);
            
            const startDate = lastDate < clickedDate ? lastDate : clickedDate;
            const endDate = lastDate < clickedDate ? clickedDate : lastDate;
            
            const rangeDates: string[] = [];
            const current = new Date(startDate);
            while (current <= endDate) {
                rangeDates.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
            
            // Merge with existing, avoiding duplicates
            const merged = [...new Set([...selectedDates, ...rangeDates])].sort();
            onSelectDates(merged);
        } else {
            toggleDate(dateStr);
        }
    }, [selectedDates, onSelectDates, formatDateStr, toggleDate]);

    return (
        <Box
            bg={bgColor}
            borderRadius="md"
            border="1px solid"
            borderColor={borderColor}
            p={3}
            h="100%"
        >
            <VStack spacing={2} h="full">
                {/* Header */}
                <HStack justify="space-between" w="full">
                    <IconButton
                        aria-label="前月"
                        icon={<ChevronLeft size={14} />}
                        size="xs"
                        variant="ghost"
                        onClick={handlePrevMonth}
                    />
                    <HStack spacing={1}>
                        <Text fontSize="sm" fontWeight="bold">
                            {year}年{month + 1}月
                        </Text>
                        {selectedDates.length > 0 && (
                            <Badge colorScheme="brand" fontSize="2xs">
                                {selectedDates.length}日
                            </Badge>
                        )}
                    </HStack>
                    <IconButton
                        aria-label="次月"
                        icon={<ChevronRight size={14} />}
                        size="xs"
                        variant="ghost"
                        onClick={handleNextMonth}
                    />
                </HStack>

                <Grid templateColumns="repeat(7, 1fr)" gap={0} w="full">
                    {WEEKDAYS.map((day, i) => (
                        <Text
                            key={day}
                            fontSize="xs"
                            textAlign="center"
                            fontWeight="bold"
                            color={i === 0 ? weekendColor : i === 6 ? saturdayColor : 'gray.500'}
                            py={0.5}
                        >
                            {day}
                        </Text>
                    ))}
                </Grid>

                {/* Calendar grid */}
                <Grid templateColumns="repeat(7, 1fr)" gap={0} w="full" flex={1}>
                    {days.map((day, index) => {
                        if (day === null) {
                            return <Box key={`empty-${index}`} h={7} />;
                        }

                        const dateStr = formatDateStr(day);
                        const isSelected = selectedDates.includes(dateStr);
                        const isToday = dateStr === todayStr;
                        const dayOfWeek = index % 7;
                        const isSunday = dayOfWeek === 0;
                        const isSaturday = dayOfWeek === 6;

                        return (
                            <Button
                                key={day}
                                size="xs"
                                variant={isSelected ? 'solid' : 'ghost'}
                                colorScheme={isSelected ? 'brand' : undefined}
                                bg={isSelected ? selectedBg : isToday ? todayBg : 'transparent'}
                                color={
                                    isSelected
                                        ? 'white'
                                        : isSunday
                                        ? weekendColor
                                        : isSaturday
                                        ? saturdayColor
                                        : undefined
                                }
                                h={7}
                                minW={7}
                                p={0}
                                fontSize="xs"
                                fontWeight={isToday ? 'bold' : 'normal'}
                                onClick={(e) => handleDateClick(day, e)}
                                _hover={{
                                    bg: isSelected ? selectedBg : 'gray.100',
                                }}
                            >
                                {day}
                            </Button>
                        );
                    })}
                </Grid>

                <Text fontSize="2xs" color="gray.500" textAlign="center">
                    複数選択OK（Shift+クリックで範囲）
                </Text>
            </VStack>
        </Box>
    );
}
