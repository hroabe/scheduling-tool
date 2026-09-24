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

interface EditKeyModalProps {
    uuid: string;
    isOpen: boolean;
    onVerified: (editKey: string) => void;
    onCancel: () => void;
}

/** Asks for the event's edit key and verifies it against the API */
export function EditKeyModal({ uuid, isOpen, onVerified, onCancel }: EditKeyModalProps) {
    const [editKey, setEditKey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { mutate: verify, isPending } = useVerifyEditKey(uuid);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!editKey) {
            setError('編集キーを入力してください');
            return;
        }
        verify(editKey, {
            onSuccess: (valid) => {
                if (valid) {
                    setError(null);
                    onVerified(editKey);
                } else {
                    setError('編集キーが正しくありません');
                }
            },
            onError: (err) => setError(err.message),
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onCancel} isCentered closeOnOverlayClick={false}>
            <ModalOverlay />
            <ModalContent mx={4} as="form" onSubmit={handleSubmit} data-testid="edit-key-modal">
                <ModalHeader>編集キーを入力</ModalHeader>
                <ModalBody>
                    <Text color="text.muted" fontSize="sm" mb={4}>
                        このイベントを編集するには、作成時に設定（または発行）された編集キーを入力してください。
                    </Text>
                    <FormControl isInvalid={!!error}>
                        <FormLabel htmlFor="edit-key-input">編集キー</FormLabel>
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
                            <FormHelperText>認証はこのタブを閉じるまで有効です</FormHelperText>
                        )}
                    </FormControl>
                </ModalBody>
                <ModalFooter gap={2}>
                    <Button variant="ghost" colorScheme="gray" onClick={onCancel}>
                        キャンセル
                    </Button>
                    <Button type="submit" isLoading={isPending} loadingText="確認中...">
                        認証
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
