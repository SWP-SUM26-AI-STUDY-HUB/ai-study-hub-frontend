# Repository Guidelines

> Generated from a parallel scout of `src/`, configs/build, tests/QA, and docs. Scope: the React SPA at the repo root (`package.json` name `@figma/my-make-file`, product title **AI-Powered Study Document System**, deployed at `aistudyhub.io.vn`).

## Project Overview

A React 18 single-page app for an academic document platform with a built-in AI assistant. Three user roles:

- **Guests** — search, filter (subject/tags), preview public documents.
- **Users** — real backend auth (incl. Google OAuth), document CRUD (upload/edit/visibility/share), side-by-side AI chat next to a document reader, storage metrics, profile, bookmarks.
- **Admins** — dashboard analytics, document moderation, user management, report management.

⚠️ **The README's "mock auth: any email/password = user; `admin@studydocs.ai` = admin" is stale.** The current `LoginPage` POSTs real credentials to `/api/v1/auth/login`; admin status comes from the backend-returned `user.role`. Treat this as a real-backend app.

## Architecture & Data Flow

**Boot flow** (`src/main.jsx` → `src/app/App.jsx` → `src/app/routes.jsx`):

```
main.jsx
  └─ <ThemeProvider>            (ThemeContext — outermost)
       └─ <App>                 (src/app/App.jsx)
            └─ <AppProvider>    (AppContext — inner)
                 └─ <RouterProvider router={router}>   (React Router 7 data-router)
                      └─ <Toaster/>                    (sonner)
```

- **Two independent context roots.** `ThemeProvider` is outermost; `AppProvider` sits inside `<App>`. `AppProvider` gates the entire subtree on TWO conditions: a full-screen "Logging out…" spinner while `isLoggingOut` is true (shown during the `POST /auth/logout` round-trip), otherwise `{!loading && children}` until the `/api/v1/users/profile` session-restore resolves. The `loading` gate prevents a guard-flicker redirect to `/auth/login` on refresh; the `isLoggingOut` gate prevents a guard-flicker (and the just-logged-out redirect below) during logout. Don't bypass either.
- **Global fetch interceptor lives in `api.js`.** `src/main.jsx`'s **first** statement is a bare `import "./app/api.js";` — a side-effect import that monkey-patches `window.fetch` *before* any component mounts. The interceptor transparently refreshes expired access tokens on `401` (see Auth model). So `api.js` is no longer "just `API_BASE_URL`" — importing it anywhere is what arms token refresh app-wide.
- **React Router 7 data-router** (`createBrowserRouter` + `<RouterProvider>`), **not** JSX `<Routes>`. Two layout-route groups use `Component: <Layout>` + `<Outlet/>`:
  - `AuthLayout` (`/auth/*`) — centered card, forces `data-theme="light"`.
  - `MainLayout` — navbar + storage-warning banner + hero (homepages only) + footer + `<FloatingChatBox/>`.
  - Three routes are deliberately **outside** any layout/guard: `/reset-password`, `/survey` (post-registration topic picker), `/auth/google/callback`. (`src/app/pages/HomeRedirect.jsx` is orphaned — not wired into routes.)

**Route guards** — 4 inline wrappers defined in `routes.jsx` (not separate files):

