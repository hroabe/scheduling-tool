'use client';

import {
    Alert,
    AlertDescription,
    AlertIcon,
    Button,
    FormControl,
    FormLabel,
    Icon,
    Input,
    InputGroup,
    InputRightElement,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    VStack,
    useClipboard,
} from '@chakra-ui/react';
import { CheckCircle2 } from 'lucide-react';

interface CreatedModalProps {
    isOpen: boolean;
    onClose: () => void;
    shareUrl: string;
    editKey?: string;
}

function CopyField({ label, value, testId }: { label: string; value: string; testId: string }) {
    const { hasCopied, onCopy } = useClipboard(value);
    return (
        <FormControl>
            <FormLabel fontSize="sm">{label}</FormLabel>
            <InputGroup size="md">
                <Input value={value} isReadOnly pr="5.5rem" data-testid={testId} onFocus={(e) => e.target.select()} />
                <InputRightElement width="5.5rem">
                    <Button h="1.75rem" size="sm" onClick={onCopy}>
                        {hasCopied ? 'コピー済' : 'コピー'}
                    </Button>
                </InputRightElement>
            </InputGroup>
        </FormControl>
    );
}

/** Shown right after creating an event: share URL + edit key reminder */
export function CreatedModal({ isOpen, onClose, shareUrl, editKey }: CreatedModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="md" motionPreset="scale">
            <ModalOverlay />
            <ModalContent mx={4} data-testid="created-modal">
                <ModalHeader display="flex" alignItems="center" gap={2}>
                    <Icon as={CheckCircle2} color="green.500" />
                    イベントを作成しました
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={5} align="stretch">
                        <Text color="text.muted" fontSize="sm">
                            このURLを参加者に共有して、回答を集めましょう。
                        </Text>
                        <CopyField label="共有URL" value={shareUrl} testId="share-url" />
                        {editKey && (
                            <>
                                <CopyField label="編集キー" value={editKey} testId="edit-key" />
                                <Alert status="warning" borderRadius="md" fontSize="sm">
                                    <AlertIcon />
                                    <AlertDescription>
                                        編集キーはイベントの編集・日程確定・削除に必要です。
                                        再表示できないため、必ずメモしておいてください。
                                    </AlertDescription>
                                </Alert>
                            </>
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button w="full" onClick={onClose}>
                        OK
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
