'use client';

import { forwardRef, useId } from 'react';
import { Box, Button, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import { Plus } from 'lucide-react';
import { minutesBetween } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import { BuilderOptionsDisclosure } from './BuilderOptionsDisclosure';
import { DateMultiSelectCalendar } from './DateMultiSelectCalendar';
import { DurationPresetChips } from './DurationPresetChips';
import { TimeSelect } from './TimeSelect';
import { builderEndTime, isTimeRangeValid, shiftTime, type BuilderState } from './candidates';

interface CandidateBuilderCardProps {
    state: BuilderState;
    onChange: (patch: Partial<BuilderState>) => void;
    onAddCandidates: () => void;
}

/** Calendar + start time + duration + "add" (RFC-0013 §2.3-2.5) */
export const CandidateBuilderCard = forwardRef<HTMLDivElement, CandidateBuilderCardProps>(function CandidateBuilderCard(
    { state, onChange, onAddCandidates },
    calendarRef
) {
    const { t } = useI18n();
    const headingId = useId();
    const endTime = builderEndTime(state);
    const isRangeValid = isTimeRangeValid(state.startTime, endTime);
    const dayCount = state.selectedDates.length;
    const canAdd = dayCount > 0 && isRangeValid;

    const handleNudge = (minutes: number) => {
        onChange({
            startTime: shiftTime(state.startTime, minutes),
            ...(state.useDirectEndTime ? { directEndTime: shiftTime(state.directEndTime, minutes) } : {}),
        });
    };

    return (
        <Box
            as="section"
            aria-labelledby={headingId}
            bg="bg.card"
            borderRadius="xl"
            border="1px solid"
            borderColor="border.default"
            p={{ base: 3, md: 4 }}
        >
            <VStack spacing={3} align="stretch">
                <Heading as="h2" size="sm" id={headingId}>
                    {t('create.candidateDates')}
                </Heading>

                <Box>
                    <Text fontSize="sm" color="text.muted" mb={1}>
                        {t('create.dateLabel')}
                    </Text>
                    <DateMultiSelectCalendar
                        ref={calendarRef}
                        selectedDates={state.selectedDates}
                        onSelectDates={(selectedDates) => onChange({ selectedDates })}
                    />
                </Box>

                <Flex gap={4} wrap="wrap" align="flex-end">
                    <Box>
                        <Text fontSize="sm" fontWeight="medium" mb={1} aria-hidden>
                            {t('create.startTime')}
                        </Text>
                        <TimeSelect
                            label={t('create.startTime')}
                            value={state.startTime}
                            onChange={(startTime) => onChange({ startTime })}
                            minuteStep={state.minuteStep}
                        />
                    </Box>
                    <Box>
                        <Text fontSize="sm" fontWeight="medium" mb={1}>
                            {t('create.endTime')}
                        </Text>
                        <Text
                            fontSize="md"
                            fontWeight="semibold"
                            color={isRangeValid ? 'text.muted' : 'red.500'}
                            data-testid="builder-end-time"
                            lineHeight="32px"
                        >
                            {endTime}
                            {state.useDirectEndTime && (
                                <Text as="span" fontSize="xs" fontWeight="normal" ml={2}>
                                    {t('create.directEndTimeActive')}
                                </Text>
                            )}
                        </Text>
                    </Box>
                </Flex>

                {state.useDirectEndTime ? (
                    <Text fontSize="sm" color="text.muted">
                        {t('create.durationValue', {
                            duration: t('create.minutes', { count: Math.max(minutesBetween(state.startTime, endTime), 0) }),
                        })}
                    </Text>
                ) : (
                    <Box>
                        <Text fontSize="sm" fontWeight="medium" mb={1} aria-hidden>
                            {t('create.duration')}
                        </Text>
                        <DurationPresetChips
                            label={t('create.duration')}
                            value={state.durationPreset}
                            customValue={state.customDuration}
                            onChange={(durationPreset) => onChange({ durationPreset })}
                            onCustomChange={(customDuration) => onChange({ customDuration })}
                        />
                    </Box>
                )}

                {!isRangeValid && (
                    <Text fontSize="sm" color="red.500" role="alert">
                        {t('create.errors.endTimeBeforeStart')}
                    </Text>
                )}

                <Button
                    leftIcon={<Plus size={18} />}
                    colorScheme="brand"
                    onClick={onAddCandidates}
                    isDisabled={!canAdd}
                    w="full"
                >
                    {dayCount > 1 ? t('create.addSelectedDates', { count: dayCount }) : t('create.addCandidate')}
                </Button>
                {dayCount === 0 && (
                    <Text fontSize="xs" color="text.muted" textAlign="center">
                        {t('create.selectDate')}
                    </Text>
                )}

                <BuilderOptionsDisclosure
                    useDirectEndTime={state.useDirectEndTime}
                    onUseDirectEndTimeChange={(useDirectEndTime) =>
                        // Start the direct input from the currently computed end time
                        onChange({ useDirectEndTime, ...(useDirectEndTime ? { directEndTime: endTime } : {}) })
                    }
                    endTime={state.directEndTime}
                    onEndTimeChange={(directEndTime) => onChange({ directEndTime })}
                    isEndTimeInvalid={state.useDirectEndTime && !isRangeValid}
                    minuteStep={state.minuteStep}
                    onMinuteStepChange={(minuteStep) => onChange({ minuteStep })}
                    onNudge={handleNudge}
                />
            </VStack>
        </Box>
    );
});
