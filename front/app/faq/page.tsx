import type { Metadata } from 'next';
import { FaqList } from '@/components/landing/FaqList';
import { JsonLd } from '@/components/seo/JsonLd';
import { faqItems } from '@/lib/faq';
import { absoluteUrl } from '@/lib/site';
import jaFaq from '@/messages/ja/faq.json';

export const metadata: Metadata = {
    title: 'よくある質問（FAQ）',
    description:
        '登録不要の日程調整ツールのよくある質問。料金、1on1予約ページ、ログインとアカウント、Googleカレンダー・Outlook連携、CSV・ICSでの書き出し、作成後の候補日の編集、編集キー、多言語対応などについて解説します。',
    alternates: { canonical: '/faq' },
    openGraph: { url: '/faq' },
};

// Structured data is always Japanese (the source locale), matching the server-rendered HTML
const structuredData = [
    {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: 'ja',
        mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
    },
    {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'ホーム', item: absoluteUrl('/') },
            { '@type': 'ListItem', position: 2, name: jaFaq.title, item: absoluteUrl('/faq') },
        ],
    },
];

export default function FaqPage() {
    return (
        <>
            <JsonLd data={structuredData} />
            <FaqList />
        </>
    );
}
