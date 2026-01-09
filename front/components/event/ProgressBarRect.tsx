'use client';

/**
 * ProgressBarRect - Rectangular progress bar (not pill-shaped)
 * Used for response progress in event cards
 */

import { Box, type BoxProps } from '@chakra-ui/react';

interface ProgressBarRectProps extends BoxProps {
    value: number; // 0-100
    max?: number;
    trackColor?: string;
    fillColor?: string;
    height?: string | number;
}

export function ProgressBarRect({
    value,
    max = 100,
    trackColor = 'gray.200',
    fillColor = 'blue.500',
    height = '6px',
    ...props
}: ProgressBarRectProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
        <Box
            bg={trackColor}
            borderRadius="2px"
            overflow="hidden"
            height={height}
            w="100%"
            {...props}
        >
            <Box
                bg={fillColor}
                height="100%"
                width={`${percentage}%`}
                borderRadius="2px"
                transition="width 0.3s ease"
            />
        </Box>
    );
}
