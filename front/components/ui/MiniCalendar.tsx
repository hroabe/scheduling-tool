'use client';

import { useMemo } from 'react';
import {
    Box,
    Grid,
    Text,
    Button,
    VStack,
    HStack,
    IconButton,
    useColorModeValue,
} from '@chakra-ui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniCalendarProps {
    selectedDate: string; // YYYY-MM-DD format
    onSelectDate: (date: string) => void;
    currentMonth: Date;
    onChangeMonth: (date: Date) => void;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function MiniCalendar({
    selectedDate,
    onSelectDate,
    currentMonth,
    onChangeMonth,
}: MiniCalendarProps) {
    const bgColor = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
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

    return (
        <Box
            bg={bgColor}
            borderRadius="lg"
            border="1px solid"
            borderColor={useColorModeValue('gray.400', 'gray.500')}
            p={4}
            h="100%"
        >
            <VStack spacing={3} h="full">
                {/* Header */}
                <HStack justify="space-between" w="full">
                    <IconButton
                        aria-label="前月"
                        icon={<ChevronLeft size={18} />}
                        size="sm"
                        variant="ghost"
                        onClick={handlePrevMonth}
                    />
                    <Text fontSize="md" fontWeight="bold">
                        {year}年{month + 1}月
                    </Text>
                    <IconButton
                        aria-label="次月"
                        icon={<ChevronRight size={18} />}
                        size="sm"
                        variant="ghost"
                        onClick={handleNextMonth}
                    />
                </HStack>

                {/* Weekday headers */}
                <Grid templateColumns="repeat(7, 1fr)" gap={1} w="full">
                    {WEEKDAYS.map((day, i) => (
                        <Text
                            key={day}
                            fontSize="sm"
                            textAlign="center"
                            fontWeight="bold"
                            color={i === 0 ? weekendColor : i === 6 ? saturdayColor : 'gray.500'}
                            py={1}
                        >
                            {day}
                        </Text>
                    ))}
                </Grid>

                {/* Calendar grid */}
                <Grid templateColumns="repeat(7, 1fr)" gap={1} w="full" flex={1}>
                    {days.map((day, index) => {
                        if (day === null) {
                            return <Box key={`empty-${index}`} h={9} />;
                        }

                        const dateStr = formatDateStr(day);
                        const isSelected = dateStr === selectedDate;
                        const isToday = dateStr === todayStr;
                        const dayOfWeek = index % 7;
                        const isSunday = dayOfWeek === 0;
                        const isSaturday = dayOfWeek === 6;

                        return (
                            <Button
                                key={day}
                                size="sm"
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
                                h={9}
                                minW={9}
                                p={0}
                                fontWeight={isToday ? 'bold' : 'normal'}
                                onClick={() => onSelectDate(dateStr)}
                                _hover={{
                                    bg: isSelected ? selectedBg : 'gray.100',
                                }}
                            >
                                {day}
                            </Button>
                        );
                    })}
                </Grid>
            </VStack>
        </Box>
    );
}
