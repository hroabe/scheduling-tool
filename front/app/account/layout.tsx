import type { Metadata } from 'next';

// Every /account page is personal: never indexed
export const metadata: Metadata = {
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    alternates: { canonical: null },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    return children;
}
