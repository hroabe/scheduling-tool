import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

const lastModified = new Date('2026-09-24');

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        { url: absoluteUrl('/'), lastModified, changeFrequency: 'weekly', priority: 1 },
        { url: absoluteUrl('/create'), lastModified, changeFrequency: 'monthly', priority: 0.9 },
        { url: absoluteUrl('/booking/new'), lastModified, changeFrequency: 'monthly', priority: 0.8 },
        { url: absoluteUrl('/faq'), lastModified, changeFrequency: 'monthly', priority: 0.7 },
        { url: absoluteUrl('/privacy'), lastModified, changeFrequency: 'yearly', priority: 0.3 },
        { url: absoluteUrl('/terms'), lastModified, changeFrequency: 'yearly', priority: 0.3 },
    ];
}
