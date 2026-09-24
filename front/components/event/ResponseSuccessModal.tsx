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

interface ResponseSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    isUpdate?: boolean;
}

/** Shown after a response is submitted; invites the respondent to create their own event (viral loop) */
export function ResponseSuccessModal({ isOpen, onClose, isUpdate = false }: ResponseSuccessModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm" motionPreset="scale">
            <ModalOverlay />
            <ModalContent mx={4} data-testid="response-success-modal">
                <ModalCloseButton />
                <ModalBody pt={10} pb={2}>
                    <VStack spacing={3} textAlign="center">
                        <Icon as={CheckCircle2} boxSize={14} color="green.500" />
                        <Text fontSize="xl" fontWeight="bold">
                            {isUpdate ? '回答を更新しました' : '回答を送信しました'}
                        </Text>
                        <Text color="text.muted">ご回答ありがとうございます</Text>

                        <Divider my={3} />

                        <Text fontWeight="semibold">あなたもイベントを作成しませんか？</Text>
                        <Box fontSize="sm" color="text.muted">
                            <Text>登録不要 / 無料</Text>
                            <Text>CSV・ICSで結果を持ち出し可能</Text>
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter flexDirection="column" gap={2}>
                    <Button as={NextLink} href="/create?ref=response_cta" w="full" rightIcon={<ArrowRight size={16} />}>
                        イベントを作成する
                    </Button>
                    <Button variant="ghost" colorScheme="gray" w="full" onClick={onClose}>
                        閉じる
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
