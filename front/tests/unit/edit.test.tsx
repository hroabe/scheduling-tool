import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { EditEventPage } from '@/components/edit/EditEventPage';
import api, { ApiError } from '@/lib/api';
import { useEditKeyStore, useMyResponsesStore } from '@/stores';
import type { Schedule } from '@/types';
import { makeSchedule, makeSummary, UUID } from '../fixtures';
import { renderWithProviders } from '../utils';

// Full-page interaction tests are slow under a loaded CI runner
vi.setConfig({ testTimeout: 20_000 });

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, replace, back: vi.fn(), prefetch: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/',
}));

beforeEach(() => {
    push.mockReset();
    replace.mockReset();
    useEditKeyStore.setState({ keys: {} });
    useMyResponsesStore.setState({ responses: {} });
});

function mockSchedule(schedule: Schedule = makeSchedule()) {
    vi.spyOn(api, 'getSchedule').mockResolvedValue(schedule);
    vi.spyOn(api, 'getScheduleSummary').mockResolvedValue(makeSummary(schedule));
    return schedule;
}

describe('EditEventPage', () => {
    test('編集キー未認証なら認証モーダルを表示', async () => {
        mockSchedule();
        renderWithProviders(<EditEventPage uuid={UUID} />);
        expect(await screen.findByTestId('edit-key-modal')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'イベント情報' })).not.toBeInTheDocument();
        // The page behind the modal is aria-hidden; it still has exactly one h1
        expect(screen.getAllByRole('heading', { level: 1, hidden: true })).toHaveLength(1);
    });

    test('編集キー未設定の旧イベントでも、作成者以外には認証を求める', async () => {
        mockSchedule(makeSchedule({ has_edit_key: false }));
        renderWithProviders(<EditEventPage uuid={UUID} />);
        expect(await screen.findByTestId('edit-key-modal')).toBeInTheDocument();
    });

    test('認証済みなら編集・確定・削除ができる', async () => {
        useEditKeyStore.setState({ keys: { [UUID]: 'secret' } });
        const schedule = mockSchedule();
        const update = vi.spyOn(api, 'updateSchedule').mockResolvedValue({ ...schedule, name: '新しい名前' });
        const finalize = vi.spyOn(api, 'finalizeSchedule').mockResolvedValue({ ...schedule, is_finalized: true, finalized_candidate: 11 });
        const remove = vi.spyOn(api, 'deleteSchedule').mockResolvedValue(undefined);
        renderWithProviders(<EditEventPage uuid={UUID} />);

        const user = userEvent.setup();
        const nameInput = await screen.findByLabelText(/イベント名/);
        await user.clear(nameInput);
        await user.type(nameInput, '新しい名前');
        await user.click(screen.getByRole('button', { name: '変更を保存' }));
        await waitFor(() => expect(update).toHaveBeenCalled());
        expect(update.mock.calls[0][1]).toMatchObject({ name: '新しい名前' });
        expect(update.mock.calls[0][1]).not.toHaveProperty('deadline');
        expect(update.mock.calls[0][2]).toBe('secret');

        expect(screen.getAllByTestId('manage-candidate')).toHaveLength(2);

        await user.click(screen.getByRole('button', { name: '日程を確定する' }));
        await waitFor(() => expect(finalize).toHaveBeenCalledWith(UUID, 11, 'secret'));

        await user.click(screen.getByRole('button', { name: 'イベントを削除する' }));
        await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '削除する' }));
        await waitFor(() => expect(remove).toHaveBeenCalledWith(UUID, 'secret'));
        await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    });

    test('候補日の追加と、回答のある候補日の削除確認', async () => {
        useEditKeyStore.setState({ keys: { [UUID]: 'secret' } });
        const schedule = mockSchedule();
        const add = vi.spyOn(api, 'addCandidate').mockResolvedValue(schedule.candidates[0]);
        const del = vi.spyOn(api, 'deleteCandidate').mockResolvedValue(undefined);
        renderWithProviders(<EditEventPage uuid={UUID} />);

        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: '追加' }));
        expect(await screen.findByText('日付を選択してください')).toBeInTheDocument();

        await user.type(screen.getByLabelText('日付'), '2030-05-01');
        await user.click(screen.getByRole('button', { name: '追加' }));
        await waitFor(() => expect(add).toHaveBeenCalled());
        expect(add.mock.calls[0][2]).toBe('secret');

        const [first] = screen.getAllByTestId('manage-candidate');
        await user.click(within(first).getByRole('button', { name: /を削除$/ }));
        const dialog = await screen.findByRole('alertdialog');
        expect(within(dialog).getByText(/2件の回答があります/)).toBeInTheDocument();
        await user.click(within(dialog).getByRole('button', { name: '削除する' }));
        await waitFor(() => expect(del).toHaveBeenCalledWith(UUID, 11, 'secret'));
    });

    test('編集キーが無効になったら再認証を求める', async () => {
        useEditKeyStore.setState({ keys: { [UUID]: 'stale' } });
        mockSchedule();
        vi.spyOn(api, 'finalizeSchedule').mockRejectedValue(new ApiError(400, { edit_key: ['編集キーが正しくありません。'] }));
        renderWithProviders(<EditEventPage uuid={UUID} />);
        await userEvent.setup().click(await screen.findByRole('button', { name: '日程を確定する' }));
        expect(await screen.findByTestId('edit-key-modal')).toBeInTheDocument();
        expect(useEditKeyStore.getState().keys[UUID]).toBeUndefined();
    });
});

