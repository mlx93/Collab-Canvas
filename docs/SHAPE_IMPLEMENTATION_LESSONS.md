# Shape Implementation Lessons Learned

## Overview
This document captures all the critical fixes and patterns discovered while implementing the Circle shape. These lessons MUST be applied to all future shapes (Triangle, Line, Text).

---

## 1. Firestore Data Loading (canvas.service.ts)

### ❌ Problem
`subscribeToShapes` was only loading `width` and `height` fields, causing circles to lose their `radius` field when loaded from Firestore.

### ✅ Solution
Load shape-specific fields conditionally based on `type`:

```typescript
const shape: any = {
  // Common fields
  id: doc.id,
  type: data.type || 'rectangle',
  x: data.x,
  y: data.y,
  color: data.color,
  rotation: data.rotation ?? 0,
  opacity: data.opacity ?? 1,
  zIndex: data.zIndex,
  // ... other common fields
};

// Add shape-specific properties
if (data.type === 'rectangle' || !data.type) {
  shape.width = data.width;
  shape.height = data.height;
} else if (data.type === 'circle') {
  shape.radius = data.radius;
} else if (data.type === 'triangle') {
  shape.width = data.width;
  shape.height = data.height;
}
// TODO: Add line, text properties
```

**Action for new shapes**: Add a new conditional block for each shape type's unique properties.

### 🔴 CRITICAL: This is the #1 cause of shapes flickering and disappearing!
If you add a new shape and it flickers away after creation, **CHECK THIS FIRST**. Without loading the shape-specific fields from Firestore, the shape will appear to "lose" its data when the subscription updates, causing it to disappear.

---

## 2. Temporary ID Matching (CanvasContext.tsx)

### ❌ Problem
When circles were created with temporary IDs, they flickered away because the matching logic only checked rectangle-specific properties (width/height).

### ✅ Solution
Match shape-specific properties based on type:

```typescript
// Check shape-specific properties (use as any to bypass TypeScript narrowing)
let shapeSpecificMatch = false;
const sAny = s as any;
const tempAny = tempShape as any;

if (sAny.type === 'rectangle') {
  shapeSpecificMatch = Math.abs(sAny.width - tempAny.width) < 1 &&
                      Math.abs(sAny.height - tempAny.height) < 1;
}

if (sAny.type === 'circle') {
  shapeSpecificMatch = Math.abs(sAny.radius - tempAny.radius) < 1;
}
```

**Action for new shapes**: Add matching logic for shape-specific dimensions (e.g., triangle: width/height, line: x2/y2, text: width/text content).

---

## 3. Canvas Rendering with renderOnlyIndicator

### ❌ Problem
Circles were rendering twice (main layer + indicators layer), causing visual artifacts and incorrect borders.

### ✅ Solution
Always pass `renderOnlyIndicator={true}` to shapes in the indicators layer:

```typescript
// Indicators Layer
{rectangles.map((shape) => {
  if (shape.type === 'circle') {
    return (
      <Circle
        key={`indicator-${shape.id}`}
        circle={shape}
        isSelected={false}
        onSelect={() => {}}
        showIndicator={true}
        renderOnlyIndicator={true}  // ← CRITICAL
      />
    );
  }
})}
```

**Action for new shapes**: Always implement `renderOnlyIndicator` prop and handle it early in the component.

---

## 4. Selection Border Styling

### ❌ Problem
Circle border was thinner than rectangle border and scaled with zoom.

### ✅ Solution
Match Rectangle's exact border styling:

```typescript
stroke={isSelected ? '#1565C0' : undefined}  // Dark blue (same as Rectangle)
strokeWidth={isSelected ? 4 : 0}              // 4px (same as Rectangle)
strokeScaleEnabled={false}                    // Keep constant when zooming
```

**Key principles**:
- Use `#1565C0` (dark blue) for selection
- Use `strokeWidth: 4` for all shapes
- Always set `strokeScaleEnabled={false}` to keep borders crisp at all zoom levels

**Action for new shapes**: Copy these exact stroke properties.

---

## 5. Resize Sensitivity (Delta-based, not Absolute)

