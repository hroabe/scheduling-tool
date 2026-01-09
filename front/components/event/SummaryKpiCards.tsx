'use client';

/**
 * SummaryKpiCards - 3 KPI cards for summary view
 * Displays: 回答者数, 最大「○」数, 候補日数
 */

import {
    SimpleGrid,
    Box,
    Text,
    VStack,
    useColorModeValue,
    Icon,
} from '@chakra-ui/react';
import { Users, CheckCircle, Calendar } from 'lucide-react';
import { useI18n } from '@/providers/I18nProvider';
import { getAvailabilitySymbols } from '@/lib/availabilitySymbols';

interface SummaryKpiCardsProps {
    participantCount: number;
    maxOkCount: number;
    candidateCount: number;
}

export function SummaryKpiCards({
    participantCount,
    maxOkCount,
    candidateCount,
}: SummaryKpiCardsProps) {
    const { locale } = useI18n();
    const symbols = getAvailabilitySymbols(locale);

    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.300', 'gray.600');
    const subtitleColor = useColorModeValue('gray.600', 'gray.400');

    const kpis = [
        {
            label: '回答者数',
            value: participantCount,
            icon: Users,
            color: 'blue.500',
        },
        {
            label: `最大「${symbols.yes}」数`,
            value: maxOkCount,
            icon: CheckCircle,
            color: 'green.500',
        },
        {
            label: '候補日数',
            value: candidateCount,
            icon: Calendar,
            color: 'purple.500',
        },
    ];

    return (
        <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
            {kpis.map((kpi) => (
                <Box
                    key={kpi.label}
                    bg={cardBg}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor={borderColor}
                    p={{ base: 4, md: 5 }}
                    boxShadow="sm"
                >
                    <VStack spacing={2}>
                        <Icon as={kpi.icon} color={kpi.color} boxSize={6} />
                        <Text
                            fontSize={{ base: '2xl', md: '3xl' }}
                            fontWeight="bold"
                        >
                            {kpi.value}
                        </Text>
                        <Text fontSize="sm" color={subtitleColor}>
                            {kpi.label}
                        </Text>
                    </VStack>
                </Box>
            ))}
        </SimpleGrid>
    );
}
