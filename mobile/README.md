# Scheduling Tool — Mobile (Expo / React Native)

iOS / Android (and web preview) client for the scheduling tool. It talks to the Django API in `../api`
and follows the contract in [`docs/11_integration.md`](../docs/11_integration.md) §2.

| | |
|---|---|
| Runtime | Expo SDK 52 · React Native 0.76 (New Architecture) · React 18.3 · Hermes |
| Navigation | React Navigation 7 (native stack + bottom tabs), deep links via `expo-linking` |
| State | zustand (auth), AsyncStorage (preferences, recent events), `expo-secure-store` (secrets) |
| Tests | Jest (`jest-expo`) |

## Setup

Requirements: Node 18+ (tested with Node 24), npm, and either Expo Go, an Android emulator, or the iOS simulator.

```bash
cd mobile
npm ci            # uses the committed package-lock.json
npm start         # Metro + Expo dev tools (press a / i / w)
npm run android   # open on an Android emulator/device
npm run ios       # open on the iOS simulator (macOS)
npm run web       # browser preview
```

Start the API as well (`cd api && python manage.py runserver 0.0.0.0:8000`). Use `0.0.0.0` when testing on a
physical device so the phone can reach your PC.

### Configuration

| Setting | How to set | Default |
|---|---|---|
| API base URL | `EXPO_PUBLIC_API_URL`, or `expo.extra.apiUrl` in `app.json` | Expo Go on a device: `http://<Metro host IP>:8000` · Android emulator: `http://10.0.2.2:8000` · iOS simulator / web: `http://localhost:8000` |
| Web app URL (share links, https deep links) | `EXPO_PUBLIC_WEB_URL`, or `expo.extra.webUrl` | `http://localhost:3000` |

Copy `.env.example` to `.env` (Expo loads it automatically), e.g.

```bash
EXPO_PUBLIC_API_URL=https://api.chousei.example.com
EXPO_PUBLIC_WEB_URL=https://chousei.example.com
```

The current API URL is shown in **Account → About**. When `EXPO_PUBLIC_WEB_URL` is `https://…`, `app.config.ts`
also registers iOS universal links (`applinks:<host>`) and Android verified app links for `/event/*` and
`/booking/*` (the web server must then serve `apple-app-site-association` / `assetlinks.json`).

For the web preview (`npm run web`, served from `http://localhost:8081`), add that origin to the API's
`CORS_ALLOWED_ORIGINS`.

## Scripts

| Command | What it does |
|---|---|
| `npm run type-check` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (`eslint-config-expo`) |
| `npm test` | Unit tests: API client (headers, token auth, no secrets in URLs), i18n key parity, deep links, helpers |
| `API_IT_URL=http://127.0.0.1:8000 npm test -- integration` | Optional end-to-end run of the API client against a live API (skipped without `API_IT_URL`) |
| `npm run export:web` | Production web bundle into `dist/` |
| `npm run doctor` | `expo-doctor` dependency / config checks |
| `python scripts/generate_assets.py` | Regenerates the placeholder icon, adaptive icon, splash and favicon (Pillow) |

## Features

**Group scheduling (no account needed)**
- Home: create an event, open a shared event by pasting its URL or UUID, events you created (when logged in,
  `GET /accounts/me/schedules/`), and events recently opened on this device.
- Create: name, organizer, description, date options (date + start/end pickers; "add" copies the last option
  to the next day), "maybe" toggle, deadline, optional edit key, notification email. Sends the device time zone.
- Event detail: status (open / closed / fixed), summary with the recommended option (◯=2, △=1, same as the API),
  response table, respond form. Your response's edit token (`"<id>.<secret>"`, returned once) is stored so you
  can edit or delete your own response later. Share sheet / copy link, CSV and ICS export (opened in the browser),
  "add to calendar" for the fixed date, meeting URL.
- Organizer tools — available to the owner account or with the edit key (saved automatically on create, or entered
  and verified via `verify_edit_key`): fix / unfix a date, close / reopen, delete.

