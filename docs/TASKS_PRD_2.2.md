# CollabCanvas Enhancement Tasks - PRD v2.2 Implementation Guide

**Based on**: PRD_Figma_2.2.md  
**Target Score**: 80/80 points (Excellent tier)  
**Status**: Ready for Implementation

---

## Phase 1: Core Shape Types & Rotation (2 weeks)

### PR #10: Circle Shape Type + Compact Toolbar UI

**Goal**: Add circle as second shape type + Introduce compact icon-based toolbar

**UI Enhancement**: Replace current LeftToolbar with CompactToolbar (48px width, icon-based)

**Files to Create**:
- `src/components/Canvas/Circle.tsx`
- `src/components/Canvas/CompactToolbar.tsx` (NEW: icon-based toolbar)

**Files to Modify**:
- `src/types/canvas.types.ts` - Add CircleShape interface
- `src/context/CanvasContext.tsx` - Add addCircle function
- `src/components/Layout/MainLayout.tsx` - Replace LeftToolbar with CompactToolbar
- `src/components/Canvas/Canvas.tsx` - Render Circle components
- **[DEPRECATED]** `src/components/Canvas/LeftToolbar.tsx` - Keep for backward compatibility

**Implementation Steps**:

1. **Update Type Definitions** (`canvas.types.ts`):
```typescript
interface CircleShape extends BaseShape {
  type: 'circle';
  radius: number;
}

type Shape = RectangleShape | CircleShape;
```

2. **Create Circle Component** (`Circle.tsx`):
- Import Konva Circle component
- Accept props: circle data, isSelected, onSelect
- Render circle with color, opacity, rotation
- Add selection outline when selected
- Handle click to select
- Subscribe to activeEdits for this shape
- Subscribe to livePositions for real-time updates
- Show edit indicator when another user is editing
- Add resize handles (4 corners, maintain aspect ratio)
- Apply rotation transformation

3. **Add Create Function** (`CanvasContext.tsx`):
```typescript
const addCircle = () => {
  // Calculate center of current viewport
  const center = {
    x: (stageSize.width / 2 - viewport.x) / viewport.scale,
    y: (stageSize.height / 2 - viewport.y) / viewport.scale
  };
  
  // Create temp circle
  const tempId = 'temp-' + Date.now();
  const newCircle: CircleShape = {
    id: tempId,
    type: 'circle',
    x: center.x,
    y: center.y,
    radius: 50,
    color: selectedColor,
    opacity: 1,
    rotation: 0,
    zIndex: getMaxZIndex() + 1,
    createdBy: user.userId,
    createdAt: new Date(),
    // ...
  };
  
  // Optimistic update
  setCanvasState(prev => ({
    ...prev,
    rectangles: [...prev.rectangles, newCircle as any],
    selectedRectangleId: tempId
  }));
  
  // Persist to Firestore
  await canvasService.createShape(newCircle);
};
```

4. **Create Compact Toolbar** (`CompactToolbar.tsx`):
```typescript
// NEW: Compact icon-based toolbar for all shapes
export function CompactToolbar() {
  const { addRectangle, addCircle } = useCanvas();
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const tools = [
    { id: 'rectangle', icon: '⬜', label: 'Rectangle (R)', action: addRectangle },
    { id: 'circle', icon: '⚫', label: 'Circle (C)', action: addCircle },
  ];

  return (
    <div className="fixed left-0 top-16 bottom-0 w-12 bg-white border-r border-gray-200 flex flex-col items-center py-2 gap-1 z-10">
      {tools.map(tool => (
        <button
          key={tool.id}
          onClick={() => {
            tool.action();
            setActiveTool(tool.id);
            setTimeout(() => setActiveTool(null), 500);
          }}
          className={`
            w-10 h-10 rounded flex items-center justify-center text-lg
            hover:bg-gray-100 transition-colors relative group
            ${activeTool === tool.id ? 'bg-blue-100 ring-2 ring-blue-500' : ''}
          `}
          title={tool.label}
        >
          {tool.icon}
          {/* Tooltip */}
          <span className="absolute left-14 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {tool.label}
          </span>
        </button>
      ))}
    </div>
  );
}
```

5. **Update MainLayout** (`MainLayout.tsx`):
- Replace `<LeftToolbar />` with `<CompactToolbar />`
- Adjust canvas padding-left: from 280px to 48px
- Gains **232px** of horizontal canvas space

5. **Render Circle** (`Canvas.tsx`):
```typescript
{rectangles.map(shape => {
  if (shape.type === 'rectangle') {
    return <Rectangle key={shape.id} ... />;
  } else if (shape.type === 'circle') {
    return <Circle key={shape.id} ... />;
  }
})}
```

**Testing Checklist**:
- [ ] Circle creates at viewport center
- [ ] Circle syncs real-time to other users
- [ ] Circle can be selected
- [ ] Circle can be moved (drag)
- [ ] Circle can be resized (maintains circular aspect)
- [ ] Circle shows in properties panel
- [ ] Circle color can be changed
- [ ] Circle can be deleted
- [ ] Circle z-index works (bring forward/back)
- [ ] Edit indicators show when another user edits

---

### PR #11: Triangle Shape Type

**Goal**: Add triangle as third shape type

**Files to Create**:
- `src/components/Canvas/Triangle.tsx`

**Files to Modify**:
- `src/types/canvas.types.ts` - Add TriangleShape interface
- `src/context/CanvasContext.tsx` - Add addTriangle function
- `src/components/Canvas/LeftToolbar.tsx` - Add Create Triangle button
- `src/components/Canvas/Canvas.tsx` - Render Triangle components

**Implementation Steps**:

1. **Update Type Definitions**:
```typescript
interface TriangleShape extends BaseShape {
  type: 'triangle';
  width: number;
  height: number;
}

type Shape = RectangleShape | CircleShape | TriangleShape;
```

2. **Create Triangle Component** (`Triangle.tsx`):
- Use Konva Line or RegularPolygon with 3 sides
- Equilateral triangle pointing up by default
- Points calculation: `[(width/2, 0), (0, height), (width, height)]`
- Add same features as Circle: selection, drag, resize, rotation
- Resize: Free resize or Shift for aspect ratio lock

3. **Add Create Function** (similar to Circle)
4. **Add UI Button** (similar to Circle)
5. **Render Triangle** (similar to Circle)

**Testing Checklist**: Same as Circle

---

### PR #12: Line Shape Type

**Goal**: Add line as fourth shape type

**Files to Create**:
- `src/components/Canvas/Line.tsx`

**Files to Modify**:
- `src/types/canvas.types.ts` - Add LineShape interface
- `src/context/CanvasContext.tsx` - Add addLine function
- `src/components/Canvas/LeftToolbar.tsx` - Add Create Line button
- `src/components/Canvas/Canvas.tsx` - Render Line components