describe('EditEventPage: owner / close / reopen', () => {
    test('ログイン中の作成者は編集キーなしで編集でき、キー無しで締め切れる', async () => {
        const schedule = mockSchedule(makeSchedule({ is_owner: true }));
        const close = vi.spyOn(api, 'closeSchedule').mockResolvedValue({ ...schedule, is_closed: true, status: 'closed' });
        renderWithProviders(<EditEventPage uuid={UUID} />);

        expect(await screen.findByRole('heading', { name: 'イベント情報' })).toBeInTheDocument();
        expect(screen.queryByTestId('edit-key-modal')).not.toBeInTheDocument();
        expect(screen.getByTestId('owner-notice')).toBeInTheDocument();

        const section = screen.getByTestId('closing-section');
        expect(section).toHaveTextContent('現在、回答を受け付けています');
        await userEvent.setup().click(within(section).getByRole('button', { name: '回答を締め切る' }));
        await waitFor(() => expect(close).toHaveBeenCalledWith(UUID, undefined));
    });

    test('締め切ったイベントは編集キー付きで再開できる', async () => {
        useEditKeyStore.setState({ keys: { [UUID]: 'secret' } });
        const schedule = mockSchedule(
            makeSchedule({ status: 'closed', is_closed: true, closed_at: '2030-03-20T10:00:00Z', can_respond: false })
        );
        const reopen = vi.spyOn(api, 'reopenSchedule').mockResolvedValue({ ...schedule, is_closed: false, status: 'open' });
        renderWithProviders(<EditEventPage uuid={UUID} />);

        const section = await screen.findByTestId('closing-section');
        expect(section).toHaveTextContent('回答を締め切りました');
        await userEvent.setup().click(within(section).getByRole('button', { name: '回答受付を再開する' }));
        await waitFor(() => expect(reopen).toHaveBeenCalledWith(UUID, 'secret'));
    });

    test('確定済みイベントでは締切・再開ボタンを出さず、会議URLを表示する', async () => {
        useEditKeyStore.setState({ keys: { [UUID]: 'secret' } });
        mockSchedule(
            makeSchedule({
                is_finalized: true,
                status: 'fixed',
                finalized_candidate: 11,
                can_respond: false,
                meeting_provider: 'teams',
                meeting_url: 'https://teams.microsoft.com/l/meetup-join/xyz',
            })
        );
        renderWithProviders(<EditEventPage uuid={UUID} />);

        const section = await screen.findByTestId('closing-section');
        expect(within(section).queryByRole('button')).not.toBeInTheDocument();
        expect(within(screen.getByTestId('meeting-url')).getByRole('link')).toHaveAttribute(
            'href',
            'https://teams.microsoft.com/l/meetup-join/xyz'
        );
        expect(screen.getByRole('button', { name: '確定を解除' })).toBeInTheDocument();
    });
});
