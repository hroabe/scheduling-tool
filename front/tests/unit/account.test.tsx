import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { IntegrationsPanel } from '@/components/account/IntegrationsPanel';
import { LoginForm } from '@/components/account/LoginForm';
import { listItemStatus, MyEventsList } from '@/components/account/MyEventsList';
import { RegisterForm } from '@/components/account/RegisterForm';
import { AccountSettings } from '@/components/account/AccountSettings';
import { safeNextPath } from '@/components/account/utils';
import api, { ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';
import { renderWithProviders } from '../utils';

const push = vi.fn();
const replace = vi.fn();
let searchParams = new URLSearchParams();
let pathname = '/';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, replace, back: vi.fn(), prefetch: vi.fn() }),
    useSearchParams: () => searchParams,
    usePathname: () => pathname,
}));

const USER: User = {
    id: 1,
    username: 'taro',
    email: 'taro@example.com',
    first_name: '太郎',
    last_name: '山田',
    profile: { timezone_name: 'Asia/Tokyo', email_notifications: true, preferred_language: 'ja' },
    date_joined: '2026-01-01T00:00:00Z',
};

function signIn() {
    useAuthStore.setState({ user: USER, isAuthenticated: true, isChecked: true, isLoading: false });
}

beforeEach(() => {
    push.mockReset();
    replace.mockReset();
    searchParams = new URLSearchParams();
    pathname = '/';
    useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isChecked: true,
        isLoading: false,
        tokens: { accessToken: null, refreshToken: null, idToken: null, expiresAt: null },
    });
});

describe('safeNextPath', () => {
    test('同一オリジンのパスのみ許可する', () => {
        expect(safeNextPath('/account/events')).toBe('/account/events');
        expect(safeNextPath('//evil.example')).toBe('/account');
        expect(safeNextPath('https://evil.example')).toBe('/account');
        expect(safeNextPath('/\\evil.example')).toBe('/account');
        expect(safeNextPath(null)).toBe('/account');
    });
});

describe('LoginForm', () => {
    test('ログイン成功で ?next= のページへ移動する', async () => {
        searchParams = new URLSearchParams('next=/account/events');
        const login = vi.spyOn(api, 'login').mockResolvedValue({ user: USER, message: 'ok' });
        renderWithProviders(<LoginForm />);

        const user = userEvent.setup();
        await user.type(screen.getByLabelText(/メールアドレスまたはユーザー名/), 'taro@example.com');
        await user.type(screen.getByLabelText(/^パスワード/), 'secret-pass');
        await user.click(screen.getByRole('button', { name: 'ログイン' }));

        await waitFor(() => expect(replace).toHaveBeenCalledWith('/account/events'));
        expect(login).toHaveBeenCalledWith('taro@example.com', 'secret-pass');
        expect(useAuthStore.getState().user?.username).toBe('taro');
    });

    test('認証失敗時はエラーを表示し移動しない', async () => {
        vi.spyOn(api, 'login').mockRejectedValue(new ApiError(400, { non_field_errors: ['invalid'] }));
        renderWithProviders(<LoginForm />);

        const user = userEvent.setup();
        await user.type(screen.getByLabelText(/メールアドレスまたはユーザー名/), 'taro');
        await user.type(screen.getByLabelText(/^パスワード/), 'wrong');
        await user.click(screen.getByRole('button', { name: 'ログイン' }));

        expect(await screen.findByTestId('login-error')).toHaveTextContent('パスワードが正しくありません');
        expect(replace).not.toHaveBeenCalled();
    });

    test('外部サイトへの next は無視して /account へ移動する', async () => {
        searchParams = new URLSearchParams('next=//evil.example');
        vi.spyOn(api, 'login').mockResolvedValue({ user: USER, message: 'ok' });
        renderWithProviders(<LoginForm />);

        const user = userEvent.setup();
        await user.type(screen.getByLabelText(/メールアドレスまたはユーザー名/), 'taro');
        await user.type(screen.getByLabelText(/^パスワード/), 'secret-pass');
        await user.click(screen.getByRole('button', { name: 'ログイン' }));
        await waitFor(() => expect(replace).toHaveBeenCalledWith('/account'));
    });

    test('Keycloak 未設定時は SSO ボタンを表示しない', () => {
        renderWithProviders(<LoginForm />);
        expect(screen.queryByRole('button', { name: /SSO/ })).not.toBeInTheDocument();
    });
});