### ❌ Problem
Initial circle resize calculated radius from absolute pointer distance to center, causing it to "blow up" too easily.

### ✅ Solution
Use **delta from initial click position** (like Rectangle does):

```typescript
const initialPointerPos = stage.getPointerPosition();
const initialRadius = circleNode.radius();

const handleMouseMove = () => {
  const pointerPos = stage.getPointerPosition();
  
  // Calculate delta from INITIAL position (not absolute distance)
  const deltaX = pointerPos.x - initialPointerPos.x;
  
  // Apply delta to initial size
  let newRadius = initialRadius + deltaX;
  newRadius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, newRadius));
  
  circleNode.radius(newRadius);
};
```

**Key principle**: Always calculate resize based on **change from starting point**, not absolute pointer position.

**Action for new shapes**: For triangles, use delta for width/height. For lines, use delta for endpoints.

---

## 6. Live Resize Streaming

### ❌ Problem
Circle resizing wasn't visible in other browsers in real-time.

### ✅ Solution
Stream live position updates **during resize** (not just during drag):

```typescript
const handleMouseMove = () => {
  // ... resize logic ...
  
  // Stream to RTDB (throttled to 60 FPS)
  if (user) {
    throttledLivePositionUpdate.current(
      circle.id,
      user.userId,
      centerX,
      centerY,
      newRadius
    );
  }
};
```

**Action for new shapes**: Always stream live position during ANY interactive operation (drag, resize, rotate).

---

## 7. Resize Handle Following During Drag

### ❌ Problem
Resize handle stayed in place when dragging the circle, looking glitchy.

### ✅ Solution
Update resize handle position during drag:

```typescript
const handleDragMove = (e) => {
  const x = node.x();
  const y = node.y();
  
  // Update resize handle position
  if (handleRef.current) {
    handleRef.current.x(x + circle.radius);
    handleRef.current.y(y);
  }
  
  // Force re-render
  forceUpdate({});
};
```

**Action for new shapes**: Always update ALL visual handles (resize, rotate, etc.) during drag operations.

---

## 7a. Cursor Position During Drag (Multi-user)

### ❌ Problem
When dragging a shape, the cursor in other browsers was being positioned at the center of the shape, not at the actual mouse position where the user was clicking/dragging. This made the cursor "jump" to the center and didn't accurately represent where the user was grabbing the shape.

### ✅ Solution
Use `stage.getPointerPosition()` to get the **actual mouse position**, then convert from screen coordinates to canvas coordinates:

```typescript
const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
  const node = e.target;
  const stage = node.getStage();
  
  // Update cursor to ACTUAL mouse position in canvas coordinates
  if (updateOwnCursor && stage) {
    const pointerPos = stage.getPointerPosition();
    if (pointerPos) {
      // CRITICAL: Convert screen coordinates to canvas coordinates
      // Account for viewport pan (x, y) and zoom (scale)
      const canvasX = (pointerPos.x - viewport.x) / viewport.scale;
      const canvasY = (pointerPos.y - viewport.y) / viewport.scale;
      updateOwnCursor(canvasX, canvasY);
    }
  }
  
  // ... rest of drag logic
};
```

**Key principle**: 
1. Use `stage.getPointerPosition()` to get the real cursor location in **screen coordinates**
2. **Convert to canvas coordinates** by applying the inverse viewport transformation: `(screenPos - pan) / scale`

**Why this matters**: 
- `stage.getPointerPosition()` returns screen pixels, but cursors in other browsers need canvas coordinates
- Without the transformation, cursors appear offset when users pan/zoom differently
- This ensures accurate cursor positioning regardless of each user's viewport state

---

## 7b. Live Visual Feedback During Resize

### ❌ Problem (Triangle)
When resizing a triangle, only the resize handle moved - the triangle shape itself didn't update until the resize was complete. This made the handle appear "untethered" from the triangle.

### ✅ Solution
Add local state to track resize dimensions and use it for rendering during active resize:

