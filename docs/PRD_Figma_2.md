CollabCanvas Enhanced Features - Product Requirements Document
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

Conflict Resolution Assessment
Your current architecture with optimistic updates + RTDB activeEdits handles most scenarios well:

Simultaneous Move: ✅ Already handled - last mouse release wins
Rapid Edit Storm: ✅ Mostly handled - needs testing with new shape types
Delete vs Edit: ⚠️ Needs enhancement - deleted shapes should immediately clear from activeEdits
Create Collision: ✅ Handled - Firestore generates unique IDs

Persistence & Reconnection Assessment
Current implementation status:

Mid-Operation Refresh: ⚠️ Needs queue system - operations during drag are lost
Total Disconnect: ✅ Works - Firestore persists all committed changes
Network Drop: ⚠️ Needs offline queue - operations during disconnect are lost
Rapid Disconnect: ✅ Works - Firestore batch writes handle this

Required Additions:

Offline operation queue for network disconnections
Connection status indicator in UI
Pending operations indicator


Enhanced Features Specification
1. Extended Shape Types
1.1 Circle Shape

Creation: Click "Create Circle" button → 100x100px circle at viewport center
Data Structure: { type: 'circle', x, y, radius, color, rotation, zIndex, ...metadata }
Resize: Maintain aspect ratio (circular), drag corner to resize
Rotation: Shift+drag to rotate around center

1.2 Triangle Shape

Creation: Click "Create Triangle" button → equilateral triangle (100px sides)
Data Structure: { type: 'triangle', x, y, width, height, color, rotation, zIndex, ...metadata }
Resize: Free resize or hold Shift for aspect ratio lock
Rotation: Shift+drag to rotate around center

1.3 Line Shape

Creation: Click "Create Line" → click-drag to set endpoints
Data Structure: { type: 'line', points: [x1, y1, x2, y2], strokeWidth, color, rotation, zIndex, ...metadata }
Edit: Drag endpoints to adjust, drag middle to move
Resize: Not applicable - edit endpoints instead
Style: Adjustable stroke width (1-10px)

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

2. Rotation System
Universal Rotation

Applies to: All shapes including rectangles
UI: Rotation handle appears 20px above shape when selected
Interaction: Drag rotation handle in circular motion
Keyboard: Hold Shift while rotating for 15° snapping
Data Update: Add rotation: number (degrees) to all shape types
Real-time Sync: Rotation updates stream via livePositions during drag
Visual Feedback: Show rotation degrees while rotating

3. Multi-Selection System
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

4. Undo/Redo System
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

