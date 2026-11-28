# Spec: final demo features

Status: draft. Source branch: `origin/final-demo` (4 commits, `d5c9760..792af8a`, branched from `f3a7f08`). Compared against `origin/main` at `8b01e43` and open PR #92 (head `49982d8`).

## Goal

The `final-demo` branch shows Gatherr's end-to-end story for the course presentation, but much of it is faked in the frontend: mock calendars, random busy slots, a hard-coded share URL and a hard-coded "final date" message. This spec lists every behaviour the demo shows, records which ones `main` already does for real, and turns the rest into issues so the real product can do everything the demo pretended to.

Not in scope: the presentation itself (`presentation.md`, `tech-stack-icons.html`) and demo-only shortcuts listed under "Dropped" below.

## Terms

The repo has no `GLOSSARY.md` or ADRs yet. This spec uses the words the code and `presentation.md` use:

- **Organiser**: the user who created the event (`event.details.creatorId`).
- **Participant**: a user with an `event_user` row for the event.
- **Slot**: one entry of `event.times`, for example `0900-27042026` (`HHmm-ddMMyyyy`), or a date/weekday for the other event types.
- **Available / not available**: the two slot lists saved per participant by `POST /events/{shortId}/respond`.
- **"Yours" tab / "Group" tab**: the two tabs of `HeatmapTabs` (mark your own availability / see the heatmap).
- **Busy slots**: slots that overlap an event in the participant's Google Calendar (`GET /events/{shortId}/calendar-busy`).
- **Confirm**: the organiser picks the final slot (`POST /events/{shortId}/confirm`, PR #92).

## User stories

Organiser

1. As an organiser, right after I create an event I want to be prompted to share its link, so I don't have to look for the share button.
2. As an organiser, I want to share the event link through my phone's share sheet (or copy it on desktop).
3. As an organiser, I want to select a whole week of dates in one tap when creating an event.
4. As an organiser, once the heatmap shows the best time, I want to confirm it so every participant gets the final time by email with a calendar invite.

Participant

5. As a participant, I want to import busy times from the Google calendars I choose, so I don't mark times I'm already booked.
6. As a participant, I want imported busy slots to stay visibly blocked in the "Yours" grid, so "Select all" and row/column toggles don't mark me available when I'm not.
7. As a participant, I want to see the group heatmap and where everyone overlaps.

Developer (demo)

8. As a developer, I want to run the whole demo flow, including calendar import and confirm, in mock mode (`VITE_ENABLE_MOCK=true`) without a backend or Google account.

## Behaviours in the demo and how each is faked

| # | Behaviour the demo shows | How the demo fakes it (`origin/final-demo`) |
|---|---|---|
| B1 | Home: event name input, Enter submits, button disabled when empty | Name pre-filled with `"Game night"` (`frontend/src/routes/index.tsx:12`); Enter and disabled are real (`:27`, `:34`) |
| B2 | Create: tap a date to toggle it (drag removed) | Real (`frontend/src/components/ui/pages/create/calendar/Calendar.tsx:168`) |
| B3 | Create: ISO week button (`W19`/`N19`) selects all future days of the week | Real (`Calendar.tsx:185`, `:220`) |
| B4 | Create: past dates dropped from the saved draft | Real (`frontend/src/routes/create.tsx:102`) |
| B5 | After create, a "Share this event with your friends" dialog opens | Real UI, but strings are hard-coded English (`frontend/src/hooks/mutation/useCreateEvent.ts:25`, `frontend/src/routes/e/$shortId.tsx:32`, `:45`, `:220-231`) |
| B6 | Share link button uses the native share sheet, falls back to copy | URL is hard-coded to `https://gatherr.alber.ee/e/cozy-hot-toast-fake` (`frontend/src/components/ui/CopyLinkButton.tsx:15`, `:20-21`) |
| B7 | "Sync Google Calendar": pick calendars, import busy times | `MOCK_CALENDARS` list (`frontend/src/components/ui/pages/event/GoogleCalendarSync.tsx:11`); busy = fixed hour ranges with `Math.random()` (`:27`); no OAuth, no API |
| B8 | After import, busy slots are saved as not available immediately and a toast says "Google Calendar synced" | Auto-save via `respond(...)` (`frontend/src/components/ui/pages/event/HeatmapTabs.tsx:136-138`, `GoogleCalendarSync.tsx:59-62`) |
| B9 | "Yours" grid shows not-available slots with a red tint and a ban icon; "Select all", row and column toggles skip them | UI-only, derived from the user's saved `notAvailable` (`HeatmapTabs.tsx:97`, `:133`, `:340`) |
| B10 | "Send final date" button: toast "Invites sent to people", then shares a text | Fully faked: toast plus hard-coded `"Game night begins at 19:00 13.05 Wednesday."` (`$shortId.tsx:58-64`, `:99`); no API call |
| B11 | Group heatmap with a clear peak (Wed 13 May 19:00) and a London participant for the timezone story | Mock data: `GATHER_EVENT`, `DEMO_EVENT`, `JAMES` (`frontend/src/mocks/data.ts:68`, `:162`, `:178`, `:258`) |
| B12 | Sign-in in mock mode skips the Google popup | `useGoogleAuth` returns `login(undefined)` when `VITE_ENABLE_MOCK` (`frontend/src/hooks/mutation/useGoogleAuth.ts:13`) |
| B13 | Demo on a phone over the LAN / ngrok | `vite.config.ts:29` `allowedHosts` with an ngrok host, `@vitejs/plugin-basic-ssl` in `package.json`; TanStack devtools commented out (`frontend/src/routes/__root.tsx:130`) |
| B14 | Button colours `dark` and new `yellow` variant | Real (`frontend/src/components/ui/button.tsx:9-10`) |

## Buckets against `main` and PR #92

All `main` references are `origin/main` at `8b01e43`.

| # | Behaviour | Bucket | Evidence on `main` | Issue |
|---|---|---|---|---|
| B1 | Home Enter / disabled | **done** | `frontend/src/routes/index.tsx:27-36`. The `"Game night"` pre-fill is demo-only and correctly absent (`:12`). | none |
| B2 | Tap-to-toggle dates | **done** | `Calendar.tsx:168`; copy updated in `frontend/messages/en.json:22` | none |
| B3 | Week button | **done** | `Calendar.tsx:48`, `:220` | none |
| B4 | Past dates out of draft | **done** | `frontend/src/routes/create.tsx:99-102` | none |
| B5 | Share dialog after create | **missing** | `useCreateEvent.ts:25` navigates without `fromCreate`; `$shortId.tsx:21-23` has no `validateSearch`; no `Dialog` on the event page | new |
| B6 | Native share with copy fallback | **done** | `CopyLinkButton.tsx:15-24` uses the real `window.location.origin/e/{shortId}`; label `m.share_link()` (`:30`) | none |
| B7 | Google Calendar import | **done** (logic) | `CalendarImport.tsx:17-165` (real OAuth connect, calendar list, busy slots); `CalendarController.java:84`, `:102`, `:133` (PRs #68/#69) | none |
| B7 | ...its look | **UI/UX only** | `CalendarImport.tsx:72-75` plain button with `CalendarDaysIcon`; native checkboxes `:120-125`; strings hard-coded English (`:74`, `:91`, `:111`, `:135`) vs the demo's Google-branded orange button and panel (`GoogleCalendarSync.tsx:76-122` on `final-demo`) | new |
| B8 | Busy slots saved right after import | **partly done** | `HeatmapTabs.tsx:211-216` only removes busy slots from the local selection; nothing is saved until the user presses Save | new (with B9) |
| B9 | Busy slots shown blocked; select-all/row/col skip them | **partly done** | `HeatmapTabs.tsx:174` "Select all" re-adds every slot including busy ones; cells have one look (`:335`, `:351`), no blocked state | new (with B8) |
| B10 | Confirm final time and notify participants | **partly done** | Backend in open PR #92 (`POST /events/{shortId}/confirm`, `.ics` mail; `mergeable: CONFLICTING` per `gh pr view 92`). No frontend on `main`: no confirm control in `$shortId.tsx` or `HeatmapTabs.tsx`. Frontend is tracked by #50 (empty body). | **#92 + #50**, no new issue (see answered question 3) |
| B11 | Demo mock dataset | **done** | `frontend/src/mocks/data.ts:5`, `:68`, `:162-166`, `:248-258` (ported in `cc3503d`) | none |
| B11b | Calendar import and confirm in mock mode | **missing** | `frontend/src/mocks/handlers.ts` has no handler for `/users/me/calendars`, `/events/:shortId/calendar-busy`, `/auth/google/calendar/url` or `/events/:shortId/confirm` (grep found none). What MSW then does with those requests is unverified. | new |
| B12 | Mock-mode sign-in bypass | **dropped** (dev shortcut) | `useGoogleAuth.ts:13` on `main` falls back to `login(undefined)` only when no client ID is set | none |
| B13 | LAN/ngrok dev server, devtools hidden | **dropped** (demo-only) | `frontend/vite.config.ts` has no `server` block; devtools on (`__root.tsx:130`) | none (answered question 4) |
| B14 | Button variants | **done** | `button.tsx:9-10` | none |

Related work the demo did not show but `main` has: leave event (`frontend/src/components/ui/pages/home/MyEvents.tsx:19`, `:81`, #90), heatmap for all four event types (#91). The two-step date-then-time flow is #94; the demo renamed "Dates and times" to "Dates" (`en.json:19` on both branches) but has no two-step flow, so nothing here overlaps #94.

## Gaps: acceptance criteria and scope

### G1. Share prompt after creating an event (B5)

Acceptance criteria

- After `POST /events` succeeds, the app navigates to `/e/{shortId}?fromCreate=true` and opens a dialog titled "Share this event with your friends" with the fireplace image and a Share button.
- Share calls `navigator.share({ url, title })` with `{origin}/e/{shortId}` (no query string) and the event name; without `navigator.share` it copies the URL and shows the existing `copy_link_copied` toast.
- Closing the dialog removes `fromCreate` from the URL (replace, not push), so a reload or a shared link never opens it again.
- Visiting `/e/{shortId}` without `fromCreate` never shows the dialog.
- All new strings are Paraglide messages in `en.json` and `et.json`.

Scope: frontend only (`useCreateEvent.ts`, `routes/e/$shortId.tsx`, messages). Reuse the share logic from `CopyLinkButton.tsx` instead of copying it. Backend: none.

### G2. Keep imported busy slots blocked in the "Yours" grid (B8, B9)

Acceptance criteria (in-session part, decided)

- After a calendar import, every busy slot that is an event slot is removed from the selection (as today) and shown as blocked: red tint and ban icon, like the demo (`HeatmapTabs.tsx:306`, `:319`, `:340` on `final-demo`).
- "Select all", row toggle and column toggle never select a blocked slot. Tapping or dragging over a blocked slot still lets the participant select it on purpose, and that unblocks it.
- Blocked state is kept per event for the rest of the page session and is reset by a new import.
- Busy slots are converted for display with the same `convertSlot` mapping the grid already uses.

Open (needs a decision, see questions 1 and 2): whether import saves immediately, and whether the blocked state survives a reload.

Scope: frontend (`HeatmapTabs.tsx`, `CalendarImport.tsx` callback). Backend: none for the in-session part. If blocked state must persist, the backend needs a way to tell "busy from calendar" apart from "not selected", because the event page saves `notAvailable` as every slot not selected (`frontend/src/routes/e/$shortId.tsx:34-41`). Deriving the blocked state from the saved `notAvailable`, as the demo did, would mark every unselected slot as blocked after any save.

### G3. Calendar import look (B7, UI/UX only)

Acceptance criteria

- The idle button reads "Sync Google Calendar" (or the agreed wording) with the `GoogleIcon`, orange variant, centred above the Select all / Deselect all / Save row with the demo's spacing.
- The calendar picker panel has a heading with the `GoogleIcon`, the demo's square checkboxes (keyboard accessible: a real checkbox input or `role="checkbox"` with Space toggling), "Import busy times" and a red-variant Cancel.
- A success toast after import ("Google Calendar synced" or agreed wording).
- Connect, loading, empty and disconnect states keep their current behaviour.
- All strings in `CalendarImport.tsx` become Paraglide messages (en and et).

Scope: frontend only, `CalendarImport.tsx` and messages. No behaviour changes; G2 owns the blocked-slot behaviour.

### G4. Mock-mode handlers for calendar import and confirm (B11b)

Acceptance criteria

- With `VITE_ENABLE_MOCK=true`, `GET /users/me/calendars` returns two or three named calendars, `GET /events/:shortId/calendar-busy?calendarIds=...` returns a fixed, deterministic set of busy slots that are a subset of that event's `times` (no `Math.random`), and `GET /auth/google/calendar/url` returns a URL that lands back on the event page.
- The response shapes match `frontend/src/api/types.gen.ts` (`CalendarListDto`, `BusySlotsDto`).
- Once PR #92 is merged, `POST /events/:shortId/confirm` is mocked too: it checks the slot is in `times`, stores `confirmedStart`/`confirmedEnd` on the mock event and returns the event.
- The `game-night` demo event can be walked through end to end in mock mode: sign in, import busy times, mark availability, see the heatmap.

Scope: frontend mocks only (`frontend/src/mocks/handlers.ts`, `data.ts`). The confirm handler waits for #92.

### Confirm UI (B10): covered by #50 and #92

No new issue. Proposed acceptance criteria for #50, for the author to adopt:

- The organiser (only) sees a "Confirm this time" action on a slot in the "Group" tab, with the slot's readable time in the event timezone.
- Confirming calls `POST /events/{shortId}/confirm` with `{ slot }`, then shows the confirmed time on the event page for everyone (`confirmedStart`, `confirmedEnd`).
- Re-confirming a different slot is allowed and replaces the shown time (PR #92 allows it).
- 403/400 errors show a toast; nothing is shown to non-organisers.

## Dropped (demo-only, not ported)

- Pre-filled event name `"Game night"` (`index.tsx:12` on `final-demo`).
- Hard-coded share URL and hard-coded "final date" text (`CopyLinkButton.tsx`, `$shortId.tsx:58-64` on `final-demo`).
- Random busy slots and `MOCK_CALENDARS` inside a product component (replaced by the real `CalendarImport` and, for mock mode, G4).
- Mock-mode Google sign-in bypass, ngrok host, `basic-ssl`, devtools commented out.

## Answered questions

Questions 1–4 were answered by the owner during triage; 5 stayed as built.

1. **Auto-save on import (G2).** Yes: an import saves straight away, with a toast ([#98](https://github.com/tomimarkus991/gatherr/issues/98), built in #114).
2. **Persist blocked slots (G2).** No: the blocked state lasts for the page session only and the next import replaces it ([#98](https://github.com/tomimarkus991/gatherr/issues/98)).
3. **#50.** Yes: #50 was rewritten with the confirm-UI criteria, made a sub-issue of #95, and built in #123.
4. **Phone testing over HTTPS.** Yes: `npm run dev:lan` ([#116](https://github.com/tomimarkus991/gatherr/issues/116), built in #119).
5. **Calendar import wording (G3).** "Import from Google Calendar", as on `main` (`calendar_import_button`).

## Unverified

- What MSW does with requests that have no handler in mock mode (G4).
- That PR #92's frontend counterpart is #50: stated in the PR body ("the front end is #50"), but #50 has no description.
- Visual parity of G3 has not been checked in a browser; the comparison is from source only.
