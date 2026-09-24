import type { Metadata } from 'next';
import { ContentPage, type ContentSection } from '@/components/layout/ContentPage';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
    title: 'プライバシーポリシー',
    description: `${siteConfig.name}における個人情報・利用者情報（アカウント、カレンダー連携、1on1予約、通知メール、Cookie）の取り扱いについて説明します。`,
    alternates: { canonical: '/privacy' },
    openGraph: { url: '/privacy' },
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

/** Build a section from message keys under `legal.privacy.<id>` */
function section(id: string, paragraphs: number, items: number, extra: string[] = []): ContentSection {
    const base = `legal.privacy.${id}`;
    return {
        heading: `${base}.heading`,
        paragraphs: [...range(paragraphs).map((n) => `${base}.p${n}`), ...extra.map((key) => `${base}.${key}`)],
        items: items ? range(items).map((n) => `${base}.item${n}`) : undefined,
    };
}

const sections: ContentSection[] = [
    section('collect', 1, 8),
    section('purpose', 0, 6),
    section('visibility', 4, 0),
    section('storage', 1, 6),
    section('thirdParty', 2, 0),
    section('retention', 5, 0),
    section('security', 1, 0),
    section('contact', 0, 0, [siteConfig.contactEmail ? 'p1Email' : 'p1NoEmail', 'p2']),
];

export default function PrivacyPage() {
    return (
        <ContentPage
            title="legal.privacy.title"
            lead="legal.privacy.lead"
            updatedAt="legal.effectiveDate"
            translationNote="legal.languageNote"
            sections={sections}
            vars={{ siteName: siteConfig.name, email: siteConfig.contactEmail ?? '' }}
        />
    );
}
