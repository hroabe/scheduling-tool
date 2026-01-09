import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';
import { WebsiteJsonLd, OrganizationJsonLd } from '@/components/seo/JsonLd';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com';

export const metadata: Metadata = {
    metadataBase: new URL(baseUrl),
    title: {
        default: '日程調整ツール - スケジュール調整を簡単に',
        template: '%s | 日程調整ツール',
    },
    description: '会議やイベントの日程調整を簡単に行えるツールです。参加者全員の都合を確認し、最適な日程を見つけましょう。登録不要・無料。',
    keywords: ['日程調整', 'スケジュール調整', '会議', 'イベント', '予定調整', '無料', 'オンライン', 'Doodle代替'],
    authors: [{ name: 'Scheduling Tool Team' }],
    creator: 'Scheduling Tool Team',
    publisher: 'Scheduling Tool',
    manifest: '/manifest.json',
    alternates: {
        canonical: baseUrl,
    },
    openGraph: {
        title: '日程調整ツール',
        description: '会議やイベントの日程調整を簡単に。登録不要・無料でお使いいただけます。',
        url: baseUrl,
        siteName: '日程調整ツール',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: '日程調整ツール',
            },
        ],
        locale: 'ja_JP',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: '日程調整ツール',
        description: '会議やイベントの日程調整を簡単に。登録不要・無料。',
        images: ['/og-image.png'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    verification: {
        // google: 'your-google-verification-code',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ja" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=M+PLUS+Rounded+1c:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
                <WebsiteJsonLd baseUrl={baseUrl} />
                <OrganizationJsonLd baseUrl={baseUrl} />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            if ('serviceWorker' in navigator) {
                                window.addEventListener('load', function() {
                                    navigator.serviceWorker.register('/sw.js').then(
                                        function(registration) {
                                            console.log('Service Worker registration successful');
                                        },
                                        function(err) {
                                            console.log('Service Worker registration failed: ', err);
                                        }
                                    );
                                });
                            }
                        `,
                    }}
                />
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}

