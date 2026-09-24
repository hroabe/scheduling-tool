'use client';

import {
    Box,
    Button,
    Divider,
    Icon,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalOverlay,
    Text,
    VStack,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/providers/I18nProvider';

interface ResponseSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    isUpdate?: boolean;
}

/** Shown after a response is submitted; invites the respondent to create their own event (viral loop) */
export function ResponseSuccessModal({ isOpen, onClose, isUpdate = false }: ResponseSuccessModalProps) {
    const { t } = useI18n();
    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm" motionPreset="scale">
            <ModalOverlay />
            <ModalContent mx={4} data-testid="response-success-modal">
                <ModalCloseButton />
                <ModalBody pt={10} pb={2}>
                    <VStack spacing={3} textAlign="center">
                        <Icon as={CheckCircle2} boxSize={14} color="green.500" aria-hidden />
                        <Text fontSize="xl" fontWeight="bold">
                            {isUpdate ? t('event.success.updated') : t('event.success.submitted')}
                        </Text>
                        <Text color="text.muted">{t('event.success.thanks')}</Text>

                        <Divider my={3} />

                        <Text fontWeight="semibold">{t('event.success.ctaTitle')}</Text>
                        <Box fontSize="sm" color="text.muted">
                            <Text>{t('event.success.ctaFree')}</Text>
                            <Text>{t('event.success.ctaExport')}</Text>
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter flexDirection="column" gap={2}>
                    <Button as={NextLink} href="/create?ref=response_cta" w="full" rightIcon={<ArrowRight size={16} />}>
                        {t('event.success.ctaButton')}
                    </Button>
                    <Button variant="ghost" colorScheme="gray" w="full" onClick={onClose}>
                        {t('common.close')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
