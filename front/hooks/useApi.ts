/**
 * React Query hooks for API data fetching
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { ApiError } from '@/lib/api';
import type { CandidateInput, ParticipantInput, ScheduleInput, ScheduleUpdateInput } from '@/types';

// Query keys
export const queryKeys = {
    schedule: (uuid: string) => ['schedule', uuid] as const,
    summary: (uuid: string) => ['schedule', uuid, 'summary'] as const,
};

const noRetryOn4xx = (failureCount: number, error: Error) =>
    !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2;

export function useSchedule(uuid: string) {
    return useQuery({
        queryKey: queryKeys.schedule(uuid),
        queryFn: () => api.getSchedule(uuid),
        enabled: !!uuid,
        retry: noRetryOn4xx,
    });
}

export function useScheduleSummary(uuid: string) {
    return useQuery({
        queryKey: queryKeys.summary(uuid),
        queryFn: () => api.getScheduleSummary(uuid),
        enabled: !!uuid,
        retry: noRetryOn4xx,
    });
}

function useInvalidateSchedule(uuid: string) {
    const queryClient = useQueryClient();
    // queryKeys.schedule(uuid) is a prefix of the summary key, so both are refreshed
    return () => queryClient.invalidateQueries({ queryKey: queryKeys.schedule(uuid) });
}

export function useCreateSchedule() {
    return useMutation({
        mutationFn: (data: { schedule: ScheduleInput; ref?: string | null }) =>
            api.createSchedule(data.schedule, data.ref),
    });
}

export function useUpdateSchedule(uuid: string) {
    const invalidate = useInvalidateSchedule(uuid);
    return useMutation({
        mutationFn: (data: { schedule: ScheduleUpdateInput; editKey: string }) =>
            api.updateSchedule(uuid, data.schedule, data.editKey),
        onSuccess: invalidate,
    });
}

export function useDeleteSchedule(uuid: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (editKey: string) => api.deleteSchedule(uuid, editKey),
        onSuccess: () => queryClient.removeQueries({ queryKey: queryKeys.schedule(uuid) }),
    });
}

export function useVerifyEditKey(uuid: string) {
    return useMutation({
        mutationFn: (editKey: string) => api.verifyEditKey(uuid, editKey),
    });
}

// Response hooks
export function useSubmitResponse(uuid: string) {
    const invalidate = useInvalidateSchedule(uuid);
    return useMutation({
        mutationFn: (data: { response: ParticipantInput; editToken?: string }) =>
            api.submitResponse(uuid, data.response, data.editToken),
        onSuccess: invalidate,
    });
}

export function useDeleteParticipant(uuid: string) {
    const invalidate = useInvalidateSchedule(uuid);
    return useMutation({
        mutationFn: (data: { participantId: number; editToken?: string; editKey?: string }) =>
            api.deleteParticipant(uuid, data.participantId, data),
        onSuccess: invalidate,
    });
}

// Candidate hooks
export function useAddCandidate(uuid: string) {
    const invalidate = useInvalidateSchedule(uuid);
    return useMutation({
        mutationFn: (data: { candidate: CandidateInput; editKey: string }) =>
            api.addCandidate(uuid, data.candidate, data.editKey),
        onSuccess: invalidate,
    });
}

export function useDeleteCandidate(uuid: string) {
    const invalidate = useInvalidateSchedule(uuid);
    return useMutation({
        mutationFn: (data: { candidateId: number; editKey: string }) =>
            api.deleteCandidate(uuid, data.candidateId, data.editKey),
        onSuccess: invalidate,
    });
}

// Finalization hook
export function useFinalizeSchedule(uuid: string) {
    const invalidate = useInvalidateSchedule(uuid);
    return useMutation({
        mutationFn: (data: { candidateId: number | null; editKey: string }) =>
            api.finalizeSchedule(uuid, data.candidateId, data.editKey),
        onSuccess: invalidate,
    });
}

// Export URLs (CSV / ICS are served as attachments and downloaded via plain links)
export function useExportUrls(uuid: string) {
    return {
        csv: api.exportCsvUrl(uuid),
        ics: (candidateId?: number) => api.exportIcsUrl(uuid, candidateId),
    };
}
