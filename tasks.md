# CollabCanvas MVP - Task List & PR Breakdown v3.0

## Project File Structure

```
collabcanvas/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   └── AuthLayout.tsx
│   │   ├── Canvas/
│   │   │   ├── Canvas.tsx
│   │   │   ├── LeftToolbar.tsx (RENAMED from CanvasToolbar)
│   │   │   ├── PropertiesPanel.tsx (NEW - right side panel)
│   │   │   ├── Rectangle.tsx
│   │   │   └── FPSCounter.tsx
│   │   ├── Collaboration/
│   │   │   ├── CursorOverlay.tsx
│   │   │   ├── EditingIndicator.tsx (RENAMED from PresenceIndicator)
│   │   │   └── ActiveUsers.tsx
│   │   └── Layout/
│   │       ├── Header.tsx
│   │       └── MainLayout.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── CanvasContext.tsx
│   ├── hooks/
│   │   ├── __tests__/
│   │   │   ├── useCanvas.test.ts
│   │   │   ├── useCanvas.rectangles.test.ts
│   │   │   └── useCanvas.selection.test.ts (NEW)
│   │   ├── useAuth.ts
│   │   ├── useCanvas.ts
│   │   ├── useCursors.ts
│   │   ├── usePresence.ts
│   │   └── useFPS.ts (NEW)
│   ├── services/
│   │   ├── __tests__/
│   │   │   ├── auth.service.test.ts
│   │   │   ├── canvas.service.test.ts
│   │   │   ├── cursor.service.test.ts
│   │   │   ├── presence.service.test.ts
│   │   │   ├── selection.service.test.ts (NEW - ephemeral RTDB)
│   │   │   ├── activeEdits.service.test.ts (NEW - conflict awareness)
│   │   │   └── zIndex.service.test.ts (NEW - z-ordering logic)
│   │   ├── firebase.ts
│   │   ├── auth.service.ts
│   │   ├── canvas.service.ts
│   │   ├── cursor.service.ts
│   │   ├── presence.service.ts
│   │   ├── selection.service.ts (NEW - RTDB ephemeral state)
│   │   ├── activeEdits.service.ts (NEW - editing state tracking)
│   │   └── zIndex.service.ts (NEW - automatic + manual z-index management)
│   ├── types/
│   │   ├── canvas.types.ts
│   │   ├── user.types.ts
│   │   └── cursor.types.ts
│   ├── utils/
│   │   ├── __tests__/
│   │   │   ├── throttle.test.ts
│   │   │   └── helpers.test.ts
│   │   ├── throttle.ts
│   │   ├── colors.ts
│   │   ├── helpers.ts
│   │   └── constants.ts
│   ├── __tests__/
│   │   ├── auth.integration.test.tsx
│   │   ├── ui-layout.integration.test.tsx (NEW - 3-column layout testing)
│   │   ├── canvas.integration.test.tsx
│   │   ├── rectangle.integration.test.tsx
│   │   ├── zindex.integration.test.tsx (NEW - auto + manual z-ordering)
│   │   ├── persistence.integration.test.tsx
│   │   ├── realtime-sync.integration.test.tsx
│   │   ├── cursor-sync.integration.test.tsx
│   │   ├── presence.integration.test.tsx
│   │   └── conflict-resolution.integration.test.tsx (NEW - optimistic updates)
│   ├── App.tsx
│   ├── index.tsx
│   └── index.css
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── jest.config.js
├── firebase.json
├── .firebaserc
├── firestore.rules
├── database.rules.json
└── README.md
```

---

## PR #1: Project Setup & Configuration

**Branch:** `feat/project-setup`  
**Goal:** Initialize React + TypeScript + Firebase project with all dependencies and hybrid database setup

### Implementation Tasks:
- [ ] **Task 1.1:** Initialize React app with TypeScript
  - **Command:** `npx create-react-app collabcanvas --template typescript`
  - **Files Created:** All base React files

- [ ] **Task 1.2:** Install core dependencies
  - **Command:** `npm install firebase konva react-konva tailwindcss react-hot-toast`
  - **Command:** `npm install -D @types/react-konva @testing-library/react @testing-library/jest-dom @testing-library/user-event`
  - **Files Modified:** `package.json`
  - **Note:** `react-hot-toast` for error notifications and user feedback

- [ ] **Task 1.3:** Configure Tailwind CSS
  - **Command:** `npx tailwindcss init`
  - **Files Created:** `tailwind.config.js`
  - **Files Modified:** `src/index.css`

- [ ] **Task 1.4:** Create Firebase project and enable services
  - **Action:** Go to Firebase Console, create project
  - **Action:** Enable Firebase Authentication (Email/Password)
  - **Action:** Enable Cloud Firestore
  - **Action:** Enable Realtime Database
  - **Action:** Enable Firebase Hosting
  - **Files Created:** `.env.example`, `.env.local` (local only, not committed)
  - **Note:** `.env.local` for local development, production env vars set in Firebase Console

- [ ] **Task 1.5:** Set up Firebase Emulators for local testing
  - **Command:** `npm install -D firebase-tools`
  - **Command:** `firebase init emulators`
  - **Action:** Enable Auth (port 9099), Firestore (port 8080), and Realtime Database (port 9000) emulators
  - **Files Created:** `firebase.json` (emulator config)
  - **Note:** These ports are Firebase defaults and allow local testing without hitting production

- [ ] **Task 1.6:** Set up project file structure
  - **Files Created:** All folders in structure above including `context/`, `__tests__` directories
  - **Files Created:** Empty placeholder files for services, types, hooks, components, context

- [ ] **Task 1.7:** Configure Firebase with hybrid database setup
  - **Files Created:** `src/services/firebase.ts`
  - **Content:** Initialize both Firestore and RTDB
  - **Files Modified:** `.gitignore` (add `.env`)

- [ ] **Task 1.8:** Create utility files
  - **Files Created:** `src/utils/helpers.ts`
  - **Content:** 
    - `generateCursorColor(userId: string): string` - generates random unique cursor color for user
    - Implementation: Hash userId string and convert to diverse hex color palette
    - Ensures same userId always gets same color, colors unique unless many users
  - **Files Created:** `src/utils/constants.ts`
  - **Content:** 
    - `CANVAS_WIDTH = 5000` - Canvas width in pixels
    - `CANVAS_HEIGHT = 5000` - Canvas height in pixels
    - `CANVAS_ID = "default-canvas"` - **Hardcoded global canvas ID** (single shared canvas)
    - `CANVAS_BACKGROUND = "#FAFAFA"` - Off-white canvas background color
    - `DEFAULT_RECT_SIZE = 100` - Default rectangle width/height (100x100px)
    - `MIN_RECT_SIZE = 1` - Minimum rectangle dimension (1px)
    - `MAX_RECT_SIZE = 4000` - Maximum rectangle dimension (80% of canvas)
    - `MIN_ZOOM = 0.1` - Minimum zoom level (10%)
    - `MAX_ZOOM = 8` - Maximum zoom level (800%)
    - `PREDEFINED_COLORS = { blue: '#2196F3', green: '#4CAF50', red: '#F44336', orange: '#FF9800', black: '#212121' }` - Material Design colors
    - `DEFAULT_COLOR = '#2196F3'` - Default Material Blue 500

- [ ] **Task 1.9:** Configure Jest for testing
  - **Files Created:** `jest.config.js` or update in `package.json`
  - **Files Created:** `src/setupTests.ts`
  - **Action:** Configure test environment for Firebase emulator mocks

- [ ] **Task 1.10:** Create security rules for both databases
  - **Files Created:** `firestore.rules` (Firestore security rules)
  - **Files Created:** `database.rules.json` (RTDB security rules)

- [ ] **Task 1.11:** Create basic README
  - **Files Created:** `README.md` with setup instructions, emulator commands

- [ ] **Task 1.12:** Initialize Git and create first commit
  - **Command:** `git init`, `git add .`, `git commit -m "Initial project setup with hybrid Firebase"`

### Testing Tasks:
*No tests for this PR - foundational setup only*

**PR Description:** "Set up React + TypeScript project with Firebase hybrid architecture (Firestore + RTDB), Konva, Tailwind CSS, Context API structure, emulators, and utilities. Configure project structure with CANVAS_ID='default-canvas', environment variables, and testing infrastructure."

---

## PR #2: Authentication System with Context

**Branch:** `feat/authentication`  
**Goal:** Implement Firebase email/password authentication with React Context for state management

### Implementation Tasks:
- [ ] **Task 2.1:** Create TypeScript types for users
  - **Files Created:** `src/types/user.types.ts`
  - **Content:** User interface, AuthState interface

- [ ] **Task 2.2:** Build authentication service
  - **Files Created:** `src/services/auth.service.ts`
  - **Functions:** 
    - `signUp(email, password, firstName, lastName)` - Create user account and Firestore profile
    - `signIn()` - Authenticate user
    - `signOut()` - Sign out user
    - `getCurrentUser()` - Get current Firebase user
    - `fetchUserData(userId)` - **Helper function** to fetch user profile (firstName/lastName) from Firestore
      - Returns `Promise<User | null>`
      - Used by AuthContext during login to populate user state
      - Enables clean mocking in tests
      - Centralizes user data fetching logic
  - **User Document Structure:** `{ userId, email, firstName, lastName, createdAt }`
  - **Display Logic:** 
    - First names used in collaboration indicators (e.g., "John is moving")
    - Full names shown in header (e.g., "John Doe")
    - Backward compatibility: Falls back to email username for users without names
  - **Performance Note:** 
    - `fetchUserData()` called once at login (async Firestore read ~50-200ms)
    - firstName/lastName cached in AuthContext state
    - Real-time collaboration (RTDB) uses cached values - no additional Firestore lookups needed

- [ ] **Task 2.3:** Create AuthContext with React Context API
  - **Files Created:** `src/context/AuthContext.tsx`
  - **Features:** AuthProvider, AuthContext, centralized auth state management
  - **State:** user object (email as username), loading, error states

- [ ] **Task 2.4:** Create useAuth hook
  - **Files Created:** `src/hooks/useAuth.ts`
  - **Features:** Hook to consume AuthContext, auth operations, loading states, error handling

- [ ] **Task 2.5:** Build AuthLayout component
  - **Files Created:** `src/components/Auth/AuthLayout.tsx`
  - **Features:** Container for auth forms

- [ ] **Task 2.6:** Build LoginForm component
  - **Files Created:** `src/components/Auth/LoginForm.tsx`
  - **Features:** Email/password inputs, submit handler, error display, uses useAuth hook

- [ ] **Task 2.7:** Build SignupForm component
  - **Files Created:** `src/components/Auth/SignupForm.tsx`
  - **Features:** 
    - First name, last name, email, password, confirm password inputs
    - Side-by-side grid layout for first/last name
    - Validation for all required fields
    - Submit handler uses `signUp(email, password, firstName, lastName)`

- [ ] **Task 2.8:** Update App.tsx with auth routing and AuthProvider
  - **Files Modified:** `src/App.tsx`
  - **Features:** 
    - Wrap app with AuthProvider
    - Add Toaster component from `react-hot-toast` for global notifications
    - Protected route logic, show auth or canvas based on state
  - **Toast Setup:** `<Toaster position="top-right" />` for error notifications and user feedback

- [ ] **Task 2.9:** Style authentication forms
  - **Files Modified:** All Auth components
  - **Features:** Tailwind styling, responsive design

