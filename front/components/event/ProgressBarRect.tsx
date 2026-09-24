'use client';

/**
 * ProgressBarRect - rectangular (not pill-shaped) progress bar
 */

import { Box, type BoxProps } from '@chakra-ui/react';

interface ProgressBarRectProps extends BoxProps {
    value: number;
    max?: number;
    trackColor?: string;
    fillColor?: string;
    height?: string | number;
}

export function ProgressBarRect({
    value,
    max = 100,
    trackColor = 'border.default',
    fillColor = 'brand.500',
    height = '6px',
    ...props
}: ProgressBarRectProps) {
    const percentage = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;

    return (
        <Box bg={trackColor} borderRadius="2px" overflow="hidden" height={height} w="100%" aria-hidden {...props}>
            <Box bg={fillColor} height="100%" width={`${percentage}%`} borderRadius="2px" transition="width 0.3s ease" />
        </Box>
    );
}
