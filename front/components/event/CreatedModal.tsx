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
import { useI18n } from '@/providers/I18nProvider';

interface CreatedModalProps {
    isOpen: boolean;
    onClose: () => void;
    shareUrl: string;
    editKey?: string;
}

function CopyField({ label, value, testId, id }: { label: string; value: string; testId: string; id: string }) {
    const { t } = useI18n();
    const { hasCopied, onCopy } = useClipboard(value);
    return (
        <FormControl>
            <FormLabel fontSize="sm" htmlFor={id}>
                {label}
            </FormLabel>
            <InputGroup size="md">
                <Input id={id} value={value} isReadOnly pr="6rem" data-testid={testId} onFocus={(e) => e.target.select()} />
                <InputRightElement width="6rem">
                    <Button h="1.75rem" size="sm" onClick={onCopy} aria-label={t('event.created.copyLabel', { label })}>
                        {hasCopied ? t('event.created.copied') : t('event.created.copy')}
                    </Button>
                </InputRightElement>
            </InputGroup>
        </FormControl>
    );
}

/** Shown right after creating an event: share URL + edit key reminder */
export function CreatedModal({ isOpen, onClose, shareUrl, editKey }: CreatedModalProps) {
    const { t } = useI18n();
    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="md" motionPreset="scale">
            <ModalOverlay />
            <ModalContent mx={4} data-testid="created-modal">
                <ModalHeader display="flex" alignItems="center" gap={2}>
                    <Icon as={CheckCircle2} color="green.500" aria-hidden />
                    {t('event.created.title')}
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={5} align="stretch">
                        <Text color="text.muted" fontSize="sm">
                            {t('event.created.description')}
                        </Text>
                        <CopyField id="created-share-url" label={t('event.created.shareUrl')} value={shareUrl} testId="share-url" />
                        {editKey && (
                            <>
                                <CopyField id="created-edit-key" label={t('event.created.editKey')} value={editKey} testId="edit-key" />
                                <Alert status="warning" borderRadius="md" fontSize="sm">
                                    <AlertIcon />
                                    <AlertDescription>{t('event.created.editKeyWarning')}</AlertDescription>
                                </Alert>
                            </>
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button w="full" onClick={onClose}>
                        {t('event.created.ok')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
