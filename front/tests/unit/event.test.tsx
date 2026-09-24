import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { EventDetail } from '@/components/event/EventDetail';
import api, { ApiError } from '@/lib/api';
import { LEGACY_TOKEN_PREFIX } from '@/lib/tokenStorage';
import { useEditKeyStore, useMyResponsesStore } from '@/stores';
import type { Schedule } from '@/types';
import { makeSchedule, makeSummary, UUID } from '../fixtures';
import { renderWithProviders } from '../utils';

// Full-page interaction tests are slow under a loaded CI runner
vi.setConfig({ testTimeout: 20_000 });

const push = vi.fn();
const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, replace, back: vi.fn(), prefetch: vi.fn() }),
    useSearchParams: () => searchParams,
    usePathname: () => '/',
}));

beforeEach(() => {
    push.mockReset();
    replace.mockReset();
    searchParams = new URLSearchParams();
    window.localStorage.clear();
    useEditKeyStore.setState({ keys: {} });
    useMyResponsesStore.setState({ responses: {} });
});

function mockSchedule(schedule: Schedule = makeSchedule()) {
    vi.spyOn(api, 'getSchedule').mockResolvedValue(schedule);
    vi.spyOn(api, 'getScheduleSummary').mockResolvedValue(makeSummary(schedule));
    return schedule;
}

async function renderEvent(schedule?: Schedule) {
    const s = mockSchedule(schedule);
    renderWithProviders(<EventDetail uuid={UUID} />);
    await screen.findByRole('heading', { level: 1, name: s.name });
    return userEvent.setup();
}

describe('EventDetail', () => {
    test('イベント情報・操作ボタン・回答状況を表示する（h1は1つ）', async () => {
        await renderEvent();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getByTestId('status-badge')).toHaveTextContent('回答受付中');
        expect(screen.getByTestId('export-csv')).toHaveAttribute('href', expect.stringContaining('/export_csv/'));
        expect(screen.getByTestId('export-ics')).toHaveAttribute('href', expect.stringContaining('/export_ics/'));
        expect(screen.getByTestId('edit-link')).toHaveAttribute('href', `/event/${UUID}/edit`);
        expect(await screen.findByTestId('recommended-badge')).toBeInTheDocument();
    });

    test('作成直後は作成完了モーダルを表示しURLからパラメータを除く', async () => {
        searchParams = new URLSearchParams('created=1');
        useEditKeyStore.setState({ keys: { [UUID]: 'k' } });
        mockSchedule();
        renderWithProviders(<EventDetail uuid={UUID} />);
        expect(await screen.findByTestId('created-modal')).toBeInTheDocument();
        expect(screen.getByTestId('edit-key')).toHaveValue('k');
        expect(replace).toHaveBeenCalledWith(`/event/${UUID}`, { scroll: false });
    });

    test('確定済みイベントはカレンダー登録リンクを表示し、回答フォームは閉じる', async () => {
        const user = await renderEvent(
            makeSchedule({ is_finalized: true, status: 'fixed', finalized_candidate: 11, can_respond: false })
        );
        expect(screen.getByTestId('status-badge')).toHaveTextContent('確定済み');
        const alert = screen.getByTestId('finalized-alert');
        expect(within(alert).getByRole('link', { name: /Googleカレンダーに登録/ })).toHaveAttribute(
            'href',
            expect.stringContaining('calendar.google.com')
        );
        await user.click(screen.getByRole('tab', { name: '回答する' }));
        expect(await screen.findByTestId('respond-closed')).toHaveTextContent('日程が確定したため');
    });

    test('締め切られたイベントは「回答締切」と締切日時・案内を表示する', async () => {
        const user = await renderEvent(
            makeSchedule({ status: 'closed', is_closed: true, closed_at: '2030-03-20T10:00:00Z', can_respond: false })
        );
        expect(screen.getByTestId('status-badge')).toHaveTextContent('回答締切');
        expect(screen.getByTestId('closed-alert')).toHaveTextContent('主催者が回答を締め切りました');
        await user.click(screen.getByRole('tab', { name: '回答する' }));
        expect(await screen.findByTestId('respond-closed')).toHaveTextContent('主催者の確定をお待ちください');
    });

    test('会議URLがあれば参加ボタンを表示する（http(s)のみ）', async () => {
        await renderEvent(
            makeSchedule({
                is_finalized: true,
                status: 'fixed',
                finalized_candidate: 11,
                can_respond: false,
                meeting_provider: 'google_meet',
                meeting_url: 'https://meet.google.com/abc-defg-hij',
            })
        );
        const meeting = screen.getByTestId('meeting-url');
        expect(meeting).toHaveTextContent('Google Meet');
        expect(within(meeting).getByRole('link', { name: '会議に参加' })).toHaveAttribute(
            'href',
            'https://meet.google.com/abc-defg-hij'
        );
    });

    test('javascript: の会議URLは表示しない', async () => {
        await renderEvent(makeSchedule({ meeting_url: 'javascript:alert(1)' }));
        expect(screen.queryByTestId('meeting-url')).not.toBeInTheDocument();
    });

    test('回答を送信すると完了モーダルを表示しトークンを保存する', async () => {
        const schedule = makeSchedule();
        vi.spyOn(api, 'submitResponse').mockResolvedValue({ ...schedule.participants[0], id: 300, name: '田中', edit_token: 'tok' });
        const user = await renderEvent(schedule);

        await user.click(screen.getByRole('tab', { name: '回答する' }));
        await user.type(screen.getByLabelText(/お名前/), '田中');
        for (const row of screen.getAllByTestId('response-candidate')) {
            await user.click(within(row).getByRole('button', { name: /参加可能$/ }));
        }
        await user.click(screen.getByRole('button', { name: '回答を送信する' }));

        expect(await screen.findByTestId('response-success-modal')).toBeInTheDocument();
        expect(useMyResponsesStore.getState().responses[UUID]).toEqual({ participantId: 300, name: '田中', editToken: 'tok' });
    });

    test('存在しないイベントはエラー表示', async () => {
        vi.spyOn(api, 'getSchedule').mockRejectedValue(new ApiError(404, {}));
        vi.spyOn(api, 'getScheduleSummary').mockRejectedValue(new ApiError(404, {}));
        renderWithProviders(<EventDetail uuid={UUID} />);
        expect(await screen.findByText('イベントが見つかりませんでした')).toBeInTheDocument();
    });
});