describe('RegisterForm', () => {
    test('?email= でメールアドレスが入力済みになる', () => {
        searchParams = new URLSearchParams('email=new@example.com');
        renderWithProviders(<RegisterForm />);
        expect(screen.getByLabelText(/^メールアドレス/)).toHaveValue('new@example.com');
    });

    test('サーバーのフィールドエラーを該当欄に表示する', async () => {
        searchParams = new URLSearchParams('email=new@example.com');
        vi.spyOn(api, 'register').mockRejectedValue(new ApiError(400, { username: ['このユーザー名は既に使用されています。'] }));
        renderWithProviders(<RegisterForm />);
        const user = userEvent.setup();
        await user.type(screen.getByLabelText(/^ユーザー名/), 'taro');
        await user.type(screen.getByLabelText(/^パスワード（確認）/), 'Passw0rd!x');
        await user.type(screen.getByLabelText(/^パスワード\s*\*?$/), 'Passw0rd!x');
        await user.click(screen.getByRole('button', { name: '登録する' }));
        expect(await screen.findByText('このユーザー名は既に使用されています。')).toBeInTheDocument();
        expect(replace).not.toHaveBeenCalled();
    });
});

describe('Account pages', () => {
    test('未ログインなら /login?next= へリダイレクトする', async () => {
        pathname = '/account';
        renderWithProviders(<AccountSettings />);
        await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?next=%2Faccount'));
        expect(screen.queryByRole('button', { name: 'ログイン' })).not.toBeInTheDocument();
    });

    test('プロフィールを保存できる', async () => {
        signIn();
        const updateMe = vi.spyOn(api, 'updateMe').mockResolvedValue({ ...USER, first_name: '次郎' });
        renderWithProviders(<AccountSettings />);
        const user = userEvent.setup();
        const firstName = screen.getByLabelText('名');
        await user.clear(firstName);
        await user.type(firstName, '次郎');
        await user.click(screen.getByRole('button', { name: '保存する' }));
        await waitFor(() => expect(updateMe).toHaveBeenCalledWith(expect.objectContaining({ first_name: '次郎', timezone_name: 'Asia/Tokyo' })));
    });

    test('マイイベントが空なら作成への導線を表示する', async () => {
        signIn();
        vi.spyOn(api, 'getMySchedules').mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
        renderWithProviders(<MyEventsList />);
        const empty = await screen.findByTestId('events-empty');
        expect(within(empty).getByRole('link', { name: 'イベントを作成' })).toHaveAttribute('href', '/create');
    });

    test('マイイベント一覧を表示する', async () => {
        signIn();
        vi.spyOn(api, 'getMySchedules').mockResolvedValue({
            count: 1,
            next: null,
            previous: null,
            results: [
                {
                    id: 1,
                    uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    name: '定例会議',
                    owner_name: '山田',
                    department: '',
                    deadline: null,
                    is_active: true,
                    is_finalized: true,
                    status: 'fixed',
                    participant_count: 3,
                    candidate_count: 2,
                    url: '',
                    created_at: '2026-09-01T00:00:00Z',
                },
            ],
        });
        renderWithProviders(<MyEventsList />);
        const item = await screen.findByTestId('event-item');
        expect(within(item).getByRole('link', { name: '定例会議' })).toHaveAttribute(
            'href',
            '/event/a1b2c3d4-e5f6-7890-abcd-ef1234567890'
        );
        expect(within(item).getByText('回答 3 人')).toBeInTheDocument();
    });
});

