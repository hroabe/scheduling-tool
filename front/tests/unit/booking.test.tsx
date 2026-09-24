import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { BookingCreateForm } from '@/components/booking/BookingCreateForm';
import { BookingGuestPage } from '@/components/booking/BookingGuestPage';
import { BookingHostPanel } from '@/components/booking/BookingHostPanel';
import { BookingCancel, BookingDone } from '@/components/booking/BookingResult';
import { BookingVerify } from '@/components/booking/BookingVerify';
import { generateSlots, groupByDay, mergeSlots } from '@/components/booking/slotUtils';
import api, { ApiError } from '@/lib/api';
import { getCancelToken, getHostToken, setCancelToken, setDevVerifyUrl, setHostToken } from '@/lib/hostTokens';
import type { AvailabilitySlot, Booking, HostBookingPage, PublicBookingPage } from '@/types';
import { renderWithProviders } from '../utils';

const push = vi.fn();
const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, replace, back: vi.fn(), prefetch: vi.fn() }),
    useSearchParams: () => searchParams,
    usePathname: () => '/booking',
}));

const SLUG = 'interview-1a2b3c4d';
const BOOKING_UUID = 'b1b2c3d4-e5f6-7890-abcd-ef1234567890';

const future = (dayOffset: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
};

function makeSlot(id: number, dayOffset: number, hour: number, booked = false): AvailabilitySlot {
    return {
        id,
        start_at: future(dayOffset, hour),
        end_at: future(dayOffset, hour + 1),
        is_booked: booked,
        is_available: !booked,
        created_at: '',
        updated_at: '',
    };
}

function makeBooking(overrides: Partial<Booking> = {}): Booking {
    const slot = makeSlot(11, 3, 10);
    return {
        uuid: BOOKING_UUID,
        slot: slot.id,
        slot_info: slot,
        page_title: '1on1 面談',
        host_name: '山田',
        guest_name: '佐藤',
        guest_email: 'sato@example.com',
        guest_message: '',
        status: 'confirmed',
        status_display: '確定',
        meeting_url: null,
        confirmed_at: null,
        cancelled_at: null,
        created_at: '',
        ...overrides,
    };
}

function makeHostPage(overrides: Partial<HostBookingPage> = {}): HostBookingPage {
    return {
        id: 1,
        slug: SLUG,
        title: '1on1 面談',
        description: '',
        organizer_name: '山田',
        organizer_email: 'yamada@example.com',
        timezone_name: 'Asia/Tokyo',
        duration_minutes: 60,
        buffer_minutes: 0,
        status: 'PENDING_VERIFY',
        is_active: true,
        notify_on_booking: true,
        slots: [makeSlot(11, 3, 10, true), makeSlot(12, 3, 14)],
        bookings: [makeBooking()],
        public_url: `/booking/${SLUG}`,
        created_at: '',
        updated_at: '',
        ...overrides,
    };
}

function makePublicPage(overrides: Partial<PublicBookingPage> = {}): PublicBookingPage {
    return {
        slug: SLUG,
        title: '1on1 面談',
        description: '',
        organizer: '山田',
        timezone_name: 'Asia/Tokyo',
        duration_minutes: 60,
        available_slots: [makeSlot(12, 3, 14), makeSlot(13, 4, 9)],
        status: 'PUBLISHED',
        ...overrides,
    };
}

beforeEach(() => {
    push.mockReset();
    replace.mockReset();
    searchParams = new URLSearchParams();
    localStorage.clear();
    sessionStorage.clear();
});

describe('slotUtils', () => {
    test('時間帯を所要時間で区切り、過去の枠は除く', () => {
        const day = new Date(2030, 0, 10);
        const slots = generateSlots([day], '10:00', '12:00', 30, new Date(2030, 0, 10, 10, 15));
        expect(slots.map((s) => new Date(s.start_at).getHours() * 60 + new Date(s.start_at).getMinutes())).toEqual([
            10 * 60 + 30,
            11 * 60,
            11 * 60 + 30,
        ]);
    });

    test('重複を除いて日付ごとにまとめる', () => {
        const a = generateSlots([new Date(2030, 0, 10)], '10:00', '11:00', 60, new Date(2029, 0, 1));
        const b = generateSlots([new Date(2030, 0, 11), new Date(2030, 0, 10)], '10:00', '11:00', 60, new Date(2029, 0, 1));
        const merged = mergeSlots(a, b);
        expect(merged).toHaveLength(2);
        expect(groupByDay(merged, (s) => s.start_at).map((g) => g.dayKey)).toEqual(['2030-01-10', '2030-01-11']);
    });
});

