CollabCanvas Enhanced Features - Product Requirements Document v1.1
Project Overview
This PRD outlines the enhanced features to be added to the existing CollabCanvas MVP to achieve "Excellent" scoring on the rubric. These features build upon the solid collaborative infrastructure already in place.
Goal: Transform the MVP into a professional-grade collaborative design tool by adding essential shape types, multi-selection, undo/redo, and improved UI features while maintaining the excellent real-time synchronization performance.

Current State Assessment
What's Working Well (No Changes Needed)

Collaborative Infrastructure: Optimistic updates with "last write wins" conflict resolution
Real-time Sync: Sub-100ms object sync achieved via Firestore + optimistic updates
Cursor Sync: Sub-50ms achieved via RTDB with 16ms throttling
Persistence: Full state recovery on refresh via Firestore
Authentication: Email/password with user profiles

Areas Needing Enhancement

Limited Shapes: Only rectangles currently
No Multi-select: Single selection only
No Undo/Redo: Users can't reverse actions
Basic Color Picker: Only 5 predefined colors
No Text Support: Can't add text elements
Missing Keyboard Shortcuts: Only Delete key works


Gap Analysis for Rubric Excellence
Section 1: Core Collaborative Infrastructure (30 points)
Current Score: ~27/30 - Strong foundation, minor enhancements needed
Section 2: Canvas Features & Performance (20 points)
Current Score: ~5/20 - Needs significant feature additions
Required for Excellent:

✅ 3+ shape types (adding circle, triangle, line, text)
✅ Text with formatting (adding with font options)
✅ Multi-select (adding shift-click and drag-select)
✅ Transform operations (adding rotation to all shapes)
✅ Duplicate/delete (adding duplicate operation)
✅ Layer management (adding visual layers panel)

Section 3: Advanced Figma-Inspired Features (15 points)
Target Score: 13-15/15 - Excellent tier

Tier 1 (6 points): Color picker, Undo/redo, Keyboard shortcuts, Copy/paste
Tier 2 (6 points): Layers panel with drag-to-reorder, Z-index management
Tier 3 (3 points): Collaborative comments/annotations


Enhanced Features Specification
1. Extended Shape Types
1.1 Circle Shape

Creation: Click "Create Circle" button → 100x100px circle at viewport center
Data Structure: { type: 'circle', x, y, radius, color, rotation, zIndex, ...metadata }
Resize: Maintain aspect ratio (circular), drag corner to resize
Rotation: Shift+drag to rotate around center
Identification: Auto-named "Circle 1", "Circle 2", etc.

1.2 Triangle Shape

Creation: Click "Create Triangle" button → equilateral triangle (100px sides)
Data Structure: { type: 'triangle', x, y, width, height, color, rotation, zIndex, ...metadata }
Resize: Free resize or hold Shift for aspect ratio lock
Rotation: Shift+drag to rotate around center
Identification: Auto-named "Triangle 1", "Triangle 2", etc.

1.3 Line Shape

Creation: Click "Create Line" → click-drag to set endpoints
Data Structure: { type: 'line', points: [x1, y1, x2, y2], strokeWidth, color, rotation, zIndex, ...metadata }
Edit: Drag endpoints to adjust, drag middle to move
Resize: Not applicable - edit endpoints instead
Style: Adjustable stroke width (1-10px)
Identification: Auto-named "Line 1", "Line 2", etc.
Note: Straight lines only, no curves or arrows in this version

1.4 Text Layers

Creation: Click "Create Text" → click canvas to place → type directly
Data Structure: { type: 'text', x, y, text, fontSize, fontFamily, color, rotation, zIndex, ...metadata }
Formatting Options:

Font size: 12-72px
Font family: Sans-serif, Serif, Monospace
Text alignment: Left, Center, Right
Bold, Italic toggles


Edit: Double-click to enter edit mode
Resize: Adjusts font size, not bounding box
Identification: Uses first 20 chars of text content as name

2. Transform Operations System
2.1 Transform Handles (Visual UI)
When a shape is selected, the following handles appear:

Resize Handles: 8 handles (4 corners + 4 edges)

Corner handles: Free resize with optional Shift for aspect ratio
Edge handles: Resize in one dimension only
Visual: Small squares (8x8px) with hover state


Rotation Handle: Circle icon 20px above shape

Visual: Circular arrow icon
Hover state: Cursor changes to rotate cursor
While rotating: Display degrees in tooltip


Transform Origin: Center point indicator

Visual: Small crosshair at shape center
Used as pivot for rotation



2.2 Universal Rotation System

Applies to: All shapes including existing rectangles
Interaction Methods:

Drag rotation handle in circular motion
Keyboard: Alt+Arrow keys for 15° increments
Properties panel: Direct degree input


Snapping: Hold Shift for 15° snapping (0°, 15°, 30°, 45°, etc.)
Data Update: Add rotation: number (degrees) to all shape types
Real-time Sync: Rotation updates stream via livePositions during drag
Visual Feedback: Show rotation degrees while rotating

2.3 Multi-Shape Transform Behavior

