/**
 * Dynamic config on top of app.json:
 * - EXPO_PUBLIC_API_URL / EXPO_PUBLIC_WEB_URL override `extra.apiUrl` / `extra.webUrl`.
 * - When the web URL is https, register universal links (iOS) / verified app links (Android)
 *   for https://<host>/event/* and https://<host>/booking/*.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
    const extra = (config.extra ?? {}) as Record<string, unknown>;
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || (extra.apiUrl as string) || '';
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL || (extra.webUrl as string) || '';
    const host = /^https:\/\/([^/:?#]+)/.exec(webUrl)?.[1];

    return {
        ...config,
        name: config.name ?? '日程調整ツール',
        slug: config.slug ?? 'scheduling-tool-mobile',
        extra: { ...extra, apiUrl, webUrl },
        ios: {
            ...config.ios,
            ...(host ? { associatedDomains: [`applinks:${host}`] } : {}),
        },
        android: {
            ...config.android,
            ...(host
                ? {
                      intentFilters: [
                          {
                              action: 'VIEW',
                              autoVerify: true,
                              data: [
                                  { scheme: 'https', host, pathPrefix: '/event/' },
                                  { scheme: 'https', host, pathPrefix: '/booking/' },
                              ],
                              category: ['BROWSABLE', 'DEFAULT'],
                          },
                      ],
                  }
                : {}),
        },
    };
};
