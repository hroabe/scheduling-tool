/**
 * Site-wide configuration used for SEO metadata, sitemap and structured data.
 */

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const siteConfig = {
    name: process.env.NEXT_PUBLIC_SITE_NAME || '日程調整ツール',
    url: rawSiteUrl.replace(/\/+$/, ''),
    title: '登録不要の無料日程調整ツール｜CSV・ICSで結果を持ち出せる',
    description:
        '登録不要・無料で使える日程調整ツール。候補日を選んでURLを共有するだけで、◯△×の出欠を自動集計。' +
        '結果はCSV（Excel）やICS（Googleカレンダー・Outlook・Appleカレンダー）で持ち出せ、作成後の候補日の追加・編集もできます。',
    keywords: [
        '日程調整',
        '日程調整ツール',
        'スケジュール調整',
        '登録不要',
        '無料',
        '出欠確認',
        '飲み会 日程調整',
        '会議 日程調整',
        '勉強会 出欠',
        'CSV出力',
        'ICS',
        'カレンダー連携',
    ],
    ogImage: '/og-image.png',
    themeColor: '#0967D2',
    locale: 'ja_JP',
    twitter: process.env.NEXT_PUBLIC_TWITTER_HANDLE || undefined,
    contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || undefined,
} as const;

export function absoluteUrl(path = '/'): string {
    return `${siteConfig.url}${path.startsWith('/') ? path : `/${path}`}`;
}