### Testing Tasks:
- [ ] **Task 2.10:** 🧪 **UNIT TEST** - Write unit tests for auth service
  - **Files Created:** `src/services/__tests__/auth.service.test.ts`
  - **Tests:** 
    - Test email validation
    - Test password validation (min 6 characters)
    - Test error handling for invalid credentials
    - Test user document creation in Firestore after signup
    - Mock Firebase calls
  - **Command:** `npm test auth.service.test.ts`

- [ ] **Task 2.11:** 🔗 **INTEGRATION TEST** - Write integration test for auth flow
  - **Files Created:** `src/__tests__/auth.integration.test.tsx`
  - **Tests:**
    - User can sign up with valid email/password
    - User can log in after signing up
    - User stays logged in after page refresh (via Context)
    - User can log out successfully
    - Error messages display for invalid inputs
    - AuthContext provides correct state
  - **Command:** `npm test auth.integration.test.tsx`

- [ ] **Task 2.12:** ✅ Verify all tests pass
  - **Action:** Run `npm test` and ensure 100% pass rate

- [ ] **Task 2.13:** Test with Firebase Emulator
  - **Command:** `firebase emulators:start`
  - **Action:** Run tests against Auth emulator

**PR Description:** "Implement Firebase email/password authentication with React Context API for centralized state management. Add AuthContext, AuthProvider, and useAuth hook. Includes unit and integration tests with emulator support."

---

## PR #3: UI Layout & Basic Canvas with Context & Performance Monitoring

**Branch:** `feat/canvas-foundation`  
**Goal:** Create 3-column UI layout (left toolbar, center canvas, right properties panel) + top header, implement pan/zoom on 5000x5000px off-white canvas, add CanvasContext and FPS monitoring

### Implementation Tasks:
- [ ] **Task 3.1:** Create canvas types
  - **Files Created:** `src/types/canvas.types.ts`
  - **Content:** CanvasState, Rectangle, Viewport interfaces
  - **Rectangle Interface:** 
    - Core: id, x, y, width, height, color
    - Z-Index: zIndex (number, 1 = back, higher = front)
    - Metadata: createdBy, createdAt, lastModifiedBy, lastModified
  - **Note:** Selection state will be RTDB ephemeral (not in Firestore Rectangle type)

- [ ] **Task 3.2:** Create CanvasContext with React Context API
  - **Files Created:** `src/context/CanvasContext.tsx`
  - **Features:** CanvasProvider, CanvasContext, centralized canvas state management
  - **State:** Rectangles array, viewport state, canvas operations, z-index management
  - **Note:** Selection state managed separately via RTDB service (ephemeral)

- [ ] **Task 3.3:** Build MainLayout component
  - **Files Created:** `src/components/Layout/MainLayout.tsx`
  - **Features:** 3-column layout structure (left toolbar, center canvas, right properties panel)
  - **Layout:** Flexbox or Grid with proper spacing

