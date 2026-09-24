'use client';

import { useState } from 'react';
import {
    Button,
    Checkbox,
    Flex,
    HStack,
    IconButton,
    Popover,
    PopoverArrow,
    PopoverBody,
    PopoverCloseButton,
    PopoverContent,
    PopoverFooter,
    PopoverHeader,
    PopoverTrigger,
    Text,
    VStack,
    useDisclosure,
} from '@chakra-ui/react';
import { Copy, Edit2, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import { DurationPresetChips } from './DurationPresetChips';
import { TimeSelect } from './TimeSelect';
import {
    DURATION_PRESETS,
    computeEndTime,
    draftDuration,
    isTimeRangeValid,
    parseDayKey,
    type CandidateDraft,
    type DurationPreset,
} from './candidates';

interface CandidateItemProps {
    candidate: CandidateDraft;
    isSelected: boolean;
    onSelectionChange: (id: string, selected: boolean) => void;
    onEdit: (id: string, startTime: string, endTime: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
}

function presetFor(duration: number): DurationPreset {
    return (DURATION_PRESETS as readonly number[]).includes(duration) ? duration : 'custom';
}

/** One candidate row: select / edit (popover) / copy time settings / delete (RFC-0013 §2.6) */
export function CandidateItem({ candidate, isSelected, onSelectionChange, onEdit, onDuplicate, onDelete }: CandidateItemProps) {
    const { t } = useI18n();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const duration = draftDuration(candidate);
    const dateLabel = formatDate(parseDayKey(candidate.date), 'yyyy/MM/dd (E)');
    const summary = t('create.candidateSummary', {
        date: dateLabel,
        start: candidate.startTime,
        end: candidate.endTime,
        duration: t('create.minutes', { count: duration }),
    });
    const shortLabel = `${dateLabel} ${candidate.startTime}`;

    // Edit state is (re)initialized from the candidate each time the popover opens
    const [editStart, setEditStart] = useState(candidate.startTime);
    const [editPreset, setEditPreset] = useState<DurationPreset>(presetFor(duration));
    const [editCustom, setEditCustom] = useState(duration);
    const editDuration = editPreset === 'custom' ? editCustom : editPreset;
    const editEnd = computeEndTime(editStart, editDuration);
    const isEditValid = isTimeRangeValid(editStart, editEnd);

    const handleOpen = () => {
        setEditStart(candidate.startTime);
        setEditPreset(presetFor(duration));
        setEditCustom(duration);
        onOpen();
    };

    const handleSave = () => {
        if (!isEditValid) return;
        onEdit(candidate.id, editStart, editEnd);
        onClose();
    };

    return (
        <Flex
            as="li"
            p={3}
            bg={isSelected ? 'brand.subtle' : 'bg.subtle'}
            borderRadius="md"
            border="1px solid"
            borderColor={isSelected ? 'brand.fg' : 'border.default'}
            align="center"
            gap={2}
            wrap="wrap"
            transition="background 0.2s, border-color 0.2s"
            data-testid="candidate-item"
        >
            <Checkbox
                isChecked={isSelected}
                onChange={(e) => onSelectionChange(candidate.id, e.target.checked)}
                colorScheme="brand"
                aria-label={t('create.selectCandidate', { label: shortLabel })}
            />

            <Text fontSize="sm" fontWeight="medium" flex="1" minW="180px">
                {summary}
            </Text>

            <HStack spacing={1}>
                <Popover isOpen={isOpen} onOpen={handleOpen} onClose={onClose} placement="bottom-end" isLazy>
                    <PopoverTrigger>
                        <IconButton
                            aria-label={t('create.editCandidate', { label: shortLabel })}
                            icon={<Edit2 size={16} />}
                            size="sm"
                            variant="ghost"
                            colorScheme="gray"
                        />
                    </PopoverTrigger>
                    <PopoverContent w={{ base: '290px', sm: '330px' }}>
                        <PopoverArrow />
                        <PopoverHeader fontWeight="semibold" fontSize="sm">
                            {t('create.editTitle')}
                            <Text as="span" display="block" fontWeight="normal" color="text.muted">
                                {dateLabel}
                            </Text>
                        </PopoverHeader>
                        <PopoverCloseButton aria-label={t('create.cancel')} />
                        <PopoverBody>
                            <VStack spacing={3} align="stretch">
                                <HStack>
                                    <Text fontSize="sm" minW="40px" aria-hidden>
                                        {t('create.startTime')}
                                    </Text>
                                    <TimeSelect
                                        label={t('create.startTime')}
                                        value={editStart}
                                        onChange={setEditStart}
                                        minuteStep={5}
                                    />
                                </HStack>
                                <VStack align="stretch" spacing={1}>
                                    <Text fontSize="sm" aria-hidden>
                                        {t('create.duration')}
                                    </Text>
                                    <DurationPresetChips
                                        label={t('create.duration')}
                                        value={editPreset}
                                        customValue={editCustom}
                                        onChange={setEditPreset}
                                        onCustomChange={setEditCustom}
                                    />
                                </VStack>
                                <Text fontSize="sm" color={isEditValid ? 'text.muted' : 'red.500'} role={isEditValid ? undefined : 'alert'}>
                                    {isEditValid
                                        ? `${editStart}–${editEnd}`
                                        : t('create.errors.endTimeBeforeStart')}
                                </Text>
                            </VStack>
                        </PopoverBody>
                        <PopoverFooter display="flex" justifyContent="flex-end" gap={2}>
                            <Button size="sm" variant="ghost" colorScheme="gray" onClick={onClose}>
                                {t('create.cancel')}
                            </Button>
                            <Button size="sm" colorScheme="brand" onClick={handleSave} isDisabled={!isEditValid}>
                                {t('create.save')}
                            </Button>
                        </PopoverFooter>
                    </PopoverContent>
                </Popover>

                <IconButton
                    aria-label={t('create.duplicateCandidateAction', { label: shortLabel })}
                    title={t('create.duplicateHint')}
                    icon={<Copy size={16} />}
                    size="sm"
                    variant="ghost"
                    colorScheme="gray"
                    onClick={() => onDuplicate(candidate.id)}
                />

                <IconButton
                    aria-label={t('create.deleteCandidate', { label: shortLabel })}
                    icon={<Trash2 size={16} />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => onDelete(candidate.id)}
                />
            </HStack>
        </Flex>
    );
}
