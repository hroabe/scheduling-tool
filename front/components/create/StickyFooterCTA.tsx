'use client';

import { Box, Button, Stack, Text } from '@chakra-ui/react';
import { Copy, Link as LinkIcon } from 'lucide-react';
import { useI18n } from '@/providers/I18nProvider';

interface StickyFooterCTAProps {
    isPending: boolean;
    /** Which button started the pending request (shows the spinner on that one) */
    pendingAction?: 'copy' | 'open' | null;
    onCreateAndCopy: () => void;
    onCreateAndNavigate: () => void;
    hasTitle: boolean;
    candidateCount: number;
}

/**
 * Sticky footer with the two creation CTAs (RFC-0013 §2.1). The buttons stay enabled
 * so that pressing them shows the validation messages; missing items are hinted above.
 */
export function StickyFooterCTA({
    isPending,
    pendingAction,
    onCreateAndCopy,
    onCreateAndNavigate,
    hasTitle,
    candidateCount,
}: StickyFooterCTAProps) {
    const { t } = useI18n();
    const missing = [
        ...(hasTitle ? [] : [t('create.eventName')]),
        ...(candidateCount > 0 ? [] : [t('create.candidateDatesShort')]),
    ];

    return (
        <Box
            position="sticky"
            bottom={0}
            zIndex="sticky"
            bg="bg.card"
            borderTop="1px solid"
            borderColor="border.default"
            boxShadow="0 -2px 10px rgba(0,0,0,0.08)"
            px={4}
            py={3}
            pb="calc(12px + env(safe-area-inset-bottom))"
            data-testid="create-footer"
        >
            <Text fontSize="xs" color="text.muted" textAlign="center" mb={2} minH="1em" aria-live="polite">
                {missing.length > 0
                    ? t('create.missingFields', { fields: missing.join(t('create.listSeparator')) })
                    : t('create.readyToCreate', { count: candidateCount })}
            </Text>
            <Stack direction={{ base: 'column', sm: 'row' }} justify="center" spacing={{ base: 2, sm: 4 }} maxW="720px" mx="auto">
                <Button
                    type="button"
                    size="lg"
                    colorScheme="brand"
                    leftIcon={<Copy size={18} />}
                    isDisabled={isPending && pendingAction !== 'copy'}
                    isLoading={isPending && pendingAction === 'copy'}
                    loadingText={t('create.creating')}
                    onClick={onCreateAndCopy}
                    flex={{ sm: 1 }}
                >
                    {t('create.createAndCopy')}
                </Button>
                <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    colorScheme="brand"
                    leftIcon={<LinkIcon size={16} />}
                    isDisabled={isPending && pendingAction !== 'open'}
                    isLoading={isPending && pendingAction === 'open'}
                    loadingText={t('create.creating')}
                    onClick={onCreateAndNavigate}
                    flex={{ sm: 1 }}
                >
                    {t('create.createAndOpen')}
                </Button>
            </Stack>
        </Box>
    );
}