```typescript
// Add state for resize dimensions
const [resizeDimensions, setResizeDimensions] = useState<{ width: number; height: number } | null>(null);

// Update currentPos calculation to use resize dimensions when actively resizing
const currentPos = livePosition && livePosition.userId !== user?.userId
  ? { x: livePosition.x, y: livePosition.y, width: livePosition.width, height: livePosition.height }
  : resizeDimensions && isResizing
  ? { x: triangle.x, y: triangle.y, width: resizeDimensions.width, height: resizeDimensions.height }
  : { x: triangle.x, y: triangle.y, width: triangle.width, height: triangle.height };

// In handleMouseMove during resize:
const handleMouseMove = () => {
  // ... calculate newWidth, newHeight ...
  
  // Update resize dimensions for visual feedback
  setResizeDimensions({ width: newWidth, height: newHeight });
  
  // Update handle position
  handle.x(anchorX + newWidth);
  handle.y(anchorY + newHeight);
  
  // Stream to RTDB and force re-render
  // ...
};

// In handleMouseUp:
const handleMouseUp = async () => {
  // Clear resize dimensions after resize completes
  setResizeDimensions(null);
  
  // Update Firestore with final dimensions
  await updateRectangle(triangle.id, {
    width: finalWidth,
    height: finalHeight,
    lastModifiedBy: user?.email || triangle.createdBy,
  });
  
  clearActiveEdit(triangle.id);
  setIsResizing(false);
};
```

**Key principle**: For shapes where resize changes visual geometry (triangles, lines, etc.), use local state to show intermediate resize states. For shapes where resize only changes size parameters (circles, rectangles), the Konva node itself can be updated directly.

**Action for new shapes**: 
- **Line**: Will need resize state for both endpoints
- **Text**: May need resize state for width (if wrapping is dynamic)

---

## 8. Toolbar Icon Styling

### ❌ Problem
Emoji icons (⭕) looked inconsistent and weren't customizable.

### ✅ Solution
Use CSS-styled divs for shape icons to match the design system:

```typescript
{tool.id === 'circle' ? (
  <div className="w-5 h-5 rounded-full bg-gray-600" />
) : (
  <span className="text-gray-600">{tool.icon}</span>
)}
```

**Action for new shapes**: 
- **Triangle**: `<div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[17px] border-b-gray-600" />`
- **Line**: `<div className="w-5 h-0.5 bg-gray-600 rotate-45" />`
- **Text**: Use text icon `"T"` or `"Aa"`

---

## 9. TypeScript Type Safety with Discriminated Unions

### ❌ Problem
TypeScript couldn't narrow `Shape` union type properly in conditional blocks, causing compilation errors.

### ✅ Solution
Use `as any` for intermediate variables when checking shape-specific properties:

```typescript
const sAny = s as any;
const tempAny = tempShape as any;

if (sAny.type === 'circle') {
  // Now can safely access sAny.radius
}
```

**Alternative**: Cast after type check:
```typescript
if (s.type === 'circle') {
  const sCircle = s as CircleShape;
  // Use sCircle.radius
}
```

**Action for new shapes**: Be prepared to use type assertions when TypeScript's type narrowing fails.

---

## 10. Component Structure Pattern

### ✅ Required Props
```typescript
interface ShapeProps {
  shape: ShapeType;           // Specific shape type
  isSelected: boolean;
  onSelect: () => void;        // MUST be called in handleDragStart
  showIndicator?: boolean;
  renderOnlyIndicator?: boolean;  // For indicators layer
  updateOwnCursor?: (x: number, y: number) => void;
}
```

### ✅ Drag Start Handler Pattern
**CRITICAL**: Always call `onSelect()` at the start of drag to ensure the shape is selected before any edits:

```typescript
const handleDragStart = () => {
  if (!user?.userId || !user?.email) return;
  setIsDragging(true);
  
  // SELECT THE SHAPE - User cannot edit unselected shapes
  onSelect();
  
  // Set active edit state
  const cursorColor = getUserCursorColor(user.email);
  const firstName = user.firstName || user.email.split('@')[0];
  setActiveEdit(shape.id, user.userId, user.email, firstName, 'moving', cursorColor);
};
```

**Why this matters**: A user should never be able to drag/edit a shape without it being selected. This ensures the properties panel updates and the shape has visual selection feedback.

