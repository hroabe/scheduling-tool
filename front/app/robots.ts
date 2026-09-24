import type { MetadataRoute } from 'next';
import { absoluteUrl, siteConfig } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                // Event pages are NOT disallowed here on purpose: crawlers must be able to
                // fetch them to see `noindex` (meta tag + X-Robots-Tag header).
                disallow: ['/offline'],
            },
        ],
        sitemap: absoluteUrl('/sitemap.xml'),
        host: siteConfig.url,
    };
}
