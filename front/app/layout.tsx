import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
    title: '日程調整ツール - スケジュール調整を簡単に',
    description: '会議やイベントの日程調整を簡単に行えるツールです。参加者全員の都合を確認し、最適な日程を見つけましょう。',
    keywords: ['日程調整', 'スケジュール', '会議', 'イベント', '予定'],
    authors: [{ name: 'Scheduling Tool Team' }],
    manifest: '/manifest.json',
    themeColor: '#0967D2',
    viewport: {
        width: 'device-width',
        initialScale: 1,
        maximumScale: 1,
    },
    openGraph: {
        title: '日程調整ツール',
        description: '会議やイベントの日程調整を簡単に',
        type: 'website',
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
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&display=swap"
                />
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
