'use client';

interface WebsiteJsonLdProps {
    baseUrl?: string;
}

export function WebsiteJsonLd({ baseUrl = 'https://your-domain.com' }: WebsiteJsonLdProps) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: '日程調整ツール',
        description: '会議やイベントの日程調整を簡単に。参加者全員の都合を確認し、最適な日程を見つけましょう。',
        url: baseUrl,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        browserRequirements: 'Requires JavaScript',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'JPY',
        },
        featureList: [
            'URL共有で誰でも回答',
            '◯△×の3段階回答',
            'リアルタイム集計',
            '期限設定・リマインダー',
            'Googleカレンダー連携',
            '1対1予約モード',
        ],
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

interface OrganizationJsonLdProps {
    baseUrl?: string;
}

export function OrganizationJsonLd({ baseUrl = 'https://your-domain.com' }: OrganizationJsonLdProps) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: '日程調整ツール',
        url: baseUrl,
        logo: `${baseUrl}/icon-512.png`,
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

interface BreadcrumbJsonLdProps {
    items: { name: string; url: string }[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
