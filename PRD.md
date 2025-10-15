# CollabCanvas MVP - Product Requirements Document

## Project Overview

CollabCanvas is a real-time collaborative design tool that allows multiple users to work simultaneously on a shared canvas. The MVP focuses on establishing solid multiplayer infrastructure with basic shape manipulation capabilities.

**Success Criteria:** Bulletproof multiplayer synchronization with basic canvas functionality

---

## User Stories

### Primary User: Designer/Creator (MVP Priority)
- As a designer, I want to **create an account and log in** so that my work is associated with my identity
- As a designer, I want to **see a large canvas workspace** so that I have space to design
- As a designer, I want to **pan and zoom the canvas** so that I can navigate my workspace
- As a designer, I want to **create rectangles** so that I can build simple designs
- As a designer, I want to **select a rectangle** so that I can interact with it
- As a designer, I want to **move rectangles around the canvas** so that I can arrange my design
- As a designer, I want to **resize rectangles** so that I can adjust their dimensions
- As a designer, I want to **delete rectangles** so that I can remove unwanted elements
- As a designer, I want to **see other users' cursors with their names** so that I know who else is working
- As a designer, I want to **see changes made by others in real-time** so that we can work together seamlessly
- As a designer, I want to **see who is currently online** so that I know who I'm collaborating with
- As a designer, I want to **refresh the page and see my work persisted** so that I don't lose progress

### Secondary User: Collaborator (Post-MVP Priority)
- As a collaborator, I want to **join an existing canvas session** so that I can contribute to the design
- As a collaborator, I want to **see all existing objects when I join** so that I have context
- As a collaborator, I want to **make edits without conflicts** so that collaboration feels natural

**Note:** Focus on Primary User stories first. Collaborator functionality will be addressed after core designer features are complete.

---

## MVP Key Features

