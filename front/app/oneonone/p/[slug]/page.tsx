'use client';

import { useParams } from 'next/navigation';
import { usePublicAvailabilityPage, useBookSlot } from '@/hooks/useApi';
import { format } from 'date-fns';

export default function PublicPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const { data: page, isLoading, error } = usePublicAvailabilityPage(slug);
    const bookSlot = useBookSlot(slug);

    if (isLoading) return <div>Loading...</div>;
    // Handle 404 explicitly if possible, or reliance on API error
    if (error || !page) return <div className="text-red-500">Not Found (404)</div>;

    const handleBook = async (slotId: number) => {
        const name = prompt('Your Name');
        const email = prompt('Your Email');
        if (!name || !email) return;

        try {
            await bookSlot.mutateAsync({
                slot: slotId,
                guest_name: name,
                guest_email: email,
            });
            alert('Booked!');
            // Invalidate/Refetch handled by mutation or auto
        } catch (err) {
            alert('Failed');
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <h1 className="text-3xl font-bold mb-2">{page.title}</h1>
            <p className="mb-6">{page.description}</p>

            <h2 className="text-xl font-bold mb-4">Available Slots</h2>
            <div className="grid gap-2">
                {page.available_slots?.map((slot: any) => (
                    <button 
                        key={slot.id}
                        onClick={() => handleBook(slot.id)}
                        className="border p-4 rounded hover:bg-gray-100 text-left"
                    >
                        {format(new Date(slot.start_at), 'yyyy-MM-dd HH:mm')}
                    </button>
                ))}
                {page.available_slots?.length === 0 && <p>No slots available.</p>}
            </div>
        </div>
    );
}
