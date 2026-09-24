/** @type {import('next').NextConfig} */

const securityHeaders = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
    ...(process.env.NODE_ENV === 'production'
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
        : []),
];

const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    // Self-contained server bundle for Docker deployments
    output: 'standalone',

    // Always emit <head> metadata before the body (Next 15 otherwise streams it at the end of the
    // HTML for non-bot user agents on dynamic pages, which link-preview crawlers and audits miss)
    htmlLimitedBots: /.*/,

    // Inline the (small) global CSS into the HTML to remove render-blocking stylesheet requests
    experimental: {
        inlineCss: true,
    },

    async headers() {
        return [
            {
                source: '/:path*',
                headers: securityHeaders,
            },
            // Private-by-URL or personal pages are never indexed (meta robots is set as well)
            ...['/event/:path*', '/account/:path*', '/account', '/login', '/register', '/callback', '/booking/verify', '/booking/cancel']
                .map((source) => ({ source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] })),
            {
                // 1-on-1 guest/host pages (everything under /booking except the public /booking/new landing)
                source: '/booking/:slug((?!new$)[^/]+)/:path*',
                headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
            },
            {
                source: '/sw.js',
                headers: [
                    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
                    { key: 'Service-Worker-Allowed', value: '/' },
                    { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
                ],
            },
            {
                source: '/manifest.json',
                headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
            },
        ];
    },
};

module.exports = nextConfig;
