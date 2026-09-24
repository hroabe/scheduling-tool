import { addMinutes } from './date';

/** Back-to-back 1-on-1 slots starting at `start`, `duration + buffer` minutes apart */
export function buildSlots(start: Date, count: number, duration: number, buffer: number) {
    return Array.from({ length: count }, (_, i) => {
        const s = addMinutes(start, i * (duration + buffer));
        return { start_at: s.toISOString(), end_at: addMinutes(s, duration).toISOString() };
    });
}
