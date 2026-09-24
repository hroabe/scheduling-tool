import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { api, ApiError, type ScheduleInput } from '../api';
import DateTimeField from '../components/DateTimeField';
import { Body, Button, Card, ErrorBanner, Row, Screen, SectionTitle, SwitchRow, TextField } from '../components/ui';
import { useI18n } from '../i18n';
import { addDays, addMinutes, combineDateTime, deviceTimeZone, nextFullHour } from '../lib/date';
import { errorMessage } from '../lib/dialogs';
import type { RootScreenProps } from '../navigation/types';
import { useAuthStore } from '../stores/authStore';
import { rememberEvent, setEditKey } from '../stores/localEvents';

interface CandidateDraft {
    key: number;
    day: Date;
    start: Date;
    end: Date;
}

let nextKey = 1;

function initialCandidate(): CandidateDraft {
    const start = addDays(nextFullHour(), 1);
    return { key: nextKey++, day: start, start, end: addMinutes(start, 60) };
}

export default function CreateEventScreen({ navigation }: RootScreenProps<'CreateEvent'>) {
    const { t } = useI18n();
    const user = useAuthStore((s) => s.user);
    const defaultName = useMemo(
        () => (user ? [user.last_name, user.first_name].filter(Boolean).join(' ') || user.username : ''),
        [user],
    );

    const [name, setName] = useState('');
    const [ownerName, setOwnerName] = useState(defaultName);
    const [description, setDescription] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [notify, setNotify] = useState(false);
    const [editKey, setEditKeyInput] = useState('');
    const [deadline, setDeadline] = useState<Date | null>(null);
    const [allowMaybe, setAllowMaybe] = useState(true);
    const [candidates, setCandidates] = useState<CandidateDraft[]>(() => [initialCandidate()]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const updateCandidate = (key: number, patch: Partial<CandidateDraft>) =>
        setCandidates((list) =>
            list.map((c) => {
                if (c.key !== key) return c;
                const next = { ...c, ...patch };
                // keep the duration when the start time moves past the end time
                if (patch.start && combineDateTime(next.day, next.end) <= combineDateTime(next.day, next.start)) {
                    const previous =
                        combineDateTime(c.day, c.end).getTime() - combineDateTime(c.day, c.start).getTime();
                    next.end = addMinutes(patch.start, Math.max(previous / 60_000, 30));
                }
                return next;
            }),
        );

    const addCandidate = () =>
        setCandidates((list) => {
            const last = list[list.length - 1];
            if (!last) return [initialCandidate()];
            return [...list, { key: nextKey++, day: addDays(last.day, 1), start: last.start, end: last.end }];
        });

    const removeCandidate = (key: number) => setCandidates((list) => list.filter((c) => c.key !== key));

    const validate = (): Record<string, string> => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = t('create.errors.nameRequired');
        if (!ownerName.trim()) e.owner_name = t('create.errors.ownerRequired');
        if (candidates.length === 0) e.candidates = t('create.errors.candidateRequired');
        candidates.forEach((c) => {
            if (combineDateTime(c.day, c.end) <= combineDateTime(c.day, c.start)) e[`c${c.key}`] = t('create.errors.endAfterStart');
        });
        if (editKey && editKey.length < 4) e.edit_key = t('create.errors.editKeyLength');
        if (deadline && deadline.getTime() <= Date.now()) e.deadline = t('create.errors.deadlineFuture');
        if (notify && !ownerEmail.trim() && !user?.email) e.owner_email = t('create.errors.emailForNotify');
        return e;
    };

    const submit = async () => {
        const e = validate();
        setErrors(e);
        setFormError(null);
        if (Object.keys(e).length) {
            setFormError(t('create.errors.fixFields'));
            return;
        }
        const input: ScheduleInput = {
            name: name.trim(),
            owner_name: ownerName.trim(),
            description: description.trim(),
            owner_email: ownerEmail.trim() || undefined,
            notify_on_response: notify,
            edit_key: editKey || undefined,
            deadline: deadline ? deadline.toISOString() : null,
            timezone_name: deviceTimeZone(),
            allow_maybe: allowMaybe,
            candidates: candidates.map((c, index) => ({
                start_at: combineDateTime(c.day, c.start).toISOString(),
                end_at: combineDateTime(c.day, c.end).toISOString(),
                order: index,
            })),
        };
        setSubmitting(true);
        try {
            const created = await api.createSchedule(input);
            const key = created._edit_key ?? editKey;
            if (key) await setEditKey(created.uuid, key);
            await rememberEvent(created.uuid, created.name, 'owner');
            navigation.replace('EventDetail', { uuid: created.uuid, created: true });
        } catch (err) {
            if (err instanceof ApiError) setErrors(err.fieldErrors);
            setFormError(errorMessage(err, t('common.genericError'), t('common.networkError')));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Screen>
            <Card>
                <SectionTitle>{t('create.basics')}</SectionTitle>
                <TextField label={`${t('create.name')} *`} value={name} onChangeText={setName} placeholder={t('create.namePlaceholder')} error={errors.name} maxLength={200} />
                <TextField label={`${t('create.ownerName')} *`} value={ownerName} onChangeText={setOwnerName} error={errors.owner_name} maxLength={100} />
                <TextField
                    label={t('create.description')}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    placeholder={t('create.descriptionPlaceholder')}
                    error={errors.description}
                />
            </Card>

            <Card>
                <SectionTitle>{t('create.candidates')}</SectionTitle>
                <Body muted>{t('create.candidatesHint')}</Body>
                {errors.candidates ? <ErrorBanner message={errors.candidates} /> : null}
                {candidates.map((c, index) => (
                    <View key={c.key} style={{ gap: 8, paddingVertical: 8 }}>
                        <Body style={{ fontWeight: '700' }}>{t('create.candidateN', { n: index + 1 })}</Body>
                        <DateTimeField label={t('create.date')} mode="date" value={c.day} minimumDate={new Date()} onChange={(day) => updateCandidate(c.key, { day })} />
                        <Row>
                            <View style={{ flex: 1, minWidth: 120 }}>
                                <DateTimeField label={t('create.start')} mode="time" value={c.start} onChange={(start) => updateCandidate(c.key, { start })} />
                            </View>
                            <View style={{ flex: 1, minWidth: 120 }}>
                                <DateTimeField
                                    label={t('create.end')}
                                    mode="time"
                                    value={c.end}
                                    onChange={(end) => updateCandidate(c.key, { end })}
                                    error={errors[`c${c.key}`]}
                                />
                            </View>
                        </Row>
                        {candidates.length > 1 ? (
                            <Button title={t('create.removeCandidate')} variant="ghost" small onPress={() => removeCandidate(c.key)} />
                        ) : null}
                    </View>
                ))}
                <Button title={t('create.addCandidate')} variant="secondary" onPress={addCandidate} disabled={candidates.length >= 100} />
            </Card>

            <Card>
                <SectionTitle>{t('create.options')}</SectionTitle>
                <SwitchRow label={t('create.allowMaybe')} value={allowMaybe} onValueChange={setAllowMaybe} />
                <DateTimeField
                    label={t('create.deadline')}
                    mode="datetime"
                    value={deadline}
                    placeholder={t('create.noDeadline')}
                    minimumDate={new Date()}
                    onChange={setDeadline}
                    onClear={() => setDeadline(null)}
                    clearLabel={t('create.clearDeadline')}
                    error={errors.deadline}
                />
                <TextField
                    label={t('create.editKey')}
                    hint={t('create.editKeyHint')}
                    value={editKey}
                    onChangeText={setEditKeyInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    error={errors.edit_key}
                    maxLength={100}
                />
                <TextField
                    label={t('create.ownerEmail')}
                    hint={user?.email ? t('create.ownerEmailAccountHint') : t('create.ownerEmailHint')}
                    value={ownerEmail}
                    onChangeText={setOwnerEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.owner_email}
                />
                <SwitchRow label={t('create.notifyOnResponse')} value={notify} onValueChange={setNotify} />
            </Card>

            {formError ? <ErrorBanner message={formError} /> : null}
            <Button title={t('create.submit')} onPress={submit} loading={submitting} />
        </Screen>
    );
}
