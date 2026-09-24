import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ServiceWorkerRegister } from '@/components/layout/ServiceWorkerRegister';
import { JsonLd } from '@/components/seo/JsonLd';
import { absoluteUrl, siteConfig } from '@/lib/site';
import { Providers } from './providers';
import './globals.css';

// Japanese glyphs use the OS font (Hiragino / Yu Gothic / Noto Sans CJK on Android):
// a Japanese web font adds ~100KB of render-blocking @font-face CSS.
const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
});

export const metadata: Metadata = {
    metadataBase: new URL(siteConfig.url),
    title: {
        default: `${siteConfig.name}｜${siteConfig.title}`,
        template: `%s｜${siteConfig.name}`,
    },
    description: siteConfig.description,
    keywords: [...siteConfig.keywords],
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.name, url: siteConfig.url }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    category: 'productivity',
    formatDetection: { telephone: false, email: false, address: false },
    alternates: { canonical: '/' },
    manifest: '/manifest.json',
    icons: {
        icon: [
            { url: '/favicon.ico', sizes: '48x48' },
            { url: '/icon.svg', type: 'image/svg+xml' },
        ],
        apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },
    appleWebApp: {
        capable: true,
        title: siteConfig.name,
        statusBarStyle: 'default',
    },
    openGraph: {
        type: 'website',
        locale: siteConfig.locale,
        siteName: siteConfig.name,
        url: '/',
        title: `${siteConfig.name}｜${siteConfig.title}`,
        description: siteConfig.description,
        images: [
            {
                url: siteConfig.ogImage,
                width: 1200,
                height: 630,
                alt: `${siteConfig.name} - 登録不要で使える無料の日程調整ツール`,
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: `${siteConfig.name}｜${siteConfig.title}`,
        description: siteConfig.description,
        images: [siteConfig.ogImage],
        ...(siteConfig.twitter ? { site: siteConfig.twitter, creator: siteConfig.twitter } : {}),
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
        },
    },
    verification: {
        google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
        other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
            ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
            : undefined,
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: siteConfig.themeColor },
        { media: '(prefers-color-scheme: dark)', color: '#1A202C' },
    ],
    colorScheme: 'light dark',
};

const siteStructuredData = [
    {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': absoluteUrl('/#website'),
        name: siteConfig.name,
        url: absoluteUrl('/'),
        inLanguage: 'ja',
        description: siteConfig.description,
        publisher: { '@id': absoluteUrl('/#organization') },
    },
    {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': absoluteUrl('/#organization'),
        name: siteConfig.name,
        url: absoluteUrl('/'),
        logo: absoluteUrl('/icons/icon-512x512.png'),
    },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ja" className={inter.variable} suppressHydrationWarning>
            <body>
                <JsonLd data={siteStructuredData} />
                <Providers>{children}</Providers>
                <ServiceWorkerRegister />
            </body>
        </html>
    );
}
