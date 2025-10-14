# PR #7 Manual Testing Checklist
**Multiplayer Cursors, Selection State & Live Position Streaming**

## Setup
1. Open app in **Browser 1** (Chrome)
2. Log in with account `myles93@sbcglobal.net`
3. Open app in **Browser 2** (Safari or Chrome Incognito)
4. Log in with account `mylesethan93@gmail.com`
5. Position windows side-by-side

---

## Test 1: Cursor Synchronization (120 FPS)

### Browser 1:
- [ ] Move mouse around the canvas
- [ ] Verify: NO colored cursor overlay for your own cursor (use native browser cursor)

### Browser 2:
- [ ] Verify: See Browser 1's colored cursor moving smoothly
- [ ] Verify: Cursor tracks in real-time with NO lag
- [ ] Verify: Cursor label shows color NAME (e.g., "Blue", "Yellow"), not email
- [ ] Verify: Cursor movement is as smooth as native browser cursor

### Browser 1:
- [ ] Move mouse to different part of canvas
- [ ] Stop moving mouse

### Browser 2:
- [ ] Verify: Cursor position updated instantly
- [ ] Verify: No jitter or stuttering

---

## Test 2: Own Cursor Filtering

### Browser 1:
- [ ] Move mouse around canvas
- [ ] Verify: You ONLY see your native browser cursor
- [ ] Verify: NO colored overlay cursor appears for yourself

### Browser 2:
- [ ] Move mouse around canvas
- [ ] Verify: You ONLY see your native browser cursor
- [ ] Verify: NO colored overlay cursor appears for yourself
- [ ] Verify: You SEE Browser 1's colored cursor

---

## Test 3: Live Position Streaming - Drag (60 FPS)

### Browser 1:
- [ ] Click "Add Rectangle" button
- [ ] Drag the rectangle around canvas (move slowly, then fast)
- [ ] Observe: Shape moves smoothly under your cursor

### Browser 2:
- [ ] Observe: Shape moves in REAL-TIME during drag
- [ ] Verify: NO FLICKER when drag starts
- [ ] Verify: Movement is SMOOTH (60 FPS), not jumpy

### Browser 1:
- [ ] RELEASE the shape (stop dragging)

### Browser 2:
- [ ] **CRITICAL**: Verify NO FLICKER when drag ends
- [ ] Shape should stay EXACTLY where it was
- [ ] No "revert then update" visual glitch
- [ ] After 1 second: Shape remains in correct position

---

## Test 4: Live Position Streaming - Resize (60 FPS)

### Browser 1:
- [ ] Hover over rectangle, click to select
- [ ] Grab the top-right resize handle (blue circle)
- [ ] Resize the shape (drag resize handle around)
- [ ] Observe: Shape resizes smoothly

### Browser 2:
- [ ] Observe: Shape resizes in REAL-TIME during resize
- [ ] Verify: NO FLICKER when resize starts
- [ ] Verify: Resizing is SMOOTH (60 FPS)

### Browser 1:
- [ ] RELEASE resize handle

### Browser 2:
- [ ] **CRITICAL**: Verify NO FLICKER when resize ends
- [ ] Shape should stay at final size
- [ ] No "revert then snap back" visual glitch
- [ ] After 1 second: Shape remains at correct size

---

## Test 5: Flicker Fix - Rapid Edits

### Browser 1:
- [ ] Drag shape A quickly
- [ ] Release
- [ ] Immediately drag shape B
- [ ] Release
- [ ] Drag shape A again
- [ ] Release

### Browser 2:
- [ ] Verify: NO FLICKER on any of the releases
- [ ] All shapes stay in correct positions
- [ ] No visual glitches during rapid succession of edits

---

## Test 6: Multiple Shapes - Concurrent Editing

### Browser 1:
- [ ] Add 3 rectangles (Red, Blue, Green)
- [ ] Drag Red rectangle

### Browser 2:
- [ ] Simultaneously drag Blue rectangle
- [ ] Observe: Both shapes move independently
- [ ] Verify: Red shape moves smoothly in Browser 2
- [ ] Verify: Blue shape moves smoothly in Browser 1

### Both Browsers:
- [ ] Release shapes
- [ ] Verify: NO FLICKER on either shape
- [ ] Both shapes in correct final positions

---

## Test 7: Cursor During Shape Drag

### Browser 1:
- [ ] Start dragging a rectangle

### Browser 2:
- [ ] Observe Browser 1's cursor position
- [ ] Verify: Cursor is AT THE CENTER of the dragged shape
- [ ] Verify: Cursor moves WITH the shape as it's dragged
- [ ] Verify: Cursor and shape move together smoothly

### Browser 1:
- [ ] Release shape

### Browser 2:
- [ ] Verify: Cursor returns to normal mouse tracking (not shape center)

---

## Test 8: Properties Panel - No Interference

### Browser 1:
- [ ] Select a shape (properties panel opens on right)
- [ ] Drag the selected shape

