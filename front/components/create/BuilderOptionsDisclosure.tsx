'use client';

import { useId } from 'react';
import {
    Box,
    Button,
    Collapse,
    FormControl,
    FormLabel,
    HStack,
    Radio,
    RadioGroup,
    Stack,
    Switch,
    Text,
    VStack,
    Wrap,
    WrapItem,
    useDisclosure,
} from '@chakra-ui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '@/providers/I18nProvider';
import { TimeSelect } from './TimeSelect';
import type { MinuteStep } from './candidates';

const NUDGES = [-60, -30, -15, 15, 30, 60];

interface BuilderOptionsDisclosureProps {
    useDirectEndTime: boolean;
    onUseDirectEndTimeChange: (value: boolean) => void;
    endTime: string;
    onEndTimeChange: (time: string) => void;
    isEndTimeInvalid?: boolean;
    minuteStep: MinuteStep;
    onMinuteStepChange: (step: MinuteStep) => void;
    onNudge: (minutes: number) => void;
}

/** Collapsed builder options: direct end time, minute step, nudge buttons (RFC-0013 §2.5) */
export function BuilderOptionsDisclosure({
    useDirectEndTime,
    onUseDirectEndTimeChange,
    endTime,
    onEndTimeChange,
    isEndTimeInvalid,
    minuteStep,
    onMinuteStepChange,
    onNudge,
}: BuilderOptionsDisclosureProps) {
    const { t } = useI18n();
    const { isOpen, onToggle } = useDisclosure();
    const panelId = useId();
    const switchId = useId();

    return (
        <Box>
            <Button
                variant="ghost"
                colorScheme="gray"
                size="sm"
                onClick={onToggle}
                leftIcon={isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                aria-expanded={isOpen}
                aria-controls={panelId}
                color="text.muted"
                fontWeight="normal"
            >
                {t('create.builderOptions')}
            </Button>

            <Collapse in={isOpen} animateOpacity>
                <Box
                    id={panelId}
                    mt={2}
                    p={4}
                    borderRadius="md"
                    border="1px solid"
                    borderColor="border.default"
                    bg="bg.subtle"
                >
                    <VStack spacing={4} align="stretch">
                        <FormControl display="flex" alignItems="center">
                            <Switch
                                id={switchId}
                                isChecked={useDirectEndTime}
                                onChange={(e) => onUseDirectEndTimeChange(e.target.checked)}
                                colorScheme="brand"
                                mr={3}
                            />
                            <FormLabel htmlFor={switchId} mb="0" fontSize="sm">
                                {t('create.directEndTime')}
                            </FormLabel>
                        </FormControl>

                        {useDirectEndTime && (
                            <HStack spacing={2} pl={{ base: 0, sm: 4 }}>
                                <Text fontSize="sm" color="text.muted" aria-hidden>
                                    {t('create.endTime')}
                                </Text>
                                <TimeSelect
                                    label={t('create.endTime')}
                                    value={endTime}
                                    onChange={onEndTimeChange}
                                    minuteStep={minuteStep}
                                    isInvalid={isEndTimeInvalid}
                                />
                            </HStack>
                        )}

                        <FormControl as="fieldset">
                            <FormLabel as="legend" fontSize="sm" mb={2}>
                                {t('create.minuteStep')}
                            </FormLabel>
                            <RadioGroup
                                value={String(minuteStep)}
                                onChange={(val) => onMinuteStepChange(val === '1' ? 1 : 5)}
                            >
                                <Stack direction="row" spacing={4}>
                                    <Radio value="5" colorScheme="brand" size="sm">
                                        {t('create.minutes', { count: 5 })}
                                    </Radio>
                                    <Radio value="1" colorScheme="brand" size="sm">
                                        {t('create.minutes', { count: 1 })}
                                    </Radio>
                                </Stack>
                            </RadioGroup>
                        </FormControl>

                        <Box role="group" aria-labelledby={`${panelId}-nudge`}>
                            <Text id={`${panelId}-nudge`} fontSize="sm" fontWeight="medium" mb={2}>
                                {t('create.nudge')}
                            </Text>
                            <Wrap spacing={2}>
                                {NUDGES.map((minutes) => (
                                    <WrapItem key={minutes}>
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            colorScheme="gray"
                                            onClick={() => onNudge(minutes)}
                                            aria-label={
                                                minutes < 0
                                                    ? t('create.nudgeEarlier', { count: -minutes })
                                                    : t('create.nudgeLater', { count: minutes })
                                            }
                                        >
                                            {minutes > 0 ? `+${minutes}` : minutes}
                                        </Button>
                                    </WrapItem>
                                ))}
                            </Wrap>
                        </Box>
                    </VStack>
                </Box>
            </Collapse>
        </Box>
    );
}
