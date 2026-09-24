import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CreateScheduleForm } from '@/components/create/CreateScheduleForm';
import api, { ApiError } from '@/lib/api';
import { useAttributionStore, useEditKeyStore } from '@/stores';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';
import { makeSchedule, UUID } from '../fixtures';
import { renderWithProviders } from '../utils';

// UI flows type into several fields: allow more than the default 5s
vi.setConfig({ testTimeout: 30000 });
// jsdom does not implement scrolling (used when focusing invalid fields)
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

const push = vi.fn();
const replace = vi.fn();
const redirect = vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, replace, back: vi.fn(), prefetch: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/create',
    redirect: (url: string) => redirect(url),
}));

const USER: User = {
    id: 1,
    username: 'taro',
    email: 'taro@example.com',
    first_name: '太郎',
    last_name: '山田',
    profile: null,
    date_joined: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
    push.mockReset();
    replace.mockReset();
    redirect.mockClear();
    window.localStorage.clear();
    useEditKeyStore.setState({ keys: {} });
    useAttributionStore.setState({ ref: null, createdCount: 0 });
    useAuthStore.setState({ user: null, isAuthenticated: false });
});

// ----- helpers ---------------------------------------------------------------------

/** Day buttons of the displayed month in the create calendar (outside days excluded) */
function monthDays() {
    const calendar = screen.getByTestId('candidate-calendar');
    return within(calendar)
        .getAllByRole('button')
        .filter((b) => b.closest('td') && b.closest('td')?.getAttribute('data-outside') !== 'true');
}

/** Move to next month (every day is in the future) and click the given day numbers */
async function pickNextMonthDays(user: UserEvent, days: number[]) {
    const calendar = screen.getByTestId('candidate-calendar');
    await user.click(within(calendar).getByRole('button', { name: /next month|次の月|翌月/i }));
    for (const day of days) {
        await user.click(monthDays()[day - 1]);
    }
}

async function addCandidates(user: UserEvent, days: number[]) {
    await pickNextMonthDays(user, days);
    const label = days.length > 1 ? `選択した${days.length}日を追加` : '追加';
    await user.click(screen.getByRole('button', { name: label }));
}

/** Focus a field and paste text (much faster than typing character by character) */
async function fill(user: UserEvent, field: HTMLElement, text: string) {
    await user.click(field);
    await user.paste(text);
}

async function fillBasics(user: UserEvent, name = '定例会議', owner = '山田') {
    await fill(user, screen.getByLabelText(/^イベント名/), name);
    await fill(user, screen.getByLabelText(/^主催者名/), owner);
}

function candidateItems() {
    return screen.queryAllByTestId('candidate-item');
}

function nextMonthDate(day: number) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, day);
}

// ----- tests -----------------------------------------------------------------------

describe('CreateScheduleForm: validation', () => {
    test('必須項目・候補日が未入力だとエラーを表示して送信しない', async () => {
        const create = vi.spyOn(api, 'createSchedule');
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });

        await user.click(screen.getByRole('button', { name: '作成（リンク画面へ）' }));

        expect(await screen.findByText('イベント名を入力してください')).toBeInTheDocument();
        expect(screen.getByText('主催者名を入力してください')).toBeInTheDocument();
        expect(screen.getByText('候補日を1つ以上追加してください')).toBeInTheDocument();
        expect(create).not.toHaveBeenCalled();
    });

    test('編集キーは4文字以上・回答期限は未来（詳細設定が自動で開く）', async () => {
        const create = vi.spyOn(api, 'createSchedule');
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });
        await fillBasics(user);
        await addCandidates(user, [3]);

        await user.click(screen.getByRole('button', { name: /詳細設定（任意）/ }));
        await fill(user, screen.getByLabelText('編集キー'), 'abc');
        await fill(user, screen.getByLabelText('回答期限'), '2020-01-01T10:00');
        await user.click(screen.getByRole('button', { name: /詳細設定（任意）/ })); // collapse again

        await user.click(screen.getByRole('button', { name: '作成してリンクをコピー' }));

        expect(await screen.findByText('編集キーは4文字以上で入力してください')).toBeInTheDocument();
        expect(screen.getByText('回答期限は未来の日時を指定してください')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /詳細設定（任意）/ })).toHaveAttribute('aria-expanded', 'true');
        expect(create).not.toHaveBeenCalled();
    });

    test('終了時刻が開始時刻より前だとエラーを表示して追加できない', async () => {
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });
        await pickNextMonthDays(user, [5]);
        await user.click(screen.getByRole('button', { name: 'オプション' }));
        await user.click(screen.getByLabelText('終了時刻を直接指定する'));
        await user.selectOptions(screen.getByLabelText('終了（時）'), '9');

        expect(screen.getByRole('alert')).toHaveTextContent('終了時刻は開始時刻より後にしてください');
        expect(screen.getByRole('button', { name: '追加' })).toBeDisabled();
    });
});

