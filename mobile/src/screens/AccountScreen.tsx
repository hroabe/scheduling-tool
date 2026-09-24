import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';

import { ApiError } from '../api';
import { Body, Button, Card, Choice, ErrorBanner, ListItem, Row, Screen, SectionTitle, SwitchRow, TextField, Title } from '../components/ui';
import { API_URL, WEB_URL } from '../config';
import { LOCALE_NAMES, SUPPORTED_LOCALES, useI18n, type Locale } from '../i18n';
import { confirmAsync, errorMessage, notify } from '../lib/dialogs';
import { openExternal } from '../lib/share';
import type { TabScreenProps } from '../navigation/types';
import { useAuthStore } from '../stores/authStore';
import { useAvailabilitySymbols, useTheme, type ThemeMode } from '../theme';

export default function AccountScreen({ navigation }: TabScreenProps<'Account'>) {
    const { t } = useI18n();
    const token = useAuthStore((s) => s.token);
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const refreshUser = useAuthStore((s) => s.refreshUser);
    const [refreshing, setRefreshing] = useState(false);

    const refresh = async () => {
        setRefreshing(true);
        await refreshUser().catch(() => undefined);
        setRefreshing(false);
    };

    return (
        <Screen refreshing={refreshing} onRefresh={token ? refresh : undefined}>
            {token ? (
                <>
                    <Title>{user ? t('account.hello', { name: user.first_name || user.username }) : t('account.title')}</Title>
                    {user ? <ProfileCard /> : null}
                    <Card>
                        <SectionTitle>{t('account.menu')}</SectionTitle>
                        <ListItem title={t('account.myEvents')} subtitle={t('account.myEventsHint')} onPress={() => navigation.navigate('Home')} />
                        <ListItem title={t('account.availabilityPages')} onPress={() => navigation.navigate('OneOnOne')} />
                        <ListItem title={t('account.myBookings')} onPress={() => navigation.navigate('MyBookings')} />
                        <ListItem
                            title={t('account.integrations')}
                            subtitle={t('account.integrationsHint')}
                            onPress={() => openExternal(`${WEB_URL}/account/integrations`)}
                        />
                    </Card>
                    <Button
                        title={t('auth.logout')}
                        variant="ghost"
                        onPress={async () => {
                            const ok = await confirmAsync(t('auth.logout'), t('auth.logoutConfirm'), {
                                ok: t('auth.logout'),
                                cancel: t('common.cancel'),
                            });
                            if (ok) await logout();
                        }}
                    />
                </>
            ) : (
                <>
                    <Title>{t('account.title')}</Title>
                    <Card>
                        <Body>{t('account.loginPitch')}</Body>
                        <Button title={t('auth.login')} onPress={() => navigation.navigate('Login')} />
                        <Button title={t('auth.register')} variant="secondary" onPress={() => navigation.navigate('Register')} />
                    </Card>
                </>
            )}
            <SettingsCard />
            <AboutCard />
        </Screen>
    );
}

function ProfileCard() {
    const { t } = useI18n();
    const user = useAuthStore((s) => s.user)!;
    const updateProfile = useAuthStore((s) => s.updateProfile);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ last_name: user.last_name, first_name: user.first_name, email: user.email });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm({ last_name: user.last_name, first_name: user.first_name, email: user.email });
    }, [user]);

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            await updateProfile({ ...form, email: form.email.trim() });
            setEditing(false);
            notify(t('account.saved'));
        } catch (e) {
            if (e instanceof ApiError) setErrors(e.fieldErrors);
            setError(errorMessage(e, t('common.genericError'), t('common.networkError')));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <SectionTitle right={!editing ? <Button title={t('common.edit')} variant="ghost" small onPress={() => setEditing(true)} /> : null}>
                {t('account.profile')}
            </SectionTitle>
            {!editing ? (
                <>
                    <Body>{[user.last_name, user.first_name].filter(Boolean).join(' ') || user.username}</Body>
                    <Body muted>@{user.username}</Body>
                    <Body muted>{user.email || t('account.noEmail')}</Body>
                </>
            ) : (
                <>
                    <Row>
                        <TextField label={t('auth.lastName')} value={form.last_name} onChangeText={(v) => setForm((f) => ({ ...f, last_name: v }))} style={{ flex: 1, minWidth: 120 }} />
                        <TextField label={t('auth.firstName')} value={form.first_name} onChangeText={(v) => setForm((f) => ({ ...f, first_name: v }))} style={{ flex: 1, minWidth: 120 }} />
                    </Row>
                    <TextField
                        label={t('auth.email')}
                        value={form.email}
                        onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        error={errors.email}
                    />
                    {error ? <ErrorBanner message={error} /> : null}
                    <Row>
                        <Button title={t('common.save')} small onPress={save} loading={saving} />
                        <Button title={t('common.cancel')} variant="ghost" small onPress={() => setEditing(false)} disabled={saving} />
                    </Row>
                </>
            )}
        </Card>
    );
}

function SettingsCard() {
    const { t, locale, setLocale, isManual } = useI18n();
    const { mode, setMode, cute, setCute } = useTheme();
    const symbols = useAvailabilitySymbols();

    const languageOptions: { value: Locale | 'system'; label: string }[] = [
        { value: 'system', label: t('settings.systemLanguage') },
        ...SUPPORTED_LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] })),
    ];
    const themeOptions: { value: ThemeMode; label: string }[] = [
        { value: 'system', label: t('settings.themeSystem') },
        { value: 'light', label: t('settings.themeLight') },
        { value: 'dark', label: t('settings.themeDark') },
    ];

    return (
        <Card>
            <SectionTitle>{t('settings.title')}</SectionTitle>
            <Choice
                label={t('settings.language')}
                options={languageOptions}
                value={isManual ? locale : 'system'}
                onChange={(value) => setLocale(value === 'system' ? null : value)}
            />
            <Choice label={t('settings.theme')} options={themeOptions} value={mode} onChange={setMode} />
            <SwitchRow
                label={t('settings.cuteMode')}
                hint={t('settings.cuteModeHint', { symbols: `${symbols.ok} ${symbols.maybe} ${symbols.ng}` })}
                value={cute}
                onValueChange={setCute}
            />
        </Card>
    );
}

function AboutCard() {
    const { t } = useI18n();
    return (
        <Card>
            <SectionTitle>{t('settings.about')}</SectionTitle>
            <Body muted>{t('settings.version', { version: Constants.expoConfig?.version ?? '-' })}</Body>
            <Body muted selectable>
                {t('settings.apiServer', { url: API_URL })}
            </Body>
            <Button title={t('settings.openWeb')} variant="ghost" small onPress={() => openExternal(WEB_URL)} />
        </Card>
    );
}
