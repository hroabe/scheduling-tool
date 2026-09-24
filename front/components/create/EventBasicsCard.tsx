'use client';

import { useId, useState } from 'react';
import NextLink from 'next/link';
import {
    Box,
    Button,
    FormControl,
    FormErrorMessage,
    FormLabel,
    HStack,
    Heading,
    Input,
    Link,
    Text,
    VStack,
    Wrap,
    WrapItem,
} from '@chakra-ui/react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { useI18n } from '@/providers/I18nProvider';
import type { CreateFormValues } from './schema';

const EVENT_NAME_TEMPLATES = ['teamMeeting', 'oneOnOne', 'interview', 'drinks', 'lunch', 'meeting'] as const;

interface EventBasicsCardProps {
    register: UseFormRegister<CreateFormValues>;
    errors: FieldErrors<CreateFormValues>;
    ownerName: string;
    onTemplateSelect: (name: string) => void;
    /** Enter in the event name moves focus to the calendar instead of submitting */
    onNameEnter: () => void;
    isSignedIn: boolean;
}

/** Event name (+ templates) and collapsible organizer (RFC-0013 §2.2) */
export function EventBasicsCard({ register, errors, ownerName, onTemplateSelect, onNameEnter, isSignedIn }: EventBasicsCardProps) {
    const { t } = useI18n();
    const headingId = useId();
    const [organizerExpanded, setOrganizerExpanded] = useState(false);
    // Show the input while the organizer is unknown, invalid or being edited
    const showOrganizerInput = organizerExpanded || !ownerName.trim() || !!errors.ownerName;
    const nameField = register('name');
    const ownerField = register('ownerName');

    return (
        <Box
            as="section"
            aria-labelledby={headingId}
            bg="bg.card"
            borderRadius="xl"
            border="1px solid"
            borderColor="border.default"
            p={{ base: 3, md: 4 }}
        >
            <VStack spacing={3} align="stretch">
                <Heading as="h2" size="sm" id={headingId}>
                    {t('create.basics')}
                </Heading>

                <FormControl isRequired isInvalid={!!errors.name}>
                    <FormLabel mb={1}>{t('create.eventName')}</FormLabel>
                    <Input
                        {...nameField}
                        placeholder={t('create.eventNamePlaceholder')}
                        autoComplete="off"
                        bg="bg.card"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                onNameEnter();
                            }
                        }}
                    />
                    <FormErrorMessage>{errors.name?.message ? t(errors.name.message) : null}</FormErrorMessage>
                </FormControl>

                <Box>
                    <Text id={`${headingId}-templates`} fontSize="xs" color="text.muted" mb={1}>
                        {t('create.templatesLabel')}
                    </Text>
                    <Wrap spacing={2} role="group" aria-labelledby={`${headingId}-templates`}>
                        {EVENT_NAME_TEMPLATES.map((key) => {
                            const label = t(`create.templates.${key}`);
                            return (
                                <WrapItem key={key}>
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        colorScheme="brand"
                                        borderRadius="full"
                                        onClick={() => onTemplateSelect(label)}
                                    >
                                        {label}
                                    </Button>
                                </WrapItem>
                            );
                        })}
                    </Wrap>
                </Box>

                {showOrganizerInput ? (
                    <FormControl isRequired isInvalid={!!errors.ownerName}>
                        <FormLabel mb={1}>{t('create.organizerName')}</FormLabel>
                        <HStack align="start">
                            <Input
                                {...ownerField}
                                placeholder={t('create.organizerNamePlaceholder')}
                                autoComplete="name"
                                bg="bg.card"
                                onFocus={() => setOrganizerExpanded(true)}
                                // Focus the field right after "change" was pressed
                                autoFocus={organizerExpanded}
                            />
                            {organizerExpanded && ownerName.trim() && !errors.ownerName && (
                                <Button variant="ghost" colorScheme="gray" onClick={() => setOrganizerExpanded(false)}>
                                    {t('create.organizerDone')}
                                </Button>
                            )}
                        </HStack>
                        <FormErrorMessage>{errors.ownerName?.message ? t(errors.ownerName.message) : null}</FormErrorMessage>
                    </FormControl>
                ) : (
                    <HStack spacing={2}>
                        <Text fontSize="sm" color="text.muted" data-testid="organizer-summary">
                            {t('create.organizerSummary', { name: ownerName })}
                        </Text>
                        <Button
                            size="sm"
                            variant="link"
                            colorScheme="brand"
                            aria-label={t('create.organizerChangeLabel')}
                            onClick={() => setOrganizerExpanded(true)}
                        >
                            {t('create.organizerChange')}
                        </Button>
                    </HStack>
                )}

                {isSignedIn && (
                    <Text fontSize="sm" color="text.muted" data-testid="signed-in-note">
                        {t('create.signedInNote')}{' '}
                        <Link as={NextLink} href="/account/events" color="brand.fg">
                            {t('create.myEventsLink')}
                        </Link>
                    </Text>
                )}
            </VStack>
        </Box>
    );
}
