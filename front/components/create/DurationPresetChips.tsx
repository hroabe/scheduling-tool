'use client';

import { HStack, Button, Input, Text, useColorModeValue } from '@chakra-ui/react';

interface DurationPresetChipsProps {
    value: number | 'custom';
    customValue: number;
    onChange: (preset: number | 'custom') => void;
    onCustomChange: (minutes: number) => void;
}

const PRESETS = [30, 60, 90, 120];

export function DurationPresetChips({
    value,
    customValue,
    onChange,
    onCustomChange,
}: DurationPresetChipsProps) {
    const activeBg = useColorModeValue('brand.500', 'brand.400');
    const inactiveBg = useColorModeValue('gray.100', 'gray.600');
    const activeColor = 'white';
    const inactiveColor = useColorModeValue('gray.700', 'gray.200');

    return (
        <HStack spacing={2} flexWrap="wrap">
            {PRESETS.map((minutes) => (
                <Button
                    key={minutes}
                    size="sm"
                    bg={value === minutes ? activeBg : inactiveBg}
                    color={value === minutes ? activeColor : inactiveColor}
                    onClick={() => onChange(minutes)}
                    _hover={{
                        bg: value === minutes ? activeBg : 'gray.200',
                    }}
                    fontWeight={value === minutes ? 'bold' : 'normal'}
                    minW="60px"
                >
                    {minutes}分
                </Button>
            ))}
            <Button
                size="sm"
                bg={value === 'custom' ? activeBg : inactiveBg}
                color={value === 'custom' ? activeColor : inactiveColor}
                onClick={() => onChange('custom')}
                _hover={{
                    bg: value === 'custom' ? activeBg : 'gray.200',
                }}
                fontWeight={value === 'custom' ? 'bold' : 'normal'}
            >
                カスタム
            </Button>
            {value === 'custom' && (
                <HStack spacing={1}>
                    <Input
                        type="number"
                        size="sm"
                        w="70px"
                        value={customValue}
                        onChange={(e) => onCustomChange(parseInt(e.target.value) || 0)}
                        min={1}
                        max={480}
                    />
                    <Text fontSize="sm" color="gray.500">分</Text>
                </HStack>
            )}
        </HStack>
    );
}