**Implementation Steps**:

1. **Update Type Definitions**:
```typescript
interface LineShape extends BaseShape {
  type: 'line';
  x2: number; // end point
  y2: number; // end point
  strokeWidth: number; // 1-10px
}

type Shape = RectangleShape | CircleShape | TriangleShape | LineShape;
```

2. **Create Line Component** (`Line.tsx`):
- Use Konva Line component
- Render from (x, y) to (x2, y2)
- Add endpoint drag handles (circles at each end)
- Add midpoint drag handle (move entire line)
- Properties panel: show stroke width slider (1-10px)
- NO resize handles (adjust endpoints instead)
- Support rotation (rotate around midpoint)

3. **Create Interaction** (`addLine` function):
- Two-step creation:
  1. Click: Place start point
  2. Drag: Set end point
  3. Release: Finalize line
- Or: Default line (100px horizontal) if single click

4. **Properties Panel Updates**:
- Add stroke width slider for line type
- Range: 1-10px
- Update line.strokeWidth on change

**Testing Checklist**:
- [ ] Line creates with click-drag
- [ ] Line syncs real-time
- [ ] Endpoints can be dragged to adjust
- [ ] Midpoint drag moves entire line
- [ ] Stroke width can be changed (1-10px)
- [ ] Line can be rotated
- [ ] Line can be deleted

---

### PR #13: Text Layers

**Goal**: Add text as fifth shape type

**Files to Create**:
- `src/components/Canvas/Text.tsx`
- `src/components/Canvas/TextEditor.tsx` (inline editing)

**Files to Modify**:
- `src/types/canvas.types.ts` - Add TextShape interface
- `src/context/CanvasContext.tsx` - Add addText function
- `src/components/Canvas/LeftToolbar.tsx` - Add Create Text button
- `src/components/Canvas/Canvas.tsx` - Render Text components
- `src/components/Canvas/PropertiesPanel.tsx` - Add text formatting options

**Implementation Steps**:

1. **Update Type Definitions**:
```typescript
interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number; // 12-72px
  fontFamily: string; // 'sans-serif' | 'serif' | 'monospace'
  fontWeight: string; // 'normal' | 'bold'
  fontStyle: string; // 'normal' | 'italic'
}

type Shape = /* ... */ | TextShape;
```

2. **Create Text Component** (`Text.tsx`):
- Use Konva Text component
- Render text with formatting
- Single-click: Select text
- Double-click: Enter edit mode (show TextEditor)
- Edit mode: Show input field overlaying canvas
- Escape or click outside: Exit edit mode
- Support rotation (rotate around center)

3. **Create Text Editor** (`TextEditor.tsx`):
- Positioned absolutely over canvas
- Textarea or contenteditable div
- Match font size, family, weight, style
- Auto-focus on mount
- Save on blur or Enter key
- Cancel on Escape

4. **Properties Panel Updates**:
```typescript
// Add text-specific controls:
- Font size slider (12-72px)
- Font family dropdown: Sans-serif, Serif, Monospace
- Bold toggle button
- Italic toggle button
- Color picker (existing)
```

5. **Add Create Function**:
```typescript
const addText = () => {
  const center = getViewportCenter();
  const newText: TextShape = {
    // ...
    text: 'Double-click to edit',
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal'
  };
  // Create optimistically and persist
};
```

**Testing Checklist**:
- [ ] Text creates at viewport center
- [ ] Double-click enters edit mode
- [ ] Text changes sync real-time
- [ ] Font size can be changed
- [ ] Font family can be changed
- [ ] Bold/italic toggles work
- [ ] Text color can be changed
- [ ] Text can be rotated
- [ ] Text can be moved
- [ ] Text can be deleted

---

### PR #14: Universal Rotation System

**Goal**: Add rotation to all shape types

**Files to Modify**:
- `src/types/canvas.types.ts` - Add rotation field to BaseShape
- `src/components/Canvas/Rectangle.tsx` - Add rotation handle
- `src/components/Canvas/Circle.tsx` - Add rotation handle
- `src/components/Canvas/Triangle.tsx` - Add rotation handle
- `src/components/Canvas/Line.tsx` - Add rotation handle
- `src/components/Canvas/Text.tsx` - Add rotation handle
- `src/components/Canvas/PropertiesPanel.tsx` - Add rotation input
- `src/services/livePositions.service.ts` - Stream rotation updates

**Implementation Steps**:

1. **Update Base Shape Interface**:
```typescript
interface BaseShape {
  // ... existing fields
  rotation: number; // degrees (0-359)
}
```

2. **Add Rotation Handle UI** (for all shape components):
```typescript
// In each shape component (Rectangle, Circle, etc.)

// Calculate handle position (20px above shape)
const rotationHandleX = shape.x + shape.width / 2;
const rotationHandleY = shape.y - 20;

// Render rotation handle
{isSelected && (
  <Circle
    x={rotationHandleX}
    y={rotationHandleY}
    radius={6}
    fill="white"
    stroke="#1565C0"
    strokeWidth={2}
    onMouseEnter={() => setCursor('grab')}
    onMouseDown={handleRotationStart}
  />
)}
```

3. **Implement Rotation Logic**:
```typescript
const handleRotationStart = (e: KonvaEventObject<MouseEvent>) => {
  const stage = stageRef.current;
  const centerX = shape.x + shape.width / 2;
  const centerY = shape.y + shape.height / 2;
  
  const handleMouseMove = (e: MouseEvent) => {
    const pos = stage.getPointerPosition();
    const dx = pos.x - centerX;
    const dy = pos.y - centerY;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Optional: Snap to 15° increments if Shift is held
    const snappedAngle = e.shiftKey 
      ? Math.round(angle / 15) * 15 
      : angle;
    
    // Update rotation via livePositions
    setLivePosition(shape.id, {
      rotation: snappedAngle,
      userId: user.userId,
      timestamp: Date.now()
    });
    
    // Optimistic local update
    updateShapeRotation(shape.id, snappedAngle);
  };
  
  // Add listeners...
};
```

4. **Add Keyboard Rotation**:
```typescript
// In global keyboard handler
if (e.altKey && e.key === 'ArrowLeft') {
  rotateSelected(-15); // Counter-clockwise
}
if (e.altKey && e.key === 'ArrowRight') {
  rotateSelected(15); // Clockwise
}
```

5. **Properties Panel Rotation Input**:
```typescript
<div className="property-row">
  <label>Rotation</label>
  <input
    type="number"
    min="0"
    max="359"
    value={Math.round(selectedShape.rotation)}
    onChange={(e) => {
      const rotation = parseInt(e.target.value);
      updateRotation(selectedShape.id, rotation);
    }}
  />
  <span>°</span>
</div>
```

