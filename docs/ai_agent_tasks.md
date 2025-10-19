## AI Agent Implementation Tasks (Build-Ready Plan)

This plan follows our established collaboration patterns: Hybrid Firebase (Firestore for shapes, RTDB for ephemeral), optimistic updates with last-write-wins, 4ms live position throttling, selection broadcasting, z-index management, and layers/naming defaults.

Model: gpt-4o-mini (default). Execution: automatic hybrid — client-exec for simple ops; server-exec for complex multi-step templates.

---

### 0) Conventions and References
- Use existing `CanvasContext` APIs for client-exec: `addRectangle`, `addCircle`, `addTriangle`, `addLine`, `addText`, `updateShape`, `deleteSelected`, `bringToFront`, `sendToBack`.
- Shape defaults (enforced by context/services): `rotation: 0`, `opacity: 1`, `visible: true`, `locked: false`, `zIndex: max + 1`, naming supported.
- Metadata: set `createdBy` and `lastModifiedBy` to requesting user email; tag `ai: true` on AI-created/modified writes (server-exec path).
- Broadcasting: selection broadcasting for new shapes; live positions only during drag flows; complex plan progress via RTDB status.
- Naming convention: new shapes are named "Type N" where N = (current count of that type + 1), e.g., the 5th triangle is "Triangle 5".

---

### 1) Shared Tool Schemas and Plan Types
Path: `collabcanvas/src/types/ai-tools.ts`

Deliverables:
- Define `AIToolSchemas` covering creation, manipulation, layout, layering, delete, `getCanvasState`.
- Use `color` (not `fill`), support `name`.
- Define `AIPlan { operations: { name; args }, rationale?, needsClarification? }`.

Acceptance:
- Types compile; imported in both server and client.
- Schemas reflect current canvas model (rectangle, circle, triangle, line, text; x/y/width/height/radius/x2/y2/rotation/opacity/zIndex/name).

---

### 2) Cloud Function: OpenAI Tool Calling (Plan + Execute)
Path: `functions/aiAgent/index.ts`

Deliverables:
- HTTPS endpoint `POST /ai/command` that:
  - Accepts `{ prompt, canvasState, mode? }`.
  - Uses OpenAI `gpt-4o-mini` with tool definitions matching `AIToolSchemas`.
  - Produces an `AIPlan` from tool calls.
  - If `mode === 'execute'` (complex), applies operations server-side to Firestore with batching.
- Concurrency:
  - RTDB lock at `/ai/locks/{canvasId}` around server-exec plans (TTL and auto-release on error).
  - Optional queue at `/ai/queue/{canvasId}` for future scaling.
- Security & metadata:
  - Validate Firebase auth; derive `userEmail`.
  - On create/update, set `createdBy`/`lastModifiedBy` and `ai: true`.
  - Respect z-index policy: only auto-bump when zIndex not explicitly provided.
- CORS & errors:
  - Region: deploy functions with `functions.region('us-central1')` (near RTDB).
  - Read config from Functions runtime config: `openai.key`, `openai.model`, `ai.server_exec_threshold`, `ai.firestore_region`, `ai.rtdb_region` (fallback to `process.env` for emulators).
  - CORS allowlist: `https://collab-canvas-mlx93-staging.web.app`, `https://collab-canvas-mlx93.web.app/`, and `http://localhost:3000` for development.
  - Return structured errors; log failures with context (project, canvasId, op count).

Acceptance:
- Function deploys; returns plans for simple prompts; applies Firestore writes in execute mode.
- Batch writes for multi-step plans (e.g., login form, grids) and ensure atomic completion or clear failure.

---

### 3) Client Service: AI Requests
Path: `collabcanvas/src/services/AICanvasService.ts`

Deliverables:
- `requestPlan(prompt, canvasState): Promise<AIPlan>`.
- `requestExecute(prompt, canvasState): Promise<ExecutionSummary>` (for complex templates).
- Timeout and retry policy; surface `needsClarification` to caller.

Acceptance:
- Robust error handling; friendly messages; logs in dev.

---

### 4) AI Context: Command Orchestration
Path: `collabcanvas/src/context/AIContext.tsx`

Deliverables:
- `executeCommand(prompt: string): Promise<void>`:
  - Capture current canvas snapshot.
  - Decide mode automatically:
    - Simple ops (single create/move/resize/rotate/style/delete/layering) → plan-only.
    - Complex templates (login form, large grid/arrangements) → server-execute.
    - Threshold: server-execute when a plan exceeds 6 operations or matches a known template command.
  - Call service; handle `needsClarification` by emitting a chat question.
  - Maintain `isProcessing`, `lastPlan`, `error`.
