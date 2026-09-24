'use client';

import { Center, Spinner, Text, VStack } from '@chakra-ui/react';
import { useI18n } from '@/providers/I18nProvider';

/** Full-width loading indicator (also used as Suspense fallback) */
export function CenteredSpinner({ label }: { label?: string }) {
    const { t } = useI18n();
    return (
        <Center py={{ base: 16, md: 24 }} role="status" aria-live="polite">
            <VStack spacing={3}>
                <Spinner size="lg" color="brand.fg" thickness="3px" />
                <Text color="text.muted" fontSize="sm">
                    {label ?? t('common.loading')}
                </Text>
            </VStack>
        </Center>
    );
}
