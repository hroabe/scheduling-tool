'use client';

/**
 * ResponseChoiceGroup - ○△× or ✓?x button group for response form
 * Uses locale-aware symbols (ja/ko use ○△×, others use ✓?x)
 */

import { ButtonGroup, Button, useColorModeValue } from '@chakra-ui/react';
import type { AttendanceStatus } from '@/types';
import { useI18n } from '@/providers/I18nProvider';
import { getAvailabilitySymbols } from '@/lib/availabilitySymbols';

interface ResponseChoiceGroupProps {
    value?: AttendanceStatus;
    onChange: (status: AttendanceStatus) => void;
    isDisabled?: boolean;
}

export function ResponseChoiceGroup({
    value,
    onChange,
    isDisabled = false,
}: ResponseChoiceGroupProps) {
    const { locale } = useI18n();
    const symbols = getAvailabilitySymbols(locale);

    const selectedBg = useColorModeValue('blue.500', 'blue.400');
    const selectedColor = 'white';

    const okBg = useColorModeValue('green.100', 'green.800');
    const okSelectedBg = useColorModeValue('green.500', 'green.400');
    const maybeBg = useColorModeValue('yellow.100', 'yellow.700');
    const maybeSelectedBg = useColorModeValue('yellow.500', 'yellow.400');
    const ngBg = useColorModeValue('red.100', 'red.800');
    const ngSelectedBg = useColorModeValue('red.500', 'red.400');

    const choices: { status: AttendanceStatus; symbol: string; bg: string; selectedBg: string }[] = [
        { status: 'ok', symbol: symbols.yes, bg: okBg, selectedBg: okSelectedBg },
        { status: 'maybe', symbol: symbols.maybe, bg: maybeBg, selectedBg: maybeSelectedBg },
        { status: 'ng', symbol: symbols.no, bg: ngBg, selectedBg: ngSelectedBg },
    ];

    return (
        <ButtonGroup isAttached size="md" isDisabled={isDisabled}>
            {choices.map((choice) => {
                const isSelected = value === choice.status;
                return (
                    <Button
                        key={choice.status}
                        onClick={() => onChange(choice.status)}
                        bg={isSelected ? choice.selectedBg : choice.bg}
                        color={isSelected ? selectedColor : undefined}
                        fontWeight="bold"
                        fontSize="lg"
                        minW={{ base: '60px', md: '70px' }}
                        minH={{ base: '44px', md: '40px' }}
                        _hover={{
                            bg: isSelected ? choice.selectedBg : choice.bg,
                            opacity: 0.8,
                        }}
                        borderWidth={isSelected ? 2 : 1}
                        borderColor={isSelected ? choice.selectedBg : 'gray.200'}
                    >
                        {choice.symbol}
                    </Button>
                );
            })}
        </ButtonGroup>
    );
}