6. **Apply Rotation in Konva**:
```typescript
<Rect
  // ... other props
  rotation={shape.rotation}
  offsetX={shape.width / 2}  // Rotate around center
  offsetY={shape.height / 2}
/>
```

7. **Stream Rotation via RTDB**:
```typescript
// In livePositions.service.ts
export interface LivePosition {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number; // ADD THIS
  userId: string;
  timestamp: number;
}
```

**Testing Checklist**:
- [ ] All shapes have rotation handle when selected
- [ ] Dragging handle rotates shape
- [ ] Rotation angle displays while rotating
- [ ] Shift key snaps to 15° increments
- [ ] Alt+Arrow keys rotate 15°
- [ ] Properties panel rotation input works
- [ ] Rotation syncs real-time to other users
- [ ] Rotation persists to Firestore

---

## Phase 2: Multi-Selection & Operations (1 week)

### PR #15: Multi-Selection System

**Goal**: Enable selecting multiple shapes at once

**Files to Create**:
- `src/hooks/useSelection.ts` (selection logic)

**Files to Modify**:
- `src/context/CanvasContext.tsx` - Replace selectedRectangleId with selectedIds array
- `src/components/Canvas/Canvas.tsx` - Add drag-select rectangle
- `src/components/Canvas/Rectangle.tsx` (and all shapes) - Update selection styling
- `src/components/Canvas/PropertiesPanel.tsx` - Handle multi-selection display

**Implementation Steps**:

1. **Update Context State**:
```typescript
interface CanvasState {
  // Replace: selectedRectangleId: string | null;
  selectedIds: string[]; // NEW
  // ...
}
```

2. **Add Selection Methods**:
```typescript
// Shift-click: Add/remove from selection
const handleShapeClick = (shapeId: string, e: KonvaEventObject) => {
  if (e.evt.shiftKey) {
    setSelectedIds(prev => 
      prev.includes(shapeId)
        ? prev.filter(id => id !== shapeId)
        : [...prev, shapeId]
    );
  } else {
    setSelectedIds([shapeId]);
  }
};

// Ctrl/Cmd+A: Select all
const selectAll = () => {
  setSelectedIds(rectangles.map(r => r.id));
};

// Escape: Deselect all
const deselectAll = () => {
  setSelectedIds([]);
};
```

3. **Implement Drag-Select**:
```typescript
// In Canvas.tsx

const [selectionBox, setSelectionBox] = useState<{
  x: number;
  y: number;
  width: number;
  height: number;
} | null>(null);

const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
  if (e.target === e.target.getStage()) {
    const pos = e.target.getStage().getPointerPosition();
    setSelectionBox({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0
    });
  }
};

const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
  if (selectionBox) {
    const pos = e.target.getStage().getPointerPosition();
    setSelectionBox(prev => ({
      ...prev!,
      width: pos.x - prev!.x,
      height: pos.y - prev!.y
    }));
  }
};

const handleMouseUp = () => {
  if (selectionBox) {
    // Find shapes intersecting selection box
    const selected = rectangles.filter(shape => {
      return intersectsBox(shape, selectionBox);
    });
    setSelectedIds(selected.map(s => s.id));
    setSelectionBox(null);
  }
};

// Render selection box
{selectionBox && (
  <Rect
    x={selectionBox.x}
    y={selectionBox.y}
    width={selectionBox.width}
    height={selectionBox.height}
    fill="rgba(33, 150, 243, 0.1)"
    stroke="#2196F3"
    strokeWidth={1}
    dash={[5, 5]}
  />
)}
```

4. **Update Properties Panel**:
```typescript
if (selectedIds.length === 0) {
  return null; // No selection
} else if (selectedIds.length === 1) {
  // Show single shape properties (existing)
} else {
  // Show multi-selection properties
  return (
    <div>
      <h3>Multiple shapes selected ({selectedIds.length})</h3>
      <button onClick={deleteSelected}>Delete All</button>
      <button onClick={duplicateSelected}>Duplicate All</button>
      <div>
        <label>Color (apply to all)</label>
        <ColorPicker onChange={applyColorToAll} />
      </div>
    </div>
  );
}
```

5. **Update Shape Rendering**:
```typescript
// In each shape component
const isSelected = selectedIds.includes(shape.id);

// Render with blue outline if selected
<Rect
  stroke={isSelected ? '#2196F3' : undefined}
  strokeWidth={isSelected ? 2 : 0}
  // ...
/>
```

**Testing Checklist**:
- [ ] Shift-click adds/removes from selection
- [ ] Drag-select creates blue rectangle
- [ ] Drag-select selects intersecting shapes
- [ ] Ctrl/Cmd+A selects all shapes
- [ ] Escape deselects all
- [ ] Properties panel shows "N shapes selected"
- [ ] All selected shapes have blue outline

---

### PR #16: Copy/Paste System

**Goal**: Enable copying and pasting shapes

**Files to Modify**:
- `src/context/CanvasContext.tsx` - Add clipboard state and functions
- `src/hooks/useKeyboardShortcuts.ts` - Add Cmd/Ctrl+C/V handlers

**Implementation Steps**:

1. **Add Clipboard State**:
```typescript
const [clipboard, setClipboard] = useState<Shape[]>([]);
```

2. **Implement Copy**:
```typescript
const copyShapes = () => {
  const selected = rectangles.filter(r => selectedIds.includes(r.id));
  
  // Deep clone to prevent reference issues
  const cloned = selected.map(shape => ({
    ...shape,
    // Remove ID so paste generates new ones
    id: undefined as any
  }));
  
  setClipboard(cloned);
  toast.success(`Copied ${selected.length} shape(s)`);
};
```

3. **Implement Paste**:
```typescript
const pasteShapes = async () => {
  if (clipboard.length === 0) return;
  
  const newShapes = clipboard.map(shape => ({
    ...shape,
    id: 'temp-' + Date.now() + Math.random(),
    x: shape.x + 20, // Offset
    y: shape.y + 20,
    createdBy: user.userId,
    createdAt: new Date(),
    lastModifiedBy: user.userId,
    lastModified: new Date()
  }));
  
  // Optimistic update
  setCanvasState(prev => ({
    ...prev,
    rectangles: [...prev.rectangles, ...newShapes as any],
    selectedIds: newShapes.map(s => s.id)
  }));
  
  // Persist to Firestore
  for (const shape of newShapes) {
    await canvasService.createShape(shape);
  }
  
  toast.success(`Pasted ${newShapes.length} shape(s)`);
};
```

