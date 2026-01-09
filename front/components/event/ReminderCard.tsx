'use client';

/**
 * ReminderCard - Card for reminding non-respondents
 * Displayed at bottom of Event Status tab
 */

import {
    Box,
    VStack,
    Heading,
    Text,
    Button,
    useColorModeValue,
    Icon,
} from '@chakra-ui/react';
import { Bell, Send } from 'lucide-react';

interface ReminderCardProps {
    onRemind?: () => void;
    isLoading?: boolean;
    pendingCount?: number;
}

export function ReminderCard({
    onRemind,
    isLoading = false,
    pendingCount,
}: ReminderCardProps) {
    const cardBg = useColorModeValue('blue.50', 'blue.900');
    const borderColor = useColorModeValue('blue.200', 'blue.700');
    const textColor = useColorModeValue('blue.800', 'blue.100');

    return (
        <Box
            bg={cardBg}
            borderRadius="xl"
            border="1px solid"
            borderColor={borderColor}
            p={{ base: 4, md: 5 }}
            mt={6}
        >
            <VStack spacing={3} align="start">
                <Heading size="sm" color={textColor}>
                    <Icon as={Bell} mr={2} />
                    未回答の人にリマインド
                </Heading>
                <Text fontSize="sm" color={textColor}>
                    {pendingCount !== undefined
                        ? `${pendingCount}人が未回答です。リンクを再送して回答を促せます。`
                        : 'リンクを再送して回答を促せます。'}
                </Text>
                <Button
                    colorScheme="blue"
                    size="sm"
                    leftIcon={<Send size={14} />}
                    onClick={onRemind}
                    isLoading={isLoading}
                >
                    リマインド
                </Button>
            </VStack>
        </Box>
    );
}
