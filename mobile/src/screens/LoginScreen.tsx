import React, { useState } from 'react';

import { ApiError } from '../api';
import { Body, Button, Card, ErrorBanner, Screen, TextField, Title } from '../components/ui';
import { useI18n } from '../i18n';
import { errorMessage } from '../lib/dialogs';
import type { RootScreenProps } from '../navigation/types';
import { useAuthStore } from '../stores/authStore';

export default function LoginScreen({ navigation }: RootScreenProps<'Login'>) {
    const { t } = useI18n();
    const login = useAuthStore((s) => s.login);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!username.trim() || !password) {
            setError(t('auth.fillAllFields'));
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await login(username.trim(), password);
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.replace('Main');
        } catch (e) {
            setError(
                e instanceof ApiError && e.status === 400
                    ? t('auth.invalidCredentials')
                    : e instanceof ApiError && e.status === 429
                      ? t('auth.tooManyAttempts')
                      : errorMessage(e, t('common.genericError'), t('common.networkError')),
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen>
            <Title>{t('auth.loginTitle')}</Title>
            <Body muted>{t('auth.loginSubtitle')}</Body>
            <Card>
                <TextField
                    label={t('auth.usernameOrEmail')}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                />
                <TextField
                    label={t('auth.password')}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="password"
                    textContentType="password"
                    onSubmitEditing={submit}
                />
                {error ? <ErrorBanner message={error} /> : null}
                <Button title={t('auth.login')} onPress={submit} loading={loading} />
            </Card>
            <Button title={t('auth.noAccount')} variant="ghost" onPress={() => navigation.replace('Register')} />
        </Screen>
    );
}
