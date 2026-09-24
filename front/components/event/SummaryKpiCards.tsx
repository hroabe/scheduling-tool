'use client';

/**
 * SummaryKpiCards - respondents / best "yes" count / number of candidates
 */

import { Box, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { CalendarDays, CheckCircle2, Users } from 'lucide-react';
import { useAvailabilitySymbols } from '@/lib/availabilitySymbols';
import { useI18n } from '@/providers/I18nProvider';

interface SummaryKpiCardsProps {
    participantCount: number;
    maxOkCount: number;
    candidateCount: number;
}

export function SummaryKpiCards({ participantCount, maxOkCount, candidateCount }: SummaryKpiCardsProps) {
    const { t } = useI18n();
    const symbols = useAvailabilitySymbols();

    const kpis = [
        { id: 'participants', label: t('event.summary.kpi.participants'), value: participantCount, icon: Users, color: 'blue' },
        { id: 'maxOk', label: t('event.summary.kpi.maxOk', { symbol: symbols.yes }), value: maxOkCount, icon: CheckCircle2, color: 'green' },
        { id: 'candidates', label: t('event.summary.kpi.candidates'), value: candidateCount, icon: CalendarDays, color: 'purple' },
    ];

    return (
        <SimpleGrid columns={{ base: 3 }} spacing={{ base: 2, md: 4 }}>
            {kpis.map((kpi) => (
                <Box
                    key={kpi.id}
                    bg="bg.card"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="border.default"
                    p={{ base: 3, md: 5 }}
                    boxShadow="sm"
                    data-testid={`kpi-${kpi.id}`}
                >
                    <VStack spacing={1}>
                        <Icon
                            as={kpi.icon}
                            color={`${kpi.color}.500`}
                            _dark={{ color: `${kpi.color}.300` }}
                            boxSize={{ base: 5, md: 6 }}
                            aria-hidden
                        />
                        <Text fontSize={{ base: 'xl', md: '3xl' }} fontWeight="bold" lineHeight={1.2}>
                            {kpi.value}
                        </Text>
                        <Text fontSize={{ base: 'xs', md: 'sm' }} color="text.muted" textAlign="center">
                            {kpi.label}
                        </Text>
                    </VStack>
                </Box>
            ))}
        </SimpleGrid>
    );
}
