import { screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Locale files load asynchronously; allow for a loaded CI runner
vi.setConfig({ testTimeout: 30_000 });
import { FaqList } from '@/components/landing/FaqList';
import { LandingPage } from '@/components/landing/LandingPage';
import { ContentPage } from '@/components/layout/ContentPage';
import { StatusPage } from '@/components/layout/StatusPage';
import { faqItems, faqKeys, landingFaqKeys } from '@/lib/faq';
import { I18nProvider } from '@/providers/I18nProvider';
import { useThemeStore } from '@/stores/themeStore';
import enFaq from '@/messages/en/faq.json';
import enHome from '@/messages/en/home.json';
import jaFaq from '@/messages/ja/faq.json';
import { renderWithProviders } from '../utils';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/',
}));

function renderInLocale(ui: ReactElement, locale: 'ja' | 'en') {
    document.cookie = `locale=${locale};path=/`;
    return renderWithProviders(<I18nProvider initialLocale={locale}>{ui}</I18nProvider>);
}

beforeEach(() => {
    document.cookie = 'locale=;path=/;max-age=0';
    useThemeStore.setState({ mode: null });
});

describe('LandingPage', () => {
    test('h1 は 1 つで、SEO 用のセクション id を持つ', () => {
        const { container } = renderWithProviders(<LandingPage />);
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(container.querySelector('section#features')).not.toBeNull();
        expect(container.querySelector('section#how-it-works')).not.toBeNull();
        expect(screen.getByRole('heading', { level: 2, name: '使い方はかんたん3ステップ' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: /回答状況の表示イメージ/ })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /イベントを作成する/ })[0]).toHaveAttribute('href', '/create');
        expect(screen.getByTestId('powered-by')).toHaveAttribute('href', '/?ref=powered_by');
    });

    test('モード選択はグループ調整 (/create) と 1on1 予約 (/booking/new) へ誘導する', () => {
        renderWithProviders(<LandingPage />);
        const modes = screen.getByRole('region', { name: '用途に合わせて選べます' });
        const group = within(modes).getByRole('article', { name: 'みんなで日程調整' });
        const oneOnOne = within(modes).getByRole('article', { name: '1on1予約ページ' });
        expect(within(group).getByRole('link', { name: /グループの日程調整を作成/ })).toHaveAttribute('href', '/create');
        expect(within(oneOnOne).getByRole('link', { name: /1on1予約ページを作成/ })).toHaveAttribute('href', '/booking/new');
        // No hard-coded mock people from origin/main
        expect(screen.queryByText('山田 大郎')).not.toBeInTheDocument();
    });

    test('FAQ 抜粋は faq 名前空間の翻訳を表示する', () => {
        renderWithProviders(<LandingPage />);
        const faq = screen.getByRole('region', { name: 'よくある質問' });
        expect(within(faq).getAllByRole('button')).toHaveLength(landingFaqKeys.length);
        expect(within(faq).getByRole('button', { name: jaFaq.items.oneOnOne.q })).toBeInTheDocument();
        expect(within(faq).getByRole('link', { name: /すべての質問を見る/ })).toHaveAttribute('href', '/faq');
    });

    test('英語ロケールでは英語で表示される', async () => {
        renderInLocale(<LandingPage />, 'en');
        expect(await screen.findByRole('heading', { level: 1, name: /Schedule without signing up/ }, { timeout: 15_000 })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: new RegExp(enHome.modeGroupCta) })).toHaveAttribute('href', '/create');
        const bookingLinks = screen.getAllByRole('link', { name: new RegExp(enHome.mode1on1Cta) });
        expect(bookingLinks.length).toBeGreaterThan(0);
        for (const link of bookingLinks) expect(link).toHaveAttribute('href', '/booking/new');
        expect(screen.getByRole('button', { name: enFaq.items.noLogin.q })).toBeInTheDocument();
        // Latin locales use ✓ ? ✗ instead of ◯△×
        expect(screen.getByText(/✓ \? ✗ answers are tallied/)).toBeInTheDocument();
    });

    test('かわいいテーマでは出欠記号が顔文字になる', () => {
        useThemeStore.setState({ mode: 'cute' });
        renderWithProviders(<LandingPage />);
        expect(screen.getByText(/😊🤔😢の出欠を自動集計/)).toBeInTheDocument();
    });
});

describe('FAQ', () => {
    test('FAQページは全質問を表示する', () => {
        renderWithProviders(<FaqList />);
        expect(screen.getByRole('heading', { level: 1, name: 'よくある質問' })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /^Q\./ })).toHaveLength(faqKeys.length);
        expect(screen.getByRole('link', { name: /1on1予約ページを作成する/ })).toHaveAttribute('href', '/booking/new');
    });

    test('FAQページは英語に翻訳される', async () => {
        renderInLocale(<FaqList />, 'en');
        expect(await screen.findByRole('heading', { level: 1, name: 'Frequently asked questions' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: `Q. ${enFaq.items.calendarSync.q}` })).toBeInTheDocument();
    });

    test('構造化データ用の faqItems は日本語で、新しい質問を含む', () => {
        expect(faqItems).toHaveLength(faqKeys.length);
        const questions = faqItems.map((item) => item.question);
        for (const key of ['oneOnOne', 'account', 'calendarSync', 'languages', 'theme'] as const) {
            expect(questions).toContain(jaFaq.items[key].q);
        }
    });
});

describe('static pages', () => {
    test('ContentPage はメッセージキーを翻訳し、未知の文字列はそのまま描画する', () => {
        renderWithProviders(
            <ContentPage
                title="legal.privacy.title"
                sections={[{ heading: '第1条', paragraphs: ['本文'], items: ['項目A', 'legal.privacy.storage.item2'] }]}
            />
        );
        expect(screen.getByRole('heading', { level: 1, name: 'プライバシーポリシー' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2, name: '第1条' })).toBeInTheDocument();
        expect(screen.getByText('項目A')).toBeInTheDocument();
        expect(screen.getByText('表示言語の設定（Cookie）')).toBeInTheDocument();
    });

    test('ContentPage は英語では翻訳の注記を表示する', async () => {
        renderInLocale(
            <ContentPage
                title="legal.terms.title"
                lead="legal.terms.lead"
                translationNote="legal.languageNote"
                vars={{ siteName: 'Demo' }}
                sections={[]}
            />,
            'en'
        );
        expect(await screen.findByRole('heading', { level: 1, name: 'Terms of Service' })).toBeInTheDocument();
        expect(screen.getByText(/Terms of Service for Demo/)).toBeInTheDocument();
        expect(screen.getByText(/Japanese version prevails/)).toBeInTheDocument();
    });

    test('StatusPage はキーを翻訳する', async () => {
        renderInLocale(<StatusPage code="404" title="home.notFoundTitle" message="home.notFoundMessage" />, 'en');
        await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument());
        expect(screen.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute('href', '/');
    });
});

describe('messages', () => {
    const root = join(process.cwd(), 'messages');
    const flatten = (obj: object, prefix = ''): string[] =>
        Object.entries(obj).flatMap(([key, value]) =>
            value && typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`]
        );

    test.each(['home', 'faq', 'legal'])('%s.json は ja と en でキーが一致する', (ns) => {
        const ja = JSON.parse(readFileSync(join(root, 'ja', `${ns}.json`), 'utf8'));
        const en = JSON.parse(readFileSync(join(root, 'en', `${ns}.json`), 'utf8'));
        expect(flatten(en).sort()).toEqual(flatten(ja).sort());
    });
});
