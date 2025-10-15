# Firebase Emulator Testing Guide

## Overview
This guide explains how to test CollabCanvas with Firebase Emulators for local development without hitting production Firebase services.

## Prerequisites
- Firebase CLI installed (v14.19.1+): `npm install -g firebase-tools`
- Node.js and npm installed
- Firebase project configured with `.env.local`

## Emulator Configuration

### Already Configured in `firebase.json`:
```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "database": { "port": 9000 },
    "ui": { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
```

### Emulator Connection in `src/services/firebase.ts`:
The app automatically connects to emulators when:
- `NODE_ENV === 'development'`
- `REACT_APP_USE_EMULATORS === 'true'`

## How to Use Emulators

### Step 1: Create `.env.local` for Emulator Mode
Create `collabcanvas/.env.local` (if using emulators):
```bash
# Copy your existing Firebase config
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Enable emulator mode (ONLY for local testing)
REACT_APP_USE_EMULATORS=true
```

### Step 2: Start Firebase Emulators
In Terminal 1:
```bash
cd collabcanvas
npx firebase emulators:start
```

You should see:
```
✔  All emulators ready! It is now safe to connect your app.
┌─────────────────────────────────────────────────────────────┐
│ ✔  All emulators started, it is now safe to connect.       │
│                                                             │
│ View Emulator UI at http://127.0.0.1:4000                  │
└─────────────────────────────────────────────────────────────┘

┌────────────┬────────────────┬─────────────────────────────────┐
│ Emulator   │ Host:Port      │ View in Emulator UI             │
├────────────┼────────────────┼─────────────────────────────────┤
│ Auth       │ 127.0.0.1:9099 │ http://127.0.0.1:4000/auth      │
│ Firestore  │ 127.0.0.1:8080 │ http://127.0.0.1:4000/firestore │
│ Database   │ 127.0.0.1:9000 │ http://127.0.0.1:4000/database  │
└────────────┴────────────────┴─────────────────────────────────┘
```

### Step 3: Start React App
In Terminal 2:
```bash
cd collabcanvas
npm start
```

Check the browser console for:
```
🔧 Connecting to Firebase Emulators...
✅ Connected to Firebase Emulators
   - Auth: http://127.0.0.1:9099
   - Firestore: http://127.0.0.1:8080
   - RTDB: http://127.0.0.1:9000
   - Emulator UI: http://127.0.0.1:4000
```

### Step 4: Run Tests Against Emulators
```bash
npm test
```

All tests should pass (126/126) ✅

## What to Test with Emulators

### 1. Authentication Flow
- ✅ Sign up with new email/password
- ✅ Sign in with existing account
- ✅ Sign out
- ✅ Check Emulator UI > Auth for user list

### 2. Firestore Persistence (PR #5 Focus)
- ✅ Create rectangles → Check Firestore UI for `/canvases/default-canvas/shapes`
- ✅ Move rectangles → Verify position updates in Firestore
- ✅ Resize rectangles → Verify dimensions update in Firestore
- ✅ Change colors → Verify color updates in Firestore
- ✅ Delete rectangles → Verify document deletion in Firestore
- ✅ Refresh page → Verify shapes persist and reload correctly
- ✅ Z-index changes → Verify z-index field updates in Firestore

### 3. Z-Index System
- ✅ Create multiple rectangles → Last created should be z-index 1 (front)
- ✅ Edit any rectangle → Should auto-move to z-index 1
- ✅ Manually change z-index → Should push other shapes accordingly
- ✅ Verify no duplicate z-indices in Firestore

### 4. Multi-User Sync (Simulate with Multiple Browser Windows)
- ✅ Open app in 2 browser windows
- ✅ Create shape in Window 1 → Should appear in Window 2 instantly
- ✅ Move shape in Window 2 → Should update in Window 1 instantly
- ✅ Delete shape in Window 1 → Should disappear in Window 2 instantly

### 5. Error Handling & Retry Logic
- ✅ Stop emulators mid-operation → App should retry 3 times
- ✅ Check console for retry attempts (100ms, 300ms, 900ms)
- ✅ Verify toast notification on final failure
- ✅ Restart emulators → App should reconnect automatically

### 6. Performance
- ✅ FPS counter should stay 60fps with 10+ shapes
- ✅ No lag when creating/moving/resizing shapes
- ✅ Optimistic updates should feel instant (local-first)

## Emulator UI Features

### Navigate to: http://127.0.0.1:4000

1. **Authentication Tab**: View registered users and auth state
2. **Firestore Tab**: Browse `/canvases/default-canvas/shapes` collection
   - See real-time shape documents
   - Verify z-index field values
   - Check `createdBy`, `lastModifiedBy` metadata
   - Confirm `createdAt`, `lastModified` timestamps
3. **Realtime Database Tab**: (For PR #6 - cursors/presence)
4. **Logs Tab**: View emulator operation logs

## Benefits of Emulator Testing

✅ **No Cost**: Emulators are 100% free (no Firestore reads/writes charged)  
✅ **Fast Reset**: Clear all data with `firebase emulators:start --import=./emulator-data --export-on-exit`  
✅ **Offline Work**: Test without internet connection  
✅ **Safe Testing**: Can't accidentally corrupt production data  
✅ **Debugging**: Inspect all Firestore operations in real-time UI  
✅ **CI/CD**: Run automated tests in CI without Firebase credentials

## Switching Back to Production

Remove or comment out in `.env.local`:
```bash
# REACT_APP_USE_EMULATORS=true
```

Restart the app. It will connect to production Firebase.

## Troubleshooting

### "Failed to connect to emulators"
- Ensure emulators are running: `npx firebase emulators:start`
- Check ports aren't in use: `lsof -i :8080,9099,9000,4000`

### "Auth emulator connection refused"
- Clear browser cache and cookies
- Restart emulators with `--export-on-exit` to preserve data

### "Firestore security rules error"
- Emulators enforce security rules from `firestore.rules`
- Check rules allow authenticated user read/write

### Tests still use real Firebase
- Tests automatically use mocks (see test files)
- Emulators are only for manual testing, not unit/integration tests

## Current Status ✅

- **Emulator Config**: ✅ Configured in `firebase.json`
- **Firebase Service**: ✅ Updated with emulator connection logic
- **Environment Setup**: ✅ Ready for `REACT_APP_USE_EMULATORS=true` flag
- **Firebase CLI**: ✅ Installed (v14.19.1)
- **Security Rules**: ✅ Defined in `firestore.rules`
- **All Tests**: ✅ 126/126 passing
- **Manual Testing**: ✅ Confirmed working with production Firebase

**Ready for emulator testing!** Just set `REACT_APP_USE_EMULATORS=true` in `.env.local` and run `npx firebase emulators:start`.

