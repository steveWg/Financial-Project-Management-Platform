# Backend Storage and Excel Import/Export Design

## Goal

Upgrade the current Vue/Vite project management app from browser-only `localStorage` persistence to a local backend data storage system, and add Excel `.xlsx` import/export for project ledger data.

The first implementation targets local or intranet deployment. GitHub Pages can still host the static frontend, but durable shared data requires running the Node backend.

## Chosen Approach

Use a local Node backend with SQLite:

- Backend: Node.js with Express.
- Database: SQLite single-file database.
- Excel processing: ExcelJS.
- Frontend: Vue/Pinia continues to own UI state, but business data is loaded and saved through REST APIs.

This keeps deployment lightweight while giving the app a real server-side persistence layer. SQLite is a good fit because the current domain is structured, queryable, and small enough to avoid a separate database service.

## Data Model

The backend stores the same business state currently managed in `src/store/projectStore.js`.

Core tables:

- `users`: account, name, phone, email, department, role, status, created date.
- `dictionaries`: dictionary type and value for departments, suppliers, service contents, project categories, statuses, and similar option lists.
- `projects`: project ledger master record and financial fields.
- `project_payments`: one-to-many payment rows for each project. The UI still presents up to six payment slots.
- `project_logs`: progress and operation history for each project.
- `warning_handlings`: pre-warning handling status, handler, and note.

Derived project fields are recalculated by backend service logic rather than trusted from imported Excel:

- accumulated payment amount
- unpaid amount
- payment progress
- subsidy unreceived
- difference amount
- payment completion status

## Backend API

Initial API surface:

- `GET /api/bootstrap`: returns users, dictionaries, projects, handled warnings, and current metadata in one call.
- `POST /api/users`: creates a user.
- `PUT /api/users/:id`: updates a user.
- `PATCH /api/users/:id/status`: toggles or sets user status.
- `POST /api/dictionaries/:type`: adds one dictionary value.
- `DELETE /api/dictionaries/:type/:value`: removes one dictionary value.
- `POST /api/projects`: creates a project.
- `PUT /api/projects/:id`: updates a project and its payment rows.
- `PATCH /api/projects/:id/progress`: updates progress/payment fields and appends a project log.
- `POST /api/warnings/:id/handle`: marks a warning as handled.
- `GET /api/export/projects.xlsx`: downloads the current project ledger as Excel.
- `POST /api/import/projects.xlsx`: uploads Excel, validates rows, and imports accepted project records.

The backend returns JSON errors with a stable `message` and, for imports, row-level validation details.

## Excel Format

Excel import/export focuses on the project ledger.

The export uses one worksheet with one row per project. Project fields stay in normal columns, and the six payment slots are expanded into repeated columns:

- `payment1Year`, `payment1Date`, `payment1Amount`
- `payment2Year`, `payment2Date`, `payment2Amount`
- through payment 6

Import matching rules:

1. Match by `id` when present.
2. Otherwise match by `subProjectNo` when present.
3. If no match exists, create a new project.

Import validation rules:

- Required fields: project name or sub-project name.
- Numeric money fields must parse as numbers or be blank.
- Date fields must be blank or parseable dates.
- Payment amounts below zero are rejected.
- Unknown dictionary values are allowed only if they are added to the matching dictionary during import.

Import response includes:

- created count
- updated count
- skipped count
- row errors with row number and reason

## Frontend Changes

Pinia store changes:

- Add an API client layer at `src/api/client.js`.
- Load initial state through `GET /api/bootstrap`.
- Replace direct business-data persistence to `localStorage` with API calls.
- Keep only UI/session preferences in browser storage, such as sidebar collapsed state and lightweight login role/session state.

Data import/export UI:

- Add a "Data Import/Export" entry in the main navigation, visible to admin users.
- Provide a download button for project ledger Excel.
- Provide an upload control for `.xlsx` files.
- Upload Excel first runs validation and returns a preview result.
- Require explicit confirmation before applying imported changes.

Error handling:

- If the backend is unavailable, show a clear connection error.
- Save operations surface backend validation errors in Element Plus messages/dialogs.
- Import failures show row-level details instead of a generic failure.

## Local Deployment

Add backend scripts to `package.json`:

- `server`: start the Express backend.
- `dev:full`: run Vite frontend and backend together for local development.

The Express backend can also serve `dist/` for single-service local deployment after `npm run build`.

Configuration:

- Backend port defaults to `3001`.
- Frontend uses `VITE_API_BASE_URL`, defaulting to `http://localhost:3001`.
- SQLite database path defaults to `server/data/project-management.db`.

## Testing Strategy

Backend tests:

- Database initialization creates required tables.
- Project normalization recalculates derived fields correctly.
- Project create/update persists payment rows.
- Excel export produces expected headers and rows.
- Excel import creates and updates projects using matching rules.
- Excel import reports row-level validation errors.

Frontend tests or focused verification:

- Store bootstrap loads API data into the same shape used by current views.
- Project save and progress update call backend APIs and refresh state.
- Import/export page triggers file download/upload and renders import results.
- Backend unavailable state shows a useful error.

## Scope Boundaries

In scope for the first implementation:

- Local Express backend.
- SQLite persistence.
- REST API for current app behavior.
- Excel project ledger import/export.
- Frontend API integration and import/export UI.

Out of scope for the first implementation:

- Cloud database hosting.
- Multi-user authentication with passwords and tokens.
- Fine-grained audit logs beyond existing project logs.
- Concurrent editing conflict resolution.
- Full Excel import/export for users and dictionaries.
