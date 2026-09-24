/**
 * Client-side state management using Zustand
 *
 * - useEditKeyStore: edit keys verified in this tab (sessionStorage, cleared when the tab closes)
 * - useMyResponsesStore: edit tokens of responses sent from this browser (localStorage)
 * - useAttributionStore: first-touch `?ref=` / utm_source for growth measurement (localStorage)
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const noopStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
};

const sessionStore = () => (typeof window === 'undefined' ? noopStorage : window.sessionStorage);
const localStore = () => (typeof window === 'undefined' ? noopStorage : window.localStorage);

interface EditKeyState {
    keys: Record<string, string>;
    setKey: (uuid: string, key: string) => void;
    clearKey: (uuid: string) => void;
}

export const useEditKeyStore = create<EditKeyState>()(
    persist(
        (set) => ({
            keys: {},
            setKey: (uuid, key) => set((state) => ({ keys: { ...state.keys, [uuid]: key } })),
            clearKey: (uuid) =>
                set((state) => {
                    const keys = { ...state.keys };
                    delete keys[uuid];
                    return { keys };
                }),
        }),
        { name: 'scheduling-tool-edit-keys', storage: createJSONStorage(sessionStore) }
    )
);

export interface MyResponse {
    participantId: number;
    name: string;
    editToken: string;
}

interface MyResponsesState {
    responses: Record<string, MyResponse>;
    saveResponse: (uuid: string, response: MyResponse) => void;
    removeResponse: (uuid: string) => void;
}

export const useMyResponsesStore = create<MyResponsesState>()(
    persist(
        (set) => ({
            responses: {},
            saveResponse: (uuid, response) =>
                set((state) => ({ responses: { ...state.responses, [uuid]: response } })),
            removeResponse: (uuid) =>
                set((state) => {
                    const responses = { ...state.responses };
                    delete responses[uuid];
                    return { responses };
                }),
        }),
        { name: 'scheduling-tool-my-responses', storage: createJSONStorage(localStore) }
    )
);

interface AttributionState {
    ref: string | null;
    createdCount: number;
    setRef: (ref: string) => void;
    incrementCreated: () => void;
}

export const useAttributionStore = create<AttributionState>()(
    persist(
        (set) => ({
            ref: null,
            createdCount: 0,
            // First touch wins: keep the original acquisition channel
            setRef: (ref) => set((state) => (state.ref ? state : { ref })),
            incrementCreated: () => set((state) => ({ createdCount: state.createdCount + 1 })),
        }),
        { name: 'scheduling-tool-attribution', storage: createJSONStorage(localStore) }
    )
);