Multiple Selection + Move: All shapes move together maintaining relative positions
Multiple Selection + Rotate: Rotate around common center point
Multiple Selection + Resize: Scale all shapes proportionally from common center
Multiple Selection + Color: Apply color to all selected shapes

3. Layer Management System
3.1 Layers Panel UI

Location: Right sidebar, below properties panel
Height: 300px with scroll
Layer Item Display:

Thumbnail preview (32x32px)
Shape type icon
Shape name (editable)
Visibility toggle (eye icon)
Lock toggle (padlock icon)



3.2 Layer Operations

Reorder via Drag: Click and drag layers to reorder z-index
Multi-select: Ctrl/Shift click for multiple layers
Context Menu (right-click):

Bring to Front
Send to Back
Bring Forward
Send Backward
Duplicate Layer
Delete Layer
Lock/Unlock
Hide/Show



3.3 Layer Grouping

Create Group: Select multiple layers → Ctrl+G
Group Behavior: Move/transform as single unit
Ungroup: Ctrl+Shift+G
Visual: Folder icon with expand/collapse

4. Multi-Selection System
Selection Methods

Shift-click: Add/remove individual shapes to selection
Drag-select: Draw rectangle to select multiple shapes
Ctrl/Cmd+A: Select all shapes
Escape: Deselect all

Multi-Selection Behavior

Visual: Light blue outline for all selected shapes
Properties Panel: Shows common properties only
Operations: Move, delete, duplicate, copy/paste work on all selected
Real-time Sync: Selection state remains ephemeral in RTDB per user

5. Shape Identification System
Auto-naming Convention
typescriptinterface Shape {
  id: string;  // Firebase auto-generated
  name: string; // User-editable, defaults:
                // "Rectangle 1", "Circle 2", "Triangle 3", etc.
  displayName?: string; // For UI display, falls back to name
  // ... rest of properties
}
AI Command Resolution
When user says "Move the blue rectangle":

Filter shapes by type and color
If single match → execute
If multiple matches → use most recently created/edited
If ambiguous → prompt for clarification

6. Undo/Redo System
Implementation

Stack Limit: Last 50 operations per user
Scope: User's own actions only (not other users' changes)
Keyboard: Cmd/Ctrl+Z (undo), Cmd/Ctrl+Shift+Z (redo)
Persistence: Undo stack is session-only (not persisted)

Undoable Operations

Create shape
Delete shape(s)
Move shape(s)
Resize shape
Rotate shape
Change color
Edit text
Reorder layers
Group/ungroup

Conflict Handling

If shape was deleted by another user → skip undo operation
If shape was modified by another user → show warning toast

