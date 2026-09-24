import type { Metadata } from 'next';
import { ContentPage, type ContentSection } from '@/components/layout/ContentPage';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
    title: '利用規約',
    description: `${siteConfig.name}の利用規約です。日程調整・1on1予約ページ・アカウント・カレンダー連携の利用条件を定めています。`,
    alternates: { canonical: '/terms' },
    openGraph: { url: '/terms' },
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

/** Build an article from message keys under `legal.terms.<id>` */
function article(id: string, paragraphs: number, items = 0): ContentSection {
    const base = `legal.terms.${id}`;
    return {
        heading: `${base}.heading`,
        paragraphs: range(paragraphs).map((n) => `${base}.p${n}`),
        items: items ? range(items).map((n) => `${base}.item${n}`) : undefined,
    };
}

const sections: ContentSection[] = [
    article('scope', 1),
    article('service', 2),
    article('account', 1),
    article('keys', 1),
    article('integrations', 1),
    article('booking', 1),
    article('prohibited', 0, 6),
    article('removal', 1),
    article('changes', 1),
    article('disclaimer', 1),
    article('amendment', 1),
    article('law', 1),
];

export default function TermsPage() {
    return (
        <ContentPage
            title="legal.terms.title"
            lead="legal.terms.lead"
            updatedAt="legal.effectiveDate"
            translationNote="legal.languageNote"
            sections={sections}
            vars={{ siteName: siteConfig.name }}
        />
    );
}
