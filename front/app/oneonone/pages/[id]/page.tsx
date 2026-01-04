'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAvailabilityPage, useAddAvailabilitySlots } from '@/hooks/useApi';
import { format, addMinutes } from 'date-fns';

export default function ManagePage() {
    const params = useParams();
    const id = params?.id as string;
    const { data: page, isLoading } = useAvailabilityPage(id);
    const addSlots = useAddAvailabilitySlots(id);
    const [isAdding, setIsAdding] = useState(false);

    if (isLoading) return <div>Loading...</div>;
    if (!page) return <div>Page not found</div>;

    const handleAddSlots = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const dateStr = formData.get('date') as string;
        const startTime = formData.get('start_time') as string;
        
        // Naive naive implementation for testing
        const start = new Date(`${dateStr}T${startTime}`);
        const end = addMinutes(start, 30);
        
        try {
            await addSlots.mutateAsync({
                slots: [{
                    start_at: start.toISOString(),
                    end_at: end.toISOString(),
                }]
            });
            setIsAdding(false);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-2">{page.title}</h1>
            <p className="text-gray-500 mb-4">/{page.slug}</p>
            
            <button 
                data-testid="add-slots"
                onClick={() => setIsAdding(!isAdding)}
                className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
            >
                {isAdding ? 'Cancel' : 'Add slots'}
            </button>

            {isAdding && (
                <form onSubmit={handleAddSlots} className="mb-8 p-4 border rounded">
                     <div className="mb-4">
                        <label className="block mb-1">Date</label>
                        <input type="date" name="date" required className="border p-2" />
                    </div>
                    <div className="mb-4">
                        <label className="block mb-1">Start Time</label>
                        <input type="time" name="start_time" required className="border p-2" />
                    </div>
                    <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
                        Save Slot
                    </button>
                </form>
            )}

            <div>
                <h3 className="text-lg font-bold">Existing Slots</h3>
                <ul>
                    {page.slots?.map((slot: any) => (
                        <li key={slot.id} className="border-b py-2">
                             {format(new Date(slot.start_at), 'yyyy-MM-dd HH:mm')} 
                             {slot.is_booked ? ' (Booked)' : ' (Available)'}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
