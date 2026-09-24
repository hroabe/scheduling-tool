import React, { useState } from 'react';

import { api, ApiError } from '../api';
import { Button, Card, Choice, ErrorBanner, Screen, SwitchRow, TextField } from '../components/ui';
import { useI18n } from '../i18n';
import { deviceTimeZone } from '../lib/date';
import { errorMessage } from '../lib/dialogs';
import { isValidSlug, randomSuffix, suggestSlug } from '../lib/slug';
import type { RootScreenProps } from '../navigation/types';

const DURATIONS = [15, 30, 45, 60, 90];
const BUFFERS = [0, 5, 10, 15, 30];

export default function CreateAvailabilityPageScreen({ navigation }: RootScreenProps<'CreateAvailabilityPage'>) {
    const { t } = useI18n();
    const [suffix] = useState(randomSuffix);
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [slugEdited, setSlugEdited] = useState(false);
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState(30);
    const [buffer, setBuffer] = useState(0);
    const [isPublic, setIsPublic] = useState(true);
    const [notify, setNotify] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const effectiveSlug = slugEdited ? slug : title.trim() ? suggestSlug(title, suffix) : '';

    const submit = async () => {
        const e: Record<string, string> = {};
        if (!title.trim()) e.title = t('pages.errors.titleRequired');
        if (!isValidSlug(effectiveSlug)) e.slug = t('pages.errors.slugInvalid');
        setErrors(e);
        if (Object.keys(e).length) return;
        setSaving(true);
        setError(null);
        try {
            await api.createPage({
                title: title.trim(),
                slug: effectiveSlug,
                description: description.trim(),
                duration_minutes: duration,
                buffer_minutes: buffer,
                is_public: isPublic,
                notify_on_booking: notify,
                timezone_name: deviceTimeZone(),
            });
            // The create response has no id; look the page up by slug
            let id: number | null = null;
            for (let page = 1; page <= 10 && id === null; page += 1) {
                const res = await api.listPages(page);
                id = res.results.find((p) => p.slug === effectiveSlug)?.id ?? null;
                if (!res.next) break;
            }
            if (id !== null) navigation.replace('AvailabilityPageDetail', { id, title: title.trim() });
            else navigation.goBack();
        } catch (err) {
            if (err instanceof ApiError) setErrors(err.fieldErrors);
            setError(errorMessage(err, t('common.genericError'), t('common.networkError')));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Screen>
            <Card>
                <TextField label={`${t('pages.pageTitle')} *`} value={title} onChangeText={setTitle} placeholder={t('pages.pageTitlePlaceholder')} error={errors.title} maxLength={200} />
                <TextField
                    label={t('pages.slug')}
                    hint={t('pages.slugHint', { slug: effectiveSlug || 'my-page' })}
                    value={effectiveSlug}
                    onChangeText={(v) => {
                        setSlugEdited(true);
                        setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.slug}
                    maxLength={100}
                />
                <TextField label={t('pages.description')} value={description} onChangeText={setDescription} multiline />
                <Choice
                    label={t('pages.duration')}
                    options={DURATIONS.map((m) => ({ value: m, label: t('pages.minutes', { n: m }) }))}
                    value={duration}
                    onChange={setDuration}
                />
                <Choice
                    label={t('pages.buffer')}
                    options={BUFFERS.map((m) => ({ value: m, label: t('pages.minutes', { n: m }) }))}
                    value={buffer}
                    onChange={setBuffer}
                />
                <SwitchRow label={t('pages.isPublic')} hint={t('pages.isPublicHint')} value={isPublic} onValueChange={setIsPublic} />
                <SwitchRow label={t('pages.notifyOnBooking')} value={notify} onValueChange={setNotify} />
            </Card>
            {error ? <ErrorBanner message={error} /> : null}
            <Button title={t('pages.createSubmit')} onPress={submit} loading={saving} />
        </Screen>
    );
}
