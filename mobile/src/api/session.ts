/** In-memory session shared by the API client and the auth store (avoids an import cycle). */

let token: string | null = null;
const unauthorizedListeners = new Set<() => void>();

export function getSessionToken(): string | null {
    return token;
}

export function setSessionToken(value: string | null): void {
    token = value;
}

export function onUnauthorized(listener: () => void): () => void {
    unauthorizedListeners.add(listener);
    return () => unauthorizedListeners.delete(listener);
}

export function notifyUnauthorized(): void {
    token = null;
    unauthorizedListeners.forEach((listener) => listener());
}
