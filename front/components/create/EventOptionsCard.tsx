'use client';

import { useId, useState } from 'react';
import {
    Box,
    Button,
    Collapse,
    Divider,
    FormControl,
    FormErrorMessage,
    FormHelperText,
    FormLabel,
    IconButton,
    Input,
    InputGroup,
    InputRightElement,
    Switch,
    Text,
    Textarea,
    VStack,
} from '@chakra-ui/react';
import { ChevronDown, ChevronRight, Eye, EyeOff, Settings } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { useI18n } from '@/providers/I18nProvider';
import type { CreateFormValues } from './schema';

interface EventOptionsCardProps {
    isOpen: boolean;
    onToggle: () => void;
    register: UseFormRegister<CreateFormValues>;
    errors: FieldErrors<CreateFormValues>;
    /** true when the organizer e-mail is a valid address (enables notifications) */
    hasValidEmail: boolean;
}

/**
 * Optional settings, collapsed by default (RFC-0013 §2.8 / RFC-0012 §3.2):
 * description, department, organizer e-mail + notifications, edit key, deadline, allow △.
 */
export function EventOptionsCard({ isOpen, onToggle, register, errors, hasValidEmail }: EventOptionsCardProps) {
    const { t } = useI18n();
    const [showEditKey, setShowEditKey] = useState(false);
    const panelId = useId();
    const ids = {
        allowMaybe: useId(),
        notify: useId(),
    };
    const err = (message?: string) => (message ? t(message) : null);

    return (
        <Box
            as="section"
            bg="bg.card"
            borderRadius="xl"
            border="1px solid"
            borderColor="border.default"
            overflow="hidden"
        >
            <h2>
                <Button
                    w="full"
                    variant="ghost"
                    colorScheme="gray"
                    justifyContent="flex-start"
                    h="auto"
                    py={3}
                    px={4}
                    borderRadius="0"
                    onClick={onToggle}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    leftIcon={isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    rightIcon={<Settings size={16} aria-hidden />}
                    iconSpacing={2}
                >
                    <Box as="span" flex="1" textAlign="left">
                        <Text as="span" display="block" fontSize="sm" fontWeight="semibold">
                            {t('create.options')}
                        </Text>
                        <Text as="span" display="block" fontSize="xs" fontWeight="normal" color="text.muted" whiteSpace="normal">
                            {t('create.optionsDescription')}
                        </Text>
                    </Box>
                </Button>
            </h2>

            <Collapse in={isOpen} animateOpacity>
                <VStack id={panelId} spacing={5} align="stretch" p={4}>
                    <FormControl isInvalid={!!errors.description}>
                        <FormLabel fontSize="sm">{t('create.description')}</FormLabel>
                        <Textarea {...register('description')} placeholder={t('create.descriptionPlaceholder')} rows={3} />
                        <FormErrorMessage>{err(errors.description?.message)}</FormErrorMessage>
                    </FormControl>

                    <FormControl isInvalid={!!errors.department}>
                        <FormLabel fontSize="sm">{t('create.department')}</FormLabel>
                        <Input
                            {...register('department')}
                            placeholder={t('create.departmentPlaceholder')}
                            autoComplete="organization"
                        />
                        <FormErrorMessage>{err(errors.department?.message)}</FormErrorMessage>
                    </FormControl>

                    <Divider />

                    <FormControl isInvalid={!!errors.ownerEmail}>
                        <FormLabel fontSize="sm">{t('create.email')}</FormLabel>
                        <Input
                            {...register('ownerEmail')}
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            placeholder={t('create.emailPlaceholder')}
                        />
                        {errors.ownerEmail ? (
                            <FormErrorMessage>{err(errors.ownerEmail.message)}</FormErrorMessage>
                        ) : (
                            <FormHelperText fontSize="xs">{t('create.emailHelper')}</FormHelperText>
                        )}
                    </FormControl>

                    <FormControl display="flex" alignItems="flex-start" isDisabled={!hasValidEmail}>
                        <Switch id={ids.notify} {...register('notifyOnResponse')} colorScheme="brand" mr={3} mt={1} />
                        <Box>
                            <FormLabel htmlFor={ids.notify} mb="0" fontSize="sm">
                                {t('create.notifyOnResponse')}
                            </FormLabel>
                            <Text fontSize="xs" color="text.muted">
                                {hasValidEmail ? t('create.notifyOnResponseDescription') : t('create.notifyNeedsEmail')}
                            </Text>
                        </Box>
                    </FormControl>

                    <Divider />

                    <FormControl isInvalid={!!errors.editKey}>
                        <FormLabel fontSize="sm">{t('create.editKey')}</FormLabel>
                        <InputGroup>
                            <Input
                                {...register('editKey')}
                                type={showEditKey ? 'text' : 'password'}
                                placeholder={t('create.editKeyPlaceholder')}
                                autoComplete="new-password"
                            />
                            <InputRightElement>
                                <IconButton
                                    aria-label={showEditKey ? t('create.hideEditKey') : t('create.showEditKey')}
                                    aria-pressed={showEditKey}
                                    icon={showEditKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                    variant="ghost"
                                    colorScheme="gray"
                                    size="sm"
                                    onClick={() => setShowEditKey((v) => !v)}
                                />
                            </InputRightElement>
                        </InputGroup>
                        {errors.editKey ? (
                            <FormErrorMessage>{err(errors.editKey.message)}</FormErrorMessage>
                        ) : (
                            <FormHelperText fontSize="xs">{t('create.editKeyHelper')}</FormHelperText>
                        )}
                    </FormControl>

                    <FormControl isInvalid={!!errors.deadline}>
                        <FormLabel fontSize="sm">{t('create.deadline')}</FormLabel>
                        <Input {...register('deadline')} type="datetime-local" />
                        <FormErrorMessage>{err(errors.deadline?.message)}</FormErrorMessage>
                    </FormControl>

                    <FormControl display="flex" alignItems="flex-start">
                        <Switch id={ids.allowMaybe} {...register('allowMaybe')} colorScheme="brand" mr={3} mt={1} />
                        <Box>
                            <FormLabel htmlFor={ids.allowMaybe} mb="0" fontSize="sm">
                                {t('create.allowMaybe')}
                            </FormLabel>
                            <Text fontSize="xs" color="text.muted">
                                {t('create.allowMaybeDescription')}
                            </Text>
                        </Box>
                    </FormControl>
                </VStack>
            </Collapse>
        </Box>
    );
}
