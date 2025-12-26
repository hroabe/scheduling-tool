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
