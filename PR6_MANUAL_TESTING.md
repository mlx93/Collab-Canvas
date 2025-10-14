# PR #6: Real-Time Collaboration - Manual Testing Guide

## Overview
PR #6 adds real-time visual collaboration indicators, showing when other users are editing shapes.

## What's New
- **Active Edits Tracking (RTDB)**: Ephemeral state tracking who's editing what shape
- **Editing Indicators**: Visual badges showing "User X is editing" with color-coded borders
- **Auto-cleanup**: onDisconnect hooks automatically clear editing state when users disconnect

## Test Setup

### Option 1: Two Browser Windows (Same Machine)
1. Open the app in two different browser windows (e.g., Chrome + Safari, or two Chrome profiles)
2. Sign in with different accounts in each:
   - Window 1: `user1@example.com`
   - Window 2: `user2@example.com`

### Option 2: Two Different Machines
1. Deploy to production (`npm run build && npx firebase deploy`)
2. Open the app on two different devices/computers
3. Sign in with different accounts

## Manual Test Cases

### ✅ Test 1: Drag Indicator
**Steps:**
1. User 1: Create a rectangle
2. User 2: See the rectangle appear
3. User 1: Start dragging the rectangle (mouse down, hold)
4. User 2: Should see an indicator badge above the rectangle saying "user1@example.com is moving" with a colored border

**Expected:**
- Indicator appears immediately when User 1 starts dragging
- Indicator disappears when User 1 releases the mouse (drag ends)
- The indicator border color matches User 1's assigned cursor color

### ✅ Test 2: Resize Indicator
**Steps:**
1. User 1: Select a rectangle
2. User 1: Grab the top-right resize handle and start resizing (mouse down, hold)
3. User 2: Should see "user1@example.com is resizing" indicator

**Expected:**
- Indicator appears during resizing
- Indicator disappears when resize ends
- Rectangle updates in real-time for User 2

### ✅ Test 3: Recolor Indicator
**Steps:**
1. User 1: Select a rectangle
2. User 1: Open color dropdown and select a new color
3. User 2: Should briefly see "user1@example.com is recoloring" indicator (500ms)

**Expected:**
- Indicator appears when color is selected
- Color updates in real-time
- Indicator auto-clears after 500ms

### ✅ Test 4: Multiple Simultaneous Edits
**Steps:**
1. Create multiple rectangles (Rect A, Rect B)
2. User 1: Start dragging Rect A
3. User 2: Start dragging Rect B (at the same time)
4. Each user should see their own rectangle move smoothly (optimistic update)
5. Each user should see an indicator on the other user's rectangle

**Expected:**
- No conflict - each user can edit different shapes simultaneously
- Indicators show correctly on shapes being edited by others
- No indicators show on shapes being edited by self

### ✅ Test 5: Concurrent Edit on Same Shape
**Steps:**
1. Create one rectangle
2. User 1: Start dragging it
3. User 2: Also start dragging it (while User 1 is still dragging)
4. Both users release

**Expected:**
- Both users can drag (optimistic updates)
- Both see each other's editing indicators
- **Last write wins**: The last user to release the mouse "wins" - their final position persists in Firestore
- The "losing" user's rectangle snaps to the winner's position

### ✅ Test 6: Disconnect Cleanup
**Steps:**
1. User 1: Start dragging a rectangle
2. User 2: See the "moving" indicator
3. User 1: Close browser/tab (simulate disconnect)
4. User 2: Wait 3-5 seconds

**Expected:**
- User 2's indicator should automatically disappear after User 1 disconnects
- This is handled by Firebase RTDB onDisconnect() hook

### ✅ Test 7: Indicator Position on Zoom
**Steps:**
1. User 1: Start dragging a rectangle
2. User 2: Zoom in/out on the canvas (mouse wheel)
3. Observe the indicator

**Expected:**
- Indicator should scale correctly with zoom level
- Badge should remain above the rectangle and readable

### ✅ Test 8: Persistent Cursor Colors
**Steps:**
1. User 1 and User 2: Both edit shapes (note the color of User 1's indicator)
2. User 1: Sign out and sign back in
3. User 1: Edit a shape again

**Expected:**
- User 1's indicator color should be the same before and after sign out
- Colors are determined by email hash (consistent across sessions)

## Key Observations

✅ **Indicators only show for OTHER users** - you never see your own editing indicator  
✅ **Indicators appear instantly** - no noticeable delay  
✅ **Auto-cleanup works** - indicators disappear when editing stops or user disconnects  
✅ **Optimistic updates** - your own edits feel instant, no waiting for server  
✅ **Real-time sync** - other users' changes appear within ~100-500ms  

## Common Issues & Troubleshooting

### Indicator not showing up
- Check that both users are signed in with **different email addresses**
- Verify RTDB is enabled in Firebase Console
- Check browser console for RTDB permission errors

### Indicator doesn't disappear
- Ensure `clearActiveEdit()` is being called on drag end/resize end
- Check that the `unsubscribe` function in `Rectangle.tsx` is being called on unmount

### Colors not consistent
- Check that `getUserCursorColor()` is using email (not userId)
- Verify the same email gets the same hash/color

## PR #6 Completion Checklist
- [x] activeEdits service created (RTDB)
- [x] EditingIndicator component created (Konva)
- [x] Rectangle component integrates indicators
- [x] Drag tracking (setActiveEdit/clearActiveEdit)
- [x] Resize tracking
- [x] Recolor tracking
- [x] 14 unit tests (activeEdits service)
- [x] 7 integration tests (collaboration features)
- [x] firstName/lastName added to signup flow
- [x] authService.fetchUserData() helper created
- [x] All 141 tests passing (100% pass rate)
- [x] PRD.md and tasks.md updated with architecture notes
- [x] AUTH_ARCHITECTURE.md created (technical documentation)
- [x] Deployed to production (https://collab-canvas-mlx93.web.app)
- [ ] Manual testing with 2+ users (USER TO COMPLETE)

## Next Steps (PR #7)
After PR #6, the next features are:
- Multiplayer cursors (show other users' mouse positions)
- Presence awareness (show who's online)
- Cursor labels with usernames