- Broadcast status:
  - Write a short-lived status to RTDB (e.g., `/ai/status/{canvasId}`) for "AI is thinking…".

Acceptance:
- Consumer components can render state, ask clarifying questions, and react to progress.

---

### 5) Plan Executor (Client-Exec)
Path: `collabcanvas/src/utils/aiPlanExecutor.ts` (or inside `AIContext`)

Deliverables:
- Map operations → `CanvasContext` calls:
  - createRectangle/createCircle/createTriangle/createLine/createText → call add* then `updateShape(id, preciseProps)`.
  - moveElement/resizeElement/rotateElement/updateStyle/deleteElement/bringToFront/sendToBack → direct calls.
  - arrangeElements (H/V): compute positions; loop `updateShape`.
  - createGrid: loop create operations; name with `namePrefix`.
- Selection broadcasting:
  - After creating shapes, mark them selected and broadcast selection using existing selection services.

Acceptance:
- Executes single-step plans responsively with optimistic updates visible to other users via existing listeners.

---

### 6) Ambiguity Flow
Paths: `collabcanvas/src/components/AI/*`, `AIContext`

Deliverables:
- When `needsClarification` is returned:
  - Show a chat message with top candidate shape names and mini-previews (type icon, color swatch, approx x,y).
  - On selection, re-issue a refined request including the chosen `id/name`.
- Use shape `name` as primary disambiguator; fallback to type/color/position.

Acceptance:
- Clear UX; minimal friction; supports multi-user (others see outcomes, not the prompt UI).

---

### 7) AI Chat UI
Paths: `collabcanvas/src/components/AI/AICommandInput.tsx`, `AILoadingIndicator.tsx`, `AICommandHistory.tsx`

Deliverables:
- Input with submit; ESC handling; disabled while processing.
- History with the last N commands and AI rationale (if provided).
- Loading indicator with step-level progress for complex plans.

Acceptance:
- Keyboard friendly; integrates visually with current layout; no blocking modals.

---

### 8) Broadcasting & Presence Integration
Paths: existing RTDB services; minimal new endpoints

Deliverables:
- Client-exec: rely on existing optimistic updates, selection broadcasting, and Firestore listeners.
- Server-exec: write status nodes for progress and completion; ensure all writes are visible via Firestore listeners.
- Respect active-edit visuals only for live drags (not needed for instant AI ops).

Acceptance:
- Other users observe AI-created/updated shapes in real-time with consistent indicators.

---

### 9) Complex Templates (Server-Exec)
Path: Cloud Function execution branch

Deliverables:
- Login form, Navigation bar, Card layout planners that output and/or execute multi-op batches.
- Use batched writes; commit once; on error, abort and report.
- Name shapes meaningfully (e.g., "Username Input", "Submit Button").

Acceptance:
- Each template results in 3–8 shapes properly arranged and styled per rubric.

---

### 10) Tests (Unit + Integration + Emulators)
Paths: `collabcanvas/src/__tests__/ai.*.test.tsx` and server tests

Deliverables:
- Command breadth: verify 8+ distinct commands across creation/manipulation/layout/complex.
- Performance: <2s response for simple commands; streaming progress for complex.
- Concurrency: two users issuing commands; last-write-wins consistency; lock prevents double-exec on server.
- Ambiguity flow: candidate list → user choice → correct execution.

Acceptance:
- All new tests pass locally with Firebase Emulators.

---

### 11) Deployment
Paths: Firebase Functions & Hosting

Deliverables:
- Staging: set `functions:config` (`openai.key`, `OPENAI_MODEL=gpt-4o-mini`), deploy function; wire in frontend.
- Production: repeat with prod configs.
- README updates for env setup and deployment commands.

Acceptance:
- Verified in staging end-to-end; then in production.

---

### 12) Telemetry & Logging
Paths: Server logs; client debug gating

Deliverables:
- Structured logs on server (prompt hash, operation counts, duration).
- Client debug logs behind dev flag.
- Rate limiting and basic abuse protection at function entry.

Acceptance:
- Useful traces for debugging failures/performance outliers.

---

### 13) Rubric Validation

Deliverables:
- Demonstrate: at least 8 command types; includes creation (2+), manipulation (2+), layout (1+), complex (1+).
- Validate "Create a login form" yields 3+ elements correctly arranged.
- Ensure shared state and multi-user consistency.

Acceptance:
- Checked against `memory-bank/AI_Agent_Rubric` and `AI_Agent_Prompt`.

---

### Appendix: Automatic Mode Selection
- Client-exec (simple): single create/move/resize/rotate/style/delete/layering; arrange with few shapes.
- Server-exec (complex): templates, grids with many elements, or plans exceeding N operations.

Implementation detail:
- Client decides based on plan size/type; no user toggle.