- [ ] **Task 3.4:** Build Header component
  - **Files Created:** `src/components/Layout/Header.tsx`
  - **Features:** App title, logout button, FPS counter display
  - **Right side:** Online users list (ActiveUsers component - added in PR #8)
  - **Top position:** Fixed header spanning full width

- [ ] **Task 3.5:** Create basic Canvas component
  - **Files Created:** `src/components/Canvas/Canvas.tsx`
  - **Features:** Konva Stage and Layer setup, 5000x5000px canvas size
  - **Background:** Off-white (#FAFAFA) using CANVAS_BACKGROUND constant
  - **Important:** Use `CANVAS_ID = "default-canvas"` from constants
  - **Viewport:** Independent per user (not synced across users)

- [ ] **Task 3.6:** Implement pan functionality
  - **Files Modified:** `src/components/Canvas/Canvas.tsx`
  - **Features:** Click-and-drag empty canvas space to pan (not rectangles)
  - **Update:** Viewport state in CanvasContext (local only, not synced)

- [ ] **Task 3.7:** Implement zoom functionality
  - **Files Modified:** `src/components/Canvas/Canvas.tsx`
  - **Features:** 
    - Mouse wheel zoom
    - Pinch gesture zoom (touch devices)
    - Keyboard shortcuts: Shift + Plus/Minus
    - Zoom limits: 10% (MIN_ZOOM = 0.1) to 800% (MAX_ZOOM = 8)
  - **Update:** CanvasContext scale state (local only, not synced)

- [ ] **Task 3.8:** Style canvas background
  - **Files Modified:** `src/components/Canvas/Canvas.tsx`
  - **Features:** Set off-white background color from CANVAS_BACKGROUND constant
  - **Visual:** Clear distinction from surrounding UI elements

- [ ] **Task 3.9:** **NEW** - Create FPS monitoring system
  - **Files Created:** `src/hooks/useFPS.ts`
  - **Features:** Track frame rate using requestAnimationFrame, calculate average FPS
  - **Files Created:** `src/components/Canvas/FPSCounter.tsx`
  - **Features:** Display FPS in dev mode (top-right corner), color-coded (green >55, yellow 30-55, red <30)

- [ ] **Task 3.10:** Create useCanvas hook
  - **Files Created:** `src/hooks/useCanvas.ts`
  - **Features:** Hook to consume CanvasContext, viewport state management, pan/zoom handlers

- [ ] **Task 3.11:** Wrap App with CanvasProvider
  - **Files Modified:** `src/App.tsx`
  - **Features:** Wrap canvas routes with CanvasProvider for state access

### Testing Tasks:
- [ ] **Task 3.12:** 🧪 **UNIT TEST** - Write unit tests for useCanvas hook
  - **Files Created:** `src/hooks/__tests__/useCanvas.test.ts`
  - **Tests:**
    - Test viewport initialization (x: 0, y: 0, scale: 1)
    - Test zoom limits (min 10% = 0.1, max 800% = 8)
    - Test pan updates viewport position correctly
    - Test zoom updates scale correctly (wheel, pinch, keyboard)
    - Test CanvasContext provides correct state
  - **Command:** `npm test useCanvas.test.ts`

- [ ] **Task 3.13:** 🔗 **INTEGRATION TEST** - **NEW** Write integration test for UI layout
  - **Files Created:** `src/__tests__/ui-layout.integration.test.tsx`
  - **Tests:**
    - 3-column layout renders correctly (left toolbar, center canvas, right properties)
    - Top header displays with correct elements
    - Left toolbar is always visible
    - Right properties panel hides when nothing selected
    - Layout is responsive and properly spaced
  - **Command:** `npm test ui-layout.integration.test.tsx`

- [ ] **Task 3.14:** 🔗 **INTEGRATION TEST** - Write integration test for canvas interactions
  - **Files Created:** `src/__tests__/canvas.integration.test.tsx`
  - **Tests:**
    - Canvas renders with correct dimensions (5000x5000px)
    - Canvas background is off-white (#FAFAFA)
    - Click-and-drag empty space pans canvas
    - Mouse wheel zooms canvas
    - Shift+/- keyboard shortcuts zoom
    - Zoom respects min/max bounds (10%-800%)
    - Multiple users can have independent viewports
    - CanvasContext state updates correctly
    - **FPS counter displays in dev mode**
    - **Canvas maintains 60 FPS during pan/zoom**
  - **Command:** `npm test canvas.integration.test.tsx`

- [ ] **Task 3.15:** ✅ Verify all tests pass
  - **Action:** Run `npm test` and ensure 100% pass rate

- [ ] **Task 3.16:** **NEW** - Manual performance testing
  - **Action:** Monitor FPS counter during heavy pan/zoom operations
  - **Action:** Verify FPS stays above 55 during normal interactions
  - **Action:** Test viewport independence with multiple browser windows

**PR Description:** "**Build complete 3-column UI layout (left toolbar, center canvas, right properties panel) with top header.** Implement canvas with Konva.js featuring pan (click-drag empty space) and zoom controls (wheel/pinch/Shift+/-) with limits (10%-800%) on 5000x5000px off-white workspace using canvas ID 'default-canvas'. **Each user has independent viewport.** Add CanvasContext for centralized state management using React Context API. Add FPS monitoring system with visual counter (dev mode only) for performance tracking. Includes unit tests for hooks and integration tests for UI layout and canvas interactions."

---

## PR #4: Rectangle Creation, Selection, Movement, Resize, Delete & Z-Index System

**Branch:** `feat/rectangle-operations`  
**Goal:** Add rectangles with 5 predefined colors, selection, move (no selection required), resize (single top-right handle), delete, and automatic + manual z-index layering. Build left toolbar and right properties panel

### Implementation Tasks:
- [ ] **Task 4.1:** Create Rectangle component
  - **Files Created:** `src/components/Canvas/Rectangle.tsx`
  - **Features:** Konva Rect with dark blue outline when selected
  - **Resize handle:** Single handle in top-right corner (dual-arrow icon)
  - **Tooltip:** "resize" text on hover over handle
  - **Drag:** Can be dragged to move even when not selected
  - **Size constraints:** Min 1x1px (MIN_RECT_SIZE), max 4000x4000px (MAX_RECT_SIZE)

- [ ] **Task 4.2:** Define predefined colors - **ALREADY IN CONSTANTS**
  - **Note:** Colors already defined in `src/utils/constants.ts` from PR #1
  - **Colors:** PREDEFINED_COLORS = Material Design { blue: '#2196F3', green: '#4CAF50', red: '#F44336', orange: '#FF9800', black: '#212121' }
  - **Default:** DEFAULT_COLOR = '#2196F3' (Material Blue 500)

- [ ] **Task 4.3:** Add rectangle creation logic
  - **Files Modified:** `src/components/Canvas/Canvas.tsx`
  - **Features:** 
    - Click "Create Rectangle" button in left toolbar
    - Rectangle created at **center of current viewport** (not canvas center 2500,2500)
    - Default size: 100x100px (from DEFAULT_RECT_SIZE constant)
    - Default color: Blue or selected color from left toolbar dropdown
    - Use CanvasContext to add rectangle
    - **Auto z-index:** New rectangle gets highest z-index + 1 (higher number = front, others unchanged)

- [ ] **Task 4.4:** Create LeftToolbar component
  - **Files Created:** `src/components/Canvas/LeftToolbar.tsx`
  - **Features:** 
    - **Color Picker Dropdown:** Shows currently selected color (default Blue), allows selection from 5 PREDEFINED_COLORS
    - **Create Rectangle Button:** Creates rectangle at viewport center with selected color
    - **Smart Offset:** If center position is occupied by another rectangle (within 50px), offset new rectangle by 20px in X and Y to prevent exact stacking
    - **Center Priority:** If no rectangle exists at center, place new rectangle exactly at center
  - **Position:** Left side of 3-column layout, always visible
  - **Note:** Delete button is NOT in left toolbar (only in properties panel)

- [ ] **Task 4.5:** Implement single selection
  - **Files Modified:** `src/components/Canvas/Rectangle.tsx`
  - **Features:** Click rectangle to select it
  - **Visual:** Show solid dark blue outline on selected rectangle (small-to-medium thickness)
  - **State:** Track selection locally (will be RTDB ephemeral in PR #7)
  - **Deselect:** Click canvas background to deselect all

- [ ] **Task 4.6:** Implement rectangle drag functionality - **SELECTION NOT REQUIRED**
  - **Files Modified:** `src/components/Canvas/Rectangle.tsx`
  - **Features:** 
    - Click-and-drag ANY rectangle to move (selected or not)
    - First click can select, then drag to move
    - Or drag unselected rectangle directly
  - **Update:** Position on drag end via CanvasContext
  - **Z-Index:** On drag end, rectangle gets highest z-index + 1 (moves to front)

- [ ] **Task 4.7:** Implement rectangle resize functionality - **SINGLE TOP-RIGHT HANDLE**
  - **Files Modified:** `src/components/Canvas/Rectangle.tsx`
  - **Features:** 
    - **Single resize handle** in top-right corner (not 4 corners)
    - Dual-arrow icon for handle
    - Show "resize" tooltip on hover
    - Drag handle to resize width and height
    - Free resize (no aspect ratio lock)
    - Enforce size constraints (min 1x1px, max 4000x4000px)
  - **Update:** Dimensions on resize end via CanvasContext
  - **Z-Index:** On resize end, rectangle gets highest z-index + 1 (moves to front)

- [ ] **Task 4.8:** Create PropertiesPanel component
  - **Files Created:** `src/components/Canvas/PropertiesPanel.tsx`
  - **Features:** Right panel showing properties of selected rectangle
  - **Visibility:** Hidden when nothing selected, appears when rectangle selected
  - **Contents:**
    - **Color Picker Dropdown:** Change selected rectangle's color (editable)
    - **Z-Index Input:** Number field to manually set z-index (editable, positive integers)
    - **Width Display:** Read-only field showing current width
    - **Height Display:** Read-only field showing current height
    - **X Position Display:** Read-only field showing X coordinate
    - **Y Position Display:** Read-only field showing Y coordinate
    - **Delete Button:** Remove selected rectangle
  - **Position:** Right side of 3-column layout

- [ ] **Task 4.9:** Implement delete operation
  - **Files Modified:** `src/components/Canvas/PropertiesPanel.tsx`
  - **Features:** Delete button in properties panel (only visible when rectangle selected)
  - **Files Modified:** `src/components/Canvas/Canvas.tsx`
  - **Features:** Listen for Delete/Backspace key press, delete selected rectangle
  - **Files Modified:** `src/context/CanvasContext.tsx`
  - **Features:** Add `deleteRectangle(id)` function to context

- [ ] **Task 4.10:** Implement Z-Index service for automatic layering
  - **Files Created:** `src/services/zIndex.service.ts`
  - **Features:**
    - `autoUpdateZIndex(shapeId)`: Moves shape to front (highest z-index + 1), others unchanged
    - `manualSetZIndex(shapeId, newZIndex)`: Sets specific z-index, recalculates others (push-down)
    - `recalculateAllZIndices(shapes)`: Ensures no duplicates, maintains order
  - **Logic:** 
    - Higher z-index = front (top layer)
    - Lower z-index = back (bottom layer)
    - New shapes and edited shapes get maxZIndex + 1
    - No duplicate z-indices allowed
    - Push-down: Setting shape C from 3→1 makes old [1,2] become [2,3]

- [ ] **Task 4.11:** Add rectangle operations to CanvasContext
  - **Files Modified:** `src/context/CanvasContext.tsx`
  - **Features:** 
    - `addRectangle(color)` - create new rectangle at viewport center with highest z-index + 1
    - `selectRectangle(id)` - set local selection state
    - `deselectAll()` - clear selection
    - `updateRectangle(id, x, y)` - move rectangle, auto-update z-index to maxZIndex + 1
    - `resizeRectangle(id, width, height)` - resize rectangle, auto-update z-index to maxZIndex + 1
    - `recolorRectangle(id, color)` - change color, auto-update z-index to maxZIndex + 1
    - `deleteRectangle(id)` - remove rectangle
    - `setZIndex(id, zIndex)` - manually set z-index with push-down recalculation
    - Rectangle state array management with z-index sorting

- [ ] **Task 4.12:** Update useCanvas hook with all operations
  - **Files Modified:** `src/hooks/useCanvas.ts`
  - **Features:** Expose all rectangle CRUD operations from CanvasContext including z-index management

- [ ] **Task 4.13:** Integrate left toolbar and properties panel with layout
  - **Files Modified:** `src/components/Layout/MainLayout.tsx`
  - **Features:** 
    - Left: LeftToolbar component (always visible)
    - Center: Canvas component
    - Right: PropertiesPanel component (conditional visibility)

### Testing Tasks:
- [ ] **Task 4.14:** 🧪 **UNIT TEST** - Write unit tests for z-index service
  - **Files Created:** `src/services/__tests__/zIndex.service.test.ts`
  - **Tests:**
    - Test autoUpdateZIndex() moves shape to front (assigns maxZIndex + 1)
    - Test autoUpdateZIndex() leaves other shapes unchanged
    - Test manualSetZIndex() sets specific z-index correctly using atomic 3-phase approach
    - Test manualSetZIndex() uses temporary high value to avoid conflicts
    - Test manualSetZIndex() shifts other shapes to make room at target z-index
    - Test manual z-index change: moving shape forward (e.g., 2→4) shifts shapes 3,4 back by 1
    - Test manual z-index change: moving shape backward (e.g., 4→2) shifts shapes 2,3 forward by 1
    - Test no duplicate z-indices during or after any operation
    - Test z-index stays positive integers
  - **Command:** `npm test zIndex.service.test.ts`

- [ ] **Task 4.15:** 🧪 **UNIT TEST** - Write unit tests for rectangle operations
  - **Files Created:** `src/hooks/__tests__/useCanvas.rectangles.test.ts`
  - **Tests:**
    - Test addRectangle() creates at viewport center (not canvas center)
    - Test addRectangle() assigns maxZIndex + 1 to new rectangle
    - Test addRectangle() auto-selects the newly created rectangle
    - Test updateRectangle() updates position and auto-sets z-index to maxZIndex + 1
    - Test updateRectangle() only updates z-index on position/size/color changes, not on explicit z-index updates
    - Test resizeRectangle() updates dimensions and auto-sets z-index to maxZIndex + 1
    - Test recolorRectangle() changes color and auto-sets z-index to maxZIndex + 1
    - Test deleteRectangle() removes rectangle from state
    - Test setZIndex() manually overrides z-index using atomic 3-phase approach
    - Test bringToFront() moves shape to maxZIndex + 1
    - Test sendToBack() moves shape to minZIndex - 1 (minimum 1)
    - Test default rectangle size 100x100px
    - Test size constraints (min 1x1, max 4000x4000)
    - Test predefined colors only
  - **Command:** `npm test useCanvas.rectangles.test.ts`

- [ ] **Task 4.16:** 🧪 **UNIT TEST** - Write unit tests for selection operations
  - **Files Created:** `src/hooks/__tests__/useCanvas.selection.test.ts`
  - **Tests:**
    - Test only one rectangle can be selected at a time
    - Test selecting new rectangle deselects previous
    - Test click background deselects all
    - Test selection is local state (not Firestore)
  - **Command:** `npm test useCanvas.selection.test.ts`

- [ ] **Task 4.17:** 🔗 **INTEGRATION TEST** - Write integration test for rectangle operations
  - **Files Created:** `src/__tests__/rectangle.integration.test.tsx`
  - **Tests:**
    - Click "Create Rectangle" button creates 100x100px rectangle at viewport center
    - **Smart Offset:** Creating multiple rectangles offsets them by 20px to prevent stacking
    - **Center Priority:** First rectangle at center if no rectangles exist
    - Left toolbar color picker changes next rectangle's color
    - **Click rectangle selects it (solid dark blue outline appears)**
    - **Single top-right resize handle appears on selected rectangle**
    - Hover over resize handle shows "resize" tooltip
    - Rectangle can be dragged to move (selection NOT required)
    - Rectangle can be resized using top-right handle
    - Size constraints enforced (min 1x1, max 4000x4000)
    - Multiple rectangles can be created
    - Properties panel appears when rectangle selected
    - Properties panel shows color picker, z-index, dimensions (read-only), delete button
  - **Command:** `npm test rectangle.integration.test.tsx`

- [ ] **Task 4.18:** 🔗 **INTEGRATION TEST** - **NEW** Write integration test for z-index system
  - **Files Created:** `src/__tests__/zindex.integration.test.tsx`
  - **Tests:**
    - Create 3 rectangles, verify last created has highest z-index (front)
    - Drag middle rectangle, verify it moves to highest z-index + 1 (front)
    - Resize bottom rectangle, verify it moves to highest z-index + 1 (front)
    - Recolor rectangle, verify it moves to highest z-index + 1 (front)
    - Manually set z-index via properties panel, verify atomic 3-phase update (no conflicts)
    - Verify manual z-index change shifts other shapes correctly (push-down)
    - Create overlapping rectangles, verify z-ordering renders correctly
    - Test with 50 rectangles, verify no duplicate z-indices
    - Z-ordering persists correctly in state
  - **Command:** `npm test zindex.integration.test.tsx`

- [ ] **Task 4.19:** ✅ Verify all tests pass
  - **Action:** Run `npm test` and ensure 100% pass rate

- [ ] **Task 4.20:** **NEW** - Manual stress testing
  - **Action:** Create 10+ rectangles rapidly at viewport center, verify all appear
  - **Action:** Test z-ordering with overlapping rectangles, verify visual layering
  - **Action:** Test drag-to-move without selecting first
  - **Action:** Test single top-right resize handle
  - **Action:** Test properties panel with read-only dimension fields
  - **Action:** Test manual z-index override with push-down
  - **Action:** Monitor FPS with 100+ rectangles

**PR Description:** "**Build left toolbar (color picker dropdown + create button) and right properties panel (color picker, z-index input, read-only dimensions, delete button).** Add rectangle creation at **viewport center** with 5 predefined colors (Blue, Green, Red, Orange, Black), single selection (solid dark blue outline), drag-to-move (**no selection required**), resize with **single top-right handle** with tooltip, delete (Delete key or properties panel button), and **automatic + manual z-index system** (most recently edited moves to front, manual override with push-down recalculation). Includes z-index service, unit tests for z-ordering logic, and integration tests for UI components and z-index behavior."

---

## PR #5: Firebase Firestore Integration for Shapes with Z-Index Persistence

**Branch:** `feat/firestore-shapes`  
**Goal:** Connect canvas to Firestore for persistent shape storage with real-time sync including z-indices and deletions

### Implementation Tasks:
- [ ] **Task 5.1:** Set up Firestore security rules
  - **Files Modified:** `firestore.rules`
  - **Content:** Authenticated user read/write rules for shapes collection under `/canvases/{canvasId}/shapes`

- [ ] **Task 5.2:** Update Firebase service to export Firestore
  - **Files Modified:** `src/services/firebase.ts`
  - **Features:** Ensure Firestore is initialized and exported

- [ ] **Task 5.3:** Create canvas service for Firestore operations
  - **Files Created:** `src/services/canvas.service.ts`
  - **Functions:** `createRectangle()`, `updateRectangle()`, `updateZIndex()`, `deleteRectangle()`, `subscribeToShapes()`
  - **Important:** Uses Firestore only for persistent shape data (not selection/editing state)
  - **Path:** `/canvases/default-canvas/shapes/{shapeId}` using CANVAS_ID constant
  - **Document Structure:**
    - id, x, y, width, height, color (from PREDEFINED_COLORS)
    - zIndex (number, 1 = back, higher = front)
    - createdBy (email), createdAt
    - lastModifiedBy (email), lastModified
  - **Error Handling:** All Firestore operations include retry logic and error handling

- [ ] **Task 5.3a:** Implement retry logic and error handling for Firestore writes
  - **Files Modified:** `src/services/canvas.service.ts`
  - **Features:**
    - Retry failed Firestore writes up to 3 attempts with exponential backoff (100ms, 300ms, 900ms)
    - Console.error() logging for all Firestore failures
    - Toast notification on final failure (after 3 retries)
    - Revert optimistic updates if all retries fail
  - **Libraries:** Consider using `react-hot-toast` or `react-toastify` for toast notifications
  - **Retry Logic:** Wrap all write operations (create, update, delete) in retry wrapper

- [ ] **Task 5.4:** Implement create rectangle in Firestore
  - **Files Modified:** `src/services/canvas.service.ts`
  - **Features:** Add rectangle document to Firestore with full metadata
  - **Z-Index:** New rectangles created with highest z-index + 1
  - **Path:** `/canvases/default-canvas/shapes/{shapeId}`
  - **Metadata:** createdBy, createdAt, lastModifiedBy, lastModified

- [ ] **Task 5.5:** Implement update rectangle in Firestore
  - **Files Modified:** `src/services/canvas.service.ts`
  - **Features:** 
    - Update position (x, y) with z-index auto-update to 1
    - Update dimensions (width, height) with z-index auto-update to 1
    - Update color with z-index auto-update to 1
    - Update lastModifiedBy and lastModified timestamp
  - **Note:** Does NOT update selection state (ephemeral, in RTDB)

- [ ] **Task 5.6:** Implement z-index update in Firestore
  - **Files Modified:** `src/services/canvas.service.ts`
  - **Features:** 
    - `updateZIndex(shapeId, newZIndex)` - manual z-index override
    - Batch update for push-down recalculation of other shapes
    - Ensure no duplicate z-indices

- [ ] **Task 5.7:** Implement delete rectangle in Firestore
  - **Files Modified:** `src/services/canvas.service.ts`
  - **Features:** Remove rectangle document from Firestore (hard delete)

- [ ] **Task 5.8:** Add Firestore listener to CanvasContext
  - **Files Modified:** `src/context/CanvasContext.tsx`
  - **Features:** Subscribe to real-time updates, sync local state with onSnapshot
  - **Important:** 
    - Handle document additions, modifications, deletions
    - Sort rectangles by z-index for rendering order
    - Does NOT sync selection state (RTDB handles that)

- [ ] **Task 5.9:** Connect Canvas component to Firestore via Context
  - **Files Modified:** `src/components/Canvas/Canvas.tsx`
  - **Features:** Use CanvasContext to access Firestore operations
  - **Rendering:** Render rectangles sorted by z-index (higher z-index = rendered later = appears on top)

- [x] **Task 5.9a:** ⚙️ **TEST INFRASTRUCTURE** - Fix Firestore mock unsubscribe handling across all test files
  - **Files Modified:** 
    - `src/context/CanvasContext.tsx` - Added safety check for unsubscribe function
    - All test files - Updated mocks with proper structure and unsubscribe handling
  - **Root Cause:** 
    - `subscribeToShapes` mock wasn't returning proper unsubscribe function that Jest could track
    - `CanvasContext` was calling `unsubscribe()` without checking if it's a function first
    - Auth service mock structure didn't match actual export (needs `authService` object wrapper)
  - **Solution Applied:**
    - Added `if (typeof unsubscribe === 'function')` safety check in `CanvasContext.tsx` cleanup
    - Updated `authService` mock to wrap functions in `authService` object (matches named export)
    - Updated `subscribeToShapes` mock to return `jest.fn()` for proper unsubscribe tracking
    - All Firestore service mocks now use `.mockResolvedValue(undefined)` for async operations
    - Used `setTimeout(() => callback([]), 0)` to simulate async-but-immediate Firestore subscription
  - **Benefits:**
    - **Inline Mocks:** Each test file has explicit mock setup - easier to debug
    - **Proper Cleanup:** Unsubscribe functions work correctly in test lifecycle
    - **Type Safety:** Matches actual service export structure
    - **Test Isolation:** Each test gets fresh mock instances
  - **Result:** ✅ **126/126 tests passing (100% coverage)**
  - **Applied To:**
    - `src/hooks/__tests__/useCanvas.test.tsx`
    - `src/__tests__/rectangle.operations.test.tsx`
    - `src/__tests__/canvas.integration.test.tsx`
    - `src/__tests__/zindex.integration.test.tsx`
    - `src/__tests__/ui-layout.integration.test.tsx`
    - `src/__tests__/persistence.integration.test.tsx`
    - `src/__tests__/auth.integration.test.tsx`

### Testing Tasks:
- [ ] **Task 5.10:** 🧪 **UNIT TEST** - Write unit tests for canvas service
  - **Files Created:** `src/services/__tests__/canvas.service.test.ts`
  - **Tests:**
    - Test createRectangle() calls Firestore with correct data structure including z-index (maxZIndex + 1)
    - Test updateRectangle() updates position/size/color and auto-sets z-index to maxZIndex + 1
    - Test updateZIndex() performs batch updates for push-down recalculation
    - Test deleteRectangle() removes document from Firestore
    - Test rectangle includes metadata (createdBy, createdAt, lastModifiedBy, lastModified)
    - Test z-index field is persisted correctly
    - **Test uses correct canvas ID "default-canvas"**
    - **Test does NOT store selection state in Firestore**
    - Mock Firestore calls
  - **Command:** `npm test canvas.service.test.ts`

- [ ] **Task 5.11:** 🔗 **INTEGRATION TEST** - Write integration test for persistence
  - **Files Created:** `src/__tests__/persistence.integration.test.tsx`
  - **Tests:**
    - Create rectangle and verify it's saved to Firestore with z-index (maxZIndex + 1)
    - Update rectangle position and verify Firestore updates with new z-index (maxZIndex + 1)
    - Resize rectangle and verify Firestore updates with new z-index (maxZIndex + 1)
    - Recolor rectangle and verify Firestore updates with new z-index (maxZIndex + 1)
    - Manually set z-index and verify Firestore batch updates for push-down
    - Delete rectangle and verify it's removed from Firestore
    - Refresh page and verify rectangles load from Firestore with correct z-ordering
    - **Refresh page and verify selection state DOES NOT persist (ephemeral)**
    - Multiple rectangles persist correctly with unique z-indices
    - **All users connect to same canvas "default-canvas"**
    - Z-ordering persists correctly across refreshes
  - **Command:** `npm test persistence.integration.test.tsx`

- [x] **Task 5.12:** ✅ Verify all tests pass
  - **Action:** Run `npm test` and ensure 100% pass rate
  - **Result:** ✅ **126/126 tests passing (100% coverage)**

- [x] **Task 5.13:** Test with Firestore Emulator & Manual Testing
  - **Documentation Created:** `EMULATOR_TESTING.md` - Comprehensive guide for emulator setup and testing
  - **Emulator Infrastructure:** ✅ Complete
    - `firebase.json` configured with Auth (9099), Firestore (8080), RTDB (9000), UI (4000)
    - `firebase.ts` updated with automatic emulator connection logic
    - Controlled by `REACT_APP_USE_EMULATORS=true` environment variable
  - **Firebase CLI:** ✅ Installed (v14.19.1)
  - **Manual Testing Completed:** ✅ Confirmed with production Firebase
    - ✅ Create rectangles → Persist to Firestore
    - ✅ Update position/size/color → Sync to Firestore with retry logic
    - ✅ Delete rectangles → Remove from Firestore
    - ✅ Page refresh → Shapes reload from Firestore correctly
    - ✅ Z-index auto-update → Shapes move to front (maxZIndex + 1) on edit
    - ✅ Z-index manual change → Push-down recalculation works correctly
    - ✅ Multi-user sync → Changes appear instantly across users
    - ✅ Real-time updates → Optimistic local updates + Firestore sync
    - ✅ Error handling → Retry logic with exponential backoff (100ms, 300ms, 900ms)
  - **How to Use Emulators:** See `EMULATOR_TESTING.md` for complete guide
    - Set `REACT_APP_USE_EMULATORS=true` in `.env.local`
    - Run `npx firebase emulators:start`
    - Run `npm start` (app auto-connects to emulators)
    - Access Emulator UI at http://127.0.0.1:4000

**PR Description:** "Integrate Firestore for persistent shape storage including **z-index persistence** using hardcoded canvas ID 'default-canvas'. Rectangles now save to Firestore database with z-index field and persist across page refreshes. **Auto-update z-index to 1 on edit, support manual z-index override with batch push-down recalculation**. Includes delete operation sync. **Selection state is NOT stored in Firestore (ephemeral RTDB only)**. Uses CanvasContext for state management. Includes unit tests for service layer with z-index logic and integration tests with Firestore emulator."

---

## PR #6: Real-Time Synchronization with Optimistic Updates & Conflict Resolution

**Branch:** `feat/realtime-sync-optimistic`  
**Goal:** Implement optimistic updates with "last write wins" - multiple users can edit same rectangle simultaneously with visual conflict awareness (no edit locks)

### Implementation Tasks:
- [x] **Task 6.1:** Create activeEdits service for conflict awareness (RTDB)
  - **Files Created:** `src/services/activeEdits.service.ts`
  - **Functions:** `setActiveEdit(shapeId, userId, email, firstName, action, cursorColor)`, `clearActiveEdit()`, `subscribeToActiveEdit()`, `subscribeToAllActiveEdits()`
  - **Path:** `/activeEdits/default-canvas/{shapeId}`
  - **Data Structure:** `{ userId, email, firstName, action: 'moving'|'resizing'|'recoloring', cursorColor, startedAt }`
  - **Features:** onDisconnect hook to auto-clear editing state, getUserCursorColor() for consistent colors
  - **Purpose:** Track who is currently editing which shape for visual indicators
  - **Display Names:** Uses firstName in indicators (e.g., "John is moving")

- [ ] **Task 6.2:** Implement optimistic UI updates for all operations
  - **Files Modified:** `src/hooks/useCanvas.ts` or `src/context/CanvasContext.tsx`
  - **Features:** 
    - **Optimistic create:** Add rectangle to local state immediately, then sync to Firestore
    - **Optimistic move:** Update position in local state immediately, then sync to Firestore
    - **Optimistic resize:** Update dimensions in local state immediately, then sync to Firestore
    - **Optimistic recolor:** Update color in local state immediately, then sync to Firestore
    - **Optimistic delete:** Remove from local state immediately, then sync to Firestore
  - **Key Principle:** User sees their own changes instantly (no waiting for Firestore)

- [ ] **Task 6.3:** Track active editing state during drag/resize/recolor
  - **Files Modified:** `src/components/Canvas/Rectangle.tsx`
  - **Features:**
    - **On drag start:** Call `setActiveEdit(shapeId, 'moving')`
    - **On resize start:** Call `setActiveEdit(shapeId, 'resizing')`
    - **On color change start:** Call `setActiveEdit(shapeId, 'recoloring')`
    - **On operation end (mouse release):** Call `clearActiveEdit(shapeId)`

- [ ] **Task 6.4:** Handle incoming real-time updates from other users
  - **Files Modified:** `src/hooks/useCanvas.ts` or `src/context/CanvasContext.tsx`
  - **Features:** 
    - **Incoming creates:** Add rectangles created by others to local state
    - **Incoming updates:** Update existing rectangles when others move/resize/recolor
    - **Incoming deletes:** Remove rectangles deleted by others from local state
    - **Z-index sync:** Update z-ordering when others edit shapes
  - **Conflict handling:** 
    - If currently editing same shape, still show local optimistic state
    - On mouse release, Firestore sync occurs
    - Incoming update from "last write wins" will override local state
    - User sees their rectangle snap to winner's position

- [x] **Task 6.5:** Create EditingIndicator component for conflict visualization
  - **Files Created:** `src/components/Collaboration/EditingIndicator.tsx`
  - **Features:** 
    - Show "John is moving" badge near rectangle (uses firstName)
    - Falls back to email username if firstName not set (backward compatibility)
    - Border color matches User's cursor color
    - Light gray background (#D3D3D3)
    - Only visible during active dragging/resizing/recoloring (not just selection)
    - Auto-scales with viewport zoom

- [ ] **Task 6.6:** Integrate editing indicators into Rectangle component
  - **Files Modified:** `src/components/Canvas/Rectangle.tsx`
  - **Features:**
    - Subscribe to activeEdits for this shape
    - Render EditingIndicator when another user is editing
    - Show even if current user is also editing (conflict awareness)
    - Position indicator near shape (not overlapping content)

### Testing Tasks:
- [ ] **Task 6.7:** 🧪 **UNIT TEST** - Write unit tests for activeEdits service
  - **Files Created:** `src/services/__tests__/activeEdits.service.test.ts`
  - **Tests:**
    - Test setActiveEdit() writes to RTDB with correct structure
    - Test clearActiveEdit() removes from RTDB
    - Test onDisconnect hook is configured correctly
    - Test uses correct canvas ID "default-canvas"
    - Test action types: 'moving', 'resizing', 'recoloring'
    - Mock RTDB calls
  - **Command:** `npm test activeEdits.service.test.ts`

- [ ] **Task 6.8:** 🔗 **INTEGRATION TEST** - Write integration test for optimistic updates
  - **Files Created:** `src/__tests__/realtime-sync.integration.test.tsx`
  - **Tests:**
    - **Optimistic create:** User A creates rectangle, sees it immediately without waiting
    - **Optimistic move:** User A drags rectangle, sees position update immediately
    - **Optimistic resize:** User A resizes rectangle, sees size update immediately
    - **Optimistic recolor:** User A changes color, sees color update immediately
    - **Optimistic delete:** User A deletes rectangle, sees it disappear immediately
    - **Sync to other users:** User B sees all of User A's changes within 100ms
    - **Two-way sync:** User B creates rectangle, User A sees it appear
  - **Command:** `npm test realtime-sync.integration.test.tsx`

- [ ] **Task 6.9:** 🔗 **INTEGRATION TEST** - **NEW** Write integration test for conflict resolution
  - **Files Created:** `src/__tests__/conflict-resolution.integration.test.tsx`
  - **Tests:**
    - **Simultaneous move:** User A and User B drag same rectangle, last mouse release wins
    - **Simultaneous resize:** User A and User B resize same rectangle, last release wins
    - **Visual indicator:** User A drags rectangle, User B sees "User A is editing" indicator
    - **Indicator appearance:** Border matches User A's cursor color, light gray background
    - **No blocking:** User B can also drag while User A is dragging (both see optimistic updates)
    - **Conflict resolution:** After both release, loser sees rectangle snap to winner's position
    - **Rapid operations:** Stress test with rapid simultaneous edits, verify no corruption
    - **ActiveEdits cleanup:** User A disconnects, editing indicator disappears automatically
  - **Command:** `npm test conflict-resolution.integration.test.tsx`

- [ ] **Task 6.10:** ✅ Verify all tests pass
  - **Action:** Run `npm test` and ensure 100% pass rate

- [ ] **Task 6.11:** Test with multiple browser windows
  - **Action:** Open 2-3 windows with different users
  - **Action:** Test optimistic updates (immediate local feedback)
  - **Action:** Test simultaneous editing (both users drag same rectangle)
  - **Action:** Verify editing indicators appear with correct cursor colors
  - **Action:** Verify last write wins behavior

- [ ] **Task 6.12:** Measure and optimize sync latency
  - **Action:** Test sync speed between users, ensure <100ms latency for Firestore updates
  - **Action:** Verify activeEdits updates happen within <50ms (RTDB)

- [ ] **Task 6.13:** **NEW** - Stress testing for optimistic updates
  - **Action:** Rapidly create 10+ rectangles in one window, verify all appear in other window immediately
  - **Action:** Two users rapidly drag different rectangles, verify no conflicts or data loss
  - **Action:** Two users rapidly drag SAME rectangle, verify last write wins and no corruption
  - **Action:** Monitor FPS during heavy sync activity (should maintain 60 FPS)

**PR Description:** "Implement **optimistic updates with 'last write wins' conflict resolution**. Users see their own changes immediately (no waiting), and multiple users can edit the same rectangle simultaneously with visual conflict awareness. Add activeEdits service (RTDB) to track editing state for visual indicators. Create EditingIndicator component showing 'User X is editing' with border matching cursor color. **No edit locks - true real-time multiplayer collaboration**. When conflicts occur, last mouse release determines final state. Includes unit tests for activeEdits service and integration tests for optimistic updates and conflict resolution scenarios including stress testing."

---

## PR #7: Multiplayer Cursors, Selection State & Live Position Streaming (RTDB)

**Branch:** `feat/multiplayer-cursors-selection`  
**Goal:** Show other users' colored cursors with color name labels in real-time, implement ephemeral selection state (RTDB), and **add live position/resize streaming for smooth real-time shape movement**

### Implementation Tasks:
- [ ] **Task 7.1:** Create cursor types
  - **Files Created:** `src/types/cursor.types.ts`
  - **Content:** Cursor interface
    - x, y (position)
    - userId
    - colorName: string (e.g., "Blue", "Red" - for display label)
    - cursorColor: string (hex code - actual cursor color)
    - lastUpdate: timestamp

- [ ] **Task 7.2:** Create throttle utility
  - **Files Created:** `src/utils/throttle.ts`
  - **Features:** Throttle function for 16ms intervals (60 FPS)

- [ ] **Task 7.3:** Set up RTDB security rules for cursors and selections
  - **Files Modified:** `database.rules.json`
  - **Content:** Authenticated user read/write rules for cursors and selections paths

- [ ] **Task 7.4:** Build cursor service using RTDB
  - **Files Created:** `src/services/cursor.service.ts`
  - **Functions:** `updateCursorPosition()`, `subscribeToCursors()`
  - **Important:** Uses RTDB (not Firestore) for high-frequency updates
  - **Features:** onDisconnect hook to auto-remove cursor
  - **Path:** `/cursors/default-canvas/{userId}` - Use CANVAS_ID from constants
  - **Data Structure:** Include colorName (for label) and cursorColor (hex for rendering)

- [ ] **Task 7.5:** **NEW** - Build selection service using RTDB (ephemeral state)
  - **Files Created:** `src/services/selection.service.ts`
  - **Functions:** `setSelection()`, `clearSelection()`, `subscribeToSelections()`
  - **Important:** Uses RTDB (not Firestore) for ephemeral selection state
  - **Features:** onDisconnect hook to auto-clear selection
  - **Path:** `/selections/default-canvas/{userId}`
  - **Data Structure:** `{ selectedShapeId: string | null, selectedAt: timestamp }`
  - **Purpose:** Selection state does NOT persist across refreshes

- [ ] **Task 7.5b:** **NEW** - Build livePositions service using RTDB (ephemeral state)
  - **Files Created:** `src/services/livePositions.service.ts`
  - **Functions:** `setLivePosition()`, `clearLivePosition()`, `subscribeToLivePositions()`
  - **Important:** Uses RTDB (not Firestore) for high-frequency position updates during drag/resize
  - **Features:** onDisconnect hook to auto-clear live position, throttled updates (16ms / 60 FPS)
  - **Path:** `/livePositions/default-canvas/{shapeId}`
  - **Data Structure:** `{ userId, x, y, width, height, lastUpdate: timestamp }`
  - **Purpose:** Stream intermediate positions during drag/resize for smooth real-time rendering
  - **Behavior:** 
    - Called during `onDragMove` and resize drag events (throttled to 16ms)
    - Auto-cleared on `onDragEnd` and resize end
    - Other users subscribe and render positions in real-time (60 FPS)
    - Does NOT persist - ephemeral only

- [ ] **Task 7.6:** Create useCursors hook
  - **Files Created:** `src/hooks/useCursors.ts`
  - **Features:** Track cursor positions, throttled updates (16ms), cleanup
  - **Uses:** Helper function `generateCursorColor()` from utils to assign unique cursor colors

- [ ] **Task 7.7:** Build CursorOverlay component
  - **Files Created:** `src/components/Collaboration/CursorOverlay.tsx`
  - **Features:** 
    - Render SVG cursors with assigned colors (cursorColor)
    - Display text label showing color name (colorName: "Blue", "Red", etc.)
    - Filter out own cursor
    - **NOT showing username/email on cursor**

- [ ] **Task 7.8:** Integrate cursor tracking in Canvas
  - **Files Modified:** `src/components/Canvas/Canvas.tsx`
  - **Features:** 
    - Track mouse position over canvas
    - Send to RTDB via throttled function (16ms)
    - Include colorName and cursorColor in updates

- [ ] **Task 7.8b:** **NEW** - Integrate live position streaming during drag/resize
  - **Files Modified:** `src/components/Canvas/Rectangle.tsx`
  - **Features:**
    - During `onDragMove`: Call `setLivePosition(shapeId, x, y, width, height)` (throttled to 16ms)
    - During resize drag: Call `setLivePosition(shapeId, x, y, width, height)` (throttled to 16ms)
    - On `onDragEnd`: Call `clearLivePosition(shapeId)`
    - On resize end: Call `clearLivePosition(shapeId)`
    - Subscribe to `livePositions` for OTHER users' shapes
    - Render live positions if available (override local position for shapes being edited by others)
    - **Important:** Only render live position if `userId !== currentUser.userId` (don't override own optimistic updates)

- [ ] **Task 7.9:** Add cursor overlay to Canvas
  - **Files Modified:** `src/components/Canvas/Canvas.tsx`
  - **Features:** Render CursorOverlay component above Konva stage

- [ ] **Task 7.10:** Integrate selection state with RTDB
  - **Files Modified:** `src/context/CanvasContext.tsx` or `src/hooks/useCanvas.ts`
  - **Features:**
    - On rectangle select: Call `setSelection(shapeId)`
    - On deselect: Call `clearSelection()`
    - Subscribe to other users' selections
    - **Selection state is ephemeral (RTDB only, not Firestore)**

- [ ] **Task 7.11:** Style cursor labels with color names
  - **Files Modified:** `src/components/Collaboration/CursorOverlay.tsx`
  - **Features:** 
    - Colored cursor (using cursorColor)
    - Text label showing colorName ("Blue", "Red", "Green", etc.)
    - Smooth animations
    - **No username/email displayed on cursor label**

### Testing Tasks:
- [ ] **Task 7.12:** 🧪 **UNIT TEST** - Write unit tests for throttle utility
  - **Files Created:** `src/utils/__tests__/throttle.test.ts`
  - **Tests:**
    - Test throttle delays function execution
    - Test throttle respects 16ms interval (60 FPS)
    - Test throttle doesn't call function more than once per interval
    - Test throttle with rapid calls
  - **Command:** `npm test throttle.test.ts`

- [ ] **Task 7.13:** 🧪 **UNIT TEST** - Write unit tests for cursor service
  - **Files Created:** `src/services/__tests__/cursor.service.test.ts`
  - **Tests:**
    - Test updateCursorPosition() sends correct data structure to RTDB
    - Test cursor includes userId, x, y, colorName, cursorColor, timestamp
    - **Test colorName is a display string (e.g., "Blue", "Red")**
    - **Test cursorColor is hex code for rendering**
    - Test subscribeToCursors() sets up RTDB listener
    - Test onDisconnect hook is set correctly
    - **Test uses correct canvas ID "default-canvas"**
    - Mock RTDB calls
  - **Command:** `npm test cursor.service.test.ts`

- [ ] **Task 7.14:** 🧪 **UNIT TEST** - **NEW** Write unit tests for selection service
  - **Files Created:** `src/services/__tests__/selection.service.test.ts`
  - **Tests:**
    - Test setSelection() writes to RTDB with correct structure
    - Test clearSelection() removes from RTDB
    - Test onDisconnect hook clears selection automatically
    - **Test uses correct canvas ID "default-canvas"**
    - **Test selection state is ephemeral (RTDB only)**
    - Mock RTDB calls
  - **Command:** `npm test selection.service.test.ts`

- [ ] **Task 7.14b:** 🧪 **UNIT TEST** - **NEW** Write unit tests for livePositions service
  - **Files Created:** `src/services/__tests__/livePositions.service.test.ts`
  - **Tests:**
    - Test setLivePosition() writes to RTDB with correct structure (userId, x, y, width, height, timestamp)
    - Test clearLivePosition() removes from RTDB
    - Test subscribeToLivePositions() sets up RTDB listener
    - Test onDisconnect hook clears live position automatically
    - **Test uses correct canvas ID "default-canvas"**
    - **Test live positions are ephemeral (RTDB only)**
    - **Test throttling to 16ms (60 FPS)**
    - Mock RTDB calls
  - **Command:** `npm test livePositions.service.test.ts`

- [ ] **Task 7.15:** 🧪 **UNIT TEST** - Write unit tests for helper functions
  - **Files Created:** `src/utils/__tests__/helpers.test.ts`
  - **Tests:**
    - Test generateCursorColor() produces consistent colors for same userId
    - Test generateCursorColor() produces diverse colors for different userIds
    - **Test colors are unique unless many users (randomized but consistent)**
  - **Command:** `npm test helpers.test.ts`

- [ ] **Task 7.16:** 🔗 **INTEGRATION TEST** - Write integration test for cursor synchronization & live position streaming
  - **Files Created:** `src/__tests__/cursor-sync.integration.test.tsx`
  - **Tests:**
    - User moves mouse, cursor position updates in RTDB within 16ms
    - Multiple users' cursors render correctly with different colors
    - Own cursor is filtered out from display
    - Cursor updates are throttled to 16ms (60 FPS)
    - **Cursor labels show color NAMES (e.g., "Blue"), not usernames/emails**
    - Cursor auto-removes on disconnect
    - **Cursor movement maintains 60 FPS**
    - **Selection state syncs via RTDB (ephemeral)**
    - **Selection clears on disconnect automatically**
    - **NEW: User A drags shape, User B sees live position updates (60 FPS)**
    - **NEW: User A resizes shape, User B sees live resize updates (60 FPS)**
    - **NEW: Live positions clear on drag/resize end**
    - **NEW: Live position updates don't override own optimistic updates**
  - **Command:** `npm test cursor-sync.integration.test.tsx`

- [ ] **Task 7.17:** ✅ Verify all tests pass
  - **Action:** Run `npm test` and ensure 100% pass rate

- [ ] **Task 7.18:** Test with RTDB Emulator
  - **Command:** `firebase emulators:start --only database`
  - **Action:** Run tests against RTDB emulator, verify auto-cleanup
  - **Action:** Test selection ephemeral state (doesn't persist on disconnect)
  - **Note:** Emulator runs on port 9000 (configured in PR #1)

- [ ] **Task 7.19:** Test cursor synchronization + live position streaming manually
  - **Action:** Open multiple windows, move cursors, verify 60 FPS smoothness
  - **Action:** Verify cursor labels show color names ("Blue", "Red"), not emails
  - **Action:** Test selection state sync and auto-clear on disconnect
  - **Action:** **NEW: User A drags shape, verify User B sees smooth real-time movement (60 FPS)**
  - **Action:** **NEW: User A resizes shape, verify User B sees smooth real-time resizing (60 FPS)**
  - **Action:** **NEW: Verify live position indicators disappear when drag/resize ends**
  - **Action:** **NEW: Verify optimistic updates (own edits) are not overridden by live positions**
  - **Action:** Monitor FPS counter during cursor + live position activity

**PR Description:** "Add multiplayer cursors showing real-time cursor positions at 60 FPS using Firebase Realtime Database with canvas ID 'default-canvas'. **Cursors display color name labels (e.g., 'Blue', 'Red') instead of usernames**. Cursors are randomly colored and unique per user. **Add ephemeral selection state service (RTDB)** - selection does NOT persist across refreshes. **NEW: Add live position streaming service** - users see shapes moving/resizing smoothly in real-time (60 FPS) during drag/resize operations via RTDB. Includes automatic cleanup with onDisconnect hooks for cursors, selections, and live positions, throttle utility (16ms), cursor color generation helper, and comprehensive tests with RTDB emulator support including live position streaming tests."

---

## PR #8: Presence Awareness with RTDB (Email Display)

**Branch:** `feat/presence-system`  
**Goal:** Show who is currently online (displaying email addresses) in top header using Realtime Database

### Implementation Tasks:
- [ ] **Task 8.1:** Set up RTDB security rules for presence
  - **Files Modified:** `database.rules.json`
  - **Content:** Authenticated user read/write rules for presence path

- [ ] **Task 8.2:** Create presence service using RTDB
  - **Files Created:** `src/services/presence.service.ts`
  - **Functions:** `setUserOnline()`, `setUserOffline()`, `subscribeToPresence()`
  - **Important:** Uses RTDB (not Firestore) for real-time presence
  - **Features:** onDisconnect hook to auto-set user offline, heartbeat mechanism
  - **Path:** `/presence/default-canvas/{userId}` - Use CANVAS_ID from constants
  - **Data Structure:** `{ online: true, email: string, joinedAt: timestamp, lastSeen: timestamp }`
  - **Note:** Email serves as username/display name

- [ ] **Task 8.3:** Create usePresence hook
  - **Files Created:** `src/hooks/usePresence.ts`
  - **Features:** Online users list (with emails), join/leave handlers, cleanup

- [ ] **Task 8.4:** Implement presence on mount/unmount
  - **Files Modified:** `src/hooks/usePresence.ts`
  - **Features:** Set online on mount, offline on unmount/window close, 30s heartbeat

- [ ] **Task 8.5:** Implement network disconnection detection and toast notifications
  - **Files Modified:** `src/hooks/usePresence.ts` or `src/services/presence.service.ts`
  - **Features:**
    - Detect Firebase connection state changes (online/offline)
    - Show toast notification when connection is lost: "Connection lost. Reconnecting..."
    - Show toast notification when reconnected: "Connected"
    - Use `react-hot-toast` for notifications
    - Listen to Firebase `.info/connected` path in RTDB for connection state

- [ ] **Task 8.6:** Build ActiveUsers component for top header
  - **Files Created:** `src/components/Collaboration/ActiveUsers.tsx`
  - **Features:** 
    - List of online users showing email addresses
    - User count display
    - User avatars/initials with colors (using cursor color from generateCursorColor)
    - Online status dots
    - **Position:** Far right of top header

- [ ] **Task 8.7:** Add ActiveUsers to Header
  - **Files Modified:** `src/components/Layout/Header.tsx`
  - **Features:** 
    - Display ActiveUsers component on far right
    - Show active users count and email list
    - Responsive design for header layout

- [ ] **Task 8.8:** Style presence indicators
  - **Files Modified:** `src/components/Collaboration/ActiveUsers.tsx`
  - **Features:** 
    - Email address display (username = email)
    - User avatars with colors matching their cursor colors
    - Online status dots (green for online)
    - Responsive design

- [ ] **Task 8.9:** Handle presence cleanup on disconnect
  - **Files Modified:** `src/services/presence.service.ts`
  - **Features:** RTDB onDisconnect handlers for automatic cleanup (sets online: false)

### Testing Tasks:
- [ ] **Task 8.10:** 🧪 **UNIT TEST** - Write unit tests for presence service
  - **Files Created:** `src/services/__tests__/presence.service.test.ts`
  - **Tests:**
    - Test setUserOnline() adds user to RTDB presence path with email
    - Test setUserOffline() updates user status in RTDB
    - **Test presence includes userId, email (as username), online status, joinedAt, lastSeen**
    - Test subscribeToPresence() sets up RTDB listener
    - Test onDisconnect hook is configured correctly
    - **Test uses correct canvas ID "default-canvas"**
    - Mock RTDB calls
  - **Command:** `npm test presence.service.test.ts`

- [ ] **Task 8.11:** 🔗 **INTEGRATION TEST** - Write integration test for presence system
  - **Files Created:** `src/__tests__/presence.integration.test.tsx`
  - **Tests:**
    - User joins canvas, appears in active users list in top header
    - **Email address displays correctly in active users list**
    - User leaves canvas, status updates to offline automatically
    - Multiple users join, all emails appear in list
    - Active user count displays correctly in header
    - Window close triggers offline status via onDisconnect
    - Presence survives network disruptions
    - **All users see same "default-canvas" presence list**
    - **ActiveUsers component appears on far right of top header**
  - **Command:** `npm test presence.integration.test.tsx`

- [ ] **Task 8.12:** ✅ Verify all tests pass
  - **Action:** Run `npm test` and ensure 100% pass rate

- [ ] **Task 8.13:** Test with RTDB Emulator
  - **Command:** `firebase emulators:start --only database`
  - **Action:** Run tests against RTDB emulator, verify onDisconnect behavior
  - **Action:** Test email display in presence data
  - **Note:** Emulator runs on port 9000 (configured in PR #1)

- [ ] **Task 8.14:** Test presence system manually
  - **Action:** Open/close windows, verify user count updates correctly in top header
  - **Action:** Verify email addresses display in active users list
  - **Action:** Test auto-cleanup (users go offline on disconnect)

**PR Description:** "Implement presence awareness system using Firebase Realtime Database with canvas ID 'default-canvas' showing all currently online users in **top header (far right)**. **Displays email addresses as usernames** with real-time join/leave updates. Includes automatic cleanup with onDisconnect hooks, heartbeat mechanism, color-coded avatars matching cursor colors, and comprehensive tests with RTDB emulator support."

---

## PR #9: REMOVED - Conflict Resolution Now in PR #6

**NOTE:** This PR has been merged into PR #6 (Real-Time Synchronization with Optimistic Updates & Conflict Resolution). The conflict resolution UI (EditingIndicator component) and activeEdits service are now implemented as part of the optimistic updates architecture in PR #6.

**What was moved to PR #6:**
- ActiveEdits service (RTDB)
- EditingIndicator component
- Conflict resolution logic
- Optimistic updates implementation
- "User X is editing" visual indicators

**Remaining PRs are renumbered:**
- Old PR #10 → New PR #9 (Deployment)

---

## PR #9: Deployment, Performance Optimization & Final Polish

**Branch:** `feat/deployment`  
**Goal:** Deploy to Firebase Hosting, optimize performance, finalize MVP with all updated features (optimistic updates, z-index, color labels, email display)

**Deployment Platform:** Firebase Hosting (single ecosystem with Firestore + RTDB + Auth)

### Implementation Tasks:
- [ ] **Task 9.1:** Configure Firebase Hosting
  - **Files Created:** `firebase.json`, `.firebaserc`
  - **Command:** `firebase init hosting`
  - **Action:** Configure build directory to `build/` (for Create React App) or `dist/` (for Vite)
  - **Action:** Configure as single-page app (rewrite all URLs to /index.html)

- [ ] **Task 9.2:** Set production environment variables in Firebase Console
  - **Action:** Go to Firebase Console → Project Settings → General → Your apps → SDK setup and configuration
  - **Action:** Verify Firebase config is correctly set for production
  - **Note:** `.env.local` is for local dev only, not deployed
  - **Important:** Firebase SDK config (apiKey, authDomain, etc.) comes from Firebase Console

- [ ] **Task 9.3:** Build production bundle
  - **Command:** `npm run build`
  - **Action:** Verify no errors, check bundle size
  - **Action:** Ensure FPS counter is disabled in production build

- [ ] **Task 9.4:** Performance optimization
  - **Files Modified:** `src/components/Canvas/Canvas.tsx`
  - **Action:** Ensure requestAnimationFrame is used for rendering
  - **Action:** Optimize Konva layer management with z-index sorting
  - **Action:** Add lazy loading for components if needed
  - **Action:** Minimize re-renders with React.memo where appropriate
  - **Action:** Optimize optimistic updates to avoid unnecessary re-renders
  - **Action:** Verify retry logic and error handling don't cause performance issues

- [ ] **Task 9.5:** Load testing with 500+ rectangles
  - **Action:** Create test script to generate 500 rectangles with various z-indices
  - **Action:** Measure FPS with 500+ objects
  - **Action:** Test z-index recalculation performance
  - **Action:** Test retry logic under load
  - **Action:** Optimize if FPS drops below 55

- [ ] **Task 9.6:** Deploy to Firebase Hosting
  - **Command:** `firebase deploy --only hosting`
  - **Action:** Get public URL (will be https://PROJECT_ID.web.app)
  - **Action:** Verify FPS counter disabled in production
  - **Action:** Test Firebase Authentication, Firestore, and RTDB in production

- [ ] **Task 9.7:** Test deployed application
  - **Action:** Test all features on live URL
  - **Action:** Test optimistic updates with multiple users
  - **Action:** Test conflict resolution (last write wins)
  - **Action:** Verify cursor color labels (not emails)
  - **Action:** Verify email display in top header
  - **Action:** Test z-index system (auto + manual)
  - **Action:** Test with 5+ concurrent users
  - **Action:** Test toast notifications for errors and connection status
  - **Action:** Verify retry logic works in production (simulate Firestore failures)

- [ ] **Task 9.8:** Update README with live URL and new features
  - **Files Modified:** `README.md`
  - **Content:** 
    - Add deployment URL
    - Document optimistic updates architecture
    - Document z-index system
    - Document cursor color labels vs email display
    - Setup instructions, features list, canvas ID info

- [ ] **Task 9.8:** Add loading states to components
  - **Files Modified:** Various components
  - **Features:** Loading spinners during auth, canvas load, initial data fetch

- [ ] **Task 9.9:** Add error boundaries
  - **Files Created:** `src/components/ErrorBoundary.tsx`
  - **Files Modified:** `src/App.tsx`
  - **Features:** Graceful error handling for conflict resolution edge cases

- [ ] **Task 9.10:** Final UI polish
  - **Files Modified:** Various components
  - **Features:** 
    - Consistent spacing, colors, typography
    - Polish left toolbar and right properties panel
    - Polish EditingIndicator appearance
    - Polish ActiveUsers list in header

- [ ] **Task 9.11:** Verify FPS counter in dev mode only
  - **Action:** Test FPS counter displays in development
  - **Action:** Verify FPS counter is disabled in production build
  - **Action:** Verify performance meets 60 FPS target

### Testing Tasks:
- [ ] **Task 9.12:** Run full test suite
  - **Action:** Run `npm test` and verify all tests pass
  - **Action:** Ensure all 9 unit + 9 integration tests pass

- [ ] **Task 9.13:** Complete stress testing checklist
  - **Action:** Test optimistic updates with 2 users editing same rectangle
  - **Action:** Test "last write wins" conflict resolution
  - **Action:** Test rapid creation of 10+ rectangles at viewport center
  - **Action:** Load test with 500+ rectangles with z-ordering
  - **Action:** Test z-index manual override with push-down
  - **Action:** Test with 5+ concurrent users
  - **Action:** Monitor FPS throughout all tests (should maintain 60 FPS)
  - **Action:** Test viewport independence (users viewing different sections)

- [ ] **Task 9.14:** Run through MVP success criteria
  - **Action:** Verify all 47 success metrics from PRD v3.0

*No new automated tests for this PR - focus on deployment and optimization*

**PR Description:** "Deploy application to Firebase Hosting with final UI polish, error handling, loading states, and **performance optimization for optimistic updates and z-index system**. **Includes comprehensive stress testing with 500+ rectangles, 5+ concurrent users, and conflict resolution scenarios**. MVP complete and publicly accessible at canvas ID 'default-canvas' featuring: optimistic updates with last write wins, automatic + manual z-index layering, cursor color labels (not emails), email display in top header, viewport independence, and true real-time multiplayer collaboration without edit locks."

---

## Testing Checklist (Before Final Submission)

Run through these tests after PR #9:

### Authentication:
- [ ] Sign up new account successfully
- [ ] Log in with existing account
- [ ] Log out and log back in
- [ ] Session persists across refresh
- [ ] **All users join same canvas "default-canvas"**
- [ ] **Email serves as username throughout app**

### UI Layout:
- [ ] **3-column layout renders correctly (left toolbar, center canvas, right properties panel)**
- [ ] **Top header displays with app title and online users (far right)**
- [ ] **Left toolbar always visible with color picker + create button**
- [ ] **Right properties panel shows/hides based on selection**
- [ ] **Canvas background is off-white**

### Canvas Basics:
- [ ] **Create rectangles at viewport center (not canvas center)**
- [ ] Create 5+ rectangles with different colors from 5 predefined options
- [ ] **Select rectangle (solid dark blue outline appears)**
- [ ] **Move rectangles by dragging (selection NOT required)**
- [ ] **Single resize handle appears in top-right corner of selected rectangle**
- [ ] Resize rectangle using top-right handle (shows "resize" tooltip on hover)
- [ ] **Change rectangle color via left toolbar (before creation) or right properties panel (after)**
- [ ] **Delete selected rectangle (Delete key or properties panel button)**
- [ ] Click canvas background deselects rectangle
- [ ] Pan canvas by click-dragging empty space
- [ ] Zoom with mouse wheel, pinch, or Shift+/- (10%-800% limits)
- [ ] **FPS counter displays in dev mode and shows 60 FPS**

### Z-Index System:
- [ ] Create overlapping rectangles
- [ ] **Verify most recently edited rectangle appears on top (highest z-index)**
- [ ] **Drag rectangle, verify it moves to front automatically**
- [ ] **Resize rectangle, verify it moves to front automatically**
- [ ] **Recolor rectangle, verify it moves to front automatically**
- [ ] **Manually set z-index in properties panel**
- [ ] **Verify push-down recalculation (no duplicate z-indices)**
- [ ] **Z-order is consistent across all users**

### Real-Time Collaboration - Optimistic Updates:
- [ ] Open second browser window, verify both users see each other's cursors
- [ ] **Verify cursor labels show color NAMES (e.g., "Blue", "Red"), NOT emails**
- [ ] **Optimistic create:** User A creates rectangle, sees it immediately (no waiting)
- [ ] User B sees User A's rectangle appear within 100ms
- [ ] **Optimistic move:** User A drags rectangle, sees immediate local feedback
- [ ] User B sees User A's rectangle move in real-time
- [ ] **Optimistic resize:** User A resizes, sees immediate feedback, User B sees it update
- [ ] **Optimistic recolor:** User A changes color, sees immediate feedback, User B sees it update
- [ ] **Optimistic delete:** User A deletes, sees it disappear immediately, User B sees it disappear
- [ ] Refresh page, verify all rectangles persist (Firestore)
- [ ] **Refresh page, verify selection state DOES NOT persist (ephemeral RTDB)**
- [ ] Close all windows, reopen, verify canvas state persists with correct z-ordering

### Conflict Resolution - Last Write Wins:
- [ ] **Two users drag SAME rectangle simultaneously**
- [ ] **User A sees "User B is editing" indicator with border matching User B's cursor color**
- [ ] **User B can ALSO drag (no edit lock)**
- [ ] **Both users see local optimistic updates immediately**
- [ ] **Last user to release mouse wins - loser sees rectangle snap to winner's position**
- [ ] **Test with resize: Both users resize same rectangle, last release wins**
- [ ] **Test with recolor: Both users change color, last change wins**
- [ ] Verify editing indicator disappears when users stop editing

### Multiplayer Features:
- [ ] **Active users list in top header (far right) shows email addresses**
- [ ] Check active users count displays correctly
- [ ] **Verify NO usernames/emails on cursor labels (only color names)**
- [ ] Close browser tab, verify cursor disappears automatically (RTDB auto-cleanup)
- [ ] Close browser tab, verify user goes offline automatically (RTDB onDisconnect)
- [ ] Close browser tab, verify selection state clears automatically (RTDB ephemeral)
- [ ] **All users see same canvas "default-canvas"**
- [ ] **Test viewport independence: Users can view different canvas sections**

### Performance:
- [ ] **Test with 3-5 concurrent users**
- [ ] Verify no console errors
- [ ] **Check FPS counter stays at 60 during all interactions (dev mode only)**
- [ ] **Test with 500+ rectangles with z-ordering (should maintain 55+ FPS)**
- [ ] Verify cursors update smoothly at 16ms intervals (60 FPS)
- [ ] Test z-index recalculation performance with many shapes
- [ ] Test optimistic updates don't cause unnecessary re-renders
- [ ] Test on different browsers (Chrome, Firefox, Safari)

### Stress Testing:
- [ ] **Rapidly create 10+ rectangles at viewport center, verify all sync within 100ms**
- [ ] **Create, move, resize, recolor, delete 20+ rectangles quickly, monitor FPS**
- [ ] **Simultaneous editing: 2 users edit same rectangle, verify last write wins**
- [ ] **Rapid z-index changes: Change z-indices rapidly, verify no duplicates**
- [ ] **Conflict stress test: 2 users rapidly drag same rectangle back and forth**
- [ ] **Network disruption: Disconnect/reconnect, verify optimistic updates recover**

---

## Test Summary by PR

| PR # | PR Name | Unit Tests | Integration Tests | Total Test Files | Notes |
|------|---------|------------|-------------------|------------------|-------|
| 1 | Project Setup | 0 | 0 | 0 | Infrastructure only |
| 2 | Authentication | 1 | 1 | 2 | Auth service + flow, email as username |
| 3 | UI Layout & Canvas | 1 | 2 | 3 | **3-column layout + FPS monitoring + pan/zoom** |
| 4 | Rectangles + Z-Index | 3 | 2 | 5 | **Z-index service + viewport center creation + single handle** |
| 5 | Firestore + Z-Index | 1 | 1 | 2 | **Z-index persistence + push-down** |
| 6 | Optimistic Updates | 1 | 2 | 3 | **ActiveEdits service + conflict resolution + last write wins** |
| 7 | Cursors + Selection | 3 | 1 | 4 | **Color labels + selection service (RTDB ephemeral)** |
| 8 | Presence | 1 | 1 | 2 | **Email display in header** |
| ~~9~~ | ~~Conflict UI~~ | ~~0~~ | ~~0~~ | ~~0~~ | **Merged into PR #6** |
| 9 | Deployment | 0 | 0 | 0 | Deployment + optimization |
| **TOTAL** | | **11** | **10** | **21** | **+7 test files from v2.1** |

**Major Changes from v2.1:**
- **PR #3:** Added UI layout integration test
- **PR #4:** Added z-index service unit test, increased total
- **PR #6:** Added activeEdits service + conflict resolution integration test
- **PR #7:** Added selection service unit test
- **PR #9:** Removed (merged into PR #6)

---

## Git Workflow Guide

**For each PR:**

1. Create feature branch: `git checkout -b feat/branch-name`
2. Complete all implementation tasks
3. Write and run all tests (verify they pass)
4. Test manually as specified
5. Commit changes: `git add .` and `git commit -m "descriptive message"`
6. Push to GitHub: `git push origin feat/branch-name`
7. Create Pull Request on GitHub
8. Merge to main after review
9. Checkout main: `git checkout main`
10. Pull latest: `git pull origin main`
11. Start next PR

---

## Testing Commands Quick Reference

```bash
# Run all tests
npm test
# Note: 'npm test' is an alias for 'npm run test' in Create React App

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test auth.service.test.ts

# Run tests with coverage
npm test -- --coverage

# Run only unit tests
npm test -- --testPathPattern=services/__tests__

# Run only integration tests
npm test -- --testPathPattern=__tests__

# Clear test cache (if needed)
npm test -- --clearCache

# Start all Firebase emulators
firebase emulators:start
# Auth: localhost:9099
# Firestore: localhost:8080
# RTDB: localhost:9000

# Start specific emulator
firebase emulators:start --only firestore
firebase emulators:start --only database
firebase emulators:start --only auth
```

---

## Key Testing Principles

1. **Unit Tests** (🧪): Test individual functions/services in isolation with mocked dependencies
   - Focus: Logic, data structures, error handling
   - Speed: Fast (< 100ms per test)
   - Mock: Firebase calls, external dependencies

2. **Integration Tests** (🔗): Test complete user flows and component interactions
   - Focus: User behavior, data flow, end-to-end scenarios
   - Speed: Slower (may take seconds)
   - Mock: Minimal mocking, test real interactions where possible

3. **Stress Tests**: Test system under load and rapid operations
   - Focus: Performance, sync speed, concurrent operations
   - Scenarios: Rapid creation, simultaneous editing, large datasets

4. **Manual Tests**: Test on deployed app with real Firebase and multiple browsers
   - Focus: Performance, cross-browser compatibility, real network conditions
   - Timing: After each PR merge and before final submission

---

## Success Metrics for MVP Checkpoint

After completing all 10 PRs, verify these metrics:

### Core Functionality
- [ ] ✅ All 17 automated tests pass
- [ ] 2+ users can connect simultaneously and see each other's cursors
- [ ] User A creates a rectangle, User B sees it appear within 100ms
- [ ] User A moves a rectangle, User B sees it move in real-time
- [ ] User A resizes a rectangle, User B sees it resize in real-time
- [ ] **User can select a rectangle (visual outline appears)**
- [ ] **User A selects and deletes a rectangle, User B sees it disappear immediately**
- [ ] **Deletion syncs to all users in real-time**
- [ ] Page refresh doesn't lose any objects (Firestore persistence)
- [ ] **Refresh during active edit preserves state correctly**

### Collaboration
- [ ] All users see the same shared persistent canvas **"default-canvas"** on login
- [ ] When User A edits a rectangle, User B sees "User A is editing this shape"
- [ ] Multiplayer cursors show names and colors
- [ ] Cursors update smoothly at 16ms intervals (60 FPS)
- [ ] RTDB auto-cleanup works (cursors disappear when users disconnect)
- [ ] Presence updates instantly with onDisconnect hooks (users go offline automatically)

### Performance
- [ ] Application is deployed and accessible via public URL
- [ ] No console errors during normal operation
- [ ] Can support 5+ concurrent users without lag
- [ ] **10+ rectangles created rapidly sync without issues**
- [ ] **Performance monitoring shows consistent 60 FPS (FPS counter in dev mode)**
- [ ] Canvas maintains 60 FPS during all interactions
- [ ] **Support 500+ rectangles without FPS drops**

### Z-Ordering & Selection
- [ ] **Z-ordering works correctly (last created rectangle appears on top)**
- [ ] **Single selection works (only one rectangle selected at a time)**
- [ ] **Visual feedback shows selected state (blue outline)**
- [ ] **Resize handles only appear on selected rectangle**

### Testing Infrastructure
- [ ] Firebase emulators work for local testing (Auth, Firestore, RTDB)
- [ ] All unit tests pass independently
- [ ] All integration tests pass independently
- [ ] Stress tests complete without errors

---

## Notes on Test Coverage

**Why these PRs have tests:**
- **PR #2 (Auth)**: Critical path - must verify auth works before building anything else
- **PR #3 (Canvas)**: Core functionality - pan/zoom logic and **FPS monitoring** needs validation
- **PR #4 (Rectangles)**: Primary feature - shape creation, **selection**, movement, **deletion** must be reliable
- **PR #5 (Firestore)**: Data layer - persistence logic including **deletions** must be correct
- **PR #6 (Sync)**: Most complex feature - real-time sync including **delete operations** needs verification
- **PR #7 (Cursors)**: High-frequency updates - throttling and sync must work perfectly
- **PR #8 (Presence)**: Real-time state - online/offline tracking must be accurate

**Why these PRs don't have automated tests:**
- **PR #1 (Setup)**: Infrastructure only, no logic to test
- **PR #9 (Conflict UI)**: Visual feature built on already-tested services
- **PR #10 (Deployment)**: Production deployment and optimization, manual verification sufficient

**Test Philosophy:** Focus tests on logic-heavy services and critical user flows including new selection and delete features. Visual components and deployment steps are verified manually. This balances thorough testing with development velocity.

---

## New Features Summary (v3.0 vs v2.1 vs v2.0)

### V3.0 - Major Updates (Current Version):

1. **Optimistic Updates Architecture** (PR #6)
   - Users see their changes immediately (no waiting for Firestore)
   - Multiple users can edit same rectangle simultaneously
   - "Last write wins" conflict resolution
   - No edit locks - true real-time multiplayer
   - ActiveEdits service (RTDB) for conflict awareness
   - EditingIndicator component with cursor color borders

2. **Complete UI Layout Specification** (PR #3, #4)
   - 3-column layout: left toolbar, center canvas, right properties panel
   - Top header with online users list (far right)
   - Left toolbar: color picker dropdown + create button
   - Right properties panel: color picker, z-index input, read-only dimensions, delete button
   - Off-white canvas background

3. **Advanced Z-Index System** (PR #4, #5)
   - Automatic layering: most recently edited moves to front (highest z-index)
   - Manual override via properties panel
   - Push-down recalculation (no duplicate z-indices)
   - Persists to Firestore
   - Works with all edit operations (move, resize, recolor)

4. **Refined Rectangle Interactions** (PR #4)
   - Creation at viewport center (not canvas center)
   - 5 predefined colors: Blue (default), Green, Red, Orange, Black
   - Drag-to-move without selection required
   - Single resize handle (top-right) with "resize" tooltip
   - Size constraints: min 1x1px, max 4000x4000px (80% canvas)

5. **Cursor & User Display Changes** (PR #7, #8)
   - Cursor labels show color NAMES ("Blue", "Red"), NOT emails/usernames
   - Email = username, displayed in top header only
   - Randomly assigned unique cursor colors

6. **Ephemeral State Management** (PR #7)
   - Selection state in RTDB (ephemeral, doesn't persist)
   - Selection clears on disconnect
   - ActiveEdits clears on disconnect

7. **Pan & Zoom Enhancements** (PR #3)
   - Multiple zoom methods: wheel, pinch, Shift+/-
   - Zoom limits: 10% min, 800% max
   - Viewport independence (users can view different sections)

8. **Enhanced Testing** (All PRs)
   - Increased from 17 to 21 test files
   - Added activeEdits, selection, z-index services tests
   - Added conflict resolution integration tests
   - Added UI layout integration tests

### V2.1 - Previous Updates:
1. Single Selection with visual feedback
2. Delete Operation (key + button)
3. Z-Ordering clarification
4. Performance Monitoring (FPS counter)
5. Enhanced testing scenarios
6. Canvas ID specification

### Test Count Evolution:
- **v2.0**: 14 test files (7 unit, 7 integration)
- **v2.1**: 17 test files (9 unit, 8 integration) - +3 files
- **v3.0**: 21 test files (11 unit, 10 integration) - +4 files

### PR Count Evolution:
- **v2.0**: 10 PRs
- **v2.1**: 10 PRs
- **v3.0**: 9 PRs (PR #9 merged into PR #6)

---

**Total PRs:** 9 (reduced from 10, PR #9 merged into PR #6)  
**Total Test Files:** 21 (11 unit, 10 integration)  
**Estimated MVP Completion:** After PR #9  
**Ready for AI Agent Development:** After successful MVP deployment with all tests passing  

**Document Version:** 3.0  
**Last Updated:** October 13, 2025  
**Changes from v2.1:**
- **Major Architecture Change:** Conflict resolution changed from lock-based to optimistic updates with "last write wins" (PR #6)
- **UI Layout:** Added complete 3-column layout specifications (left toolbar, center canvas, right properties panel)
- **Rectangle Creation:** Changed to viewport center (not canvas center 2500,2500)
- **Colors:** Defined 5 specific predefined colors (Blue, Green, Red, Orange, Black)
- **Selection:** Selection NOT required for moving rectangles
- **Resize Handle:** Changed from 4 corners to single top-right handle with tooltip
- **Z-Index System:** Added automatic layering (most recent to front) + manual override with push-down recalculation
- **Pan/Zoom:** Specified all methods (drag/wheel/pinch/Shift+/-) and limits (10%-800%)
- **Cursor Display:** Changed to color labels ("Blue", "Red") instead of usernames/emails
- **Username:** Email = username, displayed in top header only
- **Properties Panel:** Added right panel with color picker, z-index input, read-only dimensions, delete button
- **Ephemeral Selection:** Selection state now in RTDB (ephemeral), not Firestore
- **ActiveEdits Service:** Added RTDB service for conflict awareness
- **Test Count:** Increased from 17 to 21 test files
- **PR Count:** Reduced from 10 to 9 (old PR #9 merged into PR #6)

**Previous Changes from v2.0:** 
