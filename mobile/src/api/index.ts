import { API_URL } from '../config';
import { getCurrentLocale } from '../i18n';
import { ApiClient } from './client';
import { getSessionToken, notifyUnauthorized } from './session';

export { ApiClient, ApiError, extractErrorMessage } from './client';
export type * from './types';

export const api = new ApiClient({
    baseUrl: API_URL,
    getToken: getSessionToken,
    onUnauthorized: notifyUnauthorized,
    getLanguage: getCurrentLocale,
});