4. **Add Keyboard Shortcuts**:
```typescript
// In useKeyboardShortcuts.ts or global handler
if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
  e.preventDefault();
  copyShapes();
}

if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
  e.preventDefault();
  pasteShapes();
}
```

**Testing Checklist**:
- [ ] Cmd/Ctrl+C copies selected shapes
- [ ] Cmd/Ctrl+V pastes shapes with +20px offset
- [ ] Multi-select copy/paste maintains relative positions
- [ ] Pasted shapes are auto-selected
- [ ] Toast notifications appear
- [ ] Clipboard persists within session
- [ ] Clipboard clears on page refresh

---

### PR #17: Duplicate Function

**Goal**: Add duplicate operation (Cmd/Ctrl+D)

**Implementation**: Similar to Paste, but simpler:

```typescript
const duplicateShapes = async () => {
  const selected = rectangles.filter(r => selectedIds.includes(r.id));
  
  const duplicates = selected.map(shape => ({
    ...shape,
    id: 'temp-' + Date.now() + Math.random(),
    x: shape.x + 20,
    y: shape.y + 20,
    zIndex: getMaxZIndex() + 1,
    createdBy: user.userId,
    createdAt: new Date()
  }));
  
  // Add and persist...
};

// Keyboard shortcut
if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
  e.preventDefault();
  duplicateShapes();
}
```

**Testing**: Same as paste

---

### PR #18: Enhanced Delete Handling

**Goal**: Fix delete-vs-edit conflict via RTDB broadcast

**Files to Modify**:
- `src/context/CanvasContext.tsx` - Update deleteRectangle function
- `src/services/deletion.service.ts` - NEW SERVICE
- `src/types/canvas.types.ts` - Add deletedAt/deletedBy fields

**Implementation Steps**:

1. **Create Deletion Service** (`deletion.service.ts`):
```typescript
import { ref, set, onChildAdded, off } from 'firebase/database';
import { database } from './firebase';

export interface DeletionEvent {
  shapeId: string;
  deletedBy: string;
  timestamp: number;
}

export function broadcastDeletion(canvasId: string, shapeId: string, userId: string) {
  const deletionRef = ref(database, `/deletions/${canvasId}/${shapeId}`);
  return set(deletionRef, {
    deletedBy: userId,
    timestamp: Date.now()
  });
}

export function subscribeToDeletions(
  canvasId: string,
  callback: (deletion: DeletionEvent) => void
): () => void {
  const deletionsRef = ref(database, `/deletions/${canvasId}`);
  
  const handler = (snapshot: any) => {
    const shapeId = snapshot.key;
    const data = snapshot.val();
    callback({ shapeId, ...data });
  };
  
  onChildAdded(deletionsRef, handler);
  
  return () => off(deletionsRef, 'child_added', handler);
}
```

2. **Update Delete Function**:
```typescript
const deleteRectangles = async (ids: string[]) => {
  // 1. Broadcast deletion via RTDB (immediate)
  for (const id of ids) {
    await broadcastDeletion(CANVAS_ID, id, user.userId);
  }
  
  // 2. Clear from activeEdits
  for (const id of ids) {
    await clearActiveEdit(id);
  }
  
  // 3. Clear from livePositions
  for (const id of ids) {
    await clearLivePosition(id);
  }
  
  // 4. Soft delete in Firestore (500ms grace period)
  for (const id of ids) {
    await canvasService.updateShape(id, {
      deletedAt: Timestamp.now(),
      deletedBy: user.userId
    });
  }
  
  // 5. Hard delete after grace period
  setTimeout(() => {
    for (const id of ids) {
      canvasService.deleteShape(id);
    }
  }, 500);
  
  // 6. Optimistic local update
  setCanvasState(prev => ({
    ...prev,
    rectangles: prev.rectangles.filter(r => !ids.includes(r.id)),
    selectedIds: []
  }));
};
```

3. **Subscribe to Deletions** (in CanvasContext):
```typescript
useEffect(() => {
  const unsubscribe = subscribeToDeletions(CANVAS_ID, (deletion) => {
    // Immediately remove from local state
    setCanvasState(prev => ({
      ...prev,
      rectangles: prev.rectangles.filter(r => r.id !== deletion.shapeId)
    }));
  });
  
  return unsubscribe;
}, []);
```

**Testing Checklist**:
- [ ] User A deletes shape while User B is dragging → shape disappears immediately for User B
- [ ] User A deletes shape while User B is resizing → shape disappears immediately
- [ ] Deletion clears activeEdits
- [ ] Deletion clears livePositions
- [ ] 500ms grace period allows undo (if implemented)

---

### PR #19: Keyboard Shortcuts System

**Goal**: Implement 10+ keyboard shortcuts

**Files to Create**:
- `src/hooks/useKeyboardShortcuts.ts`

**Files to Modify**:
- `src/context/CanvasContext.tsx` - Add shortcut functions
- `src/components/Canvas/Canvas.tsx` - Use keyboard hook

**Implementation**:

```typescript
// useKeyboardShortcuts.ts
export function useKeyboardShortcuts() {
  const { 
    deleteSelected, 
    duplicateShapes,
    copyShapes,
    pasteShapes,
    selectAll,
    deselectAll,
    moveSelected,
    rotateSelected,
    bringForward,
    sendBackward
  } = useCanvas();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }

      // Duplicate
      if (cmdCtrl && e.key === 'd') {
        e.preventDefault();
        duplicateShapes();
      }

      // Copy
      if (cmdCtrl && e.key === 'c') {
        e.preventDefault();
        copyShapes();
      }

      // Paste
      if (cmdCtrl && e.key === 'v') {
        e.preventDefault();
        pasteShapes();
      }

      // Select All
      if (cmdCtrl && e.key === 'a') {
        e.preventDefault();
        selectAll();
      }

      // Deselect
      if (e.key === 'Escape') {
        deselectAll();
      }

      // Move with Arrow Keys
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const distance = e.shiftKey ? 1 : 10; // Shift = 1px, normal = 10px
        const dx = e.key === 'ArrowLeft' ? -distance : e.key === 'ArrowRight' ? distance : 0;
        const dy = e.key === 'ArrowUp' ? -distance : e.key === 'ArrowDown' ? distance : 0;
        moveSelected(dx, dy);
      }

      // Rotate with Alt+Arrows
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const degrees = e.key === 'ArrowLeft' ? -15 : 15;
        rotateSelected(degrees);
      }

      // Bring Forward
      if (cmdCtrl && e.key === ']') {
        e.preventDefault();
        bringForward();
      }

      // Send Backward
      if (cmdCtrl && e.key === '[') {
        e.preventDefault();
        sendBackward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [/* dependencies */]);
}
```