### 1. Canvas Core
- **Canvas size:** 5000x5000px workspace
- **Canvas background:** Off-white (#FAFAFA or similar)
- **Pan and zoom functionality** - smooth viewport navigation
  - **Pan:** Click-and-drag empty canvas space to navigate
  - **Zoom:** Mouse wheel, pinch gesture, or Shift+/- keyboard shortcuts
  - **Zoom limits:** Minimum 10%, Maximum 800%
- **Rectangle creation** - single shape type for MVP
  - **Creation method:** Click "Create Rectangle" button in left toolbar to create at default size
  - **Default size:** 100x100px
  - **Position:** Created at center of current viewport (not canvas center)
  - **Size constraints:** Minimum 1x1px, Maximum 80% of canvas dimensions (4000x4000px)
- **Z-ordering** - automatic layering based on last edited timestamp
  - **Default behavior:** Most recently edited rectangle automatically moves to front (z-index 1)
  - **Manual override:** Users can manually set z-index in properties panel
  - **Auto-recalculation:** When z-index changes, other rectangles push down to prevent duplicates

### 2. Object Management (MVP Scope)
- **Single selection** - click on a rectangle to select it
- **Visual feedback** - show selection state with solid dark blue outline (small-to-medium thickness)
- **Move rectangles** - click-and-drag any rectangle to reposition (selection NOT required)
  - Click-and-drag directly on unselected rectangle → moves it immediately
  - First click selects, subsequent drag also moves
- **Resize rectangles** - drag resize handle on selected rectangle to resize (free resize, no aspect ratio lock)
  - **Resize handle:** Single handle in top-right corner of selected rectangle
  - **Visual:** Dual-arrow icon, shows "resize" tooltip on hover
- **Rectangle colors** - 5 predefined colors available
  - **Color palette:** Blue (default), Green, Red, Orange, Black (standard web colors)
  - **Color selection:** Choose from dropdown in left toolbar before creation, or change via properties panel after creation
  - **Recoloring:** Changing a selected rectangle's color counts as "editing" state
- **Delete operation** - remove selected rectangle
  - **Keyboard:** Delete/Backspace key
  - **UI:** Delete button in right properties panel (only visible when rectangle selected)
- **Selection state sync** - ephemeral state stored in RTDB, not persisted in Firestore
  - Selection state does NOT survive page refreshes
  - When user disconnects, selection state automatically clears

### 3. Real-Time Collaboration
- **Multiplayer cursors** - show cursor position with color indicator for all connected users (16ms update interval at 60 FPS)
  - **Cursor appearance:** Colored cursor with text label showing color name (e.g., "Blue", "Red")
  - **Cursor colors:** Randomly assigned per user from a diverse palette (unique unless very large number of users)
  - **Username display:** Shown in top header online users list, NOT on cursor labels
- **Real-time object sync** - when any user creates/moves/resizes/deletes/recolors a rectangle, all users see it immediately (<100ms latency via Firestore)
- **Presence awareness** - display list of currently online users (email addresses) in top header via RTDB
- **State persistence** - canvas state (rectangles, z-indices) survives page refreshes and all users disconnecting
  - **Ephemeral data:** Selection state and cursor positions do NOT persist (RTDB only)
- **Conflict resolution - OPTIMISTIC UPDATES with Last Write Wins**
  - **Key principle:** Multiple users CAN edit the same rectangle simultaneously (no locks)
  - **Optimistic updates:** Each user sees their changes immediately locally
  - **Live position streaming (PR #7):** Other users see shapes moving/resizing smoothly in real-time (60 FPS)
    - **During drag:** Intermediate positions streamed via RTDB (throttled to 16ms)
    - **During resize:** Live width/height updates visible to all users
    - **Smooth rendering:** 60 FPS updates for fluid multiplayer experience
    - **Ephemeral:** Live positions auto-clear on mouse release (not persisted)
  - **Visual feedback:** When User A is editing a rectangle, other users see "John is editing" indicator (using first name)
    - **Indicator appearance:** Border color matches User A's cursor color, light gray background (#D3D3D3)
    - **When shown:** Only during active dragging, resizing, or recoloring (not just selection)
    - **Indicator position:** Above the rectangle being edited, auto-scales with zoom
  - **Simultaneous editing allowed:** User B can ALSO edit the same rectangle despite seeing User A's indicator
  - **Last write wins:** When multiple users edit the same rectangle, whoever releases their mouse last "wins"
  - **Conflict sync:** The "loser" sees their rectangle snap to the winner's final position/size/color
  - **Philosophy:** True real-time multiplayer collaboration with awareness, not blocking
- **Shared persistent canvas** - all users see the same canvas on login (single global canvas ID: "default-canvas")
- **Auto-cleanup** - RTDB automatically removes cursors, selection state, and sets users offline on disconnect

### 4. Authentication
- **Firebase email/password authentication**
- **User Profile** - users provide first name, last name, and email at signup
  - **Required fields:** Email, password (6+ chars), first name, last name
  - **Display names:** First names shown in collaboration indicators (e.g., "John is moving")
  - **Header display:** Full name shown in header (e.g., "John Doe"), falls back to email if not set
  - **Backward compatibility:** Existing users without names show email username part (before @)
  - **Uniqueness:** Email addresses are inherently unique (enforced by Firebase Auth)
  - **Display location:** Top header online users list
- **Session management** - users stay logged in across refreshes
- **Automatic canvas join** - users automatically join the single shared canvas "default-canvas" upon login

### 5. Performance & Monitoring
- **60 FPS rendering** - maintain smooth interactions using requestAnimationFrame
- **FPS counter** - display in dev mode for performance monitoring (local testing only, disabled in production deployment)
- **Load capacity** - support 500+ rectangles without FPS drops
- **Concurrent users** - support 5+ simultaneous users without lag
- **Performance testing** - stress test with rapid creation/movement before deployment

### 6. UI Layout & Structure

**Overall Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ TOP HEADER                           [Online Users List (emails)]│
├────────┬────────────────────────────────────────────────────────┤
│        │                                                   │     │
│  LEFT  │                                                   │RIGHT│
│ TOOL-  │             CANVAS AREA                           │PROP │
│  BAR   │         (Off-white background)                    │PANEL│
│        │          5000x5000px workspace                    │     │
│        │                                                   │     │
└────────┴───────────────────────────────────────────────────┴─────┘
```

**Top Header:**
- **Purpose:** Navigation and user awareness
- **Content:** Online users list on far right showing email addresses of connected users
- **Style:** Minimal, unobtrusive

**Left Toolbar:**
- **Position:** Left side of screen, always visible
- **Content:**
  1. **Color Picker Dropdown** - shows currently selected color (default: Blue), allows selection from 5 colors
  2. **Create Rectangle Button** - creates 100x100px rectangle at viewport center
- **Purpose:** Creation tools and color selection before/after rectangle creation

**Right Properties Panel:**
- **Position:** Right side of screen
- **Visibility:** Hidden when nothing selected, appears when rectangle selected
- **Content (when rectangle selected):**
  1. **Color Picker** - change selected rectangle's color (editable)
  2. **Z-Index Input** - manually override layer order, positive integer (editable)
  3. **Width Display** - read-only number field showing current width
  4. **Height Display** - read-only number field showing current height
  5. **X Position Display** - read-only number field showing X coordinate
  6. **Y Position Display** - read-only number field showing Y coordinate
  7. **Delete Button** - remove selected rectangle
- **Note:** Width/height/position are display-only; users must resize/move on canvas directly

**Canvas Area:**
- **Position:** Center, between left toolbar and right properties panel
- **Background:** Off-white color
- **Interaction:** Click-and-drag empty space to pan, scroll/pinch/Shift+- to zoom
- **Viewport:** Independent per user (users can view different sections of the same canvas simultaneously)

### 7. Deployment
- **Publicly accessible URL** - hosted on Firebase Hosting
- **Works across multiple browsers/devices** - testable by opening multiple browser windows
- **Multi-viewport support** - users can pan/zoom to different areas of the canvas independently

---

## Confirmed Tech Stack: Firebase Hybrid Architecture

**Frontend:**
- React + TypeScript
- Konva.js (for canvas rendering and object management)
- Tailwind CSS for UI components
- React Context API for state management

**Backend:**
- **Firebase Firestore** (persistent data - rectangles/shapes)
- **Firebase Realtime Database (RTDB)** (ephemeral data - cursors & presence)
- Firebase Authentication (email/password)
- Firebase Hosting

**Why Hybrid Firebase:**
- **Firestore for Shapes**: Persistent storage, complex queries, structured data, survives refreshes
- **RTDB for Cursors**: High-frequency updates (60 FPS), no rate limits, 20-50ms latency, auto-cleanup on disconnect
- **RTDB for Presence**: Real-time status, automatic onDisconnect hooks, instant join/leave detection
- **Cost & Performance**: 97% cheaper for high-frequency updates, 3x lower latency

**Key Implementation Notes:**
- Firestore: Shapes persist with metadata (createdBy, lastModifiedBy, timestamps)
- RTDB: Cursors update at 60 FPS with 16ms throttle, auto-delete on disconnect
- RTDB: Presence with onDisconnect hooks for automatic cleanup
- Context API: Centralized state management for auth and canvas state
- Konva: Use requestAnimationFrame for smooth 60 FPS rendering

**Data Architecture:**
```
Firestore (Persistent Data):
/canvases/default-canvas/
  - metadata: { createdAt, lastModified }
  - shapes/{shapeId}: { 
      type: 'rectangle',
      x, y, 
      width, height, 
      color: 'blue' | 'green' | 'red' | 'orange' | 'black',
      zIndex: number (1 = front, higher = back),
      createdBy: email,
      createdAt: timestamp,
      lastModifiedBy: email,
      lastModified: timestamp
    }

Realtime Database (Ephemeral Data):
/cursors/default-canvas/{userId}: {
    x, y,
    colorName: 'Blue' | 'Green' | 'Red' | etc., // Display label
    cursorColor: '#RRGGBB', // Actual cursor color (randomly assigned)
    lastUpdate: timestamp
  }
/presence/default-canvas/{userId}: {
    online: true,
    email: string, // Username = email
    joinedAt: timestamp,
    lastSeen: timestamp
  }
/activeEdits/default-canvas/{shapeId}: {
    userId: string,
    email: string,
    firstName: string, // Cached from Firestore user doc, synced in real-time
    action: 'moving' | 'resizing' | 'recoloring',
    cursorColor: '#RRGGBB', // For edit indicator border
    startedAt: timestamp
  }
/selections/default-canvas/{userId}: {
    selectedShapeId: string | null,
    selectedAt: timestamp
  }
```

**Key Design Decisions:**
- **Firestore:** Persistent shape data with z-index for manual layer control
- **Firestore user profiles:** User firstName/lastName stored once, fetched at login via `authService.fetchUserData()`
- **RTDB cursors:** High-frequency updates with color labels for display
- **RTDB activeEdits:** Ephemeral editing state with firstName cached from auth state (no Firestore lookup needed)
- **RTDB selections:** Ephemeral selection state (does NOT persist across refreshes)
- **Z-Index System:** Automatic (based on lastModified) with manual override capability
- **Auth flow:** Async Firestore user fetch at login (once) → firstName cached in AuthContext → real-time RTDB writes include cached firstName

---

## NOT Included in MVP

These features are explicitly **OUT OF SCOPE** for the MVP:

- Multiple shape types (only rectangles for MVP)
- Circles, text, or other shapes
- Rotation
- **Multiple selection** (drag-select, shift-click) - SINGLE selection only
- **Layers panel UI** (but z-ordering works automatically + manual override in properties)
- **Duplicate operation** (but delete IS included)
- Custom color picker (only 5 predefined colors: Blue, Green, Red, Orange, Black)
- Undo/redo
- Copy/paste
- Keyboard shortcuts (except Delete key and Shift+/- for zoom)
- Edit locking (using optimistic updates with conflict awareness instead)
- AI agent integration (this comes AFTER MVP)
- Multiple canvases/projects (single global canvas "default-canvas" only)
- Permissions/roles
- Comments or chat
- Export functionality
- Mobile optimization (desktop browsers only for MVP)
- Context menus or right-click actions

**MVP Philosophy:** A simple canvas where you can create rectangles, select them, move them, resize them, recolor them, delete them, and see them sync perfectly across multiple users with TRUE real-time collaboration (no edit locks) is infinitely better than a feature-rich canvas with broken or blocking multiplayer. The technical challenge is building bulletproof optimistic updates with "last write wins" conflict resolution.

---

## Development Priorities

Build features in this order:

1. **Project Setup** - Initialize React + TypeScript with Firebase hybrid architecture (Firestore + RTDB), emulators, Context API structure
2. **Authentication flow** - Firebase email/password authentication with AuthContext (username = email)
3. **UI Layout** - Build 3-column layout (left toolbar, center canvas, right properties panel) + top header
4. **Basic canvas with pan/zoom** - 5000x5000px workspace with CanvasContext, off-white background
   - Pan: Click-and-drag empty space
   - Zoom: Mouse wheel, pinch, Shift+/- (10% min, 800% max)
5. **Rectangle creation** - Click button in left toolbar to create 100x100px rectangle at viewport center
   - 5 predefined colors (Blue, Green, Red, Orange, Black)
   - Color picker dropdown in left toolbar (default: Blue)
6. **Selection & visual feedback** - Click rectangle to select, show dark blue outline, populate right properties panel
   - Properties: Color picker, Z-Index input, Width/Height/X/Y (read-only), Delete button
7. **Move & resize** - Drag any rectangle to move (selection not required), drag top-right handle to resize
   - Resize handle shows "resize" tooltip on hover
8. **Delete operation** - Remove selected rectangle (Delete key or button in properties panel)
9. **Z-Index system** - Automatic layering (most recently edited to front) + manual override in properties panel
   - Push-down recalculation when user changes z-index
10. **Firestore integration** - Persistent shape storage with real-time sync (including deletions, z-index)
11. **RTDB selection & editing state** - Ephemeral selection and activeEdits tracking (auto-cleanup on disconnect)
12. **Cursor synchronization** - Show multiplayer cursors with color labels using RTDB (16ms throttle, 60 FPS)
13. **Presence awareness** - Display online users (emails) in top header using RTDB with onDisconnect hooks
14. **Optimistic updates & conflict resolution UI** - Local immediate feedback + "User X is editing" indicators (border matches cursor color)
15. **Last write wins sync** - Implement conflict resolution where final mouse release determines winner
16. **Performance monitoring** - Add FPS counter (dev mode only), optimize rendering, stress test
17. **Deploy** - Firebase Hosting for public access with multi-viewport support

---

## Testing Strategy

### Unit Tests (9 files)
- Auth service (email/password validation, user creation, email as username)
- Canvas service (Firestore operations, metadata)
- Cursor service (RTDB updates, throttling, color assignment, onDisconnect)
- Presence service (RTDB presence, heartbeat, auto-cleanup)
- Selection service (RTDB ephemeral state, no persistence)
- Active edits service (RTDB editing state tracking, conflict awareness)
- Z-Index service (automatic recalculation, push-down logic, manual override)
- Throttle utility (16ms interval validation)
- Helper functions (color generation, cursor color assignment)

### Integration Tests (9 files)
- Authentication flow (signup, login, session persistence, email as username)
- UI layout (3-column structure, responsive panels, properties visibility)
- Canvas interactions (pan empty space, zoom with multiple methods, viewport independence)
- Rectangle operations (create at viewport center, select without moving, drag to move, resize handle, recolor)
- Z-Index operations (automatic front-on-edit, manual override, push-down recalculation)
- Persistence (Firestore save/load, page refresh, ephemeral state cleanup)
- Real-time sync (multi-user creates, moves, resizes, recolors, deletes with optimistic updates)
- Cursor synchronization (60 FPS, color labels, auto-cleanup)
- Presence system (join, leave, onDisconnect hooks, email display in header)
- Optimistic updates & conflict resolution (simultaneous edits, last write wins, visual indicators)

### Stress Testing Scenarios
1. **Simultaneous editing test**: 2 users dragging same rectangle, verify last write wins + visual conflict indicator
2. **Optimistic update test**: User A moves rectangle, sees immediate local feedback, User B sees update within 100ms
3. **Conflict resolution visual test**: User A drags rectangle, User B sees "User A is editing" with border matching A's cursor color
4. **Z-Index stress test**: Rapidly change z-indices, verify no duplicates and correct push-down recalculation
5. **Refresh during edit test**: User refreshes while actively dragging, verify selection state clears (ephemeral)
6. **Rapid creation test**: Create 10+ rectangles quickly at viewport center, verify sync happens within 100ms
7. **Performance test**: Load 500+ rectangles, verify 60 FPS maintained with z-ordering
8. **Concurrent users test**: 5 users creating/moving/resizing/recoloring/deleting simultaneously, verify no lag
9. **Delete sync test**: User A deletes rectangle, User B sees it disappear immediately
10. **Multi-viewport test**: 2 users pan to different canvas areas, verify independent viewports

### Manual Testing Checklist
- Open 2-3 browser windows simultaneously with different email accounts
- Test all features in multiple browsers (Chrome, Firefox, Safari)
- Monitor FPS counter during all interactions (dev mode only)
- Test network throttling scenarios
- Verify RTDB auto-cleanup on disconnect (selections, cursors, activeEdits)
- Test rapid mouse movements for cursor smoothness and color labels
- Verify UI layout (left toolbar, right properties panel, top header)
- Test properties panel visibility (hidden when nothing selected)
- Test color picker in both toolbar and properties panel
- Test z-index manual override and auto-recalculation
- Test viewport independence (users viewing different canvas areas)
- Test resize handle tooltip on hover
- Test optimistic updates (immediate local feedback)
- Test conflict indicators (border color matches editing user's cursor)
- Test "last write wins" by having 2 users drag same rectangle simultaneously

---

## Success Metrics for MVP Checkpoint

### Core Functionality
- [ ] All automated tests pass (9 unit tests + 9 integration tests)
- [ ] UI layout renders correctly (left toolbar, center canvas, right properties panel, top header)
- [ ] Authentication works with email/password (username = email)
- [ ] Canvas background is off-white, 5000x5000px workspace

### Rectangle Operations
- [ ] Create rectangle button in left toolbar creates 100x100px rectangle at viewport center
- [ ] 5 predefined colors (Blue, Green, Red, Orange, Black) work in left toolbar dropdown
- [ ] User can select a rectangle (solid dark blue outline appears)
- [ ] Click-and-drag any rectangle to move (selection NOT required)
- [ ] Resize handle appears in top-right corner with "resize" tooltip on hover
- [ ] User can resize rectangle by dragging handle (min 1x1px, max 80% canvas)
- [ ] User can recolor rectangle via properties panel
- [ ] User can delete rectangle via Delete key or button in properties panel
- [ ] Properties panel shows/hides correctly (visible only when rectangle selected)
- [ ] Properties panel displays: color picker, z-index input, read-only width/height/x/y, delete button

### Pan & Zoom
- [ ] Click-and-drag empty canvas space to pan
- [ ] Mouse wheel zooms in/out
- [ ] Shift+/- keyboard shortcuts zoom in/out
- [ ] Zoom limits enforced (min 10%, max 800%)
- [ ] Multiple users can view different sections of canvas independently

### Z-Index System
- [ ] Most recently edited rectangle automatically moves to front (z-index 1)
- [ ] User can manually set z-index in properties panel (positive integers only)
- [ ] Changing z-index triggers push-down recalculation (no duplicates)
- [ ] Z-ordering renders correctly with 500+ rectangles

### Real-Time Collaboration
- [ ] 2+ users can connect simultaneously and see each other's colored cursors
- [ ] Cursor labels show color names ("Blue", "Red", etc.)
- [ ] Top header shows online users list with email addresses
- [ ] User A creates a rectangle, User B sees it appear within 100ms (optimistic update)
- [ ] User A moves a rectangle, User B sees it move in real-time
- [ ] User A resizes a rectangle, User B sees it resize in real-time
- [ ] User A recolors a rectangle, User B sees color change in real-time
- [ ] User A deletes a rectangle, User B sees it disappear immediately

### Optimistic Updates & Conflict Resolution
- [ ] Each user sees their own changes immediately (local optimistic updates)
- [ ] When User A actively drags/resizes/recolors a rectangle, User B sees "User A is editing this shape" indicator
- [ ] Conflict indicator border color matches User A's cursor color, light gray background
- [ ] User B can ALSO edit the same rectangle simultaneously (no locks)
- [ ] When 2 users edit same rectangle, last mouse release wins
- [ ] "Loser" sees rectangle snap to "winner's" final state

### Persistence & State Management
- [ ] Page refresh preserves all rectangles (Firestore persistence)
- [ ] Page refresh CLEARS selection state (ephemeral RTDB data)
- [ ] All users see the same shared persistent canvas "default-canvas" on login
- [ ] RTDB auto-cleanup works (cursors, selections, activeEdits disappear when users disconnect)
- [ ] Presence updates instantly with onDisconnect hooks (users go offline automatically)

### Performance
- [ ] Canvas maintains consistent 60 FPS during all interactions
- [ ] FPS counter displays in dev mode (disabled in production)
- [ ] Can support 500+ rectangles without FPS drops
- [ ] Can support 5+ concurrent users without lag
- [ ] 10+ rectangles created rapidly sync without issues
- [ ] Cursors update smoothly at 16ms intervals (60 FPS)

### Deployment & Testing
- [ ] Application is deployed and accessible via public URL (Firebase Hosting)
- [ ] Works across multiple browsers (Chrome, Firefox, Safari)
- [ ] Firebase emulators work for local testing (Auth, Firestore, RTDB)
- [ ] No console errors during normal operation
- [ ] Multi-viewport test passes (users can pan to different areas independently)

---

## Technical Specifications Summary

| Feature | Specification |
|---------|--------------|
| Canvas Size | 5000x5000px |
| Canvas Background | Off-white (#FAFAFA or similar) |
| Canvas ID | "default-canvas" (single global canvas) |
| Shape Type | Rectangles only |
| Rectangle Default Size | 100x100px (min 1x1px, max 80% canvas = 4000x4000px) |
| Rectangle Creation | Click button in left toolbar, created at viewport center |
| Rectangle Colors | 5 predefined: Blue (default), Green, Red, Orange, Black |
| Authentication | Firebase email/password (username = email) |
| Canvas Routing | Single shared canvas (auto-join "default-canvas") |
| UI Layout | 3-column: Left toolbar, Center canvas, Right properties panel + Top header |
| Selection Method | Single-click on rectangle (selection NOT required for moving) |
| Selection Visual | Solid dark blue outline (small-to-medium thickness) |
| Selection State | Ephemeral (RTDB), does NOT persist across refreshes |
| Move Method | Click-and-drag any rectangle (selected or not) |
| Resize Method | Drag top-right corner handle (tooltip on hover, free resize) |
| Delete Method | Delete key or properties panel button (syncs to all users) |
| Z-Order Strategy | Automatic (most recently edited = front) + manual override |
| Z-Index Range | Positive integers, 1 = front, higher = back, push-down recalculation |
| Pan Method | Click-and-drag empty canvas space |
| Zoom Methods | Mouse wheel, pinch gesture, Shift+/- keyboard shortcuts |
| Zoom Limits | Minimum 10%, Maximum 800% |
| Viewport Independence | Each user can view different canvas sections simultaneously |
| Conflict Resolution | Optimistic updates + Last write wins (no edit locks) |
| Conflict UI Feedback | "User X is editing" indicator (border = cursor color, light gray bg) |
| Simultaneous Editing | Allowed (multiple users can edit same rectangle) |
| Cursor Appearance | Colored cursor + text label showing color name |
| Cursor Colors | Randomly assigned per user (unique unless many users) |
| Cursor Update Frequency | 16ms intervals (60 FPS) |
| Initial State | Shared persistent canvas visible to all users |
| Sync Latency Target | <100ms for shapes (Firestore), <50ms for cursors (RTDB) |
| Database Strategy | Hybrid: Firestore (shapes), RTDB (cursors, presence, selections, activeEdits) |
| State Management | React Context API for auth and canvas state |
| Rendering Strategy | requestAnimationFrame for 60 FPS |
| Performance Monitoring | FPS counter in dev mode (disabled in production) |
| Load Capacity | 500+ rectangles without FPS drops |
| Concurrent Users | 5+ users without performance degradation |

---

**Document Version:** 3.0  
**Last Updated:** October 13, 2025  
**Status:** Approved - Ready for Implementation (Fully Specified with UI Layout & Optimistic Updates)  

**Changes from v2.1:**
- **Major Architecture Change:** Conflict resolution changed from lock-based to optimistic updates with "last write wins"
- **UI Layout:** Added complete 3-column layout specification (left toolbar, center canvas, right properties panel, top header)
- **Rectangle Creation:** Specified click-to-create at 100x100px at viewport center
- **Color System:** Defined 5 predefined colors (Blue, Green, Red, Orange, Black) with dual color picker locations
- **Selection Model:** Clarified selection NOT required for moving, ephemeral state in RTDB
- **Z-Index System:** Detailed automatic layering (most recent to front) + manual override with push-down recalculation
- **Pan & Zoom:** Specified all methods (drag/wheel/pinch/Shift+/-) and limits (10%-800%)
- **Resize Handle:** Single top-right corner handle with hover tooltip
- **Cursor Display:** Color-coded cursors with text labels (color names, not usernames)
- **Username Handling:** Email = username, displayed in top header only
- **Properties Panel:** Detailed contents (color picker, z-index, read-only dimensions, delete button)
- **Viewport Independence:** Clarified users can view different canvas sections simultaneously
- **Conflict UI:** Specified "User X is editing" indicator appearance (border = cursor color, light gray bg)
- **Data Schema:** Updated with activeEdits and selections in RTDB, removed selection from Firestore
- **Testing:** Expanded to 9 unit + 9 integration tests with 10 stress testing scenarios
- **Success Metrics:** Reorganized into 8 categories with 47 specific checkpoints
- **Dev Mode:** Clarified FPS counter for local testing only (disabled in production)