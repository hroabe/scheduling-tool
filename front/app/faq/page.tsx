import type { Metadata } from 'next';
import { FaqList } from '@/components/landing/FaqList';
import { JsonLd } from '@/components/seo/JsonLd';
import { faqItems } from '@/lib/faq';
import { absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
    title: 'よくある質問（FAQ）',
    description:
        '登録不要の日程調整ツールのよくある質問。料金、CSV・Excelでの管理、Googleカレンダー・Outlookへの登録（ICS）、作成後の候補日の編集、編集キーなどについて解説します。',
    alternates: { canonical: '/faq' },
    openGraph: { url: '/faq' },
};

const structuredData = [
    {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
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
            { '@type': 'ListItem', position: 2, name: 'よくある質問', item: absoluteUrl('/faq') },
        ],
    },
];

export default function FaqPage() {
    return (
        <>
            <JsonLd data={structuredData} />
            <FaqList items={faqItems} />
        </>
    );
}