| Guard | Behavior |
|---|---|
| `ProtectedRoute` | `user ? children : <Navigate to="/auth/login">`. **Post-logout override:** if `sessionStorage['justLoggedOut'] === 'true'` (set by both navbars' logout handlers, consumed once then cleared), anon users redirect to `/` instead of `/auth/login` to avoid a login-page flash. |
| `GuestRoute` | logged-in → role-based redirect (`admin`→`/admin/home`, else `/user/home`) |
| `SmartHomeRoute` | `/home` dispatcher |
| `AdminRoute` | requires `user` AND `user.role.toLowerCase() === 'admin'` (case-insensitive — backend may send `ADMIN`); non-admins → `/user/home`, anon → `/auth/login`. Same `sessionStorage['justLoggedOut']` post-logout override as `ProtectedRoute` (anon → `/`). |

> Note: `/search` currently has **no guard** at all (neither Guest nor Protected). `isAdminMode` is a client-side toggle flag independent of `user.role` — the real admin gate is `AdminRoute`.

**Data flow** — every page calls the backend directly:

```js
import { API_BASE_URL } from '../api.js'        // depth-dependent relative path
const res = await fetch(`${API_BASE_URL}/api/v1/...`, {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
})
```

`api.js` exports `API_BASE_URL` (= `import.meta.env.VITE_API_BASE_URL ?? ''`) **and installs the global `window.fetch` interceptor** (monkey-patch — see Auth model). `''` in prod so the browser uses relative `/api/v1/...` and nginx proxies to the backend. Still no axios, no centralized client object, no error boundary — pages keep doing raw `fetch` with a hand-attached `Authorization` header; the interceptor is what makes 401s invisible. Tokens (`token`, `refreshToken`) live in `localStorage`.

**Production request path** (two nginx layers):

```
browser → host nginx (TLS, www→root 301, security headers) :443
        → container nginx :80 (127.0.0.1:8081 on host)
            ├─ /api/    → ${BACKEND_API_URL} (default ai-study-hub-api:8080)
            ├─ /s3-proxy/ → https://s3.amazonaws.com/
            └─ /*       → try_files → /index.html (SPA fallback)
```

## Backend API Contract

The SPA talks to a **sibling Spring Boot service** (`~/code/ai-study-hub-api`, container `ai-study-hub-api:8080`). It is the **sole** backend the frontend should call — the frontend must **never** call the RAG/FastAPI service or OpenAI/Gemini directly (all AI/moderation is server-side now). There is **no client-side LLM call anywhere in the frontend**; public uploads go straight to `PENDING` for backend moderation triage.

All endpoints live under `/api/v1/*`. The frontend reaches them via `${API_BASE_URL}/api/v1/...` where `API_BASE_URL` is `''` in prod (nginx proxies `/api` → backend) or `VITE_API_BASE_URL` in local dev. See the request-path diagram above.

### Response envelope (load-bearing)

Every controller returns `ApiResponse<T>`:

```json
{ "success": true, "message": "...", "data": <T>, "timestamp": "2026-07-17T12:00:00.000Z" }
```

- **Read `data` for the payload, `success` for outcome, `message` for user-facing text.** Errors reuse the same envelope with `success: false` + a `message`.
- **Validation errors** → HTTP 400 with `data` as a `{ field: message }` map (from `@Valid` on request DTOs).
- **Auth failures** → 401; **admin-only path hit by non-admin** → 403 (authz is purely path-based — `/api/v1/admin/**`).
- **AppException** carries its own HTTP status; anything unmapped → 500.
- **⚠️ Anomaly to handle:** `PaymentController` (`/api/v1/payments/create-payment`, `/vnpay-ipn`, `/vnpay-callback`) returns a **bare `ResponseEntity`/`RedirectView`**, NOT the `ApiResponse` envelope. `/payments/history` does use the envelope. Treat payment endpoints specially when parsing.

### Auth model

- **Dual JWT**: access token (1h, HMAC) + refresh token (7d, rotates on each refresh).
- Send as `Authorization: Bearer <accessToken>` on every authenticated request.
- The frontend stores both in `localStorage` keys **`token`** and **`refreshToken`** (set in `LoginPage`; read inline in each `fetch`). `logout` (in `AppContext`) POSTs `/api/v1/auth/logout`, which blacklists the access token and deletes the refresh in Redis.
- **Auto refresh-on-401 EXISTS** (global fetch interceptor in `api.js`, armed by the bare import in `main.jsx`). When a backend call returns `401` and the URL is NOT one of `/auth/login|/refresh|/register|/social-login|/google/callback` (excluded to prevent recursion), the interceptor: (1) grabs a mutex `isRefreshing`, (2) calls `POST /api/v1/auth/refresh` with `{ refreshToken }` via the *original* `fetch` (so it bypasses itself), (3) persists the rotated `token` + `refreshToken` pair, (4) replays the failed request — and any sibling requests that 401'd concurrently (queued in `refreshSubscribers`) — with the new bearer. **On refresh failure** (refresh token expired/invalid) it clears both tokens, toasts `"Session expired. Please log in again."`, and hard-redirects to `/auth/login`. Net effect: an expired *access* token is now invisible to the user; only an expired *refresh* token forces re-login. If you touch this flow, keep the auth-endpoint exclusion list or you'll infinite-loop.
- **Roles**: `ADMIN` / `USER`. `AdminRoute` compares `user.role.toLowerCase() === 'admin'` (case-insensitive — backend may return `ADMIN`).
- **User status** (from backend): `ACTIVE`, `INACTIVE`, `BANNED`, `OVERLIMITSTORAGE`. `OVERLIMITSTORAGE` blocks **upload only** (→ 400 on `/upload`); the user can still read their own docs. Banned users get 401/403 on auth-required paths.

### Domain statuses the frontend renders

- **Document**: `PENDING` (public upload awaiting moderation), `PROCESSING` (RAG indexing), `COMPLETED` (live), `REJECTED`, `FAILED`, `DELETED` (soft-deleted; restorable via `/restore` within the retention window). Public docs are only visible/searchable when `COMPLETED`.
- **AI quota**: a **daily per-user counter shared by chat + quiz + flashcard** (Redis `user:ai_limit:{userId}:{date}`). Overflow → **HTTP 429**. A generation **refusal** (doc too short/fragmented → empty items) **still consumes the quota**. `ChatResponse`, `QuizGenerateResponse`, `FlashcardGenerateResponse` all carry `{ remainingRequests, dailyLimit }` — use these to update the AI-quota badge after each call.

### Endpoint surface (by resource)

`PUB` = unauthenticated; `AUTH` = Bearer required; `ADMIN` = `ROLE_ADMIN`.

| Resource | Method + path | Auth | Notes |
|---|---|---|---|
| **Auth** `/auth` | `POST /login`, `POST /register`, `POST /verify`, `POST /resend-otp`, `POST /forgot-password`, `POST /reset-password`, `POST /refresh`, `POST /logout`, `GET /social-login`, `GET /google/callback?code=` | PUB | `/login` + `/refresh` + `/google/callback` → `LoginResponse` (access+refresh+user). `/logout`/`/register`/`/verify` → `Void`. |
| **User** `/users` | `GET /profile`, `GET /storage`, `PUT /edit-profile`, `POST /edit-profile/avatar` (multipart), `POST /change-password`, `POST /preferred-tags` | AUTH | `/profile` (session-restore on boot), `/storage` (storage banner + charts), `/preferred-tags` (onboarding survey: 1–3 public tags → drives `/recommendations`). |
| **Documents** `/documents` | `POST /upload` (multipart), `PUT /{id}`, `DELETE /{id}` (soft), `POST /{id}/restore`, `POST /{id}/share`, `POST /{id}/save`, `DELETE /{id}/unsave`, `GET /{id}`, `GET /{id}/preview`, `GET /{id}/download`, `GET /trash`, `GET /saved`, `GET /search`, `GET /recommendations`, `GET /trending`, `GET /shared/{token}`, `GET /user/{userId}` | mixed | `/search` `/trending` `/shared/{token}` `/user/{userId}` = PUB; `GET /{id}/preview` is PUB only for public+completed docs (guests get the 30% preview; authed get full). All others AUTH; mutations owner-scoped. |
| **Reviews** `/documents` | `GET /{id}/reviews`, `POST /{id}/reviews` | GET PUB / POST AUTH | |
| **Reports** `/documents` | `POST /{id}/reports` | AUTH | Abuse report → admins. |
| **Chat** `/chat` | `POST /` (body `{ documentId?, ... }`), `GET /sessions`, `GET /sessions/{id}/messages`, `PATCH /sessions/{id}`, `DELETE /sessions/{id}`, `GET /quota` | AUTH | `POST /` → answer in `data.llm_response`, citations in `data.debug.documents` (numeric `[N]` markers map 1:1 to that list). `documentId: null` = chat over all the user's docs. |
| **Study materials** `/study-materials` | `POST /quiz`, `POST /flashcard` (body `{ documentId, count, focus?, sessionId? }`) | AUTH | Quiz `count` clamped 5–20 (default 10), flashcard 5–30 (default 15). Refusal = HTTP 200 + empty `quiz`/`flashcards` + reason in `message`. **Persisted into a chat session** — request carries optional `sessionId`; if absent a new session is created (title `Quiz·<doc>` / `Flashcards·<doc>`), and the response returns `sessionId`. The user + bot turns are written to `chat_messages` (bot row carries `material_payload` JSONB), so generations appear in `GET /chat/sessions` + `/messages` and render in `ChatHistoryPage`. **Wired in `FloatingChatBox` (`src/app/components/chat/FloatingChatBox.jsx`)** — entry only on document-detail pages: a config panel (segmented Quiz/Flashcard toggle, count `<select>` clamped to the ranges, optional `focus` input) replaces the chat input, results render inline as `QuizCard`/`FlashcardCard` (shared via `src/app/components/chat/StudyMaterialCards.jsx`, also used by `ChatHistoryPage` to replay persisted sessions).
| **Tags** `/tags` | `GET /search`, `GET /public`, `POST /` (create private) | AUTH | `/public` feeds the onboarding survey; `/search` feeds upload autocomplete. |
| **Notifications** `/notifications` | `GET /`, `PUT /{id}/read` | AUTH | `type` ∈ `DOCUMENT_PENDING/APPROVED/REJECTED`, `NEW_REVIEW`, `REPORT_SUBMITTED`, `DOCUMENT_VIOLATION_DELETED`, `PLAN_UPGRADED`, `PLAN_EXPIRING`, `ACCOUNT_BANNED/WARNING/ACTIVATED` + `targetId`. |
| **Payments** `/payments` | `POST /create-payment`, `GET /vnpay-ipn`, `GET /vnpay-callback`, `GET /history` | mixed | VNPay flow. `create-payment`/`vnpay-ipn`/`vnpay-callback` = **bare ResponseEntity/RedirectView (no envelope)**; `vnpay-callback` redirects to `app.frontend-url` (default `http://localhost:5173`, must be the deployed origin in prod). `history` → envelope `List<TransactionHistoryResponse>`. |
| **Admin** `/admin/*` | `GET /documents/pending`, `POST /documents/{id}/approve`, `POST /documents/{id}/reject`, `GET /reports/documents`, `GET /reports/documents/{docId}`, `POST /reports/{reportId}/resolve`, `POST /reports/{reportId}/reject`, `GET /dashboard/stats?startDate=&endDate=`, `GET /dashboard/ai-metrics`, `POST /tags` (201), `GET /users?role=&status=&search=&page=&size=`, `POST /users/{id}/ban`, `POST /users/{id}/reactivate`, `POST /users/{id}/warn` | ADMIN | `/dashboard/stats` takes `startDate`/`endDate` (ISO) to scope the signup-trend window. **`/dashboard/ai-metrics`** returns Langfuse-backed RAG observability — summary (requests/tokens/cost/citation coverage), daily token time-series, latency p95 by stage+endpoint, request volume, route distribution, token usage + cost by model, refusals + empty-retrieval by endpoint. **Cache-only** (a server scheduler refreshes the cache ~6×/day over a fixed 7-day window; the client sends no query params and has no range/refresh controls), **fails open** (returns empty on error). Consumed only by `AiMetricsPage` (route `/admin/ai-metrics`, reachable from `AdminNavbar`'s "AI Observability" dropdown item). `/users` is paginated + filterable by `role`/`status`/`search`; the FE always passes `role=USER`. All admin charts (dashboard + AI metrics) are **hand-rolled SVG** (no Recharts). Approve/reject drive the moderation lifecycle server-side. |
| **Internal** `/internal/documents/callback` | `POST` | X-Internal-Secret | **RAG→backend only. Never call from the frontend.** |

### Frontend↔backend contract gotchas

- **Moderation is fully server-side.** Public uploads land in `PENDING` and are triaged by the backend's OpenAI Moderation API (auto-approve `<0.40` / auto-reject `≥0.80` / manual review in between). The admin `PendingDocumentsPage` approve/reject buttons hit `/admin/documents/{id}/{approve,reject}`. All prior client-side scanning — the bring-your-own-key OpenAI/Gemini *preview* formerly in `PendingDocumentsPage` **and** the hardcoded-admin-credential auto-moderation formerly in `UploadDocumentPage` — has been removed.
- **Upload→moderation is fully async; the `/upload` response is NOT the moderation result.** `POST /documents/upload` returns HTTP 200 `{success:true, data:{document_id, status:"uploading"}}` **immediately** — background processing (`@Async processDocumentAsync`) then uploads to S3, generates preview, and only for PUBLIC docs sets `PENDING` + queues moderation via a Redis Stream (→ OpenAI Moderation triage). So a successful upload toast means "saved + queued", not "moderated". `DocumentUploadResponse.id` serializes as **snake_case `document_id`** (rest of the envelope is camelCase) — read `data.document_id`, not `data.documentId`. **Frontend file-type whitelist MUST match the backend** (`DocumentServiceImpl`: `pdf, docx, txt, md`) — `.doc` (legacy Word) is **rejected** by the backend with `400 "Unsupported file format"`, so don't allow it client-side (letting the FE accept a file the BE rejects is exactly the "upload shows error but other uploads moderate fine" bug). Size cap is 50 MB on both sides. **Exact re-uploads are blocked**: the backend SHA-256s file content and returns `409 {success:false, message:"Document with identical content already exists"}` if a non-deleted doc with the same hash exists — surface that message verbatim. `OVERLIMITSTORAGE` user status / exceeded storage quota → `400`.
- **Share-link invalidation.** Soft-deleting or admin-deleting a document nulls its `link_share`; `/documents/shared/{token}` then 404s. Don't cache share URLs as permanent.
- **Restore is owner-only.** `POST /documents/{id}/restore` works for owner soft-deletes, not admin removals.
- **VNPay redirect target** (`app.frontend-url`) must point at the deployed frontend in prod, else the post-payment redirect lands on `localhost:5173`.
- **Two-phase public indexing**: a newly approved public doc flips `PROCESSING → COMPLETED` only after the RAG `/index` callback succeeds — expect a short window where `COMPLETED` isn't immediate after approve.
- **Study-material quota is shared with chat AND now shares its session.** Quiz/flashcard generation consumes the same daily AI counter and is persisted into a chat session (so it shows up in `ChatHistoryPage`). `FloatingChatBox` threads `sessionId` through `handleGenerateStudy` and updates its quota badge from `remainingRequests`/`dailyLimit` in every `study-materials` response. A refusal (empty items) still decrements quota — surface the backend `message`. Quota state lives local to `FloatingChatBox`; if quiz/flashcard UI moves to its own page, lift it into `AppContext`. **Backend schema requirement**: `chat_messages.material_payload jsonb` must exist (added to `initdb.sql`; running DBs need `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS material_payload jsonb;`).
- **Authoritative backend reference**: the backend's own `AGENTS.md` (`~/code/ai-study-hub-api/AGENTS.md`) and Swagger UI (`http://localhost:8080/swagger-ui/index.html` when the API is running) are the source of truth for request/response DTO shapes; this table is a navigation aid.

## Key Directories

```
src/
├── main.jsx                      # createRoot, ThemeProvider, imports styles + bare `import "./app/api.js"` to arm the fetch interceptor
├── app/
│   ├── App.jsx                   # AppProvider + RouterProvider + Toaster
│   ├── routes.jsx                # createBrowserRouter + 4 inline guards
│   ├── api.js                    # API_BASE_URL + global window.fetch interceptor (auto-refresh on 401)
│   ├── context/
│   │   ├── AppContext.jsx        # auth, user, storage, admin-mode, chat-selection
│   │   └── ThemeContext.jsx      # light/dark via document[data-theme]
│   ├── layouts/
│   │   ├── MainLayout.jsx        # navbar/footer/storage-banner(2GB free / 10GB premium)/floating chat + scroll-to-top on route change
│   │   └── AuthLayout.jsx        # centered auth card
│   ├── pages/                    # auth/, admin/, document/, user/, + HomeRedirect.jsx
│   ├── components/               # layout/, chat/, … (NO barrel index.js)
│   └── data/mockData.js          # vestigial — only mockDocuments still referenced
└── styles/
    ├── index.css                 # @import order: fonts → bootstrap → theme → bootstrap-custom
    ├── theme.css                 # :root vars + [data-theme="dark"] overrides + DEAD tailwind directives
    ├── bootstrap-custom.css      # custom .btn-primary-gradient, .card-custom, chatbox…
    └── fonts.css                 # Montserrat/Outfit via Google Fonts
deploy/nginx/                     # HOST nginx config (VPS), not the container's
.github/workflows/                # deploy.yml only
```

## Development Commands

Only two scripts exist in `package.json`:

```bash
npm install        # install deps (React/react-dom are OPTIONAL peers — npm resolves them)
npm run dev        # vite dev server → http://localhost:5173
npm run build      # vite build → dist/
```

**No** `test`, `lint`, `format`, `typecheck`, or `preview` scripts. See **Testing & QA** below.

Local backend calls require a `.env` (gitignored):

```bash
cp .env.example .env        # sets VITE_API_BASE_URL (default: VPS backend)
# point at a local backend instead:
#   VITE_API_BASE_URL=http://localhost:8080
```

In production, **do not** create `.env` — `VITE_API_BASE_URL` bakes to `''` and nginx proxies `/api`.

## Code Conventions & Common Patterns

- **Functional components only** — no class components.
- **Exports** — `default` export for pages; **named** export for layouts, contexts, shared components, hooks (`useApp`, `useTheme`).
- **File naming** — `PascalCase.jsx` for components/pages/contexts (`LoginPage.jsx`, `FloatingChatBox.jsx`, `AppContext.jsx`); `camelCase.js` for non-component modules (`api.js`, `mockData.js`).
- **No barrel `index.js`** in `components/` or `pages/`. Import by full path.
- **API calls** — always `import { API_BASE_URL }` and do raw `fetch`. Path depth varies: `../api.js` from `context/`, `../../api.js` from `components/` & `pages/`. **Never hardcode backend URLs** (enforced rule in `DEPLOYMENT.md`).
- **Auth token** — read from `localStorage.getItem('token')`, attach as `Authorization: Bearer …` header manually. Set on login in `LoginPage`.
- **User feedback** — `sonner` toasts via `<Toaster position="top-right" richColors/>` in `App.jsx`. Call `toast.success(...)` / `toast.error(...)` for operation outcomes.
- **UI primitives** — `react-bootstrap` (`Modal`, `Form`, `Card`, `Button`, `FloatingLabel`, `Dropdown`, `Spinner`); icons from `lucide-react` as named imports, e.g. `<BookOpen size={20}/>`.
- **Styling** — Bootstrap 5.3.3 utility classes (`d-flex`, `gap-2`, `text-muted`, `rounded-pill`) + heavy `style={{}}` inline values + CSS custom properties in `theme.css` (`--primary: #FD8F52`, `--bg-global`, `--text-main`). Dark mode via `[data-theme='dark']` selector overrides. See **Discrepancies** for the dead-Tailwind trap.
- **Global state** — `AppContext` exposes `{ user, setUser, isAuthenticated, isAdminMode, setIsAdminMode, logout, toggleAdminMode, updateProfile, loading, storageInfo, refetchStorage, selectedDocsForChat, setSelectedDocsForChat }`. `isAuthenticated` is derived (`!!user`); `storageInfo` refetches whenever `user` changes; `logout` is now `async` (sets `isLoggingOut`). `isLoggingOut` is **provider-internal** — it drives the full-screen logout-spinner render gate but is **not** exposed via context.
- **Comments** — Vietnamese comments are sprinkled across files; leave them unless rewriting the file.

### Guidelines from `guidelines/Guidelines.md` (currently inactive template text — treat as intent, not law)

Layout defaults to responsive flexbox/grid (avoid absolute positioning); keep files small (extract helpers/components); base font-size **14px**; dates formatted **`MMM d`** (e.g. "Jun 10"); button variants — **Primary** (filled brand, one per section), **Secondary** (outlined, transparent), **Tertiary** (text-only, least emphasis).

## Important Files

| File | Why it matters |
|---|---|
| `src/main.jsx` | Entry; mounts `ThemeProvider` + `<App/>`. **First statement is `import "./app/api.js"`** — arms the global fetch interceptor (token refresh) before any component mounts. |
| `src/app/App.jsx` | Composes `AppProvider` + `RouterProvider` + sonner `<Toaster/>`. |
| `src/app/routes.jsx` | The routing spine + all 4 guard components. Edit routes here. |
| `src/app/pages/admin/AiMetricsPage.jsx` | Admin AI/RAG observability page (route `/admin/ai-metrics`, linked as "AI Observability" in `AdminNavbar`); consumes `/admin/dashboard/ai-metrics`; every chart hand-rolled SVG. |
| `src/app/api.js` | `API_BASE_URL` + the global `window.fetch` interceptor (auto token-refresh on 401). Edit refresh/replay logic here. |
| `src/app/context/AppContext.jsx` | Global app state + real session-restore fetch. |
| `src/app/context/ThemeContext.jsx` | Light/dark theme, persisted in `localStorage('theme')`. |
| `src/app/layouts/MainLayout.jsx` | App shell; sticky storage-warning banner (shown ≥90% used; **2 GB free / 10 GB premium**; the `OVERLIMITSTORAGE` user status forces the over-limit red style); auto scroll-to-top on every route/search change. |
| `src/styles/index.css` | Style composition root (import order is load-bearing). |
| `src/styles/theme.css` | CSS variables + dark-mode overrides. **Contains dead Tailwind directives — see Discrepancies.** |
| `vite.config.js` | `@`→`./src` alias; custom `figmaAssetResolver` plugin; `/s3-proxy` dev proxy. |
| `Dockerfile` | Multi-stage build (node:22-alpine → nginx:1.27-alpine). |
| `nginx.conf` | Container nginx template (envsubst `${BACKEND_API_URL}`); SPA fallback + `/api` + `/s3-proxy`. |
| `deploy/nginx/aistudyhub.io.vn.conf` | HOST nginx (TLS termination, www→root, security headers). |
| `.github/workflows/deploy.yml` | Only CI workflow — build gate + SSH deploy. |
| `.env.example` | Documents `VITE_API_BASE_URL`. |

## Runtime / Tooling Preferences

- **Runtime: Node 22.** `Dockerfile` uses `node:22-alpine` and CI pins `node-version: '22'`. The README's "Node 18+" is the floor; **use 22** to match the build pipeline. No `engines`/`packageManager` field, no `.nvmrc`.
- **Package manager: npm.** `package-lock.json` (lockfileVersion 3) is canonical; CI and Docker run `npm ci`. The README's "or use pnpm" line is misleading — **prefer npm**; introducing pnpm creates a second lockfile.
- **ESM project** (`"type": "module"`). Use ES `import`/`export` everywhere.
- **`@` alias → `./src`** — available but note `main.jsx`/`App.jsx` import contexts via relative paths (Vietnamese comments document path fixes); either is fine for new code.
- **Custom Vite plugin** `figmaAssetResolver` rewrites `figma:asset/<name>` imports → `src/assets/<name>`. This is Figma-Make-export plumbing; leave it unless removing Figma artifacts.
- **Dev proxy** `/s3-proxy` → `https://s3.amazonaws.com` (prefix stripped). Consumed in `MyDocumentsPage` / `UploadDocumentPage` via `.replace('...amazonaws.com/', '/s3-proxy/')`.
- **No SSR.** Output is pure static files served by nginx; all rendering is client-side.

## Testing & QA

**There is no test, lint, format, or typecheck infrastructure.**

- No test runner (no vitest/jest/playwright/cypress/mocha), no test files.
- No ESLint, Prettier, Stylelint, EditorConfig.
- No TypeScript / `tsconfig.json` / `jsconfig.json` / `@types/*`.
- No husky / lint-staged / commitlint.
- **CI quality gate = `npm run build` only** (`.github/workflows/deploy.yml` `build` job runs `npm ci && npm run build`). The `deploy` job then SSHes to the VPS, runs `docker compose up --build -d`, and HTTP-200 health-checks `127.0.0.1:8081`.

**Practical implications for an AI assistant:**

- There is **no automated safety net**. Verify changes by running `npm run dev` and exercising the path in the browser, and confirm `npm run build` still passes before yielding.
- A stray `// eslint-disable-next-line react-hooks/exhaustive-deps` at `src/app/pages/user/PaymentSuccessPage.jsx:85` references an unconfigured rule — safe to remove when touching that file.
- A committed `dist/` bundle exists and causes grep false-positives — **exclude `dist/` from code searches**.

## Discrepancies & Stale-Doc Warnings

An AI assistant must trust the **code**, not the docs, in these cases:

1. **Tech-stack table in `README.md` is wrong.** The README claims libraries that are **NOT installed**:

   | Claimed in README | In `package.json`? |
   |---|---|
   | Tailwind CSS v4 | ❌ missing (no `tailwindcss`, no `@tailwindcss/vite`, no `tailwind.config.*`) |
   | Framer Motion (`motion`) | ❌ missing (zero imports) |
   | Recharts | ❌ missing (admin chart is **hand-rolled SVG**) |
   | Radix UI | ❌ missing |
   | Material UI (MUI) | ❌ missing |

   Actually present: React 18 (optional peer), Vite 6, React Router 7, Bootstrap 5.3.3 + react-bootstrap 2.10.4, Sonner, lucide-react, date-fns, clsx, @popperjs/core.

2. **`src/styles/theme.css` contains DEAD Tailwind directives** (`@custom-variant`, `@theme inline`, `@apply border-border/bg-background/text-foreground`). Without a Tailwind processor these are inert; only the plain `:root` and `[data-theme]` blocks there are live. Do **not** assume Tailwind classes work — they don't. Some files (e.g. `Navbar.jsx`) still contain vestigial Tailwind-style classes like `p-1.5`, `h-4 w-4` that have no effect.

3. **`clsx` (2.1.1) is an unused dependency** — imported nowhere. Don't add new `clsx` usage expecting an established pattern.

4. **`ATTRIBUTIONS.md` credits `shadcn/ui`** — stale; shadcn is built on Radix+Tailwind, neither installed.

5. **Package name mismatch** — `package.json` `name` is `@figma/my-make-file` (Figma Make export); product title everywhere else is "AI-Powered Study Document System"; container is `ai-study-hub-frontend`; backend service is `ai-study-hub-api`.

6. **Double CSS import** — `index.css` imports `fonts.css` (which itself imports bootstrap + theme) **and** directly imports bootstrap + theme again. Redundant; harmless but worth knowing when debugging style precedence.

7. **Doc languages differ** — `README.md`/`ATTRIBUTIONS.md`/`Guidelines.md` are English; `DEPLOYMENT.md`/`.env.example` are Vietnamese.

8. **`mockData.js` is largely vestigial** — only `mockDocuments` is still referenced (as a `catch`-block fallback in `GuestDocumentDetailPage.jsx`). `mockChatSessions`/`mockUsers`/`mockReports` appear unused.
