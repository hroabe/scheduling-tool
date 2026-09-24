'use client';

/**
 * Event creation form (RFC-0013 "fastest path to share" UX, merged with the MVP
 * guarantees in docs/11_integration.md §1):
 * - candidates are sent as ISO datetimes with the browser offset + `timezone_name`
 * - zod validation with visible, translated messages
 * - on success the edit key is kept in this tab (useEditKeyStore), the acquisition
 *   `ref` is attached, and the event page opens with `?created=1` (share URL + edit key modal)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Container, Grid, GridItem, Heading, Text, VStack, useToast } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { useCreateSchedule } from '@/hooks/useApi';
import { ApiError } from '@/lib/api';
import { localInputToISO } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import { useAttributionStore, useEditKeyStore } from '@/stores';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';
import { CandidateBuilderCard } from './CandidateBuilderCard';
import { CandidateListCard } from './CandidateListCard';
import { EventBasicsCard } from './EventBasicsCard';
import { EventOptionsCard } from './EventOptionsCard';
import { StickyFooterCTA } from './StickyFooterCTA';
import {
    INITIAL_BUILDER,
    MAX_CANDIDATES,
    addDrafts,
    builderEndTime,
    builderFromDraft,
    draftsToCandidateInputs,
    isDraftValid,
    isTimeRangeValid,
    sortDrafts,
    type BuilderState,
    type CandidateDraft,
} from './candidates';
import { CREATE_FORM_DEFAULTS, OPTION_FIELDS, createFormSchema, isValidEmail, type CreateFormValues } from './schema';

const LAST_ORGANIZER_KEY = 'lastOrganizerName';

type CreateAction = 'copy' | 'open';

function readSavedOrganizer(): string {
    try {
        return window.localStorage.getItem(LAST_ORGANIZER_KEY) ?? '';
    } catch {
        return '';
    }
}

function saveOrganizer(name: string) {
    try {
        window.localStorage.setItem(LAST_ORGANIZER_KEY, name);
    } catch {
        // storage unavailable (private mode etc.)
    }
}

/** Display name of the signed-in user (family name first for CJK locales, RFC-0013 §4.2) */
export function userDisplayName(user: User, locale: string): string {
    const first = user.first_name?.trim() ?? '';
    const last = user.last_name?.trim() ?? '';
    const full = ['ja', 'zh', 'ko'].includes(locale) ? `${last} ${first}` : `${first} ${last}`;
    return full.trim() || user.username;
}

export function shareUrlFor(uuid: string): string {
    return `${window.location.origin}/event/${uuid}?utm_source=share&utm_medium=link`;
}

