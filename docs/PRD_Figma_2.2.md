# CollabCanvas Enhanced Features - Product Requirements Document v2.2
## Comprehensive Feature Set for Rubric Excellence

---

## Executive Summary

**Goal**: Extend the existing CollabCanvas MVP to achieve **90+ points** on the rubric by systematically addressing all "Excellent" tier criteria.

**Current State**: Solid MVP with rectangles, real-time sync, presence awareness, cursor tracking, and Google Sign-In authentication.

**Target Score Breakdown**:
- Section 1 (Collaborative Infrastructure): **30/30** points ✅ (Already strong)
- Section 2 (Canvas Features & Performance): **20/20** points (Target: 8/8 + 12/12)
- Section 3 (Advanced Features): **15/15** points (Target: 6 + 6 + 3)
- Section 4 (AI Agent): **Deferred** (Future scope)
- Section 5 (Technical Implementation): **10/10** points ✅ (Already solid)
- Section 6 (Documentation): **5/5** points (Needs README update)
- **Total Target**: **80/80** points (without AI) = **Excellent Grade**

---

## Part A: Current State Analysis

### What's Working Excellently ✅
1. **Real-Time Sync**: Sub-100ms object sync, sub-50ms cursor sync
2. **Conflict Resolution**: Last-write-wins with optimistic updates
3. **Persistence**: Full state recovery via Firestore
4. **Presence System**: Real-time user tracking with RTDB
5. **Authentication**: Email/password + Google Sign-In
6. **Z-Index Management**: Automatic layering with manual override
7. **Live Position Streaming**: Real-time drag/resize sync
8. **Edit Indicators**: Visual feedback for active edits
9. **Cursor Labels**: User names with collision detection
10. **Performance**: Optimized subscriptions, throttled updates

### Feature Gaps for Rubric Excellence
Based on rubric Section 2 & 3 criteria:

**Section 2 Requirements (Canvas Features - 8 points)**:
- ❌ Only 1 shape type (need 3+)
- ❌ No text with formatting
- ❌ No multi-select
- ❌ No rotation
- ❌ Limited layer management (no visual panel)

**Section 3 Requirements (Advanced Features - 15 points)**:
- ❌ Basic color picker (need enhanced with opacity)
- ❌ No undo/redo
- ❌ Limited keyboard shortcuts (only Delete)
- ❌ No copy/paste
- ❌ No drag-to-reorder layers
- ❌ No visual layers panel
- ❌ No collaborative comments

---

## Part B: Feature Requirements by Priority

### Priority 1: Core Shape Types (Section 2 - Required for 8/8 points)

#### 1.1 Circle Shape
**Data Structure**:
```typescript
{
  type: 'circle',
  x: number,
  y: number,
  radius: number,
  color: string,
  opacity: number,
  rotation: number,
  zIndex: number,
  createdBy: string,
  createdAt: Timestamp,
  lastModifiedBy: string,
  lastModified: Timestamp
}
```

**Behavior**:
- Creation: "Create Circle" button → 100px radius at viewport center
- Resize: Drag corner handle, maintains circular aspect ratio
- Rotation: Rotate handle (20px above shape)
- Selection: Same as rectangle (click to select)
- Properties panel: Shows radius, color, opacity, rotation

#### 1.2 Triangle Shape
**Data Structure**:
```typescript
{
  type: 'triangle',
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  opacity: number,
  rotation: number,
  zIndex: number,
  // ...metadata
}
```

**Behavior**:
- Creation: "Create Triangle" button → equilateral 100x100px
- Resize: Free resize or Shift for aspect ratio lock
- Rotation: Same as circle
- Rendering: Equilateral triangle pointing up by default

#### 1.3 Line Shape
**Data Structure**:
```typescript
{
  type: 'line',
  x: number,  // Start point
  y: number,  // Start point
  x2: number, // End point
  y2: number, // End point
  color: string,
  strokeWidth: number, // 1-10px
  opacity: number,
  zIndex: number,
  // ...metadata
}
```

**Behavior**:
- Creation: "Create Line" → click-drag to set endpoints
- Edit: Drag endpoints or middle to move
- Resize: N/A (adjust endpoints instead)
- Properties panel: Stroke width slider (1-10px)