**Accounts (RFC-0003)** — log in with username **or** email, register, profile edit, logout (revokes the token).
Calendar integrations open the web app (OAuth runs there).

**1-on-1 (RFC-0005)**
- Booking pages (logged in, `oneonone/pages/`): list, create (ASCII slug suggestion), detail with share link,
  public toggle, add slots (N back-to-back slots honoring duration + buffer), delete free slots, page bookings,
  delete page.
- Received bookings (`oneonone/bookings/`): filter, confirm / cancel by booking UUID.
- Guest booking (`oneonone/booking/<slug>/`): pick a slot and reserve without an account; the cancel token is kept
  on the device so the guest can cancel later.

**Deep links** (`scheme: schedulingtool`)

| Link | Opens |
|---|---|
| `schedulingtool://event/<uuid>` · `https://<web host>/event/<uuid>[/edit]` | Event detail |
| `schedulingtool://booking/<slug>` · `https://<web host>/booking/<slug>` | Guest booking |
| `schedulingtool://create` | Create event |

Try on an emulator: `npx uri-scheme open "schedulingtool://event/<uuid>" --android` (or `--ios`). In Expo Go the
prefix is `exp://<host>:8081/--/event/<uuid>`.

**i18n (RFC-0006)** — ja (source), en, zh, ko, es, fr, de, pt with identical keys (enforced by `npm test`).
The device language comes from `expo-localization` `getLocales()`; a manual choice is saved in Account → Settings.

**Themes (RFC-0008)** — light / dark follow the OS (`useColorScheme`) or can be forced; optional "cute" pastel
palette with 😊🤔😢 symbols. Stored in AsyncStorage.

## Security notes

- Mobile uses DRF token auth: `POST /accounts/login/` and `/register/` with `issue_token: true`, then
  `Authorization: Token <token>`. Requests are sent with `credentials: 'omit'` so no session cookie is stored —
  the API puts `SessionAuthentication` first, and a session cookie would make every POST fail the CSRF check.
- The API answers an invalid/revoked token with **403** (DRF uses the first authenticator's header), even on public
  endpoints. The client confirms with a `GET /accounts/me/` probe, then drops the token and retries anonymously.
- Edit keys go in `X-Edit-Key`, response tokens in `X-Edit-Token`, booking cancel tokens in the JSON body —
  never in URLs (unit-tested).
- Auth token, edit keys, response tokens and cancel tokens live in `expo-secure-store` (Keychain / Keystore);
  the web preview falls back to AsyncStorage (localStorage).

## Project layout

```
App.tsx                 providers + navigation (tabs: Home / 1-on-1 / Account; stack screens)
index.ts                registerRootComponent
app.json, app.config.ts Expo config (+ env overrides, universal/app links)
src/api/                client.ts (ApiClient), types.ts, session.ts, index.ts (singleton)
src/screens/            Home, CreateEvent, EventDetail, Login, Register, Account,
                        AvailabilityPages, CreateAvailabilityPage, AvailabilityPageDetail, MyBookings, Booking
src/components/         ui.tsx (themed kit), DateTimeField(.native).tsx, BookingCard.tsx
src/navigation/         types.ts, linking.ts, open.ts
src/i18n/               core.ts (pure), index.tsx (provider), locales/*.json
src/theme/              palette.ts (pure), index.tsx (provider)
src/stores/             authStore.ts, localEvents.ts
src/lib/                date, links, summary, slug, slots, symbols, storage, share, dialogs
__tests__/              api, i18n, logic, integration (opt-in)
```

## Not supported yet

- Push notifications (mobile-spec v2).
- Login-free 1-on-1 page creation / host management with a host token (`oneonone/booking/` + `X-Host-Token`) —
  use the web app.
- Editing an event's details or its date options after creation (`PATCH` / candidates API) — use the web app.
- Keycloak / SSO login and connecting Google / Outlook inside the app (opens the web app instead).
- Native builds need `npx expo prebuild` or EAS; the icons/splash are generated placeholders.
