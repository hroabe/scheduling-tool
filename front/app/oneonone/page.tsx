'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAvailabilityPages, useCreateAvailabilityPage } from '@/hooks/useApi';

export default function OneOnOneDashboard() {
    const router = useRouter();
    const { data: pages, isLoading } = useAvailabilityPages();
    const createPage = useCreateAvailabilityPage();
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            title: formData.get('title'),
            slug: formData.get('slug'),
            description: formData.get('description'),
            duration_minutes: 30, // Default
            timezone_name: 'UTC',
            is_public: true,
        };
        
        try {
            const page = await createPage.mutateAsync(data);
            router.push(`/oneonone/pages/${page.id}`); 
        } catch (error) {
            console.error('Failed to create page', error);
            // In a real app, show toast
        }
    };

    if (isLoading) return <div>Loading...</div>;

    const pageList = pages?.results || [];

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">1-on-1 Scheduling</h1>
            
            <button 
                data-testid="create-page"
                onClick={() => setIsCreating(!isCreating)}
                className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
            >
                {isCreating ? 'Cancel' : 'Create New Page'}
            </button>

            {isCreating && (
                <form onSubmit={handleCreate} className="mb-8 p-4 border rounded">
                    <div className="mb-4">
                        <label className="block mb-1">Title</label>
                        <input name="title" required className="border p-2 w-full" />
                    </div>
                    <div className="mb-4">
                        <label className="block mb-1">Slug</label>
                        <input name="slug" required className="border p-2 w-full" />
                    </div>
                    <div className="mb-4">
                        <label className="block mb-1">Description</label>
                        <textarea name="description" className="border p-2 w-full" />
                    </div>
                    <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
                        Save
                    </button>
                </form>
            )}

            <div className="grid gap-4">
                {pageList.map((page: any) => (
                    <div key={page.id} className="border p-4 rounded shadow">
                        <h2 className="text-xl font-bold">{page.title}</h2>
                        <p className="text-gray-500">/{page.slug}</p>
                        <p>{page.description}</p>
                        <a href={`/oneonone/p/${page.slug}`} className="text-blue-500 hover:underline mr-4">
                            View Public Page
                        </a>
                        <a href={`/oneonone/pages/${page.id}`} className="text-green-500 hover:underline">
                            Manage
                        </a>
                    </div>
                ))}
                {pageList.length === 0 && <p>No availability pages yet.</p>}
            </div>
        </div>
    );
}