describe('BookingCreateForm', () => {
    test('作成すると管理トークンを保存して管理画面へ移動する', async () => {
        const create = vi.spyOn(api, 'createBookingPage').mockResolvedValue({
            slug: SLUG,
            status: 'PENDING_VERIFY',
            message: 'ok',
            host_token: 'host-secret',
            host_url: `/booking/${SLUG}/host`,
            verify_url: `/booking/verify?slug=${SLUG}&token=v`,
        });
        renderWithProviders(<BookingCreateForm />);
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/予約ページのタイトル/), '1on1 面談');
        await user.type(screen.getByLabelText(/^主催者名/), '山田');
        await user.type(screen.getByLabelText(/主催者のメールアドレス/), 'yamada@example.com');

        // Pick a day in the next month (always in the future)
        const calendar = screen.getByTestId('slot-calendar');
        await user.click(within(calendar).getByRole('button', { name: /next month|次の月|翌月/i }));
        const days = within(calendar)
            .getAllByRole('button')
            .filter((b) => b.closest('td') && !b.hasAttribute('disabled') && b.closest('td')?.getAttribute('data-outside') !== 'true');
        await user.click(days[10]);
        await user.click(screen.getByTestId('generate-slots'));
        expect(screen.getAllByTestId('slot-item').length).toBeGreaterThan(0);

        await user.click(screen.getByTestId('create-booking-submit'));
        await waitFor(() => expect(push).toHaveBeenCalledWith(`/booking/${SLUG}/host?created=1`));

        const payload = create.mock.calls[0][0];
        expect(payload).toMatchObject({ title: '1on1 面談', organizer_name: '山田', organizer_email: 'yamada@example.com', duration_minutes: 30 });
        expect(payload.slots.length).toBe(14); // 10:00-17:00 in 30-minute slots
        expect(payload.timezone_name).toBeTruthy();
        expect(getHostToken(SLUG)).toBe('host-secret');
    }, 20_000);

    test('必須項目と空き枠が無ければ送信しない', async () => {
        const create = vi.spyOn(api, 'createBookingPage');
        renderWithProviders(<BookingCreateForm />);
        await userEvent.setup().click(screen.getByTestId('create-booking-submit'));
        expect(await screen.findByText('タイトルを入力してください。')).toBeInTheDocument();
        expect(screen.getByText('空き枠を 1 件以上追加してください。')).toBeInTheDocument();
        expect(create).not.toHaveBeenCalled();
    });
});

