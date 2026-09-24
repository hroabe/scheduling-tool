'use client';

/**
 * Sign-up. `?email=` pre-fills the e-mail address and `?next=` is respected afterwards.
 */

import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
    Alert,
    AlertIcon,
    Button,
    Divider,
    FormControl,
    FormErrorMessage,
    FormHelperText,
    FormLabel,
    Input,
    Link as ChakraLink,
    SimpleGrid,
    Text,
    VStack,
    useToast,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/providers/I18nProvider';
import { useAuthStore } from '@/stores/authStore';
import type { RegisterInput } from '@/types';
import { AuthCard } from './AuthCard';
import { apiErrorMessage, fieldErrors, safeNextPath } from './utils';

type FormState = Required<RegisterInput>;
const FIELDS: (keyof FormState)[] = ['last_name', 'first_name', 'username', 'email', 'password', 'password_confirm'];

export function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const toast = useToast();
    const { t } = useI18n();
    const register = useAuthStore((state) => state.register);

    const next = safeNextPath(searchParams.get('next'));
    const [form, setForm] = useState<FormState>({
        username: '',
        email: searchParams.get('email') ?? '',
        password: '',
        password_confirm: '',
        first_name: '',
        last_name: '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validate = (): boolean => {
        const nextErrors: Partial<Record<keyof FormState, string>> = {};
        if (!form.username.trim()) nextErrors.username = t('auth.register.required');
        if (!form.email.trim()) nextErrors.email = t('auth.register.required');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = t('auth.register.invalidEmail');
        if (!form.password) nextErrors.password = t('auth.register.required');
        if (form.password !== form.password_confirm) nextErrors.password_confirm = t('auth.register.passwordMismatch');
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setFormError(null);
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            await register({ ...form, username: form.username.trim(), email: form.email.trim() });
            toast({ title: t('auth.register.success'), status: 'success', duration: 3000 });
            router.replace(next);
        } catch (err) {
            const byField = fieldErrors(err);
            const known = Object.fromEntries(Object.entries(byField).filter(([key]) => FIELDS.includes(key as keyof FormState)));
            setErrors(known);
            if (Object.keys(known).length === 0) setFormError(apiErrorMessage(err, t));
            setIsSubmitting(false);
        }
    };

    const loginHref = `/login${next !== '/account' ? `?next=${encodeURIComponent(next)}` : ''}`;

    const field = (name: keyof FormState, props: { type?: string; autoComplete: string; help?: string; required?: boolean }) => (
        <FormControl isRequired={props.required} isInvalid={!!errors[name]}>
            <FormLabel>{t(`auth.register.${name}`)}</FormLabel>
            <Input
                name={name}
                type={props.type ?? 'text'}
                autoComplete={props.autoComplete}
                value={form[name]}
                onChange={handleChange}
            />
            {errors[name] ? (
                <FormErrorMessage>{errors[name]}</FormErrorMessage>
            ) : (
                props.help && <FormHelperText>{props.help}</FormHelperText>
            )}
        </FormControl>
    );

    return (
        <AuthCard title={t('auth.register.title')} description={t('auth.register.description')}>
            {formError && (
                <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {formError}
                </Alert>
            )}
            <VStack as="form" spacing={4} align="stretch" onSubmit={handleSubmit} noValidate>
                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                    {field('last_name', { autoComplete: 'family-name' })}
                    {field('first_name', { autoComplete: 'given-name' })}
                </SimpleGrid>
                {field('username', { autoComplete: 'username', required: true, help: t('auth.register.usernameHelp') })}
                {field('email', { type: 'email', autoComplete: 'email', required: true })}
                {field('password', {
                    type: 'password',
                    autoComplete: 'new-password',
                    required: true,
                    help: t('auth.register.passwordHelp'),
                })}
                {field('password_confirm', { type: 'password', autoComplete: 'new-password', required: true })}
                <Button type="submit" size="lg" isLoading={isSubmitting}>
                    {t('auth.register.submit')}
                </Button>
            </VStack>
            <Divider />
            <Text fontSize="sm" color="text.muted" textAlign="center">
                {t('auth.register.hasAccount')}{' '}
                <ChakraLink as={NextLink} href={loginHref} color="brand.fg" fontWeight="semibold">
                    {t('auth.register.login')}
                </ChakraLink>
            </Text>
        </AuthCard>
    );
}
