/**
 * React Query hooks for API data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
    Schedule,
    ScheduleListItem,
    ScheduleInput,
    ScheduleSummary,
    Participant,
    ParticipantInput,
    PaginatedResponse,
} from '@/types';

// Query keys
export const queryKeys = {
    schedules: ['schedules'] as const,
    schedule: (uuid: string) => ['schedule', uuid] as const,
    summary: (uuid: string) => ['schedule', uuid, 'summary'] as const,
    participants: (uuid: string) => ['schedule', uuid, 'participants'] as const,
};

// Schedule hooks
export function useSchedules(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
}) {
    return useQuery({
        queryKey: [...queryKeys.schedules, params],
        queryFn: () => api.getSchedules({
            page: params?.page,
            page_size: params?.pageSize,
            search: params?.search,
        }),
    });
}

export function useSchedule(uuid: string) {
    return useQuery({
        queryKey: queryKeys.schedule(uuid),
        queryFn: () => api.getSchedule(uuid),
        enabled: !!uuid,
    });
}

export function useScheduleSummary(uuid: string) {
    return useQuery({
        queryKey: queryKeys.summary(uuid),
        queryFn: () => api.getScheduleSummary(uuid),
        enabled: !!uuid,
    });
}

export function useCreateSchedule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ScheduleInput) => api.createSchedule(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.schedules });
        },
    });
}

export function useUpdateSchedule(uuid: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { schedule: Partial<ScheduleInput>; editKey?: string }) =>
            api.updateSchedule(uuid, data.schedule, data.editKey),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.schedule(uuid) });
        },
    });
}

export function useDeleteSchedule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { uuid: string; editKey?: string }) =>
            api.deleteSchedule(data.uuid, data.editKey),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.schedules });
        },
    });
}

// Response hooks
export function useSubmitResponse(uuid: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { response: ParticipantInput; editToken?: string }) =>
            api.submitResponse(uuid, data.response, data.editToken),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.schedule(uuid) });
            queryClient.invalidateQueries({ queryKey: queryKeys.summary(uuid) });
        },
    });
}

export function useDeleteParticipant(uuid: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { participantId: number; token?: string }) =>
            api.deleteParticipant(uuid, data.participantId, data.token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.schedule(uuid) });
            queryClient.invalidateQueries({ queryKey: queryKeys.summary(uuid) });
        },
    });
}

// Finalization hook
export function useFinalizeSchedule(uuid: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { candidateId: number; editKey?: string }) =>
            api.finalizeSchedule(uuid, data.candidateId, data.editKey),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.schedule(uuid) });
        },
    });
}

// 1-on-1 key additions (partial update to queryKeys object not easily done with replace, so I'll add them to the object if I can, or just append hooks)
// Wait, I needs to update queryKeys const at the top first if I want to use them. 
// I'll assume I can just add hooks below and use string keys or update queryKeys separately.
// Let's update the file by chunks.

// CSV Export hook
export function useExportCsv(uuid: string) {
    return useMutation({
        mutationFn: (includeComments = true) => api.exportCsv(uuid, includeComments),
        onSuccess: async (blob) => {
            // Download the file
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `schedule-${uuid}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
    });
}

// RFC-0005: 1-on-1 Scheduling Hooks
export function useAvailabilityPages() {
    return useQuery({
        queryKey: ['oneonone', 'pages'],
        queryFn: () => api.getAvailabilityPages(),
    });
}

export function useCreateAvailabilityPage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => api.createAvailabilityPage(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['oneonone', 'pages'] });
        },
    });
}

export function useAvailabilityPage(idOrSlug: string) {
    return useQuery({
        queryKey: ['oneonone', 'page', idOrSlug],
        queryFn: () => api.getAvailabilityPage(idOrSlug),
        enabled: !!idOrSlug,
    });
}

export function usePublicAvailabilityPage(slug: string) {
    return useQuery({
        queryKey: ['oneonone', 'public-page', slug],
        queryFn: () => api.getPublicAvailabilityPage(slug),
        enabled: !!slug,
    });
}

export function useAddAvailabilitySlots(pageId: number | string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { slots: { start_at: string; end_at: string }[] }) =>
            api.addAvailabilitySlots(pageId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['oneonone', 'page', String(pageId)] });
        },
    });
}

export function useBookSlot(slug: string) {
    return useMutation({
        mutationFn: (data: { slot: number; guest_name: string; guest_email: string; guest_message?: string }) =>
            api.bookSlot(slug, data),
    });
}
