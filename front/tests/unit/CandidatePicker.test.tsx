import { useState } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import {
    CandidatePicker,
    DEFAULT_END_TIME,
    DEFAULT_START_TIME,
    draftsToCandidateInputs,
    shiftTime,
    type CandidateDraft,
} from '@/components/create/CandidatePicker';
import { renderWithProviders } from '../utils';

function Harness({ initial = [] as CandidateDraft[] }) {
    const [drafts, setDrafts] = useState<CandidateDraft[]>(initial);
    return <CandidatePicker value={drafts} onChange={setDrafts} />;
}

/** Enabled day buttons of the displayed month (past days are disabled) */
function enabledDayButtons() {
    const calendar = screen.getByTestId('candidate-calendar');
    return within(calendar)
        .getAllByRole('button')
        .filter((button) => {
            const cell = button.closest('td');
            return cell && !button.hasAttribute('disabled') && cell.getAttribute('data-outside') !== 'true';
        });
}

async function clickFutureDay(offset = 0) {
    const user = userEvent.setup();
    if (enabledDayButtons().length <= offset + 1) {
        await user.click(screen.getByRole('button', { name: /next month|次の月|翌月/i }));
    }
    const days = enabledDayButtons();
    await user.click(days[days.length - 1 - offset]);
    return user;
}

describe('CandidatePicker', () => {
    test('日付クリックで候補が追加される', async () => {
        renderWithProviders(<Harness />);
        expect(screen.queryAllByTestId('candidate-item')).toHaveLength(0);
        await clickFutureDay(0);
        expect(screen.getAllByTestId('candidate-item')).toHaveLength(1);
        expect(screen.getByTestId('candidate-count')).toHaveTextContent('1件');
    });

    test('候補の削除ボタンで候補が除去される', async () => {
        renderWithProviders(<Harness />);
        const user = await clickFutureDay(0);
        await clickFutureDay(1);
        expect(screen.getAllByTestId('candidate-item')).toHaveLength(2);
        const [first] = screen.getAllByTestId('candidate-item');
        await user.click(within(first).getByRole('button', { name: /の候補を削除/ }));
        expect(screen.getAllByTestId('candidate-item')).toHaveLength(1);
    });

    test('同じ日付を再度クリックすると選択が解除される', async () => {
        renderWithProviders(<Harness />);
        await clickFutureDay(0);
        await clickFutureDay(0);
        expect(screen.queryAllByTestId('candidate-item')).toHaveLength(0);
    });

    test('時間のデフォルト値が設定される', async () => {
        renderWithProviders(<Harness />);
        await clickFutureDay(0);
        const item = screen.getAllByTestId('candidate-item')[0];
        expect(within(item).getByLabelText(/開始時刻/)).toHaveValue(DEFAULT_START_TIME);
        expect(within(item).getByLabelText(/終了時刻/)).toHaveValue(DEFAULT_END_TIME);
    });

    test('時間帯を追加すると同じ日に次の枠が追加される', async () => {
        renderWithProviders(<Harness />);
        const user = await clickFutureDay(0);
        await user.click(screen.getByRole('button', { name: '時間帯を追加' }));
        const items = screen.getAllByTestId('candidate-item');
        expect(items).toHaveLength(2);
        expect(within(items[1]).getByLabelText(/開始時刻/)).toHaveValue('11:00');
        expect(within(items[1]).getByLabelText(/終了時刻/)).toHaveValue('12:00');
    });

    test('終了時刻が開始時刻より前だとエラーを表示する', () => {
        const draft: CandidateDraft = { id: 'x', date: new Date(2030, 0, 1), startTime: '12:00', endTime: '11:00' };
        renderWithProviders(<Harness initial={[draft]} />);
        expect(screen.getByRole('alert')).toHaveTextContent('終了時刻は開始時刻より後');
    });
});

describe('draftsToCandidateInputs', () => {
    test('日付・時刻順に並べてISO文字列に変換する', () => {
        const later: CandidateDraft = { id: 'a', date: new Date(2030, 0, 2), startTime: '09:00', endTime: '10:00' };
        const earlier: CandidateDraft = { id: 'b', date: new Date(2030, 0, 1), startTime: '14:00', endTime: '15:30' };
        const result = draftsToCandidateInputs([later, earlier]);
        expect(result.map((r) => r.order)).toEqual([0, 1]);
        expect(new Date(result[0].start_at)).toEqual(new Date(2030, 0, 1, 14, 0));
        expect(new Date(result[0].end_at)).toEqual(new Date(2030, 0, 1, 15, 30));
        expect(new Date(result[1].start_at)).toEqual(new Date(2030, 0, 2, 9, 0));
    });

    test('shiftTimeは日をまたがない', () => {
        expect(shiftTime('10:00', 90)).toBe('11:30');
        expect(shiftTime('23:30', 60)).toBe('23:59');
    });
});