#### 1.4 Text Layers
**Data Structure**:
```typescript
{
  type: 'text',
  x: number,
  y: number,
  text: string,
  fontSize: number, // 12-72px
  fontFamily: string, // 'sans-serif' | 'serif' | 'monospace'
  fontWeight: string, // 'normal' | 'bold'
  fontStyle: string, // 'normal' | 'italic'
  color: string,
  opacity: number,
  rotation: number,
  zIndex: number,
  // ...metadata
}
```

**Behavior**:
- Creation: "Create Text" → click canvas → inline editing
- Edit: Double-click to edit text inline
- Properties panel: Font size, family, bold, italic toggles
- Rendering: HTML5 Canvas text rendering

---

### Priority 2: Universal Transform System

#### 2.1 Rotation for All Shapes
**Visual UI**:
- Rotation handle: Small circle 20px above selected shape
- Cursor changes to rotation icon on hover
- Live angle display during rotation (e.g., "45°")

**Interaction**:
- Mouse drag: Circular motion around shape center
- Keyboard: Alt+Arrow keys for 15° increments
- Shift modifier: Snap to 15° increments
- Properties panel: Direct degree input (0-359)

**Data Updates**:
- Add `rotation: number` to all existing rectangles
- Real-time sync: Use existing `livePositions` service
- Conflict resolution: Last-write-wins (same as position)

**Implementation Notes**:
- Konva.js natively supports rotation
- Update `Rectangle.tsx` to apply `rotation` prop
- Add rotation handle to all shape components
- Stream rotation updates during drag via RTDB

---

### Priority 3: Multi-Selection System

#### 3.1 Selection Methods
1. **Shift-Click**: Add/remove shapes from selection
2. **Drag-Select**: Draw rectangle to select multiple
3. **Ctrl/Cmd+A**: Select all shapes
4. **Escape**: Deselect all

#### 3.2 Multi-Selection Behavior
**Visual Feedback**:
- Selected shapes: Blue outline (2px solid)
- Selection box: Dashed blue rectangle during drag-select
- Properties panel: Show "Multiple shapes selected (N)"

**Operations on Multi-Selection**:
- Move: All shapes move together, maintaining relative positions
- Delete: Delete all selected shapes
- Color change: Apply to all selected shapes
- Duplicate: Duplicate all with +20px offset
- Copy/Paste: Maintain relative positions

**State Management**:
- Client-side only (no RTDB sync for selection)
- Each user has independent selection state
- Clear selection when clicking empty canvas

---

### Priority 4: Undo/Redo System (Section 3 Tier 1 - 2 points)

#### 4.1 Implementation Strategy
**Architecture**:
```typescript
interface UndoAction {
  type: 'create' | 'delete' | 'modify' | 'move' | 'reorder';
  timestamp: number;
  userId: string;
  before: Shape | Shape[] | null;
  after: Shape | Shape[] | null;
}

interface UndoStack {
  undoStack: UndoAction[]; // Max 50
  redoStack: UndoAction[];
}
```

**Scope**:
- User's own actions only (not other users' changes)
- Session-only (not persisted to Firestore)
- Stack limit: 50 operations

**Undoable Operations**:
1. Create shape
2. Delete shape(s)
3. Move shape(s)
4. Resize shape
5. Rotate shape
6. Change color
7. Change z-index
8. Edit text content
9. Change text formatting

**Keyboard Shortcuts**:
- Cmd/Ctrl+Z: Undo
- Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y: Redo

**Conflict Handling**:
- If shape was deleted by another user → skip undo, show toast
- If shape was modified by another user → show warning, allow user to choose

---

### Priority 5: Enhanced Keyboard Shortcuts (Section 3 Tier 1 - 2 points)

#### 5.1 Full Shortcut Table