describe('EventDetail: organizer controls', () => {
    test('主催者でない閲覧者には確定・締切・削除の操作を表示しない', async () => {
        const user = await renderEvent();
        expect(screen.queryByTestId('organizer-panel')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '回答を締め切る' })).not.toBeInTheDocument();
        expect(screen.queryByTestId('reminder-card')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /さんの回答を削除/ })).not.toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: '集計結果' }));
        expect(await screen.findByTestId('candidate-detail')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'この候補で確定' })).not.toBeInTheDocument();
    });

    test('編集キーを持つ主催者は確定モーダルから確定できる（キーを送信）', async () => {
        useEditKeyStore.setState({ keys: { [UUID]: 'secret' } });
        const schedule = makeSchedule();
        const finalize = vi.spyOn(api, 'finalizeSchedule').mockResolvedValue({ ...schedule, is_finalized: true, finalized_candidate: 11 });
        const user = await renderEvent(schedule);

        expect(screen.getByTestId('organizer-panel')).toHaveTextContent('主催者として認証済み');
        expect(screen.getByTestId('reminder-card')).toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: '集計結果' }));
        await user.click(await screen.findByRole('button', { name: 'この候補で確定' }));
        const modal = await screen.findByTestId('fix-decision-modal');
        await user.click(within(modal).getByRole('button', { name: '確定する' }));
        await waitFor(() => expect(finalize).toHaveBeenCalledWith(UUID, 11, 'secret'));
    });

    test('編集キーを持つ主催者は回答を締め切れる', async () => {
        useEditKeyStore.setState({ keys: { [UUID]: 'secret' } });
        const schedule = makeSchedule();
        const close = vi.spyOn(api, 'closeSchedule').mockResolvedValue({ ...schedule, is_closed: true, status: 'closed' });
        const user = await renderEvent(schedule);
        await user.click(screen.getByRole('button', { name: '回答を締め切る' }));
        await waitFor(() => expect(close).toHaveBeenCalledWith(UUID, 'secret'));
    });

    test('ログイン中の作成者（is_owner）は編集キーなしで締切・再開できる', async () => {
        const schedule = makeSchedule({
            is_owner: true,
            status: 'closed',
            is_closed: true,
            closed_at: '2030-03-20T10:00:00Z',
            can_respond: false,
        });
        const reopen = vi.spyOn(api, 'reopenSchedule').mockResolvedValue({ ...schedule, is_closed: false, status: 'open' });
        const user = await renderEvent(schedule);
        expect(screen.getByTestId('organizer-panel')).toHaveTextContent('あなたが作成したイベントです');
        await user.click(screen.getByRole('button', { name: '回答受付を再開' }));
        await waitFor(() => expect(reopen).toHaveBeenCalledWith(UUID, undefined));
    });

    test('権限エラーなら保存済みの編集キーを破棄する', async () => {
        useEditKeyStore.setState({ keys: { [UUID]: 'stale' } });
        vi.spyOn(api, 'closeSchedule').mockRejectedValue(new ApiError(403, { detail: 'forbidden' }));
        const user = await renderEvent();
        await user.click(screen.getByRole('button', { name: '回答を締め切る' }));
        await waitFor(() => expect(useEditKeyStore.getState().keys[UUID]).toBeUndefined());
        expect(screen.queryByTestId('organizer-panel')).not.toBeInTheDocument();
    });

    test('主催者は他の参加者の回答を編集キーで削除できる', async () => {
        useEditKeyStore.setState({ keys: { [UUID]: 'secret' } });
        const remove = vi.spyOn(api, 'deleteParticipant').mockResolvedValue(undefined);
        const user = await renderEvent();
        await user.click(screen.getByRole('button', { name: '鈴木さんの回答を削除' }));
        const dialog = await screen.findByRole('alertdialog');
        expect(dialog).toHaveTextContent('鈴木さんの回答を削除します');
        await user.click(within(dialog).getByRole('button', { name: '削除する' }));
        await waitFor(() =>
            expect(remove).toHaveBeenCalledWith(UUID, 102, expect.objectContaining({ editKey: 'secret', editToken: undefined }))
        );
    });
});

