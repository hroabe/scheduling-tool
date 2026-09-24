/**
 * Candidate building blocks of the create page (RFC-0013). The MVP CandidatePicker was
 * superseded by DateMultiSelectCalendar + candidates.ts helpers; this file keeps their tests.
 */
import { useState } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { DateMultiSelectCalendar } from '@/components/create/DateMultiSelectCalendar';
import {
    INITIAL_BUILDER,
    addDrafts,
    builderEndTime,
    builderFromDraft,
    computeEndTime,
    draftsToCandidateInputs,
    isTimeRangeValid,
    minuteOptions,
    shiftTime,
    type CandidateDraft,
} from '@/components/create/candidates';
import { toDayKey } from '@/lib/date';
import { renderWithProviders } from '../utils';

const draft = (date: string, startTime: string, endTime: string, id = `${date}-${startTime}`): CandidateDraft => ({
    id,
    date,
    startTime,
    endTime,
});

describe('candidates helpers', () => {
    test('shiftTime / computeEndTime は同日内に丸める', () => {
        expect(shiftTime('10:00', 90)).toBe('11:30');
        expect(shiftTime('00:10', -30)).toBe('00:00');
        expect(computeEndTime('23:30', 60)).toBe('23:59');
        expect(computeEndTime('22:45', 60)).toBe('23:45');
    });

    test('isTimeRangeValid は終了 > 開始のみ許可', () => {
        expect(isTimeRangeValid('10:00', '11:00')).toBe(true);
        expect(isTimeRangeValid('10:00', '10:00')).toBe(false);
        expect(isTimeRangeValid('10:00', '09:00')).toBe(false);
        expect(isTimeRangeValid('25:00', '26:00')).toBe(false);
    });

    test('builderEndTime は直接指定の終了時刻を優先する', () => {
        expect(builderEndTime(INITIAL_BUILDER)).toBe('11:00');
        expect(builderEndTime({ ...INITIAL_BUILDER, durationPreset: 'custom', customDuration: 45 })).toBe('10:45');
        expect(builderEndTime({ ...INITIAL_BUILDER, useDirectEndTime: true, directEndTime: '12:15' })).toBe('12:15');
    });

    test('builderFromDraft は候補の時間設定を複製する', () => {
        const preset = builderFromDraft(INITIAL_BUILDER, draft('2030-04-01', '13:00', '14:30'));
        expect(preset).toMatchObject({ startTime: '13:00', durationPreset: 90, useDirectEndTime: false });
        const custom = builderFromDraft(INITIAL_BUILDER, draft('2030-04-01', '13:00', '13:40'));
        expect(custom).toMatchObject({ durationPreset: 'custom', customDuration: 40 });
    });

    test('addDrafts は重複と上限を除外してソートする', () => {
        const existing = [draft('2030-04-03', '10:00', '11:00')];
        const result = addDrafts(existing, ['2030-04-03', '2030-04-01', '2030-04-02'], '10:00', '11:00', 3);
        expect(result.added).toBe(2);
        expect(result.duplicates).toBe(1);
        expect(result.overLimit).toBe(0);
        expect(result.drafts.map((d) => d.date)).toEqual(['2030-04-01', '2030-04-02', '2030-04-03']);

        const full = addDrafts(result.drafts, ['2030-04-04'], '10:00', '11:00', 3);
        expect(full.overLimit).toBe(1);
        expect(full.drafts).toHaveLength(3);
    });

    test('draftsToCandidateInputs はローカル時刻を ISO に変換し order を振る', () => {
        const inputs = draftsToCandidateInputs([
            draft('2030-04-02', '14:00', '15:00'),
            draft('2030-04-01', '10:00', '11:30'),
        ]);
        expect(inputs).toEqual([
            {
                start_at: new Date(2030, 3, 1, 10, 0).toISOString(),
                end_at: new Date(2030, 3, 1, 11, 30).toISOString(),
                note: '',
                order: 0,
            },
            {
                start_at: new Date(2030, 3, 2, 14, 0).toISOString(),
                end_at: new Date(2030, 3, 2, 15, 0).toISOString(),
                note: '',
                order: 1,
            },
        ]);
    });

    test('minuteOptions は現在値を必ず含む', () => {
        expect(minuteOptions(5)).toHaveLength(12);
        expect(minuteOptions(5, 7)).toContain(7);
        expect(minuteOptions(1)).toHaveLength(60);
    });
});

function CalendarHarness() {
    const [dates, setDates] = useState<string[]>([]);
    return (
        <>
            <DateMultiSelectCalendar selectedDates={dates} onSelectDates={setDates} />
            <output data-testid="selected">{dates.join(',')}</output>
        </>
    );
}

async function openNextMonth() {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<CalendarHarness />);
    const calendar = screen.getByTestId('candidate-calendar');
    await user.click(within(calendar).getByRole('button', { name: /next month|次の月|翌月/i }));
    const days = within(calendar)
        .getAllByRole('button')
        .filter((b) => b.closest('td') && b.closest('td')?.getAttribute('data-outside') !== 'true');
    return { user, days };
}

function nextMonthKey(day: number) {
    const now = new Date();
    return toDayKey(new Date(now.getFullYear(), now.getMonth() + 1, day));
}

describe('DateMultiSelectCalendar', () => {
    test('クリックで複数日を選択・再クリックで解除できる', async () => {
        const { user, days } = await openNextMonth();
        await user.click(days[4]);
        await user.click(days[1]);
        expect(screen.getByTestId('selected')).toHaveTextContent([nextMonthKey(2), nextMonthKey(5)].join(','));
        expect(screen.getByTestId('selected-days-count')).toHaveTextContent('2日選択中');

        await user.click(days[4]);
        expect(screen.getByTestId('selected')).toHaveTextContent(nextMonthKey(2));
    });

    test('Shift+クリックで範囲選択できる', async () => {
        const { user, days } = await openNextMonth();
        await user.click(days[2]);
        await user.keyboard('{Shift>}');
        await user.click(days[5]);
        await user.keyboard('{/Shift}');
        expect(screen.getByTestId('selected')).toHaveTextContent(
            [3, 4, 5, 6].map(nextMonthKey).join(',')
        );
    });

    test('選択をクリアできる', async () => {
        const { user, days } = await openNextMonth();
        await user.click(days[0]);
        await user.click(screen.getByRole('button', { name: '選択をクリア' }));
        expect(screen.getByTestId('selected')).toBeEmptyDOMElement();
    });

    test('過去の日付は選択できない', () => {
        renderWithProviders(<CalendarHarness />);
        const today = new Date();
        if (today.getDate() === 1) return; // no past day in the current month
        const calendar = screen.getByTestId('candidate-calendar');
        const firstDay = within(calendar)
            .getAllByRole('button')
            .find((b) => b.closest('td') && b.closest('td')?.getAttribute('data-outside') !== 'true');
        expect(firstDay).toBeDisabled();
    });
});
