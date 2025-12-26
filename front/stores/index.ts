/**
 * Global state management using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Schedule, ScheduleInput, CandidateInput, AttendanceStatus } from '@/types';

interface CreateScheduleState {
    // Form data
    name: string;
    description: string;
    ownerName: string;
    ownerEmail: string;
    department: string;
    editKey: string;
    deadline: string;
    allowMaybe: boolean;
    notifyOnResponse: boolean;
    candidates: CandidateInput[];

    // Actions
    setField: <K extends keyof Omit<CreateScheduleState, 'setField' | 'addCandidate' | 'removeCandidate' | 'updateCandidate' | 'reset' | 'toInput'>>(
        field: K,
        value: CreateScheduleState[K]
    ) => void;
    addCandidate: (candidate: CandidateInput) => void;
    removeCandidate: (index: number) => void;
    updateCandidate: (index: number, candidate: CandidateInput) => void;
    reset: () => void;
    toInput: () => ScheduleInput;
}

const initialState = {
    name: '',
    description: '',
    ownerName: '',
    ownerEmail: '',
    department: '',
    editKey: '',
    deadline: '',
    allowMaybe: true,
    notifyOnResponse: false,
    candidates: [] as CandidateInput[],
};

export const useCreateScheduleStore = create<CreateScheduleState>()((set, get) => ({
    ...initialState,

    setField: (field, value) => set({ [field]: value }),

    addCandidate: (candidate) => set((state) => ({
        candidates: [...state.candidates, { ...candidate, order: state.candidates.length }],
    })),

    removeCandidate: (index) => set((state) => ({
        candidates: state.candidates.filter((_, i) => i !== index),
    })),

    updateCandidate: (index, candidate) => set((state) => ({
        candidates: state.candidates.map((c, i) => (i === index ? candidate : c)),
    })),

    reset: () => set(initialState),

    toInput: () => {
        const state = get();
        return {
            name: state.name,
            description: state.description,
            owner_name: state.ownerName,
            owner_email: state.ownerEmail || undefined,
            department: state.department || undefined,
            edit_key: state.editKey || undefined,
            deadline: state.deadline || undefined,
            allow_maybe: state.allowMaybe,
            notify_on_response: state.notifyOnResponse,
            candidates: state.candidates,
        };
    },
}));


interface ResponseState {
    // Current response data
    participantName: string;
    comment: string;
    attendances: Map<number, AttendanceStatus>;
    editToken: string | null;

    // Actions
    setParticipantName: (name: string) => void;
    setComment: (comment: string) => void;
    setAttendance: (candidateId: number, status: AttendanceStatus) => void;
    setEditToken: (token: string | null) => void;
    reset: () => void;
    toInput: () => {
        name: string;
        comment: string;
        attendances: { candidate: number; status: AttendanceStatus }[];
    };
}

export const useResponseStore = create<ResponseState>()((set, get) => ({
    participantName: '',
    comment: '',
    attendances: new Map(),
    editToken: null,

    setParticipantName: (name) => set({ participantName: name }),
    setComment: (comment) => set({ comment }),
    setAttendance: (candidateId, status) => set((state) => {
        const newAttendances = new Map(state.attendances);
        newAttendances.set(candidateId, status);
        return { attendances: newAttendances };
    }),
    setEditToken: (token) => set({ editToken: token }),
    reset: () => set({
        participantName: '',
        comment: '',
        attendances: new Map(),
        editToken: null,
    }),
    toInput: () => {
        const state = get();
        return {
            name: state.participantName,
            comment: state.comment,
            attendances: Array.from(state.attendances.entries()).map(([candidate, status]) => ({
                candidate,
                status,
            })),
        };
    },
}));


interface UIState {
    // Theme
    isDarkMode: boolean;

    // Modals
    isCreateModalOpen: boolean;
    isFinalizeModalOpen: boolean;
    isDeleteModalOpen: boolean;

    // Actions
    toggleDarkMode: () => void;
    setCreateModalOpen: (open: boolean) => void;
    setFinalizeModalOpen: (open: boolean) => void;
    setDeleteModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            isDarkMode: false,
            isCreateModalOpen: false,
            isFinalizeModalOpen: false,
            isDeleteModalOpen: false,

            toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
            setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
            setFinalizeModalOpen: (open) => set({ isFinalizeModalOpen: open }),
            setDeleteModalOpen: (open) => set({ isDeleteModalOpen: open }),
        }),
        {
            name: 'scheduling-tool-ui',
            partialize: (state) => ({ isDarkMode: state.isDarkMode }),
        }
    )
);