describe('EventDetail: my response', () => {
    test('自分の回答は編集タブで編集でき、トークンで削除できる', async () => {
        useMyResponsesStore.setState({ responses: { [UUID]: { participantId: 101, name: '佐藤', editToken: 'tok' } } });
        const remove = vi.spyOn(api, 'deleteParticipant').mockResolvedValue(undefined);
        const user = await renderEvent();

        // Only the own row has actions for a non-organizer
        expect(screen.queryByRole('button', { name: '鈴木さんの回答を削除' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: '佐藤さんの回答を編集' }));
        expect(await screen.findByRole('tab', { name: '自分の回答を編集', selected: true })).toBeInTheDocument();
        expect(screen.getByLabelText(/お名前/)).toHaveValue('佐藤');

        await user.click(screen.getByRole('tab', { name: '回答状況' }));
        await user.click(screen.getByRole('button', { name: '佐藤さんの回答を削除' }));
        const dialog = await screen.findByRole('alertdialog');
        expect(dialog).toHaveTextContent('あなたの回答を削除します');
        await user.click(within(dialog).getByRole('button', { name: '削除する' }));
        await waitFor(() =>
            expect(remove).toHaveBeenCalledWith(UUID, 101, expect.objectContaining({ editToken: 'tok', editKey: undefined }))
        );
        await waitFor(() => expect(useMyResponsesStore.getState().responses[UUID]).toBeUndefined());
    });

    test('旧 tokenStorage の回答トークンをストアへ移行する', async () => {
        window.localStorage.setItem(
            `${LEGACY_TOKEN_PREFIX}${UUID}`,
            JSON.stringify({ participantId: 102, participantName: '鈴木', token: 'legacy-tok', createdAt: '' })
        );
        await renderEvent();
        await waitFor(() =>
            expect(useMyResponsesStore.getState().responses[UUID]).toEqual({
                participantId: 102,
                name: '鈴木',
                editToken: 'legacy-tok',
            })
        );
        expect(window.localStorage.getItem(`${LEGACY_TOKEN_PREFIX}${UUID}`)).toBeNull();
        expect(await screen.findByRole('tab', { name: '自分の回答を編集' })).toBeInTheDocument();
    });
});

describe('EventDetail: summary', () => {
    test('集計タブにおすすめ候補と理由を表示する', async () => {
        const user = await renderEvent();
        await user.click(screen.getByRole('tab', { name: '集計結果' }));
        const detail = await screen.findByTestId('candidate-detail');
        expect(within(detail).getByText('おすすめ')).toBeInTheDocument();
        expect(within(screen.getByTestId('recommend-reasons')).getByText('全員が参加できます')).toBeInTheDocument();
        expect(screen.getAllByTestId('summary-candidate')).toHaveLength(2);
    });
});
