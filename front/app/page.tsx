import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LandingPage } from '@/components/landing/LandingPage';
import { RefTracker } from '@/components/landing/RefTracker';
import { JsonLd } from '@/components/seo/JsonLd';
import { absoluteUrl, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
    alternates: { canonical: '/' },
};

// Structured data is Japanese (the source locale), matching the server-rendered HTML
const structuredData = [
    {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: siteConfig.name,
        url: absoluteUrl('/'),
        description: siteConfig.description,
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: '日程調整',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript. Requires HTML5.',
        inLanguage: 'ja',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
        featureList: [
            '登録不要でイベント作成・回答',
            '◯△×の出欠を自動集計',
            'おすすめ日程の自動表示',
            'CSV（Excel）エクスポート',
            'ICS（Googleカレンダー・Outlook・Appleカレンダー）エクスポート',
            '作成後の候補日の追加・削除・締切・日程確定',
            '1on1予約ページ（空き枠の公開と予約受付、ログイン不要）',
            'Googleカレンダー・Outlook連携と会議URLの自動発行（ログイン時）',
            '回答通知メール・回答期限リマインダー',
            '8言語対応・かわいいテーマ',
            'PWA対応',
        ],
        image: absoluteUrl(siteConfig.ogImage),
        publisher: { '@id': absoluteUrl('/#organization') },
    },
    {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: `${siteConfig.name}で日程調整をする方法`,
        totalTime: 'PT1M',
        step: [
            {
                '@type': 'HowToStep',
                position: 1,
                name: '候補日を選んで作成',
                text: 'イベント名とお名前を入力し、カレンダーから候補日を選んでイベントを作成します。',
                url: absoluteUrl('/create'),
            },
            { '@type': 'HowToStep', position: 2, name: 'URLを共有', text: '作成されたイベントページのURLを参加者に共有します。' },
            {
                '@type': 'HowToStep',
                position: 3,
                name: '集計を確認して確定',
                text: '自動集計とおすすめ日程を確認して日程を確定し、ICSでカレンダーに追加します。',
            },
        ],
    },
];

export default function HomePage() {
    return (
        <>
            <JsonLd data={structuredData} />
            <Suspense fallback={null}>
                <RefTracker />
            </Suspense>
            <LandingPage />
        </>
    );
}