**Testing Checklist**:
- [ ] Delete/Backspace deletes selected
- [ ] Cmd/Ctrl+D duplicates
- [ ] Cmd/Ctrl+C/V copy/paste
- [ ] Cmd/Ctrl+A selects all
- [ ] Escape deselects all
- [ ] Arrow keys move 10px
- [ ] Shift+Arrows move 1px
- [ ] Alt+Arrows rotate 15°
- [ ] Cmd/Ctrl+] brings forward
- [ ] Cmd/Ctrl+[ sends backward
- [ ] Shortcuts disabled during text editing

---

## Phase 3: Undo/Redo System (1 week)

### PR #20: Undo/Redo Implementation

**Goal**: Add 50-operation undo/redo history

**Files to Create**:
- `src/context/UndoContext.tsx`
- `src/hooks/useUndo.ts`

**Files to Modify**:
- `src/context/CanvasContext.tsx` - Integrate undo tracking
- All operation functions - Capture undo actions

**Implementation Steps**:

1. **Create Undo Types**:
```typescript
// undo.types.ts
type ActionType = 'create' | 'delete' | 'modify' | 'move' | 'reorder';

interface UndoAction {
  type: ActionType;
  timestamp: number;
  userId: string;
  shapeIds: string[];
  before: Shape | Shape[] | null;
  after: Shape | Shape[] | null;
}
```

2. **Create Undo Context**:
```typescript
// UndoContext.tsx
interface UndoState {
  undoStack: UndoAction[];
  redoStack: UndoAction[];
}

export function UndoProvider({ children }: { children: ReactNode }) {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);
  const MAX_STACK_SIZE = 50;

  const pushUndo = (action: UndoAction) => {
    setUndoStack(prev => {
      const newStack = [...prev, action];
      if (newStack.length > MAX_STACK_SIZE) {
        newStack.shift(); // Remove oldest
      }
      return newStack;
    });
    setRedoStack([]); // Clear redo stack
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    
    const action = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, action]);
    
    // Apply inverse action
    applyInverseAction(action);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    
    const action = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, action]);
    
    // Reapply action
    applyAction(action);
  };

  return (
    <UndoContext.Provider value={{ pushUndo, undo, redo, undoStack, redoStack }}>
      {children}
    </UndoContext.Provider>
  );
}
```

3. **Capture Actions in Canvas Operations**:
```typescript
// Example: In deleteRectangles
const deleteRectangles = (ids: string[]) => {
  const shapesToDelete = rectangles.filter(r => ids.includes(r.id));
  
  // Capture undo action BEFORE deleting
  pushUndo({
    type: 'delete',
    timestamp: Date.now(),
    userId: user.userId,
    shapeIds: ids,
    before: shapesToDelete,
    after: null
  });
  
  // Proceed with deletion...
};

// Example: In moveShape
const moveShape = (id: string, x: number, y: number) => {
  const shape = rectangles.find(r => r.id === id);
  
  pushUndo({
    type: 'move',
    timestamp: Date.now(),
    userId: user.userId,
    shapeIds: [id],
    before: { ...shape },
    after: { ...shape, x, y }
  });
  
  // Update shape...
};
```

4. **Apply Inverse Actions**:
```typescript
const applyInverseAction = async (action: UndoAction) => {
  switch (action.type) {
    case 'create':
      // Undo create = delete
      await canvasService.deleteShape(action.shapeIds[0]);
      break;
    
    case 'delete':
      // Undo delete = recreate
      for (const shape of action.before as Shape[]) {
        await canvasService.createShape(shape);
      }
      break;
    
    case 'modify':
    case 'move':
      // Restore previous state
      await canvasService.updateShape(action.shapeIds[0], action.before);
      break;
  }
};
```

5. **Add Keyboard Shortcuts**:
```typescript
// Cmd/Ctrl+Z
if (cmdCtrl && e.key === 'z' && !e.shiftKey) {
  e.preventDefault();
  undo();
}

// Cmd/Ctrl+Shift+Z
if (cmdCtrl && e.key === 'z' && e.shiftKey) {
  e.preventDefault();
  redo();
}
```

**Testing Checklist**:
- [ ] Cmd/Ctrl+Z undoes last operation
- [ ] Cmd/Ctrl+Shift+Z redoes
- [ ] Create → Undo → shape deleted
- [ ] Delete → Undo → shape recreated
- [ ] Move → Undo → shape returns to original position
- [ ] Stack limited to 50 operations
- [ ] Redo stack clears on new action
- [ ] Only user's own actions are undoable
- [ ] Toast warning if shape was modified by another user

---

## Phase 4: Enhanced UI Features (2 weeks)

### PR #21: Enhanced Color Picker + Floating Modal + Narrower Properties Panel

**Goal**: Add opacity, hex input, recent colors + Floating non-blocking picker + Slimmer properties panel

**UI Enhancements**:
- **Floating Color Picker**: Modal-style picker that doesn't block other UI (280px wide, centered)
- **Narrower Properties Panel**: 280px → 240px width (saves 40px)
- **Collapsible Sections**: Accordion-style property groups

**Files to Create**:
- `src/components/Canvas/FloatingColorPicker.tsx` (NEW: modal color picker)
- `src/components/Canvas/PropertySection.tsx` (NEW: collapsible wrapper)

**Files to Modify**:
- `src/components/Canvas/PropertiesPanel.tsx` - Narrower, collapsible, trigger floating picker
- `src/components/Canvas/CompactToolbar.tsx` - Add color picker button
- `src/types/canvas.types.ts` - Add opacity field to BaseShape
- All shape components - Apply opacity

**Implementation**:

1. **Add Opacity to Shapes**:
```typescript
interface BaseShape {
  // ... existing fields
  opacity: number; // 0-1
}
```

2. **Floating Color Picker Component** (`FloatingColorPicker.tsx`):
```typescript
interface FloatingColorPickerProps {
  onClose: () => void;
  initialColor?: string;
  initialOpacity?: number;
  onColorChange: (color: string, opacity: number) => void;
}

export function FloatingColorPicker({
  onClose,
  initialColor = '#000000',
  initialOpacity = 1,
  onColorChange
}: FloatingColorPickerProps) {
  const [color, setColor] = useState(initialColor);
  const [opacity, setOpacity] = useState(initialOpacity);
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentColors');
    return saved ? JSON.parse(saved) : [];
  });

  const applyColor = () => {
    onColorChange(color, opacity);
    addToRecentColors(color);
    onClose();
  };

  const addToRecentColors = (newColor: string) => {
    const updated = [newColor, ...recentColors.filter(c => c !== newColor)].slice(0, 10);
    localStorage.setItem('recentColors', JSON.stringify(updated));
    setRecentColors(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-20"
        onClick={onClose}
      />
      
      {/* Picker Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl p-4 w-72">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Color Picker</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
        
        {/* Current Color Preview */}
        <div className="mb-3">
          <div 
            className="w-full h-12 rounded border-2"
            style={{ backgroundColor: color, opacity }}
          />
        </div>
        
        {/* Recent Colors */}
        {recentColors.length > 0 && (
          <div className="mb-3">
            <label className="text-xs text-gray-600 mb-1 block">Recent</label>
            <div className="flex gap-2 flex-wrap">
              {recentColors.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded border hover:scale-110 transition"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Preset Colors (4x5 grid, 20 colors) */}
        <div className="mb-3">
          <label className="text-xs text-gray-600 mb-1 block">Presets</label>
          <div className="grid grid-cols-5 gap-2">
            {PRESET_COLORS.map(({ name, hex }) => (
              <button
                key={name}
                onClick={() => setColor(hex)}
                className="w-10 h-10 rounded border-2 hover:scale-110 transition"
                style={{ 
                  backgroundColor: hex,
                  borderColor: color === hex ? '#2196F3' : '#E5E7EB'
                }}
                title={name}
              />
            ))}
          </div>
        </div>
        
        {/* Hex Input */}
        <div className="mb-3">
          <label className="text-xs text-gray-600 mb-1 block">Hex</label>
          <input
            type="text"
            value={color}
            onChange={(e) => {
              const val = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                setColor(val);
              }
            }}
            className="w-full px-2 py-1 border rounded text-sm font-mono"
            placeholder="#FF0000"
          />
        </div>
        
        {/* Opacity Slider */}
        <div className="mb-4">
          <label className="text-xs text-gray-600 mb-1 block">
            Opacity: {Math.round(opacity * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity * 100}
            onChange={(e) => setOpacity(parseInt(e.target.value) / 100)}
            className="w-full"
          />
        </div>
        
        {/* Apply Button */}
        <button
          onClick={applyColor}
          className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
```

3. **Add Color Picker Button to Compact Toolbar**:
```typescript
// Update CompactToolbar.tsx
const [showColorPicker, setShowColorPicker] = useState(false);

return (
  <div className="...">
    {/* ...existing tool buttons... */}
    
    {/* Divider */}
    <div className="w-8 h-px bg-gray-300 my-1" />
    
    {/* Color Picker Button */}
    <button
      onClick={() => setShowColorPicker(true)}
      className="w-10 h-10 rounded flex items-center justify-center text-lg hover:bg-gray-100"
      title="Color Picker (P)"
    >
      🎨
    </button>
    
    {showColorPicker && (
      <FloatingColorPicker
        onClose={() => setShowColorPicker(false)}
        onColorChange={(color, opacity) => {
          // Apply to selected shape or set as default
        }}
      />
    )}
  </div>
);
```

3. **Recent Colors Logic**:
```typescript
const [recentColors, setRecentColors] = useState<string[]>(() => {
  const saved = localStorage.getItem('recentColors');
  return saved ? JSON.parse(saved) : [];
});

const addToRecentColors = (color: string) => {
  setRecentColors(prev => {
    const updated = [color, ...prev.filter(c => c !== color)].slice(0, 10);
    localStorage.setItem('recentColors', JSON.stringify(updated));
    return updated;
  });
};
```

4. **Narrower Properties Panel** (`PropertiesPanel.tsx`):
```typescript
// Update PropertiesPanel with:
// 1. Narrower width: 280px → 240px
// 2. Collapsible sections
// 3. Compact inputs (64px width for X/Y/W/H)
// 4. Smooth slide-in animation

<div 
  className={`
    fixed right-0 top-16 bottom-0 w-60 bg-white border-l shadow-lg z-20
    transition-transform duration-200 ease-in-out
    ${selectedIds.length === 0 ? 'translate-x-full' : 'translate-x-0'}
  `}
>
  <div className="p-3"> {/* Reduced from p-4 */}
    <h2 className="text-sm font-semibold mb-3">Properties</h2>
    
    {/* Position & Size Section (Collapsible) */}
    <PropertySection title="Position & Size" defaultOpen={true}>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-xs text-gray-600">X</label>
          <input 
            type="number" 
            value={shape.x}
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Y</label>
          <input 
            type="number" 
            value={shape.y}
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600">W</label>
          <input type="number" value={shape.width} className="..." />
        </div>
        <div>
          <label className="text-xs text-gray-600">H</label>
          <input type="number" value={shape.height} className="..." />
        </div>
      </div>
    </PropertySection>
    
    {/* Appearance Section (Collapsible) */}
    <PropertySection title="Appearance" defaultOpen={true}>
      {/* Color swatch that opens FloatingColorPicker */}
      <button
        onClick={() => setShowColorPicker(true)}
        className="w-full h-10 rounded border-2 flex items-center justify-between px-2"
        style={{ backgroundColor: shape.color, opacity: shape.opacity }}
      >
        <span className="text-xs text-gray-600">Color</span>
        <span className="text-xs">🎨</span>
      </button>
    </PropertySection>
    
    {/* Layer Section */}
    <PropertySection title="Layer" defaultOpen={true}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">Z-Index</span>
        <div className="flex items-center gap-2">
          <button onClick={() => decrementZIndex()} className="...">↓</button>
          <input 
            type="number" 
            value={shape.zIndex} 
            className="w-16 px-2 py-1 border rounded text-sm text-center"
          />
          <button onClick={() => incrementZIndex()} className="...">↑</button>
        </div>
      </div>
    </PropertySection>
  </div>
</div>
```

5. **PropertySection Component** (`PropertySection.tsx`):
```typescript
interface PropertySectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function PropertySection({ 
  title, 
  defaultOpen = false, 
  children 
}: PropertySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-0 py-2 flex items-center justify-between hover:bg-gray-50 text-sm font-medium"
      >
        <span>{title}</span>
        <span className="text-gray-400 text-xs">
          {isOpen ? '▼' : '►'}
        </span>
      </button>
      
      {isOpen && (
        <div className="pb-3">
          {children}
        </div>
      )}
    </div>
  );
}
```

6. **Apply Opacity in Shapes**:
```typescript
<Rect
  // ... other props
  opacity={shape.opacity}
/>
```

**Testing**: 
- [ ] Properties panel 240px wide (not 280px)
- [ ] All sections collapsible
- [ ] Color picker opens floating modal
- [ ] All inputs accessible and functional
- [ ] Panel slides in/out smoothly when selecting/deselecting

---

### PR #22: Visual Layers Panel (Compact & Sleek)

**Goal**: Add drag-to-reorder layers panel with compact Figma-inspired design

**UI Enhancements**:
- **Narrower Panel**: 280px → 240px width (saves 40px)
- **Compact Rows**: 40px → 32px height
- **Drag Handles**: Visual ⋮⋮ icon for dragging
- **Inline Actions**: Eye, lock icons in same row

**Files to Create**:
- `src/components/Canvas/LayersPanel.tsx`
- `src/components/Canvas/LayerItem.tsx`

**Dependencies**: Install `react-beautiful-dnd` or `@dnd-kit/core`

**Implementation**:

1. **Layers Panel Component**:
```typescript
// LayersPanel.tsx
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export function LayersPanel() {
  const { rectangles, reorderShapes } = useCanvas();
  
  // Sort by z-index (highest first = frontmost)
  const sortedShapes = [...rectangles].sort((a, b) => b.zIndex - a.zIndex);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    // Reorder shapes
    reorderShapes(sourceIndex, destIndex);
  };

  return (
    <div className="layers-panel w-60 bg-gray-50 border-l p-4">
      <h3 className="font-semibold mb-2">Layers</h3>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="layers">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {sortedShapes.map((shape, index) => (
                <Draggable key={shape.id} draggableId={shape.id} index={index}>
                  {(provided) => (
                    <LayerItem
                      shape={shape}
                      provided={provided}
                    />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
```

2. **Layer Item Component**:
```typescript
function LayerItem({ shape, provided }) {
  const { selectShape, toggleVisibility, toggleLock } = useCanvas();

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className="layer-item flex items-center gap-2 p-2 bg-white rounded mb-1 hover:bg-gray-100"
      onClick={() => selectShape(shape.id)}
    >
      {/* Shape Icon */}
      <div className="w-8 h-8 border rounded flex items-center justify-center">
        {getShapeIcon(shape.type)}
      </div>

      {/* Shape Name */}
      <span className="flex-1 text-sm truncate">
        {getShapeName(shape)}
      </span>

      {/* Visibility Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleVisibility(shape.id);
        }}
        className="text-gray-500 hover:text-gray-700"
      >
        {shape.visible ? <EyeIcon /> : <EyeOffIcon />}
      </button>

      {/* Lock Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleLock(shape.id);
        }}
        className="text-gray-500 hover:text-gray-700"
      >
        {shape.locked ? <LockIcon /> : <UnlockIcon />}
      </button>
    </div>
  );
}
```

3. **Reorder Function**:
```typescript
const reorderShapes = async (sourceIndex: number, destIndex: number) => {
  const sorted = [...rectangles].sort((a, b) => b.zIndex - a.zIndex);
  const movedShape = sorted[sourceIndex];
  
  // Calculate new z-index
  let newZIndex: number;
  if (destIndex === 0) {
    // Move to front
    newZIndex = sorted[0].zIndex + 1;
  } else if (destIndex === sorted.length - 1) {
    // Move to back
    newZIndex = sorted[sorted.length - 1].zIndex - 1;
  } else {
    // Move between two layers
    const above = sorted[destIndex - 1].zIndex;
    const below = sorted[destIndex].zIndex;
    newZIndex = (above + below) / 2;
  }
  
  // Update via atomic 3-phase z-index update
  await manualSetZIndex(movedShape.id, Math.round(newZIndex));
};
```

4. **Visibility & Lock Logic**:
```typescript
const toggleVisibility = async (id: string) => {
  const shape = rectangles.find(r => r.id === id);
  await canvasService.updateShape(id, { visible: !shape.visible });
};

const toggleLock = async (id: string) => {
  const shape = rectangles.find(r => r.id === id);
  await canvasService.updateShape(id, { locked: !shape.locked });
};

// In shape components: Don't allow drag if locked
<Rect
  draggable={!shape.locked}
  listening={shape.visible && !shape.locked}
  opacity={shape.visible ? shape.opacity : 0.3}
  // ...
/>
```

**Testing Checklist**:
- [ ] Layers panel shows all shapes
- [ ] Drag-to-reorder updates z-index
- [ ] Eye icon toggles visibility
- [ ] Lock icon prevents editing
- [ ] Click layer selects shape on canvas
- [ ] Panel scrolls with 50+ shapes

---

### PR #23: Connection Status & Offline Persistence

**Goal**: Show connection status and enable offline mode

**Files to Create**:
- `src/components/ConnectionStatus.tsx`

**Files to Modify**:
- `src/services/firebase.ts` - Enable persistence
- `src/components/Layout/Header.tsx` - Add status indicator

**Implementation**:

1. **Enable Firestore Offline Persistence**:
```typescript
// firebase.ts
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence only in one tab');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser doesn\'t support persistence');
  }
});
```

2. **Connection Status Component**:
```typescript
export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const connectedRef = ref(database, '.info/connected');
    
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val();
      setIsConnected(connected);
      
      if (!connected) {
        toast.error('Connection lost. Changes will sync when reconnected.', {
          id: 'connection-lost'
        });
      } else {
        toast.success('Reconnected. Syncing changes...', {
          id: 'connection-restored'
        });
      }
    });
    
    return unsubscribe;
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
        title={isConnected ? 'Connected' : 'Disconnected'}
      />
      <span className="text-xs text-gray-600">
        {isConnected ? 'Connected' : 'Offline'}
      </span>
    </div>
  );
}
```

3. **Add to Header**:
```typescript
// Header.tsx
<header className="flex justify-between items-center">
  <div>CollabCanvas</div>
  
  <div className="flex items-center gap-4">
    <ConnectionStatus />
    <ActiveUsers />
    {/* ... rest of header */}
  </div>
</header>
```

**Testing**:
- [ ] Green dot when connected
- [ ] Red dot when disconnected
- [ ] Toast appears on disconnect/reconnect
- [ ] Offline edits queue and sync on reconnect

---

## Phase 5: Collaborative Comments (1 week)

### PR #24: Comments System

**Goal**: Add collaborative comments to shapes

**Files to Create**:
- `src/components/Comments/CommentsPanel.tsx`
- `src/components/Comments/CommentItem.tsx`
- `src/components/Comments/CommentForm.tsx`
- `src/services/comments.service.ts`
- `src/types/comment.types.ts`

**Files to Modify**:
- All shape components - Add comment bubble indicator
- `src/components/Layout/MainLayout.tsx` - Add comments panel
- Firestore security rules - Allow comments

**Implementation**:

1. **Comment Types**:
```typescript
// comment.types.ts
export interface Comment {
  id: string;
  canvasId: string;
  shapeId: string | null;
  userId: string;
  userName: string;
  text: string;
  timestamp: Timestamp;
  resolved: boolean;
  replies: Reply[];
}

export interface Reply {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Timestamp;
}
```

2. **Comments Service**:
```typescript
// comments.service.ts
import { collection, doc, setDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const COMMENTS_COLLECTION = 'comments';

export async function createComment(comment: Omit<Comment, 'id'>): Promise<string> {
  const docRef = doc(collection(db, COMMENTS_COLLECTION));
  await setDoc(docRef, {
    ...comment,
    timestamp: Timestamp.now()
  });
  return docRef.id;
}

export function subscribeToComments(
  canvasId: string,
  callback: (comments: Comment[]) => void
): () => void {
  const q = query(
    collection(db, COMMENTS_COLLECTION),
    where('canvasId', '==', canvasId)
  );

  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Comment));
    callback(comments);
  });
}

export async function resolveComment(commentId: string): Promise<void> {
  const docRef = doc(db, COMMENTS_COLLECTION, commentId);
  await setDoc(docRef, { resolved: true }, { merge: true });
}

export async function addReply(commentId: string, reply: Omit<Reply, 'id'>): Promise<void> {
  // Fetch comment, add reply, update doc
}
```

3. **Comments Panel**:
```typescript
// CommentsPanel.tsx
export function CommentsPanel() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');

  useEffect(() => {
    const unsubscribe = subscribeToComments(CANVAS_ID, setComments);
    return unsubscribe;
  }, []);

  const filteredComments = filter === 'unresolved'
    ? comments.filter(c => !c.resolved)
    : comments;

  return (
    <div className="comments-panel w-80 bg-gray-50 border-l p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Comments</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="unresolved">Unresolved</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="space-y-3">
        {filteredComments.map(comment => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      <CommentForm />
    </div>
  );
}
```

4. **Comment Bubble Indicator** (on shapes):
```typescript
// In shape components
const shapeComments = comments.filter(c => c.shapeId === shape.id);
const hasComments = shapeComments.length > 0;

{hasComments && (
  <Circle
    x={shape.x + shape.width + 10}
    y={shape.y - 10}
    radius={8}
    fill="#FFA500"
    onClick={(e) => {
      e.cancelBubble = true;
      openCommentsPanel();
      highlightComment(shapeComments[0].id);
    }}
  />
  <Text
    x={shape.x + shape.width + 5}
    y={shape.y - 15}
    text={shapeComments.length.toString()}
    fontSize={12}
    fill="white"
  />
)}
```

5. **Firestore Security Rules**:
```
match /comments/{commentId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update: if request.auth != null;
  allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
```

**Testing Checklist**:
- [ ] Right-click shape → "Add comment"
- [ ] Comment appears in panel
- [ ] Other users see comment real-time
- [ ] Reply functionality works
- [ ] Resolve/unresolve works
- [ ] Filter by unresolved
- [ ] Comment bubble shows on shapes
- [ ] Click bubble highlights comment

---

## Documentation & Testing

### PR #25: README Update

**Goal**: Complete documentation for submission

**File to Update**: `README.md`

**Required Sections**:
1. Project overview
2. Features list (comprehensive)
3. Tech stack
4. Setup instructions
   - Clone repo
   - Install dependencies
   - Firebase configuration
   - Environment variables
   - Run locally
5. Testing instructions
6. Deployment guide
7. Architecture overview
8. Known issues
9. Roadmap

**Example Structure**:
```markdown
# CollabCanvas

Real-time collaborative design tool with 5 shape types, multi-selection, undo/redo, and more.

## Features
- 5 shape types: Rectangle, Circle, Triangle, Line, Text
- Real-time sync (<100ms objects, <50ms cursors)
- Multi-selection (shift-click, drag-select)
- Undo/redo (50 operations)
- 15+ keyboard shortcuts
- Collaborative comments
- Visual layers panel with drag-to-reorder
- Rotation on all shapes
- Copy/paste, duplicate
- Enhanced color picker with opacity
- Connection status & offline mode
- Google Sign-In authentication

## Tech Stack
- React 18 + TypeScript
- Firebase (Firestore, RTDB, Auth, Hosting)
- Konva.js for canvas rendering
- Tailwind CSS for styling
- React Beautiful DnD for layers

## Quick Start
\`\`\`bash
git clone https://github.com/yourusername/collab-canvas.git
cd collab-canvas/collabcanvas
npm install
# Add .env.local with Firebase config
npm start
\`\`\`

## Architecture
- **Firestore**: Persistent shape data
- **RTDB**: Ephemeral data (cursors, edits, presence, live positions)
- **Optimistic Updates**: Local-first with async sync
- **Last-Write-Wins**: Conflict resolution strategy
```

---

### PR #26: Performance Testing & Optimization

**Goal**: Verify rubric performance targets

**Testing Script**:
```typescript
// performance-test.ts
describe('Performance Tests', () => {
  it('should maintain 60 FPS with 500 shapes', async () => {
    // Create 500 mixed shapes
    for (let i = 0; i < 500; i++) {
      await createRandomShape();
    }
    
    // Measure FPS during pan/zoom
    const fps = await measureFPS(() => {
      panCanvas(100, 100);
      zoomCanvas(1.5);
    });
    
    expect(fps).toBeGreaterThan(60);
  });

  it('should sync in <100ms', async () => {
    // User A creates shape
    const startTime = Date.now();
    await userA.createShape();
    
    // Wait for User B to receive
    await userB.waitForShape();
    const syncTime = Date.now() - startTime;
    
    expect(syncTime).toBeLessThan(100);
  });
});
```

**Manual Testing Checklist**:
- [ ] 500+ shapes at 60 FPS
- [ ] 5+ concurrent users
- [ ] Object sync <100ms
- [ ] Cursor sync <50ms
- [ ] Delete vs edit conflict resolved
- [ ] Mid-operation refresh preserves state
- [ ] Offline edits queue and sync
- [ ] All keyboard shortcuts work
- [ ] Multi-select works smoothly
- [ ] Undo/redo works correctly
- [ ] Comments sync real-time
- [ ] Layers panel smooth with 100+ shapes

---

## Summary

**Total PRs**: 26  
**Estimated Time**: 7-8 weeks  
**Target Score**: 80/80 points (Excellent)

**Phase Timeline**:
- Phase 1 (PRs 10-14): 2 weeks
- Phase 2 (PRs 15-19): 1 week
- Phase 3 (PR 20): 1 week
- Phase 4 (PRs 21-23): 2 weeks
- Phase 5 (PR 24): 1 week
- Documentation (PRs 25-26): As needed

**Next Actions**:
1. Review and approve this task list
2. Start with PR #10 (Circle Shape)
3. Test continuously against rubric
4. Deploy to staging after each phase
5. Promote to production when complete

---

**Document Version**: 1.0  
**Based On**: PRD_Figma_2.2.md  
**Last Updated**: [Current Date]  
**Status**: Ready for Implementation

