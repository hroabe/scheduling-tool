/**
 * Event detail: summary + response table, respond / edit own response (edit token in secure storage),
 * share, CSV/ICS export, and organizer actions (owner account or edit key via X-Edit-Key).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, ApiError, type AttendanceStatus, type Candidate, type Participant, type Schedule } from '../api';
import { Badge, Body, Button, Card, Choice, ErrorBanner, InfoBanner, Loading, Row, Screen, SectionTitle, TextField, Title } from '../components/ui';
import { WEB_URL } from '../config';
import { useI18n } from '../i18n';
import { formatDateTime, formatRange } from '../lib/date';
import { confirmAsync, errorMessage, notify } from '../lib/dialogs';
import { copyText, openExternal, shareLink } from '../lib/share';
import { scoreCandidates } from '../lib/summary';
import { symbolFor } from '../lib/symbols';
import type { RootScreenProps } from '../navigation/types';
import {
    forgetEvent,
    getEditKey,
    getMyResponse,
    rememberEvent,
    removeEditKey,
    removeMyResponse,
    setEditKey,
    setMyResponse,
    type StoredResponse,
} from '../stores/localEvents';
import { useAvailabilitySymbols, useTheme } from '../theme';

const STATUS_TONE = { open: 'success', closed: 'warning', fixed: 'primary' } as const;

export default function EventDetailScreen({ navigation, route }: RootScreenProps<'EventDetail'>) {
    const { uuid, created } = route.params;
    const { t, locale } = useI18n();
    const { colors } = useTheme();
    const symbols = useAvailabilitySymbols();

    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [loadError, setLoadError] = useState<{ message: string; notFound: boolean } | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [editKey, setEditKeyState] = useState<string | null>(null);
    const [myResponse, setMyResponseState] = useState<StoredResponse | null>(null);

    const load = useCallback(async () => {
        try {
            const [data, key, mine] = await Promise.all([api.getSchedule(uuid), getEditKey(uuid), getMyResponse(uuid)]);
            setSchedule(data);
            setEditKeyState(key);
            setMyResponseState(mine);
            setLoadError(null);
            navigation.setOptions({ title: data.name });
            const role = data.is_owner || key ? 'owner' : mine ? 'participant' : 'viewer';
            rememberEvent(data.uuid, data.name, role);
        } catch (e) {
            setLoadError({
                message: errorMessage(e, t('common.genericError'), t('common.networkError')),
                notFound: e instanceof ApiError && e.status === 404,
            });
        }
    }, [uuid, navigation, t]);

    useEffect(() => {
        load();
    }, [load]);

    const refresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    if (!schedule) {
        if (!loadError) return <Loading />;
        return (
            <Screen>
                <ErrorBanner
                    message={loadError.notFound ? t('event.notFound') : loadError.message}
                    onRetry={loadError.notFound ? undefined : load}
                    retryLabel={t('common.retry')}
                />
            </Screen>
        );
    }

    const canManage = schedule.is_owner || !!editKey;
    const shareUrl = `${WEB_URL}/event/${schedule.uuid}`;
    const myParticipant =
        myResponse &&
        (schedule.participants.find((p) => p.id === myResponse.participantId) ??
            (myResponse.participantId === null ? schedule.participants.find((p) => p.name === myResponse.name) : undefined));

    return (
        <Screen refreshing={refreshing} onRefresh={refresh}>
            {created && editKey ? <CreatedBanner editKey={editKey} /> : null}

            <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                    <Title style={{ flex: 1 }}>{schedule.name}</Title>
                    <Badge label={t(`status.${schedule.status}`)} tone={STATUS_TONE[schedule.status]} />
                </Row>
                <Body muted>{t('event.organizer', { name: schedule.owner_name })}</Body>
                {schedule.description ? <Body selectable>{schedule.description}</Body> : null}
                {schedule.deadline ? (
                    <Body muted>{t('event.deadline', { date: formatDateTime(schedule.deadline, locale) })}</Body>
                ) : null}
                {schedule.meeting_url ? (
                    <Button title={t('event.joinMeeting')} variant="secondary" small onPress={() => openExternal(schedule.meeting_url!)} />
                ) : null}
            </Card>

            {schedule.is_finalized && schedule.finalized_candidate ? (
                <FinalizedCard schedule={schedule} />
            ) : null}

            <ShareCard schedule={schedule} shareUrl={shareUrl} />
            <SummaryCard schedule={schedule} canManage={canManage} editKey={editKey} onUpdated={setSchedule} />
            <ResponsesTable schedule={schedule} highlightId={myParticipant ? myParticipant.id : null} />

            <RespondCard
                schedule={schedule}
                myParticipant={myParticipant || null}
                myResponse={myResponse}
                onSaved={async () => {
                    setMyResponseState(await getMyResponse(uuid));
                    await load();
                }}
            />

            <OrganizerCard
                schedule={schedule}
                canManage={canManage}
                editKey={editKey}
                onEditKey={async (key) => {
                    if (key) await setEditKey(uuid, key);
                    else await removeEditKey(uuid);
                    setEditKeyState(key);
                }}
                onUpdated={setSchedule}
                onDeleted={async () => {
                    await forgetEvent(uuid);
                    navigation.popToTop();
                }}
            />
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>
                {t('event.symbolsLegend', { ok: symbols.ok, maybe: symbols.maybe, ng: symbols.ng })}
            </Text>
        </Screen>
    );
}

// ---------------------------------------------------------------- sections

function CreatedBanner({ editKey }: { editKey: string }) {
    const { t } = useI18n();
    const [visible, setVisible] = useState(false);
    return (
        <InfoBanner>
            <Body style={{ fontWeight: '700' }}>{t('event.createdTitle')}</Body>
            <Body>{t('event.createdBody')}</Body>
            <Row style={{ marginTop: 8 }}>
                <Body selectable style={{ fontFamily: 'monospace' }}>
                    {visible ? editKey : '••••••••'}
                </Body>
                <Button title={visible ? t('event.hideKey') : t('event.showKey')} variant="ghost" small onPress={() => setVisible((v) => !v)} />
                <Button
                    title={t('common.copy')}
                    variant="ghost"
                    small
                    onPress={async () => notify((await copyText(editKey)) ? t('common.copied') : t('common.genericError'))}
                />
            </Row>
        </InfoBanner>
    );
}

function FinalizedCard({ schedule }: { schedule: Schedule }) {
    const { t, locale } = useI18n();
    const candidate = schedule.candidates.find((c) => c.id === schedule.finalized_candidate);
    if (!candidate) return null;
    return (
        <InfoBanner>
            <Body style={{ fontWeight: '700' }}>{t('event.finalizedTitle')}</Body>
            <Body>{formatRange(candidate.start_at, candidate.end_at, locale)}</Body>
            <Button
                title={t('event.addToCalendar')}
                variant="secondary"
                small
                onPress={() => openExternal(api.exportIcsUrl(schedule.uuid, candidate.id))}
            />
        </InfoBanner>
    );
}

function ShareCard({ schedule, shareUrl }: { schedule: Schedule; shareUrl: string }) {
    const { t } = useI18n();
    return (
        <Card>
            <SectionTitle>{t('event.shareTitle')}</SectionTitle>
            <Body muted selectable numberOfLines={2}>
                {shareUrl}
            </Body>
            <Row>
                <Button
                    title={t('event.share')}
                    small
                    onPress={async () => {
                        const result = await shareLink(shareUrl, t('event.shareMessage', { name: schedule.name }));
                        if (result === 'copied') notify(t('common.copied'));
                    }}
                />
                <Button
                    title={t('common.copy')}
                    variant="ghost"
                    small
                    onPress={async () => notify((await copyText(shareUrl)) ? t('common.copied') : t('common.genericError'))}
                />
                <Button title="CSV" variant="ghost" small accessibilityLabel={t('event.exportCsv')} onPress={() => openExternal(api.exportCsvUrl(schedule.uuid))} />
                <Button title="ICS" variant="ghost" small accessibilityLabel={t('event.exportIcs')} onPress={() => openExternal(api.exportIcsUrl(schedule.uuid))} />
            </Row>
        </Card>
    );
}

function SummaryCard({
    schedule,
    canManage,
    editKey,
    onUpdated,
}: {
    schedule: Schedule;
    canManage: boolean;
    editKey: string | null;
    onUpdated: (s: Schedule) => void;
}) {
    const { t, locale } = useI18n();
    const { colors, radius } = useTheme();
    const symbols = useAvailabilitySymbols();
    const scores = useMemo(() => scoreCandidates(schedule.candidates), [schedule.candidates]);
    const [busyId, setBusyId] = useState<number | null>(null);

    const finalize = async (candidate: Candidate | null) => {
        const ok = await confirmAsync(
            candidate ? t('event.finalizeTitle') : t('event.unfinalizeTitle'),
            candidate ? formatRange(candidate.start_at, candidate.end_at, locale) : t('event.unfinalizeMessage'),
            { ok: t('common.ok'), cancel: t('common.cancel') },
        );
        if (!ok) return;
        setBusyId(candidate?.id ?? -1);
        try {
            onUpdated(await api.finalize(schedule.uuid, candidate?.id ?? null, editKey));
        } catch (e) {
            notify(t('common.error'), errorMessage(e, t('common.genericError'), t('common.networkError')));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Card>
            <SectionTitle>{t('event.summaryTitle', { count: schedule.participants.length })}</SectionTitle>
            {scores.map(({ candidate, score, isRecommended }) => {
                const finalized = schedule.finalized_candidate === candidate.id;
                return (
                    <View
                        key={candidate.id}
                        style={[
                            styles.candidate,
                            {
                                borderColor: finalized || isRecommended ? colors.primary : colors.border,
                                backgroundColor: finalized ? colors.primarySubtle : colors.card,
                                borderRadius: radius,
                            },
                        ]}
                    >
                        <Row style={{ justifyContent: 'space-between' }}>
                            <Body style={{ fontWeight: '600', flex: 1 }}>{formatRange(candidate.start_at, candidate.end_at, locale)}</Body>
                            {finalized ? <Badge label={t('event.finalizedBadge')} tone="primary" /> : null}
                            {!finalized && isRecommended ? <Badge label={t('event.recommended')} tone="success" /> : null}
                        </Row>
                        {candidate.note ? <Body muted>{candidate.note}</Body> : null}
                        <Body
                            muted
                            accessibilityLabel={t('event.countsA11y', {
                                ok: candidate.ok_count,
                                maybe: candidate.maybe_count,
                                ng: candidate.ng_count,
                            })}
                        >
                            {`${symbols.ok} ${candidate.ok_count}   ${schedule.allow_maybe ? `${symbols.maybe} ${candidate.maybe_count}   ` : ''}${symbols.ng} ${candidate.ng_count}   · ${t('event.score', { score })}`}
                        </Body>
                        {canManage && !finalized ? (
                            <Button
                                title={t('event.finalizeThis')}
                                variant="ghost"
                                small
                                loading={busyId === candidate.id}
                                disabled={busyId !== null}
                                onPress={() => finalize(candidate)}
                            />
                        ) : null}
                    </View>
                );
            })}
            {canManage && schedule.is_finalized ? (
                <Button title={t('event.unfinalize')} variant="ghost" small loading={busyId === -1} onPress={() => finalize(null)} />
            ) : null}
        </Card>
    );
}

function ResponsesTable({ schedule, highlightId }: { schedule: Schedule; highlightId: number | null }) {
    const { t, locale } = useI18n();
    const { colors } = useTheme();
    const symbols = useAvailabilitySymbols();
    const candidates = useMemo(() => scoreCandidates(schedule.candidates).map((s) => s.candidate), [schedule.candidates]);

    if (schedule.participants.length === 0) {
        return (
            <Card>
                <SectionTitle>{t('event.responsesTitle')}</SectionTitle>
                <Body muted>{t('event.noResponses')}</Body>
            </Card>
        );
    }

    const statusOf = (p: Participant, c: Candidate) => p.attendances.find((a) => a.candidate === c.id)?.status;
    const colorOf = (status: AttendanceStatus | undefined) =>
        status === 'ok' ? colors.ok : status === 'maybe' ? colors.maybe : status === 'ng' ? colors.ng : colors.muted;

    return (
        <Card>
            <SectionTitle>{t('event.responsesTitle')}</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                    <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.nameCell, { color: colors.muted }]}>{t('event.participant')}</Text>
                        {candidates.map((c) => (
                            <Text key={c.id} style={[styles.cell, styles.headerCell, { color: colors.muted }]}>
                                {formatDateTime(c.start_at, locale)}
                            </Text>
                        ))}
                    </View>
                    {schedule.participants.map((p) => (
                        <View
                            key={p.id}
                            style={[
                                styles.tableRow,
                                { borderBottomColor: colors.border, backgroundColor: p.id === highlightId ? colors.primarySubtle : undefined },
                            ]}
                        >
                            <View style={styles.nameCell}>
                                <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                                    {p.name}
                                    {p.id === highlightId ? ` (${t('event.you')})` : ''}
                                </Text>
                                {p.comment ? (
                                    <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>
                                        {p.comment}
                                    </Text>
                                ) : null}
                            </View>
                            {candidates.map((c) => {
                                const status = statusOf(p, c);
                                return (
                                    <Text
                                        key={c.id}
                                        accessibilityLabel={status ? t(`attendance.${status}`) : t('attendance.none')}
                                        style={[styles.cell, styles.symbol, { color: colorOf(status) }]}
                                    >
                                        {symbolFor(symbols, status)}
                                    </Text>
                                );
                            })}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </Card>
    );
}

function RespondCard({
    schedule,
    myParticipant,
    myResponse,
    onSaved,
}: {
    schedule: Schedule;
    myParticipant: Participant | null;
    myResponse: StoredResponse | null;
    onSaved: () => Promise<void>;
}) {
    const { t, locale } = useI18n();
    const symbols = useAvailabilitySymbols();
    const candidates = useMemo(() => scoreCandidates(schedule.candidates).map((s) => s.candidate), [schedule.candidates]);
    const editing = !!(myResponse && myParticipant);

    const initialAnswers = useCallback((): Record<number, AttendanceStatus> => {
        const map: Record<number, AttendanceStatus> = {};
        myParticipant?.attendances.forEach((a) => {
            map[a.candidate] = a.status;
        });
        return map;
    }, [myParticipant]);

    const [name, setName] = useState(myParticipant?.name ?? '');
    const [comment, setComment] = useState(myParticipant?.comment ?? '');
    const [answers, setAnswers] = useState<Record<number, AttendanceStatus>>(initialAnswers);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<'save' | 'delete' | null>(null);

    useEffect(() => {
        setName(myParticipant?.name ?? '');
        setComment(myParticipant?.comment ?? '');
        setAnswers(initialAnswers());
    }, [myParticipant, initialAnswers]);

    if (!schedule.can_respond && !editing) {
        return (
            <Card>
                <SectionTitle>{t('event.respondTitle')}</SectionTitle>
                <Body muted>{t('event.respondClosed')}</Body>
            </Card>
        );
    }

    const options: { value: AttendanceStatus; label: string; accessibilityLabel: string }[] = [
        { value: 'ok', label: symbols.ok, accessibilityLabel: t('attendance.ok') },
        ...(schedule.allow_maybe
            ? [{ value: 'maybe' as const, label: symbols.maybe, accessibilityLabel: t('attendance.maybe') }]
            : []),
        { value: 'ng', label: symbols.ng, accessibilityLabel: t('attendance.ng') },
    ];

    const save = async () => {
        if (!name.trim()) {
            setError(t('event.nameRequired'));
            return;
        }
        const missing = candidates.filter((c) => !answers[c.id]);
        if (missing.length) {
            setError(t('event.answerAll'));
            return;
        }
        setError(null);
        setBusy('save');
        try {
            const result = await api.respond(
                schedule.uuid,
                {
                    name: name.trim(),
                    comment: comment.trim(),
                    attendances: candidates.map((c) => ({ candidate: c.id, status: answers[c.id] })),
                },
                editing ? myResponse!.token : null,
            );
            if (result.edit_token) await setMyResponse(schedule.uuid, result.edit_token, result.name);
            notify(editing ? t('event.updated') : t('event.submitted'));
            await onSaved();
        } catch (e) {
            setError(errorMessage(e, t('common.genericError'), t('common.networkError')));
        } finally {
            setBusy(null);
        }
    };

    const remove = async () => {
        if (!myParticipant || !myResponse) return;
        const ok = await confirmAsync(t('event.deleteResponseTitle'), t('event.deleteResponseMessage'), {
            ok: t('common.delete'),
            cancel: t('common.cancel'),
            destructive: true,
        });
        if (!ok) return;
        setBusy('delete');
        try {
            await api.deleteParticipant(schedule.uuid, myParticipant.id, { editToken: myResponse.token });
            await removeMyResponse(schedule.uuid);
            await onSaved();
        } catch (e) {
            setError(errorMessage(e, t('common.genericError'), t('common.networkError')));
        } finally {
            setBusy(null);
        }
    };

    return (
        <Card>
            <SectionTitle>{editing ? t('event.editResponseTitle') : t('event.respondTitle')}</SectionTitle>
            {editing ? <Body muted>{t('event.editingHint')}</Body> : null}
            {!schedule.can_respond ? <Body muted>{t('event.respondClosed')}</Body> : null}
            <TextField label={t('event.yourName')} value={name} onChangeText={setName} maxLength={100} />
            {candidates.map((c) => (
                <Choice
                    key={c.id}
                    label={formatRange(c.start_at, c.end_at, locale)}
                    options={options}
                    value={answers[c.id] ?? null}
                    onChange={(status) => setAnswers((prev) => ({ ...prev, [c.id]: status }))}
                />
            ))}
            <TextField label={t('event.comment')} value={comment} onChangeText={setComment} multiline maxLength={1000} />
            {error ? <ErrorBanner message={error} /> : null}
            <Button
                title={editing ? t('event.update') : t('event.submit')}
                onPress={save}
                loading={busy === 'save'}
                disabled={!!busy || !schedule.can_respond}
            />
            {editing ? (
                <Button title={t('event.deleteResponse')} variant="ghost" small onPress={remove} loading={busy === 'delete'} disabled={!!busy} />
            ) : null}
        </Card>
    );
}

function OrganizerCard({
    schedule,
    canManage,
    editKey,
    onEditKey,
    onUpdated,
    onDeleted,
}: {
    schedule: Schedule;
    canManage: boolean;
    editKey: string | null;
    onEditKey: (key: string | null) => Promise<void>;
    onUpdated: (s: Schedule) => void;
    onDeleted: () => Promise<void>;
}) {
    const { t } = useI18n();
    const [keyInput, setKeyInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const run = async (name: string, action: () => Promise<void>) => {
        setBusy(name);
        setError(null);
        try {
            await action();
        } catch (e) {
            setError(errorMessage(e, t('common.genericError'), t('common.networkError')));
        } finally {
            setBusy(null);
        }
    };

    if (!canManage) {
        return (
            <Card>
                <SectionTitle>{t('event.organizerTitle')}</SectionTitle>
                <Body muted>{t('event.enterKeyHint')}</Body>
                <TextField
                    label={t('event.editKey')}
                    value={keyInput}
                    onChangeText={setKeyInput}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={error}
                />
                <Button
                    title={t('event.verifyKey')}
                    variant="secondary"
                    disabled={!keyInput.trim()}
                    loading={busy === 'verify'}
                    onPress={() =>
                        run('verify', async () => {
                            try {
                                await api.verifyEditKey(schedule.uuid, keyInput.trim());
                            } catch (e) {
                                if (e instanceof ApiError && e.status === 403) throw new Error(t('event.wrongKey'));
                                throw e;
                            }
                            await onEditKey(keyInput.trim());
                            setKeyInput('');
                        })
                    }
                />
            </Card>
        );
    }

    return (
        <Card>
            <SectionTitle>{t('event.organizerTitle')}</SectionTitle>
            <Body muted>{schedule.is_owner ? t('event.managingAsOwner') : t('event.managingWithKey')}</Body>
            <Row>
                {schedule.status === 'open' ? (
                    <Button
                        title={t('event.close')}
                        variant="secondary"
                        small
                        loading={busy === 'close'}
                        disabled={!!busy}
                        onPress={() => run('close', async () => onUpdated(await api.close(schedule.uuid, editKey)))}
                    />
                ) : null}
                {schedule.status === 'closed' ? (
                    <Button
                        title={t('event.reopen')}
                        variant="secondary"
                        small
                        loading={busy === 'reopen'}
                        disabled={!!busy}
                        onPress={() => run('reopen', async () => onUpdated(await api.reopen(schedule.uuid, editKey)))}
                    />
                ) : null}
                {editKey ? (
                    <Button title={t('event.forgetKey')} variant="ghost" small disabled={!!busy} onPress={() => onEditKey(null)} />
                ) : null}
            </Row>
            <Body muted>{t('event.finalizeHint')}</Body>
            {error ? <ErrorBanner message={error} /> : null}
            <Button
                title={t('event.deleteEvent')}
                variant="danger"
                small
                loading={busy === 'delete'}
                disabled={!!busy}
                onPress={async () => {
                    const ok = await confirmAsync(t('event.deleteEventTitle'), t('event.deleteEventMessage', { name: schedule.name }), {
                        ok: t('common.delete'),
                        cancel: t('common.cancel'),
                        destructive: true,
                    });
                    if (ok) {
                        run('delete', async () => {
                            await api.deleteSchedule(schedule.uuid, editKey);
                            await onDeleted();
                        });
                    }
                }}
            />
        </Card>
    );
}

const styles = StyleSheet.create({
    candidate: { borderWidth: 1, padding: 12, gap: 4 },
    tableRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 44 },
    nameCell: { width: 130, paddingRight: 8, paddingVertical: 6 },
    cell: { width: 84, textAlign: 'center', paddingVertical: 6 },
    headerCell: { fontSize: 11 },
    symbol: { fontSize: 18, fontWeight: '700' },
});
