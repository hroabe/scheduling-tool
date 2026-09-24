'use client';

import { useRef } from 'react';
import {
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    Button,
} from '@chakra-ui/react';
import { useI18n } from '@/providers/I18nProvider';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    body: string;
    confirmLabel: string;
    onConfirm: () => void;
    onClose: () => void;
    isLoading?: boolean;
}

/** Confirmation for destructive actions (cancel booking, ...) */
export function ConfirmDialog({ isOpen, title, body, confirmLabel, onConfirm, onClose, isLoading }: ConfirmDialogProps) {
    const { t } = useI18n();
    const cancelRef = useRef<HTMLButtonElement>(null);
    return (
        <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose} isCentered>
            <AlertDialogOverlay>
                <AlertDialogContent mx={4}>
                    <AlertDialogHeader fontSize="lg">{title}</AlertDialogHeader>
                    <AlertDialogBody>{body}</AlertDialogBody>
                    <AlertDialogFooter gap={3}>
                        <Button ref={cancelRef} variant="ghost" colorScheme="gray" onClick={onClose}>
                            {t('booking.confirm.keep')}
                        </Button>
                        <Button colorScheme="red" onClick={onConfirm} isLoading={isLoading}>
                            {confirmLabel}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialogOverlay>
        </AlertDialog>
    );
}
