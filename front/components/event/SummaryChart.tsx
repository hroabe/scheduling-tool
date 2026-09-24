'use client';

import { Card, CardBody, Icon, Skeleton, Text, VStack } from '@chakra-ui/react';
import { Users } from 'lucide-react';
import { CandidateSummarySection } from './CandidateSummarySection';
import { SummaryKpiCards } from './SummaryKpiCards';
import { useI18n } from '@/providers/I18nProvider';
import type { Schedule, ScheduleSummary } from '@/types';

interface SummaryChartProps {
    schedule: Schedule;
    summary?: ScheduleSummary;
    icsUrl: (candidateId: number) => string;
    /** Organizer (owner or verified edit key): shows the finalize CTA */
    isOrganizer?: boolean;
    onFinalize?: (candidateId: number) => void;
}

/** Summary tab: KPIs + candidate comparison with the recommendation and finalize CTA */
export function SummaryChart({ schedule, summary, icsUrl, isOrganizer = false, onFinalize }: SummaryChartProps) {
    const { t } = useI18n();

    if (schedule.participants.length === 0) {
        return (
            <Card>
                <CardBody>
                    <VStack spacing={4} py={8}>
                        <Icon as={Users} boxSize={12} color="text.muted" aria-hidden />
                        <Text color="text.muted">{t('event.summary.empty')}</Text>
                    </VStack>
                </CardBody>
            </Card>
        );
    }

    if (!summary) {
        return <Skeleton h="300px" borderRadius="xl" />;
    }

    const maxOk = Math.max(0, ...summary.candidates.map((c) => c.ok_count));

    return (
        <VStack spacing={6} align="stretch">
            <SummaryKpiCards
                participantCount={summary.total_participants}
                maxOkCount={maxOk}
                candidateCount={summary.candidates.length}
            />
            <CandidateSummarySection
                schedule={schedule}
                summary={summary}
                icsUrl={icsUrl}
                isOrganizer={isOrganizer}
                onFinalize={onFinalize}
            />
        </VStack>
    );
}
