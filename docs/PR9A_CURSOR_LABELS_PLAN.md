# PR #9a: Cursor Labels with User Names

## 🎯 Goal
Replace cursor color labels ("Purple", "Blue") with user names ("John", "Jane D.") to improve collaborative experience.

## 📋 Requirements
1. Show **first name** by default
2. If 2+ users have same first name → add last initial (e.g., "John D.", "John S.")
3. Keep colored triangle cursor (no change)
4. Keep label position next to cursor (no change)
5. Replace color name text with user name

## 🔧 Implementation Plan

### Step 1: Update Cursor Data Structure
**File:** `src/types/cursor.types.ts`
- Add `firstName` and `lastName` to `Cursor` interface

### Step 2: Update Cursor Service
**File:** `src/services/cursor.service.ts`
- Add `firstName` and `lastName` to cursor data when updating position
- Keep `colorName` and `cursorColor` for rendering

### Step 3: Add Name Collision Detection Logic
**File:** `src/utils/helpers.ts` (or new file)
- Create `generateCursorLabel(cursors)` function
- Logic:
  - If only one user with first name → show "John"
  - If 2+ users with same first name → show "John D.", "John S."

### Step 4: Update CursorOverlay Component
**File:** `src/components/Collaboration/CursorOverlay.tsx`
- Call `generateCursorLabel()` to get display names
- Replace `cursor.colorName` with generated user label
- Keep all other rendering logic (triangle, position, color)

### Step 5: Update useCursors Hook
**File:** `src/hooks/useCursors.ts`
- Pass `firstName` and `lastName` from `user` to `updateCursorPosition()`

## 🧪 Testing
- Test with 2 users (different first names) → shows "John", "Jane"
- Test with 2 users (same first name) → shows "John D.", "John S."
- Test with 3+ users (mix of same/different names)
- Verify cursor still renders correctly
- Verify label position unchanged

## ⏱️ Estimated Time
30-45 minutes

---

Let's start implementing!