describe('listItemStatus', () => {
    test('API の status を使い、停止中の受付中イベントは inactive にする', () => {
        expect(listItemStatus({ status: 'closed', is_active: true, is_finalized: false })).toBe('closed');
        expect(listItemStatus({ status: 'fixed', is_active: false, is_finalized: true })).toBe('fixed');
        expect(listItemStatus({ status: 'open', is_active: false, is_finalized: false })).toBe('inactive');
        expect(listItemStatus({ status: 'open', is_active: true, is_finalized: false })).toBe('open');
    });
});

describe('IntegrationsPanel', () => {
    test('「連携する」で OAuth URL へ遷移する', async () => {
        signIn();
        vi.spyOn(api, 'getIntegrationStatus').mockResolvedValue({ configured: true, connected: false });
        const connect = vi.spyOn(api, 'connectIntegration').mockResolvedValue({ auth_url: 'https://accounts.google.com/o/oauth2/auth?x=1' });
        const redirect = vi.fn();
        renderWithProviders(<IntegrationsPanel redirect={redirect} />);

        const card = await screen.findByTestId('integration-google');
        const user = userEvent.setup();
        await user.click(await within(card).findByRole('button', { name: '連携する' }));
        await waitFor(() => expect(redirect).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/auth?x=1'));
        expect(connect).toHaveBeenCalledWith('google');
    });

    test('サーバー未設定 (503) なら案内を表示する', async () => {
        signIn();
        vi.spyOn(api, 'getIntegrationStatus').mockResolvedValue({ configured: true, connected: false });
        vi.spyOn(api, 'connectIntegration').mockRejectedValue(new ApiError(503, { error: 'not_configured' }));
        const redirect = vi.fn();
        renderWithProviders(<IntegrationsPanel redirect={redirect} />);

        const card = await screen.findByTestId('integration-outlook');
        const user = userEvent.setup();
        await user.click(await within(card).findByRole('button', { name: '連携する' }));
        expect(await screen.findByTestId('integration-outlook-not-configured')).toHaveTextContent('設定されていません');
        expect(redirect).not.toHaveBeenCalled();
    });

    test('configured=false なら連携ボタンを出さない', async () => {
        signIn();
        vi.spyOn(api, 'getIntegrationStatus').mockResolvedValue({ configured: false, connected: false });
        renderWithProviders(<IntegrationsPanel redirect={vi.fn()} />);
        expect(await screen.findByTestId('integration-google-not-configured')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '連携する' })).not.toBeInTheDocument();
    });

    test('OAuth コールバックの結果をトーストで表示し URL を戻す', async () => {
        signIn();
        searchParams = new URLSearchParams('provider=google&status=connected');
        vi.spyOn(api, 'getIntegrationStatus').mockResolvedValue({ configured: true, connected: true });
        renderWithProviders(<IntegrationsPanel redirect={vi.fn()} />);
        expect(await screen.findByText('Google カレンダー と連携しました')).toBeInTheDocument();
        expect(replace).toHaveBeenCalledWith('/account/integrations', { scroll: false });
    });

    test('OAuth エラーの理由を表示する', async () => {
        signIn();
        searchParams = new URLSearchParams('provider=outlook&status=error&reason=denied');
        vi.spyOn(api, 'getIntegrationStatus').mockResolvedValue({ configured: true, connected: false });
        renderWithProviders(<IntegrationsPanel redirect={vi.fn()} />);
        expect(await screen.findByText('Outlook カレンダー と連携できませんでした')).toBeInTheDocument();
        expect(screen.getByText('アクセスが許可されませんでした。')).toBeInTheDocument();
    });

    test('連携解除できる', async () => {
        signIn();
        vi.spyOn(api, 'getIntegrationStatus').mockResolvedValue({ configured: true, connected: true, is_valid: true });
        const disconnect = vi.spyOn(api, 'disconnectIntegration').mockResolvedValue({ message: 'ok' });
        renderWithProviders(<IntegrationsPanel redirect={vi.fn()} />);
        const card = await screen.findByTestId('integration-google');
        const user = userEvent.setup();
        await user.click(await within(card).findByRole('button', { name: '連携を解除' }));
        await waitFor(() => expect(disconnect).toHaveBeenCalledWith('google'));
    });
});
