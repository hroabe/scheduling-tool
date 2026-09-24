import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CreatedModal } from '@/components/event/CreatedModal';
import { EventListCard } from '@/components/event/EventListCard';
import { safeMeetingUrl } from '@/components/event/meetingUrl';
import { ReminderCard } from '@/components/event/ReminderCard';
import { ResponseForm } from '@/components/event/ResponseForm';
import { ResponseSuccessModal } from '@/components/event/ResponseSuccessModal';
import { ResponseTable } from '@/components/event/ResponseTable';
import { StatusPill, getDetailStatus } from '@/components/event/StatusPill';
import { SummaryChart } from '@/components/event/SummaryChart';
import api from '@/lib/api';
import { LEGACY_TOKEN_PREFIX, migrateLegacyTokens } from '@/lib/tokenStorage';
import { useThemeStore } from '@/stores/themeStore';
import { makeSchedule, makeSummary } from '../fixtures';
import { renderWithProviders } from '../utils';

// Full-page interaction tests are slow under a loaded CI runner
vi.setConfig({ testTimeout: 20_000 });

beforeEach(() => {
    useThemeStore.setState({ mode: null });
    window.localStorage.clear();
});

describe('ResponseTable', () => {
    test('回答がない場合は案内を表示', () => {
        renderWithProviders(<ResponseTable schedule={makeSchedule({ participants: [] })} />);
        expect(screen.getByText('まだ回答がありません')).toBeInTheDocument();
    });

    test('参加者ごとの◯△×とおすすめバッジ・自分の行を表示', () => {
        renderWithProviders(<ResponseTable schedule={makeSchedule()} recommendedId={11} myParticipantId={102} />);
        const table = screen.getByTestId('response-table');
        const sato = within(table).getByRole('rowheader', { name: '佐藤' }).closest('tr')!;
        expect(within(sato).getByLabelText('参加可能')).toHaveTextContent('◯');
        expect(within(sato).getByLabelText('調整可能')).toHaveTextContent('△');
        expect(within(table).getByTestId('recommended-badge')).toBeInTheDocument();
        expect(within(table).getByText('あなた')).toBeInTheDocument();
        expect(within(table).getByText('午後なら参加できます')).toBeInTheDocument();
    });

    test('かわいいモードでは同じ記号セット（顔文字）を使い、意味はラベルで残す', () => {
        useThemeStore.setState({ mode: 'cute' });
        renderWithProviders(<ResponseTable schedule={makeSchedule()} />);
        const sato = screen.getByRole('rowheader', { name: '佐藤' }).closest('tr')!;
        expect(within(sato).getByLabelText('参加可能')).toHaveTextContent('😊');
    });

    test('確定済みの候補には確定バッジを表示', () => {
        renderWithProviders(<ResponseTable schedule={makeSchedule({ is_finalized: true, finalized_candidate: 12 })} recommendedId={11} />);
        expect(screen.getByText('確定')).toBeInTheDocument();
    });

    test('操作ボタン: 自分の行だけ編集・削除、主催者は全行削除、それ以外は無し', async () => {
        const onEdit = vi.fn();
        const onDelete = vi.fn();
        const { unmount } = renderWithProviders(
            <ResponseTable schedule={makeSchedule()} myParticipantId={101} onEdit={onEdit} onDelete={onDelete} />
        );
        expect(screen.getByRole('button', { name: '佐藤さんの回答を編集' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '鈴木さんの回答を削除' })).not.toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole('button', { name: '佐藤さんの回答を削除' }));
        expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 101 }));
        unmount();

        const second = renderWithProviders(<ResponseTable schedule={makeSchedule()} isOrganizer onDelete={onDelete} />);
        expect(screen.getByRole('button', { name: '鈴木さんの回答を削除' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /を編集$/ })).not.toBeInTheDocument();
        second.unmount();

        renderWithProviders(<ResponseTable schedule={makeSchedule()} onDelete={onDelete} />);
        expect(screen.queryByRole('button', { name: /を削除$/ })).not.toBeInTheDocument();
    });
});

