import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CreateScheduleForm } from '@/components/create/CreateScheduleForm';
import { EditEventPage } from '@/components/edit/EditEventPage';
import { EventDetail } from '@/components/event/EventDetail';
import { LandingPage } from '@/components/landing/LandingPage';
import { FaqList } from '@/components/landing/FaqList';
import { ContentPage } from '@/components/layout/ContentPage';
import api from '@/lib/api';
import { faqItems } from '@/lib/faq';
import { useAttributionStore, useEditKeyStore, useMyResponsesStore } from '@/stores';
import { makeSchedule, makeSummary, UUID } from '../fixtures';
import { renderWithProviders } from '../utils';

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
    useEditKeyStore.setState({ keys: {} });
    useMyResponsesStore.setState({ responses: {} });
    useAttributionStore.setState({ ref: null, createdCount: 0 });
});

describe('LandingPage / static pages', () => {
    test('トップページは h1 と主要セクションを持つ', () => {
        renderWithProviders(<LandingPage />);
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getByRole('heading', { name: '使い方はかんたん3ステップ' })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /イベントを作成する/ })[0]).toHaveAttribute('href', '/create');
        expect(screen.getByTestId('powered-by')).toHaveAttribute('href', '/?ref=powered_by');
    });

    test('FAQページは全質問を表示する', () => {
        renderWithProviders(<FaqList items={faqItems} />);
        expect(screen.getByRole('heading', { level: 1, name: 'よくある質問' })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /^Q\./ })).toHaveLength(faqItems.length);
    });

    test('ContentPage はセクションを描画する', () => {
        renderWithProviders(
            <ContentPage title="規約" sections={[{ heading: '第1条', paragraphs: ['本文'], items: ['項目A'] }]} />
        );
        expect(screen.getByRole('heading', { level: 2, name: '第1条' })).toBeInTheDocument();
        expect(screen.getByText('項目A')).toBeInTheDocument();
    });
});

describe('CreateScheduleForm', () => {
    test('必須項目が未入力だとエラーを表示する', async () => {
        const create = vi.spyOn(api, 'createSchedule');
        renderWithProviders(<CreateScheduleForm />);
        await userEvent.setup().click(screen.getByRole('button', { name: 'イベントを作成する' }));
        expect(await screen.findByText('イベント名を入力してください')).toBeInTheDocument();
        expect(screen.getByText('お名前を入力してください')).toBeInTheDocument();
        expect(create).not.toHaveBeenCalled();
    });

    test('候補日を選んで作成すると編集キーを保存してイベントページへ遷移する', async () => {
        useAttributionStore.setState({ ref: 'response_cta' });
        const create = vi.spyOn(api, 'createSchedule').mockResolvedValue({ ...makeSchedule(), _edit_key: 'auto-key' });
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup();
        await user.type(screen.getByLabelText(/イベント名/), '定例');
        await user.type(screen.getByLabelText(/あなたの名前/), '山田');

        const calendar = screen.getByTestId('candidate-calendar');
        const days = within(calendar)
            .getAllByRole('button')
            .filter((b) => b.closest('td') && !b.hasAttribute('disabled') && b.closest('td')?.getAttribute('data-outside') !== 'true');
        await user.click(days[days.length - 1]);
        await user.click(screen.getByRole('button', { name: 'イベントを作成する' }));

        await waitFor(() => expect(push).toHaveBeenCalledWith(`/event/${UUID}?created=1`));
        const [payload, ref] = create.mock.calls[0];
        expect(payload.name).toBe('定例');
        expect(payload.owner_name).toBe('山田');
        expect(payload.candidates).toHaveLength(1);
        expect(ref).toBe('response_cta');
        expect(useEditKeyStore.getState().keys[UUID]).toBe('auto-key');
        expect(useAttributionStore.getState().createdCount).toBe(1);
    });
});

describe('EventDetail', () => {
    test('イベント情報・操作ボタン・回答状況を表示する', async () => {
        const schedule = makeSchedule();
        vi.spyOn(api, 'getSchedule').mockResolvedValue(schedule);
        vi.spyOn(api, 'getScheduleSummary').mockResolvedValue(makeSummary(schedule));
        renderWithProviders(<EventDetail uuid={UUID} />);

        expect(await screen.findByRole('heading', { level: 1, name: 'チームミーティング' })).toBeInTheDocument();
        expect(screen.getByText('回答受付中')).toBeInTheDocument();
        expect(screen.getByTestId('export-csv')).toHaveAttribute('href', expect.stringContaining('/export_csv/'));
        expect(screen.getByTestId('export-ics')).toHaveAttribute('href', expect.stringContaining('/export_ics/'));
        expect(screen.getByTestId('edit-link')).toHaveAttribute('href', `/event/${UUID}/edit`);
        expect(await screen.findByTestId('recommended-badge')).toBeInTheDocument();
    });

    test('作成直後は作成完了モーダルを表示しURLからパラメータを除く', async () => {
        searchParams = new URLSearchParams('created=1');
        useEditKeyStore.setState({ keys: { [UUID]: 'k' } });
        vi.spyOn(api, 'getSchedule').mockResolvedValue(makeSchedule());
        vi.spyOn(api, 'getScheduleSummary').mockResolvedValue(makeSummary());
        renderWithProviders(<EventDetail uuid={UUID} />);
        expect(await screen.findByTestId('created-modal')).toBeInTheDocument();
        expect(replace).toHaveBeenCalledWith(`/event/${UUID}`, { scroll: false });
    });

    test('確定済みイベントはカレンダー登録リンクを表示する', async () => {
        const schedule = makeSchedule({ is_finalized: true, finalized_candidate: 11, can_respond: false });
        vi.spyOn(api, 'getSchedule').mockResolvedValue(schedule);
        vi.spyOn(api, 'getScheduleSummary').mockResolvedValue(makeSummary(schedule));
        renderWithProviders(<EventDetail uuid={UUID} />);
        const alert = await screen.findByTestId('finalized-alert');
        expect(within(alert).getByRole('link', { name: /Googleカレンダーに登録/ })).toHaveAttribute(
            'href',
            expect.stringContaining('calendar.google.com')
        );
    });

    test('回答を送信すると完了モーダルを表示しトークンを保存する', async () => {
        const schedule = makeSchedule();
        vi.spyOn(api, 'getSchedule').mockResolvedValue(schedule);
        vi.spyOn(api, 'getScheduleSummary').mockResolvedValue(makeSummary(schedule));
        vi.spyOn(api, 'submitResponse').mockResolvedValue({ ...schedule.participants[0], id: 300, name: '田中', edit_token: 'tok' });
        renderWithProviders(<EventDetail uuid={UUID} />);

        const user = userEvent.setup();
        await user.click(await screen.findByRole('tab', { name: '回答する' }));
        await user.type(screen.getByLabelText(/お名前/), '田中');
        for (const row of screen.getAllByTestId('response-candidate')) {
            await user.click(within(row).getByRole('button', { name: /参加可能$/ }));
        }
        await user.click(screen.getByRole('button', { name: '回答を送信する' }));

        expect(await screen.findByTestId('response-success-modal')).toBeInTheDocument();
        expect(useMyResponsesStore.getState().responses[UUID]).toEqual({ participantId: 300, name: '田中', editToken: 'tok' });
    });

    test('存在しないイベントはエラー表示', async () => {
        const { ApiError } = await import('@/lib/api');
        vi.spyOn(api, 'getSchedule').mockRejectedValue(new ApiError(404, {}));
        vi.spyOn(api, 'getScheduleSummary').mockRejectedValue(new ApiError(404, {}));
        renderWithProviders(<EventDetail uuid={UUID} />);
        expect(await screen.findByText('イベントが見つかりませんでした')).toBeInTheDocument();
    });
});

describe('EditEventPage', () => {
    test('編集キー未認証なら認証モーダルを表示', async () => {
        vi.spyOn(api, 'getSchedule').mockResolvedValue(makeSchedule());
        vi.spyOn(api, 'getScheduleSummary').mockResolvedValue(makeSummary());
        renderWithProviders(<EditEventPage uuid={UUID} />);
        expect(await screen.findByTestId('edit-key-modal')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'イベント情報' })).not.toBeInTheDocument();
    });

    test('認証済みなら編集・確定・削除ができる', async () => {
        useEditKeyStore.setState({ keys: { [UUID]: 'secret' } });
        const schedule = makeSchedule();
        vi.spyOn(api, 'getSchedule').mockResolvedValue(schedule);
        vi.spyOn(api, 'getScheduleSummary').mockResolvedValue(makeSummary(schedule));
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
        const schedule = makeSchedule();
        vi.spyOn(api, 'getSchedule').mockResolvedValue(schedule);
        vi.spyOn(api, 'getScheduleSummary').mockResolvedValue(makeSummary(schedule));
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
        const { ApiError } = await import('@/lib/api');
        useEditKeyStore.setState({ keys: { [UUID]: 'stale' } });
        vi.spyOn(api, 'getSchedule').mockResolvedValue(makeSchedule());
        vi.spyOn(api, 'getScheduleSummary').mockResolvedValue(makeSummary());
        vi.spyOn(api, 'finalizeSchedule').mockRejectedValue(new ApiError(400, { edit_key: ['編集キーが正しくありません。'] }));
        renderWithProviders(<EditEventPage uuid={UUID} />);
        await userEvent.setup().click(await screen.findByRole('button', { name: '日程を確定する' }));
        expect(await screen.findByTestId('edit-key-modal')).toBeInTheDocument();
        expect(useEditKeyStore.getState().keys[UUID]).toBeUndefined();
    });
});