describe('CreateScheduleForm: candidate builder', () => {
    test('カレンダーで選んだ日に既定の所要時間（60分）で候補が追加される', async () => {
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });
        await addCandidates(user, [2, 4]);

        const items = candidateItems();
        expect(items).toHaveLength(2);
        expect(items[0]).toHaveTextContent('10:00–11:00（60分）');
        expect(screen.getByTestId('candidate-count')).toHaveTextContent('2件');
        // selection is cleared after adding
        expect(screen.queryByTestId('selected-days-count')).not.toBeInTheDocument();
    });

    test('所要時間チップを変えると終了時刻が変わる', async () => {
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });
        await user.click(screen.getByRole('radio', { name: '90分' }));
        expect(screen.getByTestId('builder-end-time')).toHaveTextContent('11:30');
        await addCandidates(user, [6]);
        expect(candidateItems()[0]).toHaveTextContent('10:00–11:30（90分）');
    });

    test('終了時刻の直接指定が候補に反映される', async () => {
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });
        await user.click(screen.getByRole('button', { name: 'オプション' }));
        await user.click(screen.getByLabelText('終了時刻を直接指定する'));
        await user.selectOptions(screen.getByLabelText('終了（時）'), '12');
        await user.selectOptions(screen.getByLabelText('終了（分）'), '30');
        await addCandidates(user, [7]);

        expect(candidateItems()[0]).toHaveTextContent('10:00–12:30（150分）');
    });

    test('終了時刻は 23:59 で頭打ちになる（分が繰り上がらない）', async () => {
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });
        await user.selectOptions(screen.getByLabelText('開始（時）'), '23');
        await user.selectOptions(screen.getByLabelText('開始（分）'), '30');
        expect(screen.getByTestId('builder-end-time')).toHaveTextContent('23:59');
    });

    test('単体削除の後も選択が正しい候補を指し、一括削除で選択分だけ消える', async () => {
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });
        await addCandidates(user, [1, 2, 3]);
        const labels = candidateItems().map((item) => item.textContent);

        // select the 3rd candidate, then delete the 1st one individually
        await user.click(within(candidateItems()[2]).getByRole('checkbox'));
        await user.click(within(candidateItems()[0]).getByRole('button', { name: /の候補を削除/ }));
        expect(candidateItems()).toHaveLength(2);
        expect(screen.getByText('1件選択中')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: '選択した1件を削除' }));
        expect(candidateItems()).toHaveLength(1);
        expect(candidateItems()[0].textContent).toBe(labels[1]);
    });

    test('全選択 → 一括削除で全件消える', async () => {
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });
        await addCandidates(user, [8, 9]);
        await user.click(screen.getByRole('button', { name: '全選択' }));
        await user.click(screen.getByRole('button', { name: '選択した2件を削除' }));
        expect(candidateItems()).toHaveLength(0);
        expect(screen.getByText('まだ候補がありません')).toBeInTheDocument();
    });

    test('同じ候補は重複して追加されない', async () => {
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });
        await addCandidates(user, [10]);
        await user.click(monthDays()[9]);
        await user.click(screen.getByRole('button', { name: '追加' }));
        expect(candidateItems()).toHaveLength(1);
    });

    test('テンプレートチップでイベント名が入る', async () => {
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });
        await user.click(screen.getByRole('button', { name: '飲み会' }));
        expect(screen.getByLabelText(/^イベント名/)).toHaveValue('飲み会');
    });
});