### ✅ Required State
```typescript
const [isDragging, setIsDragging] = useState(false);
const [isResizing, setIsResizing] = useState(false);
const [, forceUpdate] = useState({});  // For manual re-renders
const [activeEdit, setActiveEditState] = useState<ActiveEdit | null>(null);
const [livePosition, setLivePositionState] = useState<LivePosition | null>(null);
```

### ✅ Required Refs
```typescript
const shapeRef = useRef<Konva.Shape>(null);
const handleRef = useRef<Konva.Circle>(null);
```

### ✅ Required Hooks
```typescript
// Subscribe to active edits
useEffect(() => {
  const unsubscribe = subscribeToActiveEdit(shape.id, (edit) => {
    if (edit && edit.userId !== user?.userId) {
      setActiveEditState(edit);
    } else {
      setActiveEditState(null);
    }
  });
  return unsubscribe;
}, [shape.id, user?.userId]);

// Subscribe to live positions (only when another user is editing)
useEffect(() => {
  if (!activeEdit) {
    setLivePositionState(null);
    return;
  }
  // ... subscription logic
}, [shape.id, user?.userId, activeEdit]);
```

---

## 11. Properties Panel Shape-Specific Fields

### ✅ Solution
Conditionally render shape-specific properties:

```typescript
{selectedRectangle.type === 'rectangle' && (
  <>
    <div>Width: {selectedRectangle.width}px</div>
    <div>Height: {selectedRectangle.height}px</div>
  </>
)}

{selectedRectangle.type === 'circle' && (
  <div>Radius: {selectedRectangle.radius}px</div>
)}
```

**Action for new shapes**: Add conditional blocks in `PropertiesPanel.tsx` for shape-specific properties.

---

## Summary Checklist for New Shapes

When implementing Triangle, Line, or Text:

- [ ] Add shape-specific fields to Firestore loading in `canvas.service.ts` (**CRITICAL - #1 cause of flickering!**)
- [ ] Add temp ID matching logic in `CanvasContext.tsx`
- [ ] Pass `renderOnlyIndicator={true}` in indicators layer
- [ ] Use exact border styling (`stroke='#1565C0'`, `strokeWidth={4}`, `strokeScaleEnabled={false}`)
- [ ] **Call `onSelect()` in `handleDragStart` to auto-select shape when dragging starts**
- [ ] Implement delta-based resizing (not absolute position)
- [ ] Stream live position updates during ALL interactive operations
- [ ] Update ALL visual handles during drag
- [ ] **Use `stage.getPointerPosition()` for `updateOwnCursor` (shows actual mouse position)**
- [ ] **Add `resizeDimensions` state for shapes with complex geometry (triangles, lines)**
- [ ] Create CSS-styled toolbar icon (larger, grey color)
- [ ] Handle TypeScript type narrowing with `as any` when needed
- [ ] Follow the component structure pattern (props, state, refs, hooks)
- [ ] Add shape-specific fields to `PropertiesPanel.tsx`
- [ ] Test in multiple browsers for real-time collaboration
- [ ] Test drag, resize, color change, z-index, delete
- [ ] **Verify shape auto-selects when starting to drag**
- [ ] **Verify resize handle stays attached during resize**
- [ ] **Verify cursor appears centered when dragging in other browsers**

---

## Performance Notes

- **Throttle live updates to 16ms (60 FPS)** for smooth performance
- **Use `perfectDrawEnabled={false}`** on all Konva shapes for better performance
- **Memoize shape components** with `React.memo()` to prevent unnecessary re-renders
- **Clear live position after 1000ms grace period** to prevent flicker

---

## Files Modified for Circle Implementation

1. `src/types/canvas.types.ts` - Added `CircleShape` interface
2. `src/context/CanvasContext.tsx` - Added `addCircle`, temp ID matching
3. `src/services/canvas.service.ts` - Added circle field loading
4. `src/components/Canvas/Circle.tsx` - New component
5. `src/components/Canvas/Canvas.tsx` - Added circle rendering
6. `src/components/Canvas/CompactToolbar.tsx` - Added circle button
7. `src/components/Canvas/PropertiesPanel.tsx` - Added radius display

**Action for new shapes**: Modify these same 7 files.

