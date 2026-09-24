import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { CreatedModal } from '@/components/event/CreatedModal';
import { ResponseForm } from '@/components/event/ResponseForm';
import { ResponseSuccessModal } from '@/components/event/ResponseSuccessModal';
import { ResponseTable } from '@/components/event/ResponseTable';
import { SummaryChart } from '@/components/event/SummaryChart';
import api from '@/lib/api';
import { makeSchedule, makeSummary } from '../fixtures';
import { renderWithProviders } from '../utils';

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

    test('確定済みの候補には確定バッジを表示', () => {
        renderWithProviders(<ResponseTable schedule={makeSchedule({ is_finalized: true, finalized_candidate: 12 })} recommendedId={11} />);
        expect(screen.getByText('確定')).toBeInTheDocument();
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

    test('未選択の候補があると送信せず警告する', async () => {
        const submit = vi.spyOn(api, 'submitResponse');
        renderWithProviders(<ResponseForm schedule={makeSchedule()} />);
        const user = userEvent.setup();
        await user.type(screen.getByLabelText(/お名前/), '田中');
        await user.click(screen.getByRole('button', { name: '回答を送信する' }));
        expect(await screen.findByText('未選択の候補日が2件あります')).toBeInTheDocument();
        expect(submit).not.toHaveBeenCalled();
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
    test('スコア順に並び、おすすめを表示する', () => {
        const schedule = makeSchedule();
        renderWithProviders(<SummaryChart schedule={schedule} summary={makeSummary(schedule)} icsUrl={(id) => `/ics/${id}`} />);
        const items = screen.getAllByTestId('summary-candidate');
        expect(items).toHaveLength(2);
        expect(within(items[0]).getByText('おすすめ')).toBeInTheDocument();
        expect(within(items[0]).getByRole('link', { name: /カレンダーに追加/ })).toHaveAttribute('href', '/ics/11');
        expect(screen.getByText('回答者数')).toBeInTheDocument();
    });

    test('回答がない場合は案内を表示', () => {
        renderWithProviders(<SummaryChart schedule={makeSchedule({ participants: [] })} icsUrl={() => ''} />);
        expect(screen.getByText('回答があると集計結果が表示されます')).toBeInTheDocument();
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
        expect(screen.getByText(/必ずメモしておいてください/)).toBeInTheDocument();
    });
});