describe('ResponseForm', () => {
    test('全候補に回答して送信するとAPIが呼ばれる', async () => {
        const schedule = makeSchedule();
        const submit = vi.spyOn(api, 'submitResponse').mockResolvedValue({
            ...schedule.participants[0],
            id: 200,
            name: '田中',
            edit_token: 'token-1',
        });
        const onSuccess = vi.fn();
        renderWithProviders(<ResponseForm schedule={schedule} onSuccess={onSuccess} />);

        const user = userEvent.setup();
        await user.type(screen.getByLabelText(/お名前/), '田中');
        const rows = screen.getAllByTestId('response-candidate');
        await user.click(within(rows[0]).getByRole('button', { name: /参加可能$/ }));
        await user.click(within(rows[1]).getByRole('button', { name: /参加不可$/ }));
        expect(within(rows[0]).getByRole('button', { name: /参加可能$/ })).toHaveAttribute('aria-pressed', 'true');
        await user.click(screen.getByRole('button', { name: '回答を送信する' }));

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        expect(submit).toHaveBeenCalledWith(
            schedule.uuid,
            {
                name: '田中',
                comment: '',
                attendances: [
                    { candidate: 11, status: 'ok' },
                    { candidate: 12, status: 'ng' },
                ],
            },
            undefined
        );
        expect(onSuccess.mock.calls[0][1]).toBe(false);
    });

    test('記号の凡例を表示し、ボタンは記号＋意味のラベルを持つ', () => {
        renderWithProviders(<ResponseForm schedule={makeSchedule()} />);
        expect(screen.getByTestId('symbol-legend')).toHaveTextContent('◯ 参加可能');
        const [row] = screen.getAllByTestId('response-candidate');
        expect(within(row).getByRole('button', { name: /参加可能$/ })).toHaveTextContent('◯');
    });

    test('未選択の候補があると送信せず警告する', async () => {
        const submit = vi.spyOn(api, 'submitResponse');
        renderWithProviders(<ResponseForm schedule={makeSchedule()} />);
        const user = userEvent.setup();
        await user.type(screen.getByLabelText(/お名前/), '田中');
        await user.click(screen.getByRole('button', { name: '回答を送信する' }));
        expect(await screen.findByText('未選択の候補日が2件あります')).toBeInTheDocument();
        expect(submit).not.toHaveBeenCalled();
    });

    test('名前が空なら検証エラーを表示する', async () => {
        renderWithProviders(<ResponseForm schedule={makeSchedule()} />);
        await userEvent.setup().click(screen.getByRole('button', { name: '回答を送信する' }));
        expect(await screen.findByText('お名前を入力してください')).toBeInTheDocument();
    });

    test('△を許可しないイベントでは△ボタンを表示しない', () => {
        renderWithProviders(<ResponseForm schedule={makeSchedule({ allow_maybe: false })} />);
        expect(screen.queryAllByRole('button', { name: /調整可能$/ })).toHaveLength(0);
    });

    test('既存回答の編集では値が初期表示され、トークン付きで更新する', async () => {
        const schedule = makeSchedule();
        const existing = schedule.participants[0];
        const submit = vi.spyOn(api, 'submitResponse').mockResolvedValue({ ...existing, edit_token: 'tok' });
        const onSuccess = vi.fn();
        renderWithProviders(<ResponseForm schedule={schedule} existing={existing} editToken="tok" onSuccess={onSuccess} />);

        expect(screen.getByLabelText(/お名前/)).toHaveValue('佐藤');
        await userEvent.setup().click(screen.getByRole('button', { name: '回答を更新する' }));
        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        expect(submit.mock.calls[0][2]).toBe('tok');
        expect(onSuccess.mock.calls[0][1]).toBe(true);
    });
});

describe('SummaryChart', () => {
    test('KPI・スコア順の候補一覧・おすすめ理由・ICSリンクを表示する', () => {
        const schedule = makeSchedule();
        renderWithProviders(<SummaryChart schedule={schedule} summary={makeSummary(schedule)} icsUrl={(id) => `/ics/${id}`} />);
        const items = screen.getAllByTestId('summary-candidate');
        expect(items).toHaveLength(2);
        expect(within(items[0]).getByText('おすすめ')).toBeInTheDocument();
        const detail = screen.getByTestId('candidate-detail');
        expect(within(detail).getByRole('link', { name: /カレンダーに追加/ })).toHaveAttribute('href', '/ics/11');
        expect(within(screen.getByTestId('recommend-reasons')).getByText('全員が参加できます')).toBeInTheDocument();
        expect(screen.getByText('回答者数')).toBeInTheDocument();
        // Non-organizers never see the finalize CTA
        expect(screen.queryByRole('button', { name: 'この候補で確定' })).not.toBeInTheDocument();
    });

    test('候補を選ぶと詳細が切り替わり、主催者は確定CTAを押せる', async () => {
        const schedule = makeSchedule();
        const onFinalize = vi.fn();
        renderWithProviders(
            <SummaryChart schedule={schedule} summary={makeSummary(schedule)} icsUrl={(id) => `/ics/${id}`} isOrganizer onFinalize={onFinalize} />
        );
        const user = userEvent.setup();
        const items = screen.getAllByTestId('summary-candidate');
        await user.click(within(items[1]).getByRole('button'));
        expect(within(items[1]).getByRole('button')).toHaveAttribute('aria-pressed', 'true');
        expect(within(screen.getByTestId('candidate-detail')).getByRole('link', { name: /カレンダーに追加/ })).toHaveAttribute(
            'href',
            '/ics/12'
        );
        expect(screen.queryByTestId('recommend-reasons')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'この候補で確定' }));
        expect(onFinalize).toHaveBeenCalledWith(12);
    });

    test('確定済みなら主催者にも確定CTAを出さない', () => {
        const schedule = makeSchedule({ is_finalized: true, finalized_candidate: 11 });
        renderWithProviders(
            <SummaryChart schedule={schedule} summary={makeSummary(schedule)} icsUrl={() => ''} isOrganizer onFinalize={vi.fn()} />
        );
        expect(screen.queryByRole('button', { name: 'この候補で確定' })).not.toBeInTheDocument();
    });

    test('回答がない場合は案内を表示', () => {
        renderWithProviders(<SummaryChart schedule={makeSchedule({ participants: [] })} icsUrl={() => ''} />);
        expect(screen.getByText('回答があると集計結果が表示されます')).toBeInTheDocument();
    });
});

describe('ReminderCard / StatusPill / EventListCard', () => {
    test('期限まで24時間を切ると強調して表示し、共有ボタンでonShare', async () => {
        const onShare = vi.fn();
        const now = new Date('2030-04-01T00:00:00Z');
        renderWithProviders(
            <ReminderCard responseCount={2} deadline="2030-04-01T12:00:00Z" onShare={onShare} now={now} />
        );
        expect(screen.getByTestId('reminder-deadline')).toHaveTextContent('24時間を切りました');
        await userEvent.setup().click(screen.getByRole('button', { name: 'URLを共有' }));
        expect(onShare).toHaveBeenCalled();
    });

    test('回答0件なら共有を促す', () => {
        renderWithProviders(<ReminderCard responseCount={0} onShare={vi.fn()} />);
        expect(screen.getByRole('heading', { name: '参加者にURLを共有しましょう' })).toBeInTheDocument();
    });

    test('ステータスの判定と表示', () => {
        expect(getDetailStatus(makeSchedule())).toBe('open');
        expect(getDetailStatus(makeSchedule({ is_closed: true, closed_at: '2030-01-01T00:00:00Z' }))).toBe('closed');
        expect(getDetailStatus(makeSchedule({ is_expired: true, status: 'closed' }))).toBe('expired');
        expect(getDetailStatus(makeSchedule({ is_active: false }))).toBe('inactive');
        expect(getDetailStatus(makeSchedule({ is_finalized: true, status: 'fixed' }))).toBe('fixed');
        renderWithProviders(<StatusPill status="closed" />);
        expect(screen.getByText('回答締切')).toBeInTheDocument();
    });

    test('マイイベント用カードは詳細ページへのリンクを持つ', () => {
        renderWithProviders(
            <EventListCard
                schedule={{
                    id: 1,
                    uuid: 'u-1',
                    name: '定例',
                    owner_name: '山田',
                    department: '',
                    deadline: null,
                    is_active: true,
                    is_finalized: false,
                    status: 'open',
                    participant_count: 3,
                    candidate_count: 2,
                    url: '/event/u-1',
                    created_at: '2030-04-01T00:00:00Z',
                }}
            />
        );
        expect(screen.getByText('回答受付中')).toBeInTheDocument();
        expect(screen.getByText('回答: 3名')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '開く' })).toHaveAttribute('href', '/event/u-1');
    });
});

describe('Modals', () => {
    test('回答完了モーダルに作成CTA（ref付き）がある', () => {
        renderWithProviders(<ResponseSuccessModal isOpen onClose={vi.fn()} />);
        expect(screen.getByText('回答を送信しました')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /イベントを作成する/ })).toHaveAttribute('href', '/create?ref=response_cta');
    });

    test('作成完了モーダルに共有URLと編集キーを表示', () => {
        renderWithProviders(<CreatedModal isOpen onClose={vi.fn()} shareUrl="https://x.test/event/1" editKey="abc123" />);
        expect(screen.getByTestId('share-url')).toHaveValue('https://x.test/event/1');
        expect(screen.getByTestId('edit-key')).toHaveValue('abc123');
        expect(screen.getByLabelText('編集キー')).toHaveValue('abc123');
        expect(screen.getByText(/必ずメモしておいてください/)).toBeInTheDocument();
    });
});

describe('utilities', () => {
    test('safeMeetingUrl は http(s) のみ許可', () => {
        expect(safeMeetingUrl('https://zoom.us/j/1')).toBe('https://zoom.us/j/1');
        expect(safeMeetingUrl('javascript:alert(1)')).toBeNull();
        expect(safeMeetingUrl('not a url')).toBeNull();
        expect(safeMeetingUrl(null)).toBeNull();
    });

    test('migrateLegacyTokens は旧形式を移行し、既存のエントリを優先し、壊れた値は捨てる', () => {
        window.localStorage.setItem(`${LEGACY_TOKEN_PREFIX}a`, JSON.stringify({ participantId: 1, participantName: 'A', token: 't1' }));
        window.localStorage.setItem(`${LEGACY_TOKEN_PREFIX}b`, JSON.stringify({ participantId: 2, participantName: 'B', token: 't2' }));
        window.localStorage.setItem(`${LEGACY_TOKEN_PREFIX}c`, '{broken');
        window.localStorage.setItem('unrelated', 'keep');
        const save = vi.fn();
        const migrated = migrateLegacyTokens({ b: { participantId: 9, name: 'X', editToken: 'new' } }, save);

        expect(migrated).toBe(1);
        expect(save).toHaveBeenCalledTimes(1);
        expect(save).toHaveBeenCalledWith('a', { participantId: 1, name: 'A', editToken: 't1' });
        expect(Object.keys(window.localStorage).filter((k) => k.startsWith(LEGACY_TOKEN_PREFIX))).toHaveLength(0);
        expect(window.localStorage.getItem('unrelated')).toBe('keep');
    });
});
