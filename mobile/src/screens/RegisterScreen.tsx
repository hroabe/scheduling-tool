import React, { useState } from 'react';

import { ApiError } from '../api';
import { Body, Button, Card, ErrorBanner, Row, Screen, TextField, Title } from '../components/ui';
import { useI18n } from '../i18n';
import { errorMessage } from '../lib/dialogs';
import type { RootScreenProps } from '../navigation/types';
import { useAuthStore } from '../stores/authStore';

export default function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
    const { t } = useI18n();
    const register = useAuthStore((s) => s.register);
    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        password_confirm: '',
        last_name: '',
        first_name: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

    const submit = async () => {
        const e: Record<string, string> = {};
        if (!form.username.trim()) e.username = t('auth.required');
        if (!form.email.trim()) e.email = t('auth.required');
        if (!form.password) e.password = t('auth.required');
        if (form.password !== form.password_confirm) e.password_confirm = t('auth.passwordMismatch');
        setErrors(e);
        if (Object.keys(e).length) {
            setError(t('auth.fillAllFields'));
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await register({
                ...form,
                username: form.username.trim(),
                email: form.email.trim(),
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
            });
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.replace('Main');
        } catch (err) {
            if (err instanceof ApiError) setErrors(err.fieldErrors);
            setError(errorMessage(err, t('auth.registerError'), t('common.networkError')));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen>
            <Title>{t('auth.registerTitle')}</Title>
            <Body muted>{t('auth.registerSubtitle')}</Body>
            <Card>
                <TextField label={t('auth.username')} value={form.username} onChangeText={set('username')} autoCapitalize="none" autoCorrect={false} error={errors.username} />
                <TextField
                    label={t('auth.email')}
                    value={form.email}
                    onChangeText={set('email')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    error={errors.email}
                />
                <Row>
                    <TextField label={t('auth.lastName')} value={form.last_name} onChangeText={set('last_name')} style={{ flex: 1, minWidth: 120 }} />
                    <TextField label={t('auth.firstName')} value={form.first_name} onChangeText={set('first_name')} style={{ flex: 1, minWidth: 120 }} />
                </Row>
                <TextField
                    label={t('auth.password')}
                    value={form.password}
                    onChangeText={set('password')}
                    secureTextEntry
                    autoComplete="new-password"
                    textContentType="newPassword"
                    hint={t('auth.passwordHint')}
                    error={errors.password}
                />
                <TextField
                    label={t('auth.confirmPassword')}
                    value={form.password_confirm}
                    onChangeText={set('password_confirm')}
                    secureTextEntry
                    error={errors.password_confirm}
                />
                {error ? <ErrorBanner message={error} /> : null}
                <Button title={t('auth.register')} onPress={submit} loading={loading} />
            </Card>
            <Button title={t('auth.hasAccount')} variant="ghost" onPress={() => navigation.replace('Login')} />
        </Screen>
    );
}