| Shortcut | Action | Priority |
|----------|--------|----------|
| **Delete/Backspace** | Delete selected shapes | ✅ Existing |
| **Cmd/Ctrl+D** | Duplicate selected | High |
| **Cmd/Ctrl+C** | Copy selected | High |
| **Cmd/Ctrl+V** | Paste | High |
| **Cmd/Ctrl+Z** | Undo | High |
| **Cmd/Ctrl+Shift+Z** | Redo | High |
| **Arrow Keys** | Move selected (10px) | High |
| **Shift+Arrows** | Move selected (1px) | Medium |
| **Alt+Arrows** | Rotate (15°) | Medium |
| **Cmd/Ctrl+A** | Select all | High |
| **Escape** | Deselect all | High |
| **Cmd/Ctrl+]** | Bring forward | Low |
| **Cmd/Ctrl+[** | Send backward | Low |
| **Cmd/Ctrl+Shift+]** | Bring to front | Low |
| **Cmd/Ctrl+Shift+[** | Send to back | Low |

**Implementation**:
- Single global keyboard event listener
- Check for modifier keys (Cmd/Ctrl, Shift, Alt)
- Prevent default browser shortcuts
- Disable shortcuts during text editing

---

### Priority 6: Copy/Paste System (Section 3 Tier 1 - 2 points)

#### 6.1 Behavior
**Copy (Cmd/Ctrl+C)**:
- Stores selected shape(s) data in session state (not clipboard API)
- Deep clone shape data
- Preserve relative positions for multi-select

**Paste (Cmd/Ctrl+V)**:
- Creates new shapes with +20px X/Y offset
- Generates new Firestore IDs
- Maintains relative positions for multi-select
- Pastes at current viewport center (optional)

**Cross-Session**:
- Clipboard clears on page refresh
- No cross-browser paste support (session-only)

**Implementation**:
```typescript
// In CanvasContext
const [clipboard, setClipboard] = useState<Shape[]>([]);

const copyShapes = () => {
  const selected = rectangles.filter(r => selectedIds.includes(r.id));
  setClipboard(deepClone(selected));
};

const pasteShapes = () => {
  const newShapes = clipboard.map(shape => ({
    ...shape,
    id: 'temp-' + Date.now() + Math.random(),
    x: shape.x + 20,
    y: shape.y + 20,
    createdAt: new Date(),
    createdBy: user.userId
  }));
  // Add to Firestore...
};
```

---

### Priority 7: Enhanced Color Picker (Section 3 Tier 1 - 2 points)

#### 7.1 Features
**Color Selection UI**:
1. **Preset Colors**: Grid of 20 common colors (current 8 + 12 more)
2. **Hex Input**: Manual hex code entry (#RRGGBB)
3. **Opacity Slider**: 0-100% transparency (new)
4. **Recent Colors**: Last 10 used colors (new)

**UI Layout**:
```
┌─────────────────────────────┐
│  Current Color: [    ]      │
├─────────────────────────────┤
│  Preset Colors (4x5 grid)   │
│  ■ ■ ■ ■ ■                  │
│  ■ ■ ■ ■ ■                  │
│  ■ ■ ■ ■ ■                  │
│  ■ ■ ■ ■ ■                  │
├─────────────────────────────┤
│  Hex: #______               │
│  Opacity: [====||====] 100% │
├─────────────────────────────┤
│  Recent: ■ ■ ■ ■ ■          │
└─────────────────────────────┘
```

**Implementation**:
- Opacity stored as `opacity: number` (0-1) on each shape
- Konva.js supports `opacity` natively
- Recent colors stored in localStorage (max 10)
- Preset palette defined in constants

---

### Priority 8: Visual Layers Panel (Section 3 Tier 2 - 3 points)

#### 8.1 Panel Layout
**Location**: Right sidebar, below properties panel (or collapsible)
**Height**: 300px with vertical scroll
**Width**: 240px

**Layer Item Display**:
```
┌───────────────────────────────┐
│ Layers                    [×] │
├───────────────────────────────┤
│ ┌─┐ Rectangle 3     👁 🔒   │
│ ┌─┐ Circle 2        👁      │
│ ┌─┐ Text 1          👁      │
│ ┌─┐ Rectangle 1     👁      │
└───────────────────────────────┘
```

Each layer item shows:
- Thumbnail preview (32x32px) or shape icon
- Shape type icon
- Shape name (auto-generated or editable)
- Visibility toggle (eye icon)
- Lock toggle (padlock icon)
- Z-index order (top = front)

#### 8.2 Drag-to-Reorder
**Interaction**:
- Click and drag layer item to reorder
- Visual feedback: Dragged item follows cursor
- Drop zones: Blue line indicator between items
- On drop: Update z-index for all affected shapes

**Implementation**:
- Use `react-beautiful-dnd` or similar
- On reorder: Recalculate z-index for all shapes
- Use atomic 3-phase update (from existing z-index service)
- Real-time sync: Other users see reordering immediately

#### 8.3 Layer Operations
**Click Actions**:
- Click layer: Select shape on canvas
- Eye icon: Toggle visibility (hide/show)
- Lock icon: Prevent edits
- Delete icon: Delete shape

**Context Menu** (Right-click):
- Bring to Front
- Send to Back
- Bring Forward
- Send Backward
- Duplicate Layer
- Delete Layer
- Rename Layer

---

### Priority 9: Collaborative Comments (Section 3 Tier 3 - 3 points)

#### 9.1 Data Structure
```typescript
interface Comment {
  id: string;
  canvasId: string;
  shapeId: string | null; // null = general canvas comment
  userId: string;
  userName: string;
  text: string;
  timestamp: Timestamp;
  resolved: boolean;
  replies: Reply[];
  position?: { x: number; y: number }; // For canvas comments
}

interface Reply {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Timestamp;
}
```

**Storage**: `canvases/{canvasId}/comments/{commentId}`

#### 9.2 UI Components
**Comment Trigger**:
- Right-click shape → "Add comment" menu option
- Click canvas comment icon in toolbar

**Visual Indicator**:
- Small chat bubble icon on shapes with comments
- Badge count shows unread comments
- Highlight shape when comment panel is open

**Comments Panel** (Right Sidebar):
```
┌─────────────────────────────┐
│ Comments             [×]    │
├─────────────────────────────┤
│ 💬 John Doe (2 min ago)     │
│   "Should this be blue?"    │
│   → On: Rectangle 3         │
│   [Reply] [Resolve]         │
├─────────────────────────────┤
│ 💬 Jane Smith (5 min ago)   │
│   "Looks good!"             │
│   ✅ Resolved               │
└─────────────────────────────┘
```

**Features**:
- Real-time sync via Firestore
- Reply threads
- Resolve/unresolve comments
- Filter: All / Resolved / Unresolved
- Click comment → highlight shape on canvas

---

## Part C: Feature Validation & Testing

### Testing Requirements for Rubric Excellence

#### Section 1 Testing (Conflict Resolution & Persistence)

**Conflict Resolution Tests**:
1. ✅ **Simultaneous Move**: Already passes (last mouse release wins)
2. ✅ **Rapid Edit Storm**: Already passes (optimistic updates)
3. ⚠️ **Delete vs Edit**: *Needs enhancement*
   - Current: Shape may flicker when deleted during edit
   - Fix: Add deletion broadcast to RTDB
4. ✅ **Create Collision**: Already passes (Firestore unique IDs)

**Enhanced Delete Handling** (Critical Gap):
```typescript
// When deleting a shape:
async function deleteShape(shapeId: string) {
  // 1. Broadcast deletion intent via RTDB (high priority)
  await database.ref(`/deletions/${canvasId}/${shapeId}`).set({
    deletedBy: currentUser.id,
    timestamp: Date.now()
  });
  
  // 2. Clear from activeEdits immediately
  await database.ref(`/activeEdits/${canvasId}/${shapeId}`).remove();
  
  // 3. Clear from livePositions
  await database.ref(`/livePositions/${canvasId}/${shapeId}`).remove();
  
  // 4. Soft delete in Firestore (500ms grace period)
  await firestore.doc(`canvases/${canvasId}/shapes/${shapeId}`)
    .update({ 
      deletedAt: Timestamp.now(),
      deletedBy: currentUser.id 
    });
  
  // 5. Hard delete after grace period
  setTimeout(() => {
    firestore.doc(`canvases/${canvasId}/shapes/${shapeId}`).delete();
  }, 500);
}

// On all clients: subscribe to deletions
database.ref(`/deletions/${canvasId}`).on('child_added', (snapshot) => {
  const { shapeId } = snapshot.key;
  // Immediately remove from local state
  setShapes(prev => prev.filter(s => s.id !== shapeId));
});
```

**Persistence Tests**:
1. ✅ **Mid-Operation Refresh**: Shape position preserved (already passes)
2. ✅ **Total Disconnect**: Full canvas state intact (already passes)
3. ⚠️ **Network Drop with Queue**: *Needs enhancement*
   - Current: Operations during disconnect may be lost
   - Fix: Enable Firestore offline persistence
4. ✅ **Rapid Disconnect**: Edits persist (already passes)

**Firestore Offline Persistence** (Enhancement):
```typescript
// In firebase.ts
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence only in one tab');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser doesn't support persistence');
  }
});
```

**Connection Status Indicator**:
```typescript
// Monitor RTDB connection
database.ref('.info/connected').on('value', (snapshot) => {
  const isConnected = snapshot.val();
  setConnectionStatus(isConnected ? 'connected' : 'disconnected');
});

// UI: Dot in header
🟢 Connected
🟡 Slow (>200ms latency)
🔴 Disconnected

// Toast notifications
"Connection lost. Changes will sync when reconnected."
"Reconnected. Syncing changes..."
```

#### Section 2 Testing (Canvas Features & Performance)

**Feature Tests**:
1. ✅ Pan/zoom: Smooth (already passes)
2. ✅ 3+ shapes: Need to add Circle, Triangle, Line, Text
3. ✅ Text formatting: Need to implement
4. ✅ Multi-select: Need to implement
5. ✅ Layer management: Need visual panel
6. ✅ Transforms: Need rotation
7. ✅ Duplicate/delete: Duplicate needs implementation

**Performance Tests**:
1. ✅ 60 FPS: Already achieving
2. ✅ <100ms object sync: Already achieving
3. ✅ <50ms cursor sync: Already achieving
4. ⚠️ 500+ objects: *Needs testing*
   - Test: Create 500 mixed shapes, measure FPS
   - If <60 FPS: Implement virtual rendering for layers panel
5. ✅ 5+ users: Already supporting

#### Section 3 Testing (Advanced Features)

**Tier 1 Features (Need 3 for 6 points)**:
1. ✅ Color picker: Enhanced version
2. ✅ Undo/redo: Full implementation
3. ✅ Keyboard shortcuts: 10+ shortcuts
4. ✅ Copy/paste: Full implementation

**Tier 2 Features (Need 2 for 6 points)**:
1. ✅ Layers panel: With drag-to-reorder
2. ✅ Z-index management: Already excellent

**Tier 3 Features (Need 1 for 3 points)**:
1. ✅ Collaborative comments: Full implementation

---

## Part D: Feature Revisits & Improvements

### Areas to Re-Test for Rubric Compliance

#### 1. Delete vs Edit Conflict
**Current Status**: ⚠️ Needs enhancement  
**Required**: Shape should disappear instantly for all users  
**Implementation**: Add deletion broadcast via RTDB (see Part C)

#### 2. Mid-Operation Network Drop
**Current Status**: ⚠️ Needs enhancement  
**Required**: Queue operations during disconnect  
**Implementation**: Enable Firestore offline persistence (see Part C)

#### 3. Connection Status Visibility
**Current Status**: ❌ Missing  
**Required**: Clear UI indicator  
**Implementation**: Connection dot in header + toast notifications

#### 4. Performance with 500+ Objects
**Current Status**: ⏳ Needs testing  
**Required**: Maintain 60 FPS  
**Implementation**: If fails, add virtual rendering for layers panel

---

## Part E: Implementation Roadmap

### Phase 1: Core Shape Types & Rotation (Week 1)
**Goal**: Meet Section 2 "3+ shapes" requirement

**Tasks**:
1. Add Circle shape type
   - Create `Circle.tsx` component
   - Update `CanvasContext` to handle circle type
   - Add "Create Circle" button to toolbar
2. Add Triangle shape type
   - Create `Triangle.tsx` component
   - Add to CanvasContext
   - Add "Create Triangle" button
3. Add Line shape type
   - Create `Line.tsx` component
   - Add endpoint drag handles
   - Add to CanvasContext
4. Add Text layers
   - Create `Text.tsx` component
   - Implement inline editing
   - Add font formatting options
5. Implement universal rotation
   - Add rotation handle to all shapes
   - Update data model (`rotation: number`)
   - Stream rotation via livePositions
   - Add keyboard rotation (Alt+Arrows)

**Success Metrics**:
- ✅ 4 shape types working
- ✅ Rotation on all shapes
- ✅ Real-time sync for new shapes
- ✅ 60 FPS maintained

---

### Phase 2: Multi-Selection & Operations (Week 2)
**Goal**: Enable bulk operations

**Tasks**:
1. Implement multi-select
   - Shift-click selection
   - Drag-to-select rectangle
   - Visual selection outline
2. Add copy/paste
   - Copy selected shapes to session state
   - Paste with offset
   - Maintain relative positions
3. Add duplicate
   - Cmd/Ctrl+D shortcut
   - Duplicate with +20px offset
4. Implement keyboard shortcuts
   - Arrow key movement
   - Cmd/Ctrl+A select all
   - Escape deselect
5. Add delete enhancement
   - Deletion broadcast via RTDB
   - Clear activeEdits immediately

**Success Metrics**:
- ✅ Multi-select with 3 methods
- ✅ Copy/paste working
- ✅ 8+ keyboard shortcuts
- ✅ Delete vs Edit conflicts resolved

---

### Phase 3: Undo/Redo & History (Week 3)
**Goal**: Add operation history

**Tasks**:
1. Build undo/redo system
   - Action stack (max 50)
   - Capture before/after states
   - Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z
2. Handle all undoable operations
   - Create, delete, move, resize, rotate
   - Color change, z-index change
   - Text edit
3. Conflict handling
   - Detect if shape was modified by others
   - Show warning toast
   - Allow user to proceed or cancel

**Success Metrics**:
- ✅ Undo/redo working
- ✅ 50-operation history
- ✅ Conflicts handled gracefully

---

### Phase 4: Enhanced UI Features (Week 4)
**Goal**: Polish UI and add advanced features

**Tasks**:
1. Enhanced color picker
   - Add hex input
   - Add opacity slider
   - Add recent colors (localStorage)
   - Expand preset palette to 20 colors
2. Visual layers panel
   - Build layer list component
   - Add drag-to-reorder
   - Add visibility/lock toggles
   - Add context menu
3. Connection status indicator
   - Monitor `.info/connected`
   - Display connection dot
   - Show toast notifications
4. Enable offline persistence
   - Add `enableIndexedDbPersistence`
   - Handle multiple tabs
   - Test offline queue

**Success Metrics**:
- ✅ Color picker with opacity
- ✅ Layers panel with drag-to-reorder
- ✅ Connection status visible
- ✅ Offline operations queue

---

### Phase 5: Collaborative Comments (Week 5)
**Goal**: Add Tier 3 feature for bonus points

**Tasks**:
1. Build comments data structure
   - Firestore collection
   - Comment schema with replies
   - Real-time sync
2. Add comment UI
   - Right-click menu
   - Comments panel sidebar
   - Visual indicators on shapes
3. Add threading
   - Reply functionality
   - Resolve/unresolve
   - Filter options
4. Notifications
   - Badge count
   - Unread indicator
   - Toast on new comment

**Success Metrics**:
- ✅ Comments working
- ✅ Threaded replies
- ✅ Real-time sync
- ✅ Notifications

---

## Part F: Updated Data Models

### Universal Shape Interface
```typescript
type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line' | 'text';

interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  color: string;
  opacity: number;        // 0-1 (new)
  rotation: number;       // degrees (new)
  zIndex: number;
  locked?: boolean;       // prevent edits (new)
  visible?: boolean;      // hide/show (new)
  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  lastModifiedBy: string;
  lastModified: Timestamp;
  deletedAt?: Timestamp;  // soft delete (new)
  deletedBy?: string;
}

interface RectangleShape extends BaseShape {
  type: 'rectangle';
  width: number;
  height: number;
}

interface CircleShape extends BaseShape {
  type: 'circle';
  radius: number;
}

interface TriangleShape extends BaseShape {
  type: 'triangle';
  width: number;
  height: number;
}

interface LineShape extends BaseShape {
  type: 'line';
  x2: number;             // end point
  y2: number;             // end point
  strokeWidth: number;    // 1-10px
}

interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;       // 12-72px
  fontFamily: string;     // 'sans-serif' | 'serif' | 'monospace'
  fontWeight: string;     // 'normal' | 'bold'
  fontStyle: string;      // 'normal' | 'italic'
}

type Shape = RectangleShape | CircleShape | TriangleShape | LineShape | TextShape;
```

### Comments Schema
```typescript
interface Comment {
  id: string;
  canvasId: string;
  shapeId: string | null;
  userId: string;
  userName: string;
  text: string;
  timestamp: Timestamp;
  resolved: boolean;
  replies: Reply[];
  position?: { x: number; y: number };
}

interface Reply {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Timestamp;
}
```

### Undo Stack Schema
```typescript
interface UndoAction {
  type: 'create' | 'delete' | 'modify' | 'move' | 'reorder';
  timestamp: number;
  userId: string;
  shapeIds: string[];
  before: Shape | Shape[] | null;
  after: Shape | Shape[] | null;
}

interface UndoStack {
  undoStack: UndoAction[];
  redoStack: UndoAction[];
}
```

---

## Part G: Success Criteria & Rubric Mapping

### Section 1: Core Collaborative Infrastructure (30 points)
**Target**: 30/30

**Real-Time Sync (12/12)**:
- ✅ Sub-100ms object sync
- ✅ Sub-50ms cursor sync
- ✅ Zero visible lag

**Conflict Resolution (9/9)**:
- ✅ Simultaneous edits resolve correctly
- ✅ Last-write-wins documented
- ✅ No ghost objects
- ✅ Rapid edits don't corrupt state
- ⚠️ Delete vs Edit: **Needs enhancement (Phase 2)**

**Persistence (9/9)**:
- ✅ Refresh preserves state
- ✅ Full canvas persists
- ⚠️ Offline queue: **Needs enhancement (Phase 4)**
- ⚠️ Connection indicator: **Needs implementation (Phase 4)**

---

### Section 2: Canvas Features & Performance (20 points)
**Target**: 20/20

**Canvas Functionality (8/8)**:
- ✅ Smooth pan/zoom (existing)
- ⏳ 3+ shape types: **Phase 1 (Circle, Triangle, Line)**
- ⏳ Text with formatting: **Phase 1**
- ⏳ Multi-select: **Phase 2**
- ⏳ Layer management: **Phase 4 (visual panel)**
- ⏳ Transform operations: **Phase 1 (rotation)**
- ⏳ Duplicate: **Phase 2**

**Performance (12/12)**:
- ✅ 500+ objects at 60 FPS (needs testing)
- ✅ 5+ users supported
- ✅ No degradation under load
- ✅ Smooth interactions

---

### Section 3: Advanced Features (15 points)
**Target**: 15/15

**Tier 1 (6/6 points) - Need 3 features**:
1. ⏳ **Enhanced color picker**: Phase 4 (opacity, hex input, recent colors)
2. ⏳ **Undo/redo**: Phase 3 (50-operation history, Cmd+Z)
3. ⏳ **Keyboard shortcuts**: Phase 2 (10+ shortcuts)
4. ⏳ **Copy/paste**: Phase 2 (Cmd+C/V with offset)

**Tier 2 (6/6 points) - Need 2 features**:
1. ⏳ **Layers panel**: Phase 4 (drag-to-reorder, visibility, lock)
2. ✅ **Z-index management**: Existing (bring to front, send to back, auto-layer)

**Tier 3 (3/3 points) - Need 1 feature**:
1. ⏳ **Collaborative comments**: Phase 5 (threaded, real-time, resolve)

---

### Section 5: Technical Implementation (10 points)
**Target**: 10/10

**Architecture (5/5)**:
- ✅ Clean code organization
- ✅ Separation of concerns
- ✅ Scalable architecture
- ✅ Error handling
- ✅ Modular components

**Authentication (5/5)**:
- ✅ Robust auth (email + Google)
- ✅ Secure user management
- ✅ Session handling
- ✅ Protected routes
- ✅ No exposed credentials

---

### Section 6: Documentation (5 points)
**Target**: 5/5

**Repository (3/3)**:
- ⏳ Clear README: **Needs update**
- ⏳ Setup guide: **Needs documentation**
- ✅ Architecture docs (existing PRD, tasks.md)
- ✅ Easy to run locally
- ✅ Dependencies listed (package.json)

**Deployment (2/2)**:
- ✅ Stable deployment (Firebase)
- ✅ Publicly accessible
- ✅ Supports 5+ users
- ✅ Fast load times

---

## Part H: Risk Assessment & Mitigation

### Performance Risks

**Risk 1**: Multi-select with 100+ shapes may lag  
**Mitigation**: 
- Batch selection operations
- Use Konva.Group for multi-select transforms
- Virtual rendering for layers panel (react-window)

**Risk 2**: Layers panel with 500+ items may slow down  
**Mitigation**:
- Virtual scrolling (react-window)
- Lazy rendering of thumbnails
- Debounce drag-to-reorder updates

**Risk 3**: Undo stack memory usage  
**Mitigation**:
- Limit to 50 operations
- Only store diff, not full shapes
- Clear stack on logout

### Sync Complexity Risks

**Risk 4**: Rotation + resize + move conflicts  
**Mitigation**:
- Extend activeEdits to include operation type
- Maintain last-write-wins for all operations
- Lock shape during complex multi-operation transforms

**Risk 5**: Offline queue may conflict with real-time edits  
**Mitigation**:
- Firestore offline persistence handles this automatically
- Show conflict resolution UI if needed
- Allow user to choose: Keep local / Use server version

---

## Part I: Testing Checklist

### Manual Testing Scenarios

**Section 1 Tests (Collaborative Infrastructure)**:
- [ ] Two users drag same rectangle simultaneously
- [ ] User A resizes while User B changes color
- [ ] User A deletes shape while User B is dragging it
- [ ] Refresh mid-edit → state preserved
- [ ] Disconnect for 30s, make edits → syncs on reconnect
- [ ] All users leave, return → canvas intact

**Section 2 Tests (Canvas Features)**:
- [ ] Create 500 mixed shapes → maintain 60 FPS
- [ ] Multi-select 50 shapes, drag → smooth at 60 FPS
- [ ] Rotate shape while another user moves it
- [ ] Edit text while another user is typing in it
- [ ] 5 users simultaneously editing → no conflicts

**Section 3 Tests (Advanced Features)**:
- [ ] Undo 20 operations rapidly
- [ ] Copy/paste 10 shapes → relative positions preserved
- [ ] Drag layers to reorder → z-index updates real-time
- [ ] Add comment → other users see it instantly
- [ ] Offline for 60s, make 10 operations → all sync on reconnect

### Automated Testing (Optional)

**Performance Tests**:
```typescript
describe('Performance', () => {
  it('should maintain 60 FPS with 500 shapes', () => {
    // Create 500 shapes
    // Measure FPS during pan/zoom
    expect(averageFPS).toBeGreaterThan(60);
  });

  it('should sync in <100ms', () => {
    // Create shape
    // Measure time until visible on second client
    expect(syncTime).toBeLessThan(100);
  });
});
```

**Conflict Resolution Tests**:
```typescript
describe('Conflicts', () => {
  it('should resolve simultaneous edits', () => {
    // User A and B edit same shape
    // Verify consistent final state
  });

  it('should handle delete during edit', () => {
    // User A deletes while User B edits
    // Verify shape disappears immediately
  });
});
```

---

## Part J: Documentation Requirements

### README Update Checklist

**Required Sections**:
- [ ] Project overview
- [ ] Tech stack
- [ ] Features list
- [ ] Setup instructions (local)
- [ ] Firebase configuration
- [ ] Environment variables
- [ ] Deployment guide
- [ ] Architecture overview
- [ ] Testing instructions
- [ ] Known issues
- [ ] Future roadmap

**Example Structure**:
```markdown
# CollabCanvas

Real-time collaborative design tool with multi-user sync and advanced features.

## Features
- 4 shape types (Rectangle, Circle, Triangle, Line)
- Text layers with formatting
- Real-time cursor tracking (<50ms)
- Optimistic updates (<100ms sync)
- Multi-selection and bulk operations
- Undo/redo (50 operations)
- Collaborative comments
- Visual layers panel
- 15+ keyboard shortcuts

## Tech Stack
- React + TypeScript
- Firebase (Firestore + RTDB + Auth)
- Konva.js for canvas rendering
- Tailwind CSS for styling

## Setup
1. Clone repo
2. `npm install`
3. Create `.env.local` with Firebase config
4. `npm start`

## Testing
- Manual: Open 2 browsers to test sync
- Automated: `npm test`

## Architecture
- Optimistic updates with last-write-wins
- Firestore for persistence
- RTDB for ephemeral data (cursors, edits, presence)
- React Context for state management
```

---

## Document Summary

**Version**: 2.2  
**Status**: Ready for Implementation  
**Target Score**: **80+ points** (Excellent tier)

**Phase Breakdown**:
- Phase 1: Core shapes + rotation (2 weeks)
- Phase 2: Multi-select + operations (1 week)
- Phase 3: Undo/redo (1 week)
- Phase 4: Enhanced UI (2 weeks)
- Phase 5: Comments (1 week)
- **Total**: 7-8 weeks for full implementation

**Next Steps**:
1. Review and approve this PRD
2. Create detailed task list from this PRD
3. Start Phase 1 implementation
4. Test continuously against rubric criteria
5. Deploy and gather feedback

This PRD provides a complete roadmap to achieve **rubric excellence** while maintaining the strong collaborative foundation already built. Each feature maps directly to rubric criteria, ensuring efficient development toward the 90+ point target.