describe('BookingHostPanel', () => {
    test('URL のトークンを保存して URL から除き、ヘッダーで管理情報を取得する', async () => {
        searchParams = new URLSearchParams('token=from-email');
        const getHost = vi.spyOn(api, 'getHostBookingPage').mockResolvedValue(makeHostPage());
        renderWithProviders(<BookingHostPanel slug={SLUG} />);

        expect(await screen.findByRole('heading', { level: 1, name: '1on1 面談' })).toBeInTheDocument();
        expect(getHost).toHaveBeenCalledWith(SLUG, 'from-email');
        expect(getHostToken(SLUG)).toBe('from-email');
        expect(replace).toHaveBeenCalledWith(`/booking/${SLUG}/host`, { scroll: false });
        expect(screen.getByTestId('verify-banner')).toHaveTextContent('yamada@example.com');
    });

    test('作成直後は開発用の確認リンクを表示し、再送できる', async () => {
        setHostToken(SLUG, 'stored');
        setDevVerifyUrl(SLUG, `/booking/verify?slug=${SLUG}&token=v`);
        searchParams = new URLSearchParams('created=1');
        vi.spyOn(api, 'getHostBookingPage').mockResolvedValue(makeHostPage());
        const resend = vi.spyOn(api, 'resendBookingVerification').mockResolvedValue({ message: 'ok' });
        renderWithProviders(<BookingHostPanel slug={SLUG} />);

        expect(await screen.findByTestId('dev-verify-link')).toHaveAttribute('href', `/booking/verify?slug=${SLUG}&token=v`);
        await userEvent.setup().click(screen.getByRole('button', { name: '確認メールを再送' }));
        await waitFor(() => expect(resend).toHaveBeenCalledWith(SLUG, 'stored'));
    });

    test('トークンが無ければメールのリンクを案内する', async () => {
        const getHost = vi.spyOn(api, 'getHostBookingPage');
        renderWithProviders(<BookingHostPanel slug={SLUG} />);
        expect(await screen.findByTestId('host-no-token')).toBeInTheDocument();
        expect(getHost).not.toHaveBeenCalled();
    });

    test('無効なトークンは削除する', async () => {
        setHostToken(SLUG, 'revoked');
        vi.spyOn(api, 'getHostBookingPage').mockRejectedValue(new ApiError(403, { error: 'forbidden' }));
        renderWithProviders(<BookingHostPanel slug={SLUG} />);
        expect(await screen.findByText('管理用リンクが無効です')).toBeInTheDocument();
        await waitFor(() => expect(getHostToken(SLUG)).toBeNull());
    });

    test('受付の停止と予約のキャンセルができる', async () => {
        setHostToken(SLUG, 'stored');
        vi.spyOn(api, 'getHostBookingPage').mockResolvedValue(makeHostPage({ status: 'PUBLISHED' }));
        const update = vi
            .spyOn(api, 'updateHostBookingPage')
            .mockResolvedValue(makeHostPage({ status: 'PUBLISHED', is_active: false }));
        const cancel = vi.spyOn(api, 'hostCancelBooking').mockResolvedValue({ message: 'ok', booking: makeBooking({ status: 'cancelled' }) });
        renderWithProviders(<BookingHostPanel slug={SLUG} />);
        const user = userEvent.setup();

        await user.click(await screen.findByLabelText('予約を受け付ける'));
        await waitFor(() => expect(update).toHaveBeenCalledWith(SLUG, 'stored', { is_active: false }));

        await user.click(screen.getByRole('tab', { name: /予約（1）/ }));
        await user.click(within(await screen.findByTestId('host-booking')).getByRole('button', { name: '予約をキャンセル' }));
        const dialog = await screen.findByRole('alertdialog');
        await user.click(within(dialog).getByRole('button', { name: '予約をキャンセル' }));
        await waitFor(() => expect(cancel).toHaveBeenCalledWith(SLUG, 'stored', BOOKING_UUID));
    }, 15_000);
});

describe('BookingGuestPage', () => {
    test('枠を選んで予約すると完了ページへ移動しキャンセル用トークンを保存する', async () => {
        vi.spyOn(api, 'getPublicBookingPage').mockResolvedValue(makePublicPage());
        const reserve = vi.spyOn(api, 'reserveSlot').mockResolvedValue({ booking: makeBooking(), cancel_token: 'cancel-secret', message: 'ok' });
        renderWithProviders(<BookingGuestPage slug={SLUG} />);
        const user = userEvent.setup();

        const [first] = await screen.findAllByTestId('guest-slot');
        await user.click(first);
        expect(first).toHaveAttribute('aria-pressed', 'true');
        await user.type(screen.getByLabelText(/お名前/), '佐藤');
        await user.type(screen.getByLabelText(/メールアドレス/), 'sato@example.com');
        await user.click(screen.getByRole('button', { name: 'この日時で予約する' }));

        await waitFor(() =>
            expect(push).toHaveBeenCalledWith(`/booking/${SLUG}/done?booking=${BOOKING_UUID}`)
        );
        expect(reserve).toHaveBeenCalledWith(SLUG, { slot: 12, guest_name: '佐藤', guest_email: 'sato@example.com', guest_message: undefined });
        expect(getCancelToken(BOOKING_UUID)).toBe('cancel-secret');
    }, 15_000);

    test('他の人に先に予約された場合は選び直しを促す', async () => {
        const getPage = vi.spyOn(api, 'getPublicBookingPage').mockResolvedValue(makePublicPage());
        vi.spyOn(api, 'reserveSlot').mockRejectedValue(new ApiError(400, { slot: ['この時間枠は既に予約されています'] }));
        renderWithProviders(<BookingGuestPage slug={SLUG} />);
        const user = userEvent.setup();

        await user.click((await screen.findAllByTestId('guest-slot'))[0]);
        await user.type(screen.getByLabelText(/お名前/), '佐藤');
        await user.type(screen.getByLabelText(/メールアドレス/), 'sato@example.com');
        await user.click(screen.getByRole('button', { name: 'この日時で予約する' }));

        expect(await screen.findByText(/その枠はすでに予約されました/)).toBeInTheDocument();
        await waitFor(() => expect(getPage).toHaveBeenCalledTimes(2));
        expect(push).not.toHaveBeenCalled();
    }, 15_000);

    test('非公開・存在しないページは案内を表示する', async () => {
        vi.spyOn(api, 'getPublicBookingPage').mockRejectedValue(new ApiError(404, {}));
        renderWithProviders(<BookingGuestPage slug={SLUG} />);
        expect(await screen.findByTestId('booking-unavailable')).toHaveTextContent('現在利用できません');
    });
});

describe('BookingDone / BookingCancel', () => {
    test('完了ページは予約内容とキャンセルボタンを表示する', async () => {
        searchParams = new URLSearchParams(`booking=${BOOKING_UUID}`);
        setCancelToken(BOOKING_UUID, 'cancel-secret');
        vi.spyOn(api, 'getBooking').mockResolvedValue(makeBooking());
        const cancel = vi.spyOn(api, 'cancelBooking').mockResolvedValue({ message: 'ok', booking: makeBooking({ status: 'cancelled' }) });
        renderWithProviders(<BookingDone slug={SLUG} />);

        expect(await screen.findByRole('heading', { level: 1, name: /予約が確定しました/ })).toBeInTheDocument();
        const user = userEvent.setup();
        await user.click(screen.getByTestId('cancel-booking'));
        await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '予約をキャンセルする' }));
        await waitFor(() => expect(cancel).toHaveBeenCalledWith(BOOKING_UUID, 'cancel-secret'));
        expect(await screen.findByRole('heading', { level: 1, name: /キャンセルされました/ })).toBeInTheDocument();
    });

    test('キャンセルリンクのトークンを URL から除いてキャンセルできる', async () => {
        searchParams = new URLSearchParams(`booking=${BOOKING_UUID}&token=from-email`);
        vi.spyOn(api, 'getBooking').mockResolvedValue(makeBooking());
        const cancel = vi.spyOn(api, 'cancelBooking').mockResolvedValue({ message: 'ok', booking: makeBooking({ status: 'cancelled' }) });
        renderWithProviders(<BookingCancel />);

        expect(await screen.findByRole('heading', { level: 1, name: '予約のキャンセル' })).toBeInTheDocument();
        expect(replace).toHaveBeenCalledWith(`/booking/cancel?booking=${BOOKING_UUID}`, { scroll: false });
        const user = userEvent.setup();
        await user.click(screen.getByTestId('cancel-booking'));
        await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '予約をキャンセルする' }));
        await waitFor(() => expect(cancel).toHaveBeenCalledWith(BOOKING_UUID, 'from-email'));
        expect(await screen.findByTestId('booking-status')).toHaveTextContent('キャンセル済み');
    });

    test('パラメータが無いキャンセルリンクは無効', () => {
        renderWithProviders(<BookingCancel />);
        expect(screen.getByTestId('invalid-link')).toBeInTheDocument();
    });
});

describe('BookingVerify', () => {
    test('認証成功後、管理トークンがあれば管理画面への導線を表示する', async () => {
        setHostToken(SLUG, 'stored');
        searchParams = new URLSearchParams(`slug=${SLUG}&token=verify-secret`);
        const verify = vi.spyOn(api, 'verifyBookingPage').mockResolvedValue({ slug: SLUG, status: 'PUBLISHED', message: 'ok' });
        renderWithProviders(<BookingVerify />);
        const success = await screen.findByTestId('verify-success');
        expect(verify).toHaveBeenCalledWith(SLUG, 'verify-secret');
        expect(within(success).getByRole('link', { name: '管理画面を開く' })).toHaveAttribute('href', `/booking/${SLUG}/host`);
    });

    test('管理トークンが無ければメールのリンクを案内する', async () => {
        searchParams = new URLSearchParams(`slug=${SLUG}&token=verify-secret`);
        vi.spyOn(api, 'verifyBookingPage').mockResolvedValue({ slug: SLUG, status: 'PUBLISHED', message: 'ok' });
        renderWithProviders(<BookingVerify />);
        const success = await screen.findByTestId('verify-success');
        expect(within(success).queryByRole('link', { name: '管理画面を開く' })).not.toBeInTheDocument();
        expect(within(success).getByText(/管理用リンク/)).toBeInTheDocument();
    });

    test('無効なトークンはエラーを表示する', async () => {
        searchParams = new URLSearchParams(`slug=${SLUG}&token=bad`);
        vi.spyOn(api, 'verifyBookingPage').mockRejectedValue(new ApiError(403, { error: 'invalid' }));
        renderWithProviders(<BookingVerify />);
        expect(await screen.findByTestId('verify-error')).toHaveTextContent('リンクが無効');
    });
});
