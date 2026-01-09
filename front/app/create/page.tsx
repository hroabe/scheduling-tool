'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Container,
    Flex,
    VStack,
    HStack,
    Heading,
    Text,
    Tabs,
    TabList,
    Tab,
    useColorModeValue,
    useToast,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useI18n } from '@/providers/I18nProvider';
import { useCreateSchedule } from '@/hooks/useApi';
import { useCreateScheduleStore } from '@/stores';
import {
    EventBasicsCard,
    EventOptionsCard,
    CandidateBuilderCard,
    CandidateListCard,
    StickyFooterCTA,
} from '@/components/create';

// Form validation schema
const formSchema = z.object({
    title: z.string().min(1, 'イベント名は必須です'),
    description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Candidate {
    start_at: string;
    end_at: string;
    order: number;
}

export default function CreatePage() {
    const { t } = useI18n();
    const router = useRouter();
    const toast = useToast();
    const bgColor = useColorModeValue('gray.50', 'gray.900');

    // Mode: 0 = simple, 1 = detail
    const [mode, setMode] = useState(0);
    const isSimpleMode = mode === 0;

    // Form
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            description: '',
        },
    });

    const titleValue = watch('title');
    const hasTitle = titleValue?.trim().length > 0;

    // Candidates state
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set());
    
    // Multi-date selection
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    
    // Time settings
    const [startHour, setStartHour] = useState(10);
    const [startMinute, setStartMinute] = useState(0);
    const [endHour, setEndHour] = useState(11);
    const [endMinute, setEndMinute] = useState(0);
    
    // Duration presets
    const [durationPreset, setDurationPreset] = useState<number | 'custom'>(60);
    const [customDuration, setCustomDuration] = useState(60);
    
    // Options
    const [useDirectEndTime, setUseDirectEndTime] = useState(false);
    const [minuteStep, setMinuteStep] = useState<5 | 1>(5);
    
    // Organizer
    const [organizerName, setOrganizerName] = useState('');

    // Detailed mode fields
    const [description, setDescription] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [editKey, setEditKey] = useState('');
    const [deadline, setDeadline] = useState('');
    const [allowMaybe, setAllowMaybe] = useState(true);
    const [notifyOnResponse, setNotifyOnResponse] = useState(false);

    // Load organizer from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('lastOrganizerName');
        if (saved) {
            setOrganizerName(saved);
        }
    }, []);

    // Calculate end time from duration
    const getEffectiveDuration = () => {
        return durationPreset === 'custom' ? customDuration : durationPreset;
    };

    const getCalculatedEndTime = () => {
        const duration = getEffectiveDuration();
        let endH = startHour;
        let endM = startMinute + duration;
        
        while (endM >= 60) {
            endM -= 60;
            endH += 1;
        }
        if (endH >= 24) endH = 23;
        
        return { hour: endH, minute: endM };
    };

    const calculatedEnd = useDirectEndTime 
        ? { hour: endHour, minute: endMinute }
        : getCalculatedEndTime();

    const calculatedEndTimeStr = `${calculatedEnd.hour.toString().padStart(2, '0')}:${calculatedEnd.minute.toString().padStart(2, '0')}`;

    // Handle start time change
    const handleStartTimeChange = (hour: number, minute: number) => {
        setStartHour(hour);
        setStartMinute(minute);
    };

    // Handle end time change (direct input)
    const handleEndTimeChange = (hour: number, minute: number) => {
        setEndHour(hour);
        setEndMinute(minute);
        setUseDirectEndTime(true);
    };

    // Handle nudge
    const handleNudge = (minutes: number) => {
        let newStartM = startMinute + minutes;
        let newStartH = startHour;
        
        while (newStartM < 0) {
            newStartM += 60;
            newStartH -= 1;
        }
        while (newStartM >= 60) {
            newStartM -= 60;
            newStartH += 1;
        }
        
        newStartH = Math.max(0, Math.min(23, newStartH));
        
        setStartHour(newStartH);
        setStartMinute(newStartM);
    };

    // Add candidates (multi-date)
    const handleAddCandidates = () => {
        if (selectedDates.length === 0) return;

        const duration = getEffectiveDuration();
        const newCandidates: Candidate[] = selectedDates.map((dateStr, idx) => {
            const [year, month, day] = dateStr.split('-').map(Number);
            const startDate = new Date(year, month - 1, day, startHour, startMinute);
            const endDate = new Date(startDate.getTime() + duration * 60000);

            return {
                start_at: startDate.toISOString(),
                end_at: endDate.toISOString(),
                order: candidates.length + idx,
            };
        });

        setCandidates([...candidates, ...newCandidates]);
        setSelectedDates([]);
        
        toast({
            title: `${newCandidates.length}件の候補を追加しました`,
            status: 'success',
            duration: 2000,
        });
    };

    // Edit candidate
    const handleEditCandidate = (index: number, startTime: string, endTime: string) => {
        setCandidates(prev => prev.map((c, i) => 
            i === index ? { ...c, start_at: startTime, end_at: endTime } : c
        ));
    };

    // Duplicate candidate
    const handleDuplicateCandidate = (index: number) => {
        const original = candidates[index];
        const startDate = new Date(original.start_at);
        const endDate = new Date(original.end_at);
        const duration = endDate.getTime() - startDate.getTime();

        // Copy time settings for next selection
        setStartHour(startDate.getHours());
        setStartMinute(startDate.getMinutes());
        
        const durationMinutes = duration / 60000;
        if ([30, 60, 90, 120].includes(durationMinutes)) {
            setDurationPreset(durationMinutes);
        } else {
            setDurationPreset('custom');
            setCustomDuration(durationMinutes);
        }
        
        toast({
            title: '時間設定をコピーしました',
            description: '日付を選択して追加してください',
            status: 'info',
            duration: 2000,
        });
    };

    // Delete candidate
    const handleDeleteCandidate = (index: number) => {
        setCandidates(prev => prev.filter((_, i) => i !== index));
    };

    // API mutation
    const { mutateAsync: createSchedule, isPending } = useCreateSchedule();

    // Create and return URL
    const handleCreateAndCopy = async (): Promise<string | null> => {
        try {
            // Save organizer name
            localStorage.setItem('lastOrganizerName', organizerName);

            const result = await createSchedule({
                name: titleValue,
                description: description,
                owner_name: organizerName,
                owner_email: ownerEmail || undefined,
                edit_key: editKey || undefined,
                deadline: deadline || undefined,
                allow_maybe: allowMaybe,
                notify_on_response: notifyOnResponse,
                candidates: candidates.map((c, i) => ({
                    start_at: c.start_at,
                    end_at: c.end_at,
                    order: i,
                })),
            });

            const url = `${window.location.origin}/event/${result.uuid}`;
            router.push(`/event/${result.uuid}`);
            return url;
        } catch (error: unknown) {
            // Extract specific error message from API response
            let errorMessage = 'イベントの作成に失敗しました';
            if (error && typeof error === 'object' && 'response' in error) {
                const response = (error as { response?: { data?: Record<string, unknown> } }).response;
                if (response?.data) {
                    // Try to extract specific validation error
                    const data = response.data;
                    if (typeof data === 'object') {
                        const firstKey = Object.keys(data)[0];
                        if (firstKey && data[firstKey]) {
                            const value = data[firstKey];
                            errorMessage = Array.isArray(value) ? value[0] : String(value);
                        }
                    }
                }
            }
            toast({
                title: 'エラーが発生しました',
                description: errorMessage,
                status: 'error',
                duration: 5000,
            });
            return null;
        }
    };

    // Create and navigate
    const handleCreateAndNavigate = async () => {
        try {
            localStorage.setItem('lastOrganizerName', organizerName);

            const result = await createSchedule({
                name: titleValue,
                description: description,
                owner_name: organizerName,
                owner_email: ownerEmail || undefined,
                edit_key: editKey || undefined,
                deadline: deadline || undefined,
                allow_maybe: allowMaybe,
                notify_on_response: notifyOnResponse,
                candidates: candidates.map((c, i) => ({
                    start_at: c.start_at,
                    end_at: c.end_at,
                    order: i,
                })),
            });

            router.push(`/event/${result.uuid}`);
        } catch (error: unknown) {
            // Extract specific error message from API response
            let errorMessage = 'イベントの作成に失敗しました';
            if (error && typeof error === 'object' && 'response' in error) {
                const response = (error as { response?: { data?: Record<string, unknown> } }).response;
                if (response?.data) {
                    // Try to extract specific validation error
                    const data = response.data;
                    if (typeof data === 'object') {
                        const firstKey = Object.keys(data)[0];
                        if (firstKey && data[firstKey]) {
                            const value = data[firstKey];
                            errorMessage = Array.isArray(value) ? value[0] : String(value);
                        }
                    }
                }
            }
            toast({
                title: 'エラーが発生しました',
                description: errorMessage,
                status: 'error',
                duration: 5000,
            });
        }
    };

    return (
        <Box minH="100vh" bg={bgColor} pb="120px">
            <Header />
            
            <Container maxW="1200px" py={3}>
                {/* Header */}
                <VStack spacing={2} mb={3} align="stretch">
                    <Heading size="md">新規イベント作成</Heading>
                    {!isSimpleMode && (
                        <Text fontSize="sm" color="gray.600">
                            候補日を選んで、リンクを共有しましょう
                        </Text>
                    )}
                    
                    {/* Mode tabs */}
                    <Tabs index={mode} onChange={setMode} variant="soft-rounded" colorScheme="brand" size="sm">
                        <TabList>
                            <Tab>かんたん</Tab>
                            <Tab>詳細</Tab>
                        </TabList>
                    </Tabs>
                </VStack>

                {/* Main content - Two columns on desktop */}
                <Flex gap={3} direction={{ base: 'column', lg: 'row' }} align="flex-start">
                    {/* Left column - Input */}
                    <VStack spacing={2} flex={1} align="stretch">
                        {/* Event basics */}
                        <EventBasicsCard
                            register={register}
                            errors={errors}
                            organizerName={organizerName}
                            onOrganizerChange={setOrganizerName}
                            isSimpleMode={isSimpleMode}
                            description={description}
                            onDescriptionChange={setDescription}
                            ownerEmail={ownerEmail}
                            onOwnerEmailChange={setOwnerEmail}
                        />

                        {/* Candidate builder */}
                        <CandidateBuilderCard
                            selectedDates={selectedDates}
                            onSelectDates={setSelectedDates}
                            currentMonth={calendarMonth}
                            onChangeMonth={setCalendarMonth}
                            startHour={startHour}
                            startMinute={startMinute}
                            onStartTimeChange={handleStartTimeChange}
                            durationPreset={durationPreset}
                            customDuration={customDuration}
                            onDurationPresetChange={setDurationPreset}
                            onCustomDurationChange={setCustomDuration}
                            calculatedEndTimeStr={calculatedEndTimeStr}
                            useDirectEndTime={useDirectEndTime}
                            onUseDirectEndTimeChange={setUseDirectEndTime}
                            endHour={endHour}
                            endMinute={endMinute}
                            onEndTimeChange={handleEndTimeChange}
                            minuteStep={minuteStep}
                            onMinuteStepChange={setMinuteStep}
                            onNudge={handleNudge}
                            onAddCandidates={handleAddCandidates}
                            isSimpleMode={isSimpleMode}
                        />

                        {/* Options card - only in detailed mode */}
                        {!isSimpleMode && (
                            <EventOptionsCard
                                editKey={editKey}
                                onEditKeyChange={setEditKey}
                                deadline={deadline}
                                onDeadlineChange={setDeadline}
                                allowMaybe={allowMaybe}
                                onAllowMaybeChange={setAllowMaybe}
                                notifyOnResponse={notifyOnResponse}
                                onNotifyOnResponseChange={setNotifyOnResponse}
                                ownerEmail={ownerEmail}
                            />
                        )}
                    </VStack>

                    {/* Right column - Candidate list */}
                    <Box flex={1} minH="400px">
                        <CandidateListCard
                            candidates={candidates}
                            selectedIndices={selectedCandidates}
                            onSelectionChange={(index: number, selected: boolean) => {
                                setSelectedCandidates(prev => {
                                    const newSet = new Set(prev);
                                    if (selected) {
                                        newSet.add(index);
                                    } else {
                                        newSet.delete(index);
                                    }
                                    return newSet;
                                });
                            }}
                            onSelectAll={() => {
                                setSelectedCandidates(new Set(candidates.map((_, i) => i)));
                            }}
                            onDeselectAll={() => {
                                setSelectedCandidates(new Set());
                            }}
                            onDeleteSelected={() => {
                                setCandidates(prev => prev.filter((_, i) => !selectedCandidates.has(i)));
                                setSelectedCandidates(new Set());
                            }}
                            onEdit={handleEditCandidate}
                            onDuplicate={handleDuplicateCandidate}
                            onDelete={handleDeleteCandidate}
                        />
                    </Box>
                </Flex>
            </Container>

            {/* Sticky footer CTA */}
            <StickyFooterCTA
                isDisabled={!hasTitle || candidates.length === 0}
                isPending={isPending}
                onCreateAndCopy={handleCreateAndCopy}
                onCreateAndNavigate={handleCreateAndNavigate}
                candidateCount={candidates.length}
                hasTitle={hasTitle}
            />

            <Footer />
        </Box>
    );
}