7. Keyboard Shortcuts
ShortcutActionDelete/BackspaceDelete selected shapesCmd/Ctrl+DDuplicate selected shapesCmd/Ctrl+CCopy selected shapesCmd/Ctrl+VPaste shapesCmd/Ctrl+ZUndoCmd/Ctrl+Shift+ZRedoArrow KeysMove selected shapes (10px)Shift+ArrowsMove selected shapes (1px)Alt+ArrowsRotate selected shapes (15°)Cmd/Ctrl+ASelect allEscapeDeselect allCmd/Ctrl+]Bring forwardCmd/Ctrl+[Send backwardCmd/Ctrl+Shift+]Bring to frontCmd/Ctrl+Shift+[Send to backCmd/Ctrl+GGroup selectedCmd/Ctrl+Shift+GUngroup
8. Enhanced Color Picker
Features

Color Wheel: HSL color picker
Recent Colors: Last 10 used colors
Preset Palette: 20 common colors
Hex Input: Manual color code entry
Opacity Slider: 0-100% transparency
Eyedropper: Pick color from canvas (future)

9. Copy/Paste System
Behavior

Copy: Stores shape data in clipboard (session memory)
Paste: Creates new shapes with offset (+20px X/Y)
Cross-Session: Clipboard clears on page refresh
Multi-Select: Copy/paste multiple shapes maintains relative positions

10. Collaborative Comments/Annotations (Tier 3 Feature)
Implementation

Trigger: Right-click shape → "Add comment"
Data Structure:

typescriptinterface Comment {
  id: string;
  shapeId: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Timestamp;
  resolved: boolean;
  replies: Reply[];
}

Storage: Firestore at /canvases/default-canvas/comments/{commentId}
Visual: Small comment bubble icon on shapes with comments
Panel: Comments panel slides out from right side
Real-time: Comments sync instantly via existing Firestore infrastructure
Notifications: Badge count for unread comments

11. Delete vs Edit Conflict Resolution
Enhanced Deletion Handling
When a shape is deleted:

Immediate RTDB broadcast: Send high-priority deletion event
Clear activeEdits: Remove shape from all activeEdits immediately
Revert optimistic updates: Other users editing see shape disappear
Firestore sync: Mark as deleted (soft delete with deletedAt timestamp)
Grace period: 500ms delay before hard delete (allows undo)

javascriptasync function deleteShape(shapeId: string) {
  // 1. Broadcast deletion intent via RTDB
  await database.ref(`/deletions/${canvasId}/${shapeId}`).set({
    deletedBy: currentUser.id,
    timestamp: Date.now()
  });
  
  // 2. Clear from activeEdits
  await database.ref(`/activeEdits/${canvasId}/${shapeId}`).remove();
  
  // 3. Soft delete in Firestore
  await firestore.doc(`canvases/${canvasId}/shapes/${shapeId}`)
    .update({ 
      deletedAt: Timestamp.now(),
      deletedBy: currentUser.id 
    });
  
  // 4. Hard delete after grace period
  setTimeout(() => {
    firestore.doc(`canvases/${canvasId}/shapes/${shapeId}`).delete();
  }, 500);
}

Connection Status & Persistence
Connection Status Indicator

Visual: Status dot in top-right header

🟢 Green: Connected
🟡 Yellow: Slow connection (>200ms latency)
🔴 Red: Disconnected


Implementation:

javascript// Monitor connection state
firebase.database().ref('.info/connected').on('value', (snapshot) => {
  const isConnected = snapshot.val();
  updateConnectionStatus(isConnected);
});

// Enable Firestore offline persistence
firebase.firestore().enablePersistence({ synchronizeTabs: false });

Toast Notifications:

"Connection lost. Changes will sync when reconnected."
"Reconnected. Syncing changes..."



Performance Monitoring

FPS Counter: Dev mode toggle in settings
Performance Panel: Shows metrics:

Current FPS
Shape count
Active users
Sync latency




Data Model Updates
Updated Shape Interface
typescriptinterface Shape {
  id: string;
  name: string;              // User-editable display name
  type: 'rectangle' | 'circle' | 'triangle' | 'line' | 'text';
  x: number;
  y: number;
  // Shape-specific properties
  width?: number;            // rectangle, triangle
  height?: number;           // rectangle, triangle  
  radius?: number;           // circle
  points?: number[];         // line
  text?: string;             // text
  fontSize?: number;         // text
  fontFamily?: string;       // text
  fontStyle?: string;        // text (bold, italic)
  strokeWidth?: number;      // line
  // Common properties
  color: string;
  opacity: number;           // 0-1
  rotation: number;          // degrees
  zIndex: number;
  locked?: boolean;          // prevent edits
  visible?: boolean;         // hide/show
  groupId?: string;          // for grouped shapes
  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  lastModifiedBy: string;
  lastModified: Timestamp;
  deletedAt?: Timestamp;     // soft delete
  deletedBy?: string;
}

Testing Requirements
Performance Tests

Create 100 mixed shapes rapidly, verify <100ms sync
Multi-select 50 shapes, drag together at 60 FPS
Rotate shape while another user moves it
Undo 20 operations rapidly
Layers panel with 500+ items scrolls smoothly

Conflict Resolution Tests

User A rotates while User B resizes same shape
User A deletes text while User B is typing in it
User A deletes shape while User B is dragging it → shape disappears immediately
Three users simultaneously multi-select overlapping shapes
Rapid delete/undo cycles with multiple users

Persistence Tests

Refresh during text edit → text preserved
Refresh during rotation → rotation angle preserved
Network drop during multi-select drag → shapes at last committed position
Firestore offline mode → can continue working, syncs when reconnected


Implementation Priority
Phase 1: Core Shapes & Transforms

Add Circle, Triangle, Line shapes
Implement universal rotation system
Add Text layers with basic formatting
Add connection status indicator
Enable Firestore offline persistence

Phase 2: Selection & Operations

Multi-select system
Duplicate operation
Copy/paste system
Delete vs Edit conflict resolution

Phase 3: History & Shortcuts

Undo/redo system
Keyboard shortcuts
Shape naming system

Phase 4: UI Enhancements

Enhanced color picker
Layers panel with drag-to-reorder
Transform handles UI

Phase 5: Advanced Features

Collaborative comments
Layer grouping
Performance monitoring panel


Success Metrics
Feature Completion

 All 4 shape types working with rotation
 Multi-select with 3+ selection methods
 Undo/redo with 50-operation history
 15+ keyboard shortcuts implemented
 Color picker with opacity and recent colors
 Layers panel with drag-to-reorder and grouping
 Comments system with threading
 Delete vs Edit conflicts resolved properly

Performance Metrics

 Maintain <100ms object sync with new shapes
 Maintain <50ms cursor sync
 60 FPS with 50+ selected shapes
 No data loss during network disruptions
 Smooth rotation at 60 FPS

Rubric Alignment

 Section 1: 30/30 points (Infrastructure)
 Section 2: 20/20 points (Canvas Features)
 Section 3: 13-15/15 points (Advanced Features)
 Section 5: 10/10 points (Technical Implementation)
 Section 6: 5/5 points (Documentation)


Document Version: 1.1
Last Updated: Revised with enhanced layer management, transform operations, delete conflict resolution, and shape identification
Status: Ready for Implementation
This PRD provides a complete specification for enhancing CollabCanvas from MVP to achieve "Excellent" scoring (80+ points excluding AI sections) on the rubric.