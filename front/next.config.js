/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // API proxy for development
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:8000/api/:path*',
            },
        ];
    },

    // Optimize images
    images: {
        domains: ['localhost'],
    },

    // Environment variables
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    },
};

module.exports = nextConfig;