export function CreateScheduleForm() {
    const { t, locale } = useI18n();
    const router = useRouter();
    const toast = useToast();
    const calendarRef = useRef<HTMLDivElement>(null);

    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const setEditKey = useEditKeyStore((state) => state.setKey);
    const ref = useAttributionStore((state) => state.ref);
    const incrementCreated = useAttributionStore((state) => state.incrementCreated);
    const { mutateAsync: createSchedule, isPending } = useCreateSchedule();

    // Auth state is restored from storage on the client only: avoid hydration mismatches
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isSignedIn = mounted && isAuthenticated && !!user;

    const [builder, setBuilder] = useState<BuilderState>(INITIAL_BUILDER);
    const [candidates, setCandidates] = useState<CandidateDraft[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
    const [candidateError, setCandidateError] = useState<string | null>(null);
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<CreateAction | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        setFocus,
        control,
        formState: { errors },
    } = useForm<CreateFormValues>({
        resolver: zodResolver(createFormSchema),
        defaultValues: CREATE_FORM_DEFAULTS,
    });

    // Subscribe only to the fields the page needs (typing elsewhere does not re-render it)
    const [name, ownerName, ownerEmail] = useWatch({ control, name: ['name', 'ownerName', 'ownerEmail'] });
    const hasValidEmail = isValidEmail(ownerEmail);

    // Organizer prefill: signed-in user > previously used name (RFC-0013 §4.2)
    useEffect(() => {
        if (!getValues('ownerName').trim()) {
            const next = (user && isAuthenticated ? userDisplayName(user, locale) : '') || readSavedOrganizer();
            if (next) setValue('ownerName', next);
        }
        if (user && isAuthenticated && user.email && !getValues('ownerEmail')) {
            setValue('ownerEmail', user.email);
        }
    }, [user, isAuthenticated, locale, getValues, setValue]);

    // ----- candidates -------------------------------------------------------------

    const updateCandidates = useCallback((next: CandidateDraft[]) => {
        setCandidates(next);
        // Drop selections of removed candidates (selection is tracked by id, not index)
        setSelectedIds((prev) => new Set(next.filter((c) => prev.has(c.id)).map((c) => c.id)));
        if (next.length > 0) setCandidateError(null);
    }, []);

    const handleBuilderChange = (patch: Partial<BuilderState>) => setBuilder((prev) => ({ ...prev, ...patch }));

    const handleAddCandidates = () => {
        const endTime = builderEndTime(builder);
        if (builder.selectedDates.length === 0 || !isTimeRangeValid(builder.startTime, endTime)) return;

        const result = addDrafts(candidates, builder.selectedDates, builder.startTime, endTime);
        updateCandidates(result.drafts);
        setBuilder((prev) => ({ ...prev, selectedDates: [] }));

        if (result.added > 0) {
            toast({
                title: t('create.candidatesAdded', { count: result.added }),
                description: result.duplicates > 0 ? t('create.duplicatesSkipped', { count: result.duplicates }) : undefined,
                status: 'success',
                duration: 2000,
            });
        } else if (result.duplicates > 0) {
            toast({ title: t('create.duplicateCandidate'), status: 'info', duration: 2500 });
        }
        if (result.overLimit > 0) {
            toast({ title: t('create.maxCandidates', { max: MAX_CANDIDATES }), status: 'warning', duration: 4000 });
        }
    };

    const handleEditCandidate = (id: string, startTime: string, endTime: string) => {
        updateCandidates(sortDrafts(candidates.map((c) => (c.id === id ? { ...c, startTime, endTime } : c))));
    };

    const handleDuplicateCandidate = (id: string) => {
        const original = candidates.find((c) => c.id === id);
        if (!original) return;
        setBuilder((prev) => builderFromDraft(prev, original));
        toast({
            title: t('create.timeCopied'),
            description: t('create.timeCopiedDescription'),
            status: 'info',
            duration: 2500,
        });
    };

    const handleDeleteCandidate = (id: string) => updateCandidates(candidates.filter((c) => c.id !== id));

    const handleDeleteSelected = () => updateCandidates(candidates.filter((c) => !selectedIds.has(c.id)));

    const handleSelectionChange = (id: string, selected: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (selected) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const validateCandidates = (): string | null => {
        if (candidates.length === 0) return 'create.errors.atLeastOne';
        if (!candidates.every(isDraftValid)) return 'create.errors.invalidCandidates';
        return null;
    };

    // ----- submit -----------------------------------------------------------------

    const create = async (values: CreateFormValues, action: CreateAction) => {
        const candidateProblem = validateCandidates();
        setCandidateError(candidateProblem);
        if (candidateProblem) return;

        setPendingAction(action);
        try {
            saveOrganizer(values.ownerName);
            const email = values.ownerEmail.trim();
            const created = await createSchedule({
                schedule: {
                    name: values.name,
                    owner_name: values.ownerName,
                    description: values.description.trim(),
                    department: values.department,
                    owner_email: email || undefined,
                    notify_on_response: values.notifyOnResponse && isValidEmail(email),
                    edit_key: values.editKey || undefined,
                    deadline: localInputToISO(values.deadline),
                    allow_maybe: values.allowMaybe,
                    timezone_name: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo',
                    candidates: draftsToCandidateInputs(candidates),
                },
                ref,
            });

            // The creator manages the event from this tab: remember the key
            setEditKey(created.uuid, created._edit_key || values.editKey || '');
            incrementCreated();

            if (action === 'copy') {
                try {
                    if (!navigator.clipboard) throw new Error('clipboard unavailable');
                    await navigator.clipboard.writeText(shareUrlFor(created.uuid));
                    toast({
                        title: t('create.linkCopied'),
                        description: t('create.linkCopiedDescription'),
                        status: 'success',
                        duration: 3000,
                        isClosable: true,
                    });
                } catch {
                    toast({
                        title: t('create.copyFailed'),
                        description: t('create.copyFailedDescription'),
                        status: 'warning',
                        duration: 4000,
                        isClosable: true,
                    });
                }
            }

            router.push(`/event/${created.uuid}?created=1`);
        } catch (error) {
            toast({
                title: t('create.createFailed'),
                description: error instanceof ApiError ? error.message : t('create.createFailedDescription'),
                status: 'error',
                duration: 6000,
                isClosable: true,
            });
        } finally {
            setPendingAction(null);
        }
    };

    const onInvalid = (formErrors: FieldErrors<CreateFormValues>) => {
        setCandidateError(validateCandidates());
        if (OPTION_FIELDS.some((field) => field in formErrors)) setOptionsOpen(true);
    };

    const submit = (action: CreateAction) => {
        if (isPending) return;
        void handleSubmit((values) => create(values, action), onInvalid)();
    };

    const focusCalendar = () => {
        const root = calendarRef.current;
        const target =
            root?.querySelector<HTMLElement>('.rdp-month_grid button[tabindex="0"]') ??
            root?.querySelector<HTMLElement>('button.rdp-day_button:not([disabled])');
        target?.focus();
    };

    const handleTemplateSelect = (template: string) => {
        setValue('name', template, { shouldDirty: true, shouldValidate: !!errors.name });
        setFocus('name');
    };

    return (
        <Container maxW="6xl" px={{ base: 4, md: 6 }} pt={{ base: 4, md: 8 }}>
            <VStack align="start" spacing={1} mb={4}>
                <Heading as="h1" size="lg">
                    {t('create.pageTitle')}
                </Heading>
                <Text color="text.muted">{t('create.pageDescription')}</Text>
            </VStack>

            <form
                noValidate
                aria-label={t('create.pageTitle')}
                onSubmit={(e) => {
                    e.preventDefault();
                    submit('open');
                }}
            >
                <Grid
                    templateColumns={{ base: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' }}
                    templateRows={{ lg: 'auto auto 1fr' }}
                    templateAreas={{
                        base: `"basics" "builder" "list" "options"`,
                        lg: `"basics list" "builder list" "options list"`,
                    }}
                    gap={4}
                    alignItems="start"
                    pb={6}
                >
                    <GridItem area="basics">
                        <EventBasicsCard
                            register={register}
                            errors={errors}
                            ownerName={ownerName}
                            onTemplateSelect={handleTemplateSelect}
                            onNameEnter={focusCalendar}
                            isSignedIn={isSignedIn}
                        />
                    </GridItem>

                    <GridItem area="builder">
                        <CandidateBuilderCard
                            ref={calendarRef}
                            state={builder}
                            onChange={handleBuilderChange}
                            onAddCandidates={handleAddCandidates}
                        />
                    </GridItem>

                    <GridItem area="list" position={{ lg: 'sticky' }} top={{ lg: 4 }}>
                        <CandidateListCard
                            candidates={candidates}
                            selectedIds={selectedIds}
                            onSelectionChange={handleSelectionChange}
                            onSelectAll={() => setSelectedIds(new Set(candidates.map((c) => c.id)))}
                            onDeselectAll={() => setSelectedIds(new Set())}
                            onDeleteSelected={handleDeleteSelected}
                            onEdit={handleEditCandidate}
                            onDuplicate={handleDuplicateCandidate}
                            onDelete={handleDeleteCandidate}
                            error={candidateError ? t(candidateError) : null}
                        />
                    </GridItem>

                    <GridItem area="options">
                        <EventOptionsCard
                            isOpen={optionsOpen}
                            onToggle={() => setOptionsOpen((open) => !open)}
                            register={register}
                            errors={errors}
                            hasValidEmail={hasValidEmail}
                        />
                    </GridItem>
                </Grid>

                <StickyFooterCTA
                    isPending={isPending || pendingAction !== null}
                    pendingAction={pendingAction}
                    onCreateAndCopy={() => submit('copy')}
                    onCreateAndNavigate={() => submit('open')}
                    hasTitle={name.trim().length > 0}
                    candidateCount={candidates.length}
                />
            </form>
        </Container>
    );
}