### Browser 2:
- [ ] Verify: Live position streaming still works
- [ ] Verify: NO FLICKER when properties panel is open

---

## Test 9: Zoom & Pan - Cursor Coordinates

### Browser 1:
- [ ] Zoom in (Shift + Plus)
- [ ] Move mouse around canvas
- [ ] Verify: Your cursor position updates correctly

### Browser 2:
- [ ] Verify: See Browser 1's cursor in correct position
- [ ] Cursor should appear at same CANVAS coordinates (not affected by zoom)

### Browser 1:
- [ ] Pan the canvas (drag empty space)
- [ ] Move mouse

### Browser 2:
- [ ] Verify: Cursor still tracks correctly after pan

---

## Test 10: Disconnect & Reconnect

### Browser 1:
- [ ] Close the browser tab (or navigate away)

### Browser 2:
- [ ] Verify: Browser 1's cursor DISAPPEARS automatically
- [ ] (Within a few seconds, RTDB onDisconnect triggers)

### Browser 1:
- [ ] Reopen the app
- [ ] Move mouse

### Browser 2:
- [ ] Verify: Browser 1's cursor REAPPEARS
- [ ] Cursor tracking works correctly

---

## Test 11: Performance - FPS Counter

### Both Browsers:
- [ ] Open browser dev console
- [ ] Move mouse rapidly around canvas
- [ ] Drag shapes around
- [ ] Resize shapes

### Dev Console:
- [ ] Check FPS counter (bottom-left of canvas)
- [ ] Verify: FPS stays near 60 during all actions
- [ ] No significant frame drops
- [ ] App feels responsive

---

## Test 12: Editing Indicators

### Browser 1:
- [ ] Drag a rectangle

### Browser 2:
- [ ] Verify: See "Test is moving" indicator above the shape
- [ ] Indicator shows FIRST NAME, not email

### Browser 1:
- [ ] Resize a rectangle (grab resize handle)

### Browser 2:
- [ ] Verify: See "Test is resizing" indicator

### Browser 1:
- [ ] Change rectangle color (in properties panel)

### Browser 2:
- [ ] Verify: See "Test is recoloring" indicator

---

## Test 13: Stress Test - Many Shapes

### Browser 1:
- [ ] Add 10+ rectangles to canvas
- [ ] Move mouse rapidly
- [ ] Drag multiple shapes in succession

### Browser 2:
- [ ] Observe: All live position streaming works
- [ ] Cursor tracking still smooth
- [ ] No performance degradation

---

## Test 14: Edge Cases

### Browser 1:
- [ ] Drag a shape VERY slowly (1 pixel per second)

### Browser 2:
- [ ] Verify: Shape still updates smoothly in real-time

### Browser 1:
- [ ] Drag a shape VERY fast (rapid movement)

### Browser 2:
- [ ] Verify: Shape updates keep up (may have slight delay but no glitches)
- [ ] NO FLICKER when released

### Browser 1:
- [ ] Start dragging, then immediately release (< 100ms)

### Browser 2:
- [ ] Verify: NO FLICKER on quick tap-drag-release

---

## Test 15: Triangle Cursor Shape

### Browser 2:
- [ ] Observe Browser 1's cursor
- [ ] Verify: Cursor is a SIMPLE TRIANGLE (3 points)
- [ ] Verify: NO curves or complex shapes
- [ ] Verify: Triangle has white stroke for visibility

---

## Summary Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| Cursor tracking (120 FPS) | ⬜ | Smooth, no lag |
| Own cursor filtered out | ⬜ | No overlay for self |
| Live drag streaming (60 FPS) | ⬜ | Real-time movement |
| Live resize streaming (60 FPS) | ⬜ | Real-time resizing |
| NO flicker on drag end | ⬜ | Grace period works |
| NO flicker on resize end | ⬜ | Grace period works |
| Cursor at shape center during drag | ⬜ | Tracks with shape |
| Cursor labels show color names | ⬜ | Not emails |
| Simple triangle cursor | ⬜ | Clean design |
| Disconnect cleanup | ⬜ | Cursor auto-removes |
| Performance (60 FPS) | ⬜ | No frame drops |
| Editing indicators | ⬜ | Show first names |

---

## Known Issues to Watch For

❌ **DO NOT PROCEED if you see:**
- Own cursor overlay visible
- Lag in cursor tracking (> 50ms delay)
- Flicker when releasing shapes
- Shapes reverting then updating
- Cursor not following shape center during drag
- Frame rate drops below 50 FPS

✅ **Expected Behavior:**
- Silky smooth cursor movement
- Real-time shape updates during drag/resize
- Zero visual flicker on release
- Cursor perfectly centered in dragged shapes
- Stable 60 FPS performance

---

## Next Steps After Testing

- [ ] All manual tests pass → Proceed to commit PR #7
- [ ] Issues found → Debug and retest
- [ ] Performance issues → Profile and optimize
- [ ] Deploy to production for final verification