describe('CreateScheduleForm: submit', () => {
    test('ISO 日時・タイムゾーン・ref を送信し、編集キーを保存して ?created=1 へ遷移する', async () => {
        useAttributionStore.setState({ ref: 'response_cta' });
        const create = vi.spyOn(api, 'createSchedule').mockResolvedValue({ ...makeSchedule(), _edit_key: 'auto-key' });
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });
        await fillBasics(user);
        await addCandidates(user, [3, 1]);

        // notify switch stays disabled without an e-mail
        await user.click(screen.getByRole('button', { name: /詳細設定（任意）/ }));
        expect(screen.getByLabelText('新しい回答をメールで通知する')).toBeDisabled();

        await user.click(screen.getByRole('button', { name: '作成（リンク画面へ）' }));

        await waitFor(() => expect(push).toHaveBeenCalledWith(`/event/${UUID}?created=1`));
        const [payload, ref] = create.mock.calls[0];
        expect(ref).toBe('response_cta');
        expect(payload.name).toBe('定例会議');
        expect(payload.owner_name).toBe('山田');
        expect(payload.timezone_name).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
        expect(payload.notify_on_response).toBe(false);
        expect(payload.owner_email).toBeUndefined();
        expect(payload.edit_key).toBeUndefined();
        expect(payload.allow_maybe).toBe(true);
        expect(payload.candidates).toHaveLength(2);
        // sorted, ISO strings that represent 10:00-11:00 local time on the chosen days
        expect(payload.candidates[0].start_at).toBe(new Date(nextMonthDate(1).setHours(10, 0)).toISOString());
        expect(payload.candidates[0].end_at).toBe(new Date(nextMonthDate(1).setHours(11, 0)).toISOString());
        expect(payload.candidates[1].start_at).toBe(new Date(nextMonthDate(3).setHours(10, 0)).toISOString());
        expect(payload.candidates.map((c) => c.order)).toEqual([0, 1]);

        expect(useEditKeyStore.getState().keys[UUID]).toBe('auto-key');
        expect(useAttributionStore.getState().createdCount).toBe(1);
        expect(window.localStorage.getItem('lastOrganizerName')).toBe('山田');
    });

    test('入力した編集キー・メール通知・説明などの任意項目を送信する', async () => {
        const create = vi.spyOn(api, 'createSchedule').mockResolvedValue(makeSchedule());
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });
        await fillBasics(user);
        await addCandidates(user, [2]);

        await user.click(screen.getByRole('button', { name: /詳細設定（任意）/ }));
        await fill(user, screen.getByLabelText('説明・メモ'), '会議室A');
        await fill(user, screen.getByLabelText('所属'), '開発チーム');
        await fill(user, screen.getByLabelText('主催者のメールアドレス'), 'owner@example.com');
        const notify = screen.getByLabelText('新しい回答をメールで通知する');
        expect(notify).toBeEnabled();
        await user.click(notify);
        await fill(user, screen.getByLabelText('編集キー'), 'secret-key');
        await user.click(screen.getByLabelText('「△（調整可能）」を許可'));

        await user.click(screen.getByRole('button', { name: '作成（リンク画面へ）' }));

        await waitFor(() => expect(push).toHaveBeenCalledWith(`/event/${UUID}?created=1`));
        const [payload] = create.mock.calls[0];
        expect(payload).toMatchObject({
            description: '会議室A',
            department: '開発チーム',
            owner_email: 'owner@example.com',
            notify_on_response: true,
            edit_key: 'secret-key',
            allow_maybe: false,
            deadline: null,
        });
        // no _edit_key in the response: the entered key is remembered
        expect(useEditKeyStore.getState().keys[UUID]).toBe('secret-key');
    });

    test('「作成してリンクをコピー」は共有URLをコピーしてから遷移する', async () => {
        vi.spyOn(api, 'createSchedule').mockResolvedValue({ ...makeSchedule(), _edit_key: 'k' });
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });
        const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
        await fillBasics(user);
        await addCandidates(user, [4]);

        await user.click(screen.getByRole('button', { name: '作成してリンクをコピー' }));

        await waitFor(() => expect(push).toHaveBeenCalledWith(`/event/${UUID}?created=1`));
        expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/event/${UUID}?utm_source=share&utm_medium=link`);
        expect(await screen.findByText('リンクをコピーしました')).toBeInTheDocument();
    });

    test('API エラーは ApiError のメッセージを表示する', async () => {
        vi.spyOn(api, 'createSchedule').mockRejectedValue(
            new ApiError(400, { candidates: ['候補日は100件までです。'] })
        );
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });
        await fillBasics(user);
        await addCandidates(user, [4]);
        await user.click(screen.getByRole('button', { name: '作成（リンク画面へ）' }));

        expect(await screen.findByText('イベントを作成できませんでした')).toBeInTheDocument();
        expect(screen.getByText('候補日は100件までです。')).toBeInTheDocument();
        expect(push).not.toHaveBeenCalled();
    });
});

describe('CreateScheduleForm: organizer prefill', () => {
    test('ログイン中は氏名とメールを自動入力し、マイイベントの案内を表示する', async () => {
        useAuthStore.setState({ user: USER, isAuthenticated: true });
        renderWithProviders(<CreateScheduleForm />);
        const user = userEvent.setup({ delay: null });

        expect(await screen.findByTestId('organizer-summary')).toHaveTextContent('主催者：山田 太郎');
        expect(screen.getByTestId('signed-in-note')).toHaveTextContent('マイイベント');

        await user.click(screen.getByRole('button', { name: /詳細設定（任意）/ }));
        expect(screen.getByLabelText('主催者のメールアドレス')).toHaveValue('taro@example.com');
        expect(screen.getByLabelText('新しい回答をメールで通知する')).toBeEnabled();

        await user.click(screen.getByRole('button', { name: '主催者名を変更' }));
        expect(screen.getByLabelText(/^主催者名/)).toHaveValue('山田 太郎');
    });

    test('未ログインでは前回の主催者名を使う', async () => {
        window.localStorage.setItem('lastOrganizerName', '佐藤');
        renderWithProviders(<CreateScheduleForm />);
        expect(await screen.findByTestId('organizer-summary')).toHaveTextContent('主催者：佐藤');
        expect(screen.queryByTestId('signed-in-note')).not.toBeInTheDocument();
    });
});

describe('/create page', () => {
    test('?mode=1on1 は 1on1 予約ページ作成へリダイレクトする', async () => {
        const { default: CreatePage } = await import('@/app/create/page');
        await expect(CreatePage({ searchParams: Promise.resolve({ mode: '1on1' }) })).rejects.toThrow(
            'NEXT_REDIRECT:/booking/new'
        );
        expect(redirect).toHaveBeenCalledWith('/booking/new');
    });

    test('?mode=group はそのまま作成フォームを表示する', async () => {
        const { default: CreatePage } = await import('@/app/create/page');
        const element = await CreatePage({ searchParams: Promise.resolve({ mode: 'group' }) });
        expect(element).toBeTruthy();
        expect(redirect).not.toHaveBeenCalled();
    });
});
