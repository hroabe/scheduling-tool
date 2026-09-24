'use client';

import { useState } from 'react';
import {
    Button,
    FormControl,
    FormErrorMessage,
    FormHelperText,
    FormLabel,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
} from '@chakra-ui/react';
import { useVerifyEditKey } from '@/hooks/useApi';
import { useI18n } from '@/providers/I18nProvider';

interface EditKeyModalProps {
    uuid: string;
    isOpen: boolean;
    onVerified: (editKey: string) => void;
    onCancel: () => void;
}

/** Asks for the event's edit key and verifies it against the API */
export function EditKeyModal({ uuid, isOpen, onVerified, onCancel }: EditKeyModalProps) {
    const { t } = useI18n();
    const [editKey, setEditKey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { mutate: verify, isPending } = useVerifyEditKey(uuid);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!editKey) {
            setError(t('edit.keyModal.required'));
            return;
        }
        verify(editKey, {
            onSuccess: (valid) => {
                if (valid) {
                    setError(null);
                    onVerified(editKey);
                } else {
                    setError(t('edit.keyModal.invalid'));
                }
            },
            onError: (err) => setError(err.message),
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onCancel} isCentered closeOnOverlayClick={false}>
            <ModalOverlay />
            <ModalContent mx={4} as="form" onSubmit={handleSubmit} data-testid="edit-key-modal">
                <ModalHeader>{t('edit.keyModal.title')}</ModalHeader>
                <ModalBody>
                    <Text color="text.muted" fontSize="sm" mb={4}>
                        {t('edit.keyModal.description')}
                    </Text>
                    <FormControl isInvalid={!!error}>
                        <FormLabel htmlFor="edit-key-input">{t('edit.keyModal.label')}</FormLabel>
                        <Input
                            id="edit-key-input"
                            type="password"
                            value={editKey}
                            autoComplete="current-password"
                            autoFocus
                            onChange={(e) => {
                                setEditKey(e.target.value);
                                setError(null);
                            }}
                        />
                        {error ? (
                            <FormErrorMessage role="alert">{error}</FormErrorMessage>
                        ) : (
                            <FormHelperText>{t('edit.keyModal.helper')}</FormHelperText>
                        )}
                    </FormControl>
                </ModalBody>
                <ModalFooter gap={2}>
                    <Button variant="ghost" colorScheme="gray" onClick={onCancel}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" isLoading={isPending} loadingText={t('edit.keyModal.verifying')}>
                        {t('edit.keyModal.submit')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