5. Keyboard Shortcuts
ShortcutActionDelete/BackspaceDelete selected shapesCmd/Ctrl+DDuplicate selected shapesCmd/Ctrl+CCopy selected shapesCmd/Ctrl+VPaste shapesCmd/Ctrl+ZUndoCmd/Ctrl+Shift+ZRedoArrow KeysMove selected shapes (10px)Shift+ArrowsMove selected shapes (1px)Cmd/Ctrl+ASelect allEscapeDeselect allCmd/Ctrl+]Bring forwardCmd/Ctrl+[Send backward
6. Enhanced Color Picker
Features

Color Wheel: HSL color picker
Recent Colors: Last 10 used colors
Preset Palette: 20 common colors
Hex Input: Manual color code entry
Opacity Slider: 0-100% transparency
Eyedropper: Pick color from canvas (future)

7. Copy/Paste System
Behavior

Copy: Stores shape data in clipboard (session memory)
Paste: Creates new shapes with offset (+20px X/Y)
Cross-Session: Clipboard clears on page refresh
Multi-Select: Copy/paste multiple shapes maintains relative positions

8. Enhanced Layers Panel
Features

Visual List: Thumbnail + shape name/type
Drag to Reorder: Direct manipulation of z-index
Quick Actions: Eye (hide/show), Lock (prevent edits), Delete
Multi-Select: Shift/Ctrl click for multiple layers
Context Menu: Right-click for more options
Auto-Scroll: Scrolls to show selected shape

Layer Operations

Bring to Front (Cmd+Shift+])
Send to Back (Cmd+Shift+[)
Bring Forward (Cmd+])
Send Backward (Cmd+[)

Connection Status Indicator (Simple Enhancement)
Implementation

Visual Indicator: Small dot in header (green = connected, red = disconnected)
Firebase Connection Monitoring: Use .info/connected reference
Firestore Offline: Enable enablePersistence() for automatic offline support
No Custom Queue Needed: Firebase handles this automatically

What Users Experience

Work continues uninterrupted during network loss
Changes sync automatically when reconnected
Visual indicator shows connection status

Performance Requirements
Maintain Current Performance

Object sync: <100ms (via optimistic updates)
Cursor sync: <50ms (RTDB with 16ms throttle)
60 FPS during all operations
Support 500+ mixed shapes
Support 5+ concurrent users

New Performance Targets

Undo/redo operations: <50ms
Multi-select drag: 60 FPS with 50+ selected shapes
Layer panel updates: <100ms
Rotation updates: Stream at 60 FPS


Data Model Updates
Updated Shape Interface
typescriptinterface Shape {
  id: string;
  type: 'rectangle' | 'circle' | 'triangle' | 'line' | 'text';
  x: number;
  y: number;
  // Shape-specific properties
  width?: number;        // rectangle, triangle
  height?: number;       // rectangle, triangle  
  radius?: number;       // circle
  points?: number[];     // line
  text?: string;         // text
  fontSize?: number;     // text
  fontFamily?: string;   // text
  fontStyle?: string;    // text (bold, italic)
  strokeWidth?: number;  // line
  // Common properties
  color: string;
  opacity: number;       // 0-1
  rotation: number;      // degrees
  zIndex: number;
  locked?: boolean;      // prevent edits
  visible?: boolean;     // hide/show
  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  lastModifiedBy: string;
  lastModified: Timestamp;
}


Testing Requirements
Performance Tests

Create 100 mixed shapes rapidly, verify <100ms sync
Multi-select 50 shapes, drag together at 60 FPS
Rotate shape while another user moves it
Undo 20 operations rapidly

Conflict Resolution Tests

User A rotates while User B resizes same shape
User A deletes text while User B is typing in it
Three users simultaneously multi-select overlapping shapes
Offline user makes changes, comes online during another user's edits

Persistence Tests

Refresh during text edit → text preserved
Refresh during rotation → rotation angle preserved
Offline for 60s with 10 operations → all sync on reconnect
Close tab during multi-select drag → shapes at last known position


Implementation Priority
Phase 1: Core Shapes & Rotation

Add Circle, Triangle, Line shapes
Implement universal rotation system
Add Text layers with basic formatting

Phase 2: Selection & Operations

Multi-select system
Duplicate operation
Copy/paste system

Phase 3: History & Shortcuts

Undo/redo system
Keyboard shortcuts

Phase 4: UI Enhancements

Enhanced color picker
Layers panel with drag-to-reorder

Success Metrics
Feature Completion

 All 4 shape types working with rotation
 Multi-select with 3+ selection methods
 Undo/redo with 50-operation history
 10+ keyboard shortcuts implemented
 Color picker with opacity and recent colors
 Layers panel with drag-to-reorder

Performance Metrics

 Maintain <100ms object sync with new shapes
 Maintain <50ms cursor sync
 60 FPS with 50+ selected shapes
 Offline queue successfully syncs 20+ operations
 No data loss during network disruptions

User Experience

 All rubric "Excellent" criteria met
 Smooth rotation at 60 FPS
 Intuitive multi-select behavior
 Clear offline/online status indication
 Professional color picker UI


Risk Mitigation
Performance Risks

Risk: Multi-select with 100+ shapes may lag
Mitigation: Implement selection batching, virtual rendering for layers panel

Sync Complexity

Risk: Rotation + resize + move conflicts
Mitigation: Extend activeEdits to track operation type, maintain last-write-wins


Document Version: 1.0
Created: Based on MVP PRD v3.0
Status: Ready for Implementation
This PRD provides a complete specification for enhancing CollabCanvas from MVP to a rubric "Excellent" scoring application. The phased approach allows for incremental development while maintaining the strong collaborative foundation already built.