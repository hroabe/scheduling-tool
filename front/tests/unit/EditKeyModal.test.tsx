import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { EditKeyModal } from '@/components/edit/EditKeyModal';
import api from '@/lib/api';
import { renderWithProviders } from '../utils';

const UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('EditKeyModal', () => {
    test('正しいedit_keyで認証成功', async () => {
        const verify = vi.spyOn(api, 'verifyEditKey').mockResolvedValue(true);
        const onVerified = vi.fn();
        renderWithProviders(<EditKeyModal uuid={UUID} isOpen onVerified={onVerified} onCancel={vi.fn()} />);

        const user = userEvent.setup();
        await user.type(screen.getByLabelText('編集キー'), 'secret123');
        await user.click(screen.getByRole('button', { name: '認証' }));

        await waitFor(() => expect(onVerified).toHaveBeenCalledWith('secret123'));
        expect(verify).toHaveBeenCalledWith(UUID, 'secret123');
    });

    test('間違ったedit_keyでエラー表示', async () => {
        vi.spyOn(api, 'verifyEditKey').mockResolvedValue(false);
        const onVerified = vi.fn();
        renderWithProviders(<EditKeyModal uuid={UUID} isOpen onVerified={onVerified} onCancel={vi.fn()} />);

        const user = userEvent.setup();
        await user.type(screen.getByLabelText('編集キー'), 'wrong');
        await user.click(screen.getByRole('button', { name: '認証' }));

        expect(await screen.findByText('編集キーが正しくありません')).toBeInTheDocument();
        expect(onVerified).not.toHaveBeenCalled();
    });

    test('空のまま送信するとエラー表示', async () => {
        const verify = vi.spyOn(api, 'verifyEditKey');
        renderWithProviders(<EditKeyModal uuid={UUID} isOpen onVerified={vi.fn()} onCancel={vi.fn()} />);
        await userEvent.setup().click(screen.getByRole('button', { name: '認証' }));
        expect(await screen.findByText('編集キーを入力してください')).toBeInTheDocument();
        expect(verify).not.toHaveBeenCalled();
    });

    test('キャンセルでonCancelが呼ばれる', async () => {
        const onCancel = vi.fn();
        renderWithProviders(<EditKeyModal uuid={UUID} isOpen onVerified={vi.fn()} onCancel={onCancel} />);
        await userEvent.setup().click(screen.getByRole('button', { name: 'キャンセル' }));
        expect(onCancel).toHaveBeenCalled();
    });
});
