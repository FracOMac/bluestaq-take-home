# Team Notes

A small note-taking service for teams: a REST API with a React single-page
frontend. Users sign up, write private notes, create teams, and share notes with
their teammates.

## Stack

- Server: Node + TypeScript, Express, SQLite (better-sqlite3), JWT auth
- Web: React + TypeScript, Vite, Tailwind, React Router

## Project layout

npm workspaces monorepo:

- `server/` — the REST API
- `web/` — the React SPA
- `shared/` — TypeScript types for the API contract, imported by both sides

## Prerequisites

[node.js](https://nodejs.org/en)

## Setup

```bash
npm install
```

## Run

```bash
npm run dev -w server   # API on http://localhost:3000
npm run dev -w web      # frontend on http://localhost:5173
npm test -w server      # tests
```

Run the two dev servers in separate terminals. The web dev server proxies
`/api/*` to the API, so there's no CORS to configure. A SQLite file
(`server/team-notes.sqlite`) is created on first run. Server config is via env
vars: `PORT`, `DB_PATH`, `JWT_SECRET`.

## API

See `API.md` for the endpoint list. In short: `register`/`login` return a JWT,
which you send as `Authorization: Bearer <token>` on every other request. Notes
have full CRUD; teams support create / list / view, adding members, and listing
members.

## Data model

- `users` — id, email, password hash
- `notes` — owner, optional team, visibility (`private` | `team`), last editor, timestamps
- `teams` and `team_members` (role: `owner` | `member`)

## Authorization

The JWT identifies the caller. A note is readable by its owner, or for a team
note by members of that team. Team members can edit a team note's content; only
the owner can change its visibility or delete it.

## Tests

`npm test -w server` runs the Vitest suite against a fresh in-memory SQLite database, covering auth, notes
CRUD, team membership, and the visibility rules.

## Decisions

**Note visibility and authorization.** I spent a lot of time on the ability for users to make teams and either keep notes private or in teams. This expanded the needed api functionality by a lot, but it made it more interesting than just the super simple un-authenticated crud operations it could have been.

**Web frontend** This wasn't requested in the prompt, but building it allowed me to make sure the API was fully featured and usable and more easily identify where the gaps were vs my initial api design.

## If I had more time

- **Live updates.** Push changes to connected clients (Server-Sent Events is the
  easy version) so edits show up
  without a refresh. Real simultaneous co-editing (CRDT/OT) would be the bigger,
  much harder version.
- **Concurrency on edits.** Edits are last-write-wins. With multiple editors on a
  team note I'd add a version / `updated_at` check so a save can't silently
  clobber someone else's change.
- **More note features.** Search and tags plus team management: removing members, leaving or deleting a team.
- **Auth hardening.** Auth setup is real basic right now, with more time I'd do a proper access/refresh token scheme with validation.
- **Production storage.** I used SQLite for ease of dev environment setup; for a real multi-instance
  deployment I'd switch to Postgres and add a proper migration tool instead of
  schema-on-boot.
- **Frontend tests.** I deliberately skipped web tests to focus on the API since it wasn't even requested in the first place; I'd
  add a few component/integration tests.
