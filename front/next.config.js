/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // API proxy for development (when not using nginx)
    async rewrites() {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
            console.warn('NEXT_PUBLIC_API_URL not set, API rewrites disabled');
            return [];
        }
        return [
            {
                source: '/api/:path*',
                destination: `${apiUrl}/api/:path*`,
            },
        ];
    },

    // Optimize images
    images: {
        domains: ['localhost'],
    },
};

module.exports = nextConfig;
