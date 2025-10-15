# CollabCanvas MVP v3.0 - System Architecture Documentation

> **Note:** For the visual architecture diagram, see `architectureFinal.md`

## Key Architectural Decisions (v3.0)

### 1. **Optimistic Updates Architecture**
- **Local-First Updates:** All user actions (create, move, resize, recolor, delete) update local state immediately
- **Async Firestore Sync:** Changes sync to Firestore asynchronously (~100ms)
- **Last Write Wins:** When conflicts occur, the last mouse release determines the final state
- **No Edit Locks:** Multiple users can edit the same rectangle simultaneously

### 2. **Hybrid Firebase Database Strategy**
- **Firestore (Persistent):** Shapes with z-index, metadata (survives refreshes)
- **RTDB (Ephemeral):** Cursors, selections, activeEdits, presence (doesn't persist)
- **Cost & Performance:** 97% cheaper for high-frequency updates, 3x lower latency

### 3. **Z-Index System**
- **Automatic:** Most recently edited shape moves to front (z-index 1)
- **Manual Override:** Users can set specific z-index in properties panel
- **Push-Down Recalculation:** Ensures no duplicate z-indices
- **Persisted:** Z-index stored in Firestore for consistency

### 4. **3-Column UI Layout**
- **Left Toolbar:** Always visible, color picker + create button
- **Center Canvas:** Off-white, pan/zoom, viewport-independent
- **Right Properties Panel:** Visible when selected, editable/read-only fields

### 5. **Cursor & User Display Separation**
- **Cursor Labels:** Show color NAMES ("Blue", "Red") for visual tracking
- **Email Display:** Username = email, shown in top header ActiveUsers list
- **Rationale:** Cursors for position tracking, header for identity

### 6. **Ephemeral vs Persistent State**
- **Persistent (Firestore):** Shapes, z-indices, metadata
- **Ephemeral (RTDB):** Selections, activeEdits, cursors, presence
- **Auto-Cleanup:** onDisconnect hooks clear ephemeral state

### 7. **Performance Targets**
- **60 FPS:** Canvas rendering, cursor updates (16ms throttle)
- **<100ms:** Shape sync latency (Firestore)
- **<50ms:** Cursor/presence updates (RTDB)
- **500+ Shapes:** Load capacity without FPS drops
- **5+ Users:** Concurrent user support

### 8. **Testing Strategy**
- **21 Test Files:** 11 unit + 10 integration
- **New Tests:** Z-index logic, optimistic updates, conflict resolution, ephemeral state
- **Stress Testing:** Simultaneous editing, rapid operations, last write wins

## Data Flow: Optimistic Updates Example

```
User A drags rectangle:
1. Local State Updates Immediately → User A sees instant feedback
2. activeEdits.set(shapeId, "moving") → RTDB (~20ms)
3. User B sees "User A is editing" indicator
4. Firestore.update(position) → Async sync (~100ms)
5. User B receives Firestore update
6. On mouse release: activeEdits.clear(shapeId)
7. Z-index auto-updates to 1, others push back

If User B also drags:
1. Both see local optimistic updates
2. Both have activeEdit entries in RTDB
3. Both indicators show
4. Last mouse release → final Firestore write
5. "Loser" sees rectangle snap to "winner's" position
```

## Error Handling & Retry Logic

### **Firestore Write Failures**
```
Operation: Create/Update/Delete Rectangle

1. Optimistic Update: Local state updates immediately
2. Firestore Write Attempt 1: Try write to Firestore
   ↓ FAIL
3. Retry 1 (100ms delay): Exponential backoff
   ↓ FAIL
4. Retry 2 (300ms delay): Exponential backoff
   ↓ FAIL
5. Retry 3 (900ms delay): Final attempt
   ↓ FAIL
6. Error Handling:
   - console.error("Firestore write failed after 3 retries")
   - toast.error("Failed to save changes")
   - Revert optimistic update (return to previous state)
```

### **Network Disconnection**
```
Connection Monitor: RTDB .info/connected path

Connection Lost:
1. RTDB detects disconnection
2. toast.warning("Connection lost. Reconnecting...")
3. Continue local operations (optimistic)
4. Queue writes for when connection restored

Connection Restored:
1. RTDB detects reconnection
2. toast.success("Connected")
3. Flush queued operations
4. Sync state with Firestore
```

## Environment Configuration

### **Development (.env.local)**
```bash
# Firebase Configuration (from Firebase Console)
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Realtime Database URL
REACT_APP_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com

# Canvas Configuration (optional overrides)
REACT_APP_CANVAS_ID=default-canvas
REACT_APP_FPS_COUNTER_ENABLED=true  # Dev only
```

### **Production (Firebase Console)**
- **Location:** Firebase Console → Project Settings → General → Your apps
- **Setup:** SDK setup and configuration
- **Note:** `.env.local` is NOT deployed (gitignored)
- **Process:** 
  1. Create web app in Firebase Console
  2. Copy configuration object
  3. Hardcode in `firebase.ts` or use environment-specific builds

### **Firebase Hosting Deployment**
```bash
# Initialize (one-time)
firebase init hosting

# Build production bundle
npm run build

# Deploy
firebase deploy --only hosting

# Access
https://PROJECT_ID.web.app
```

## Document Version
**Version:** 3.0  
**Last Updated:** October 13, 2025  
**Status:** Synchronized with PRD v3.0 and tasks.md v3.0

**Major Changes from v2.1:**
- Added optimistic updates architecture
- Updated deployment to Firebase Hosting (removed Vercel)
- Added error handling and retry logic (3 attempts with exponential backoff)
- Added toast notifications for errors and connection status
- Updated color palette to Material Design colors
- Added .env.local configuration documentation
- Added network disconnection detection and handling
- Updated environment variable management strategy
- Added 3 new services (zIndex, selection, activeEdits)
- Added 2 new RTDB paths (selections, activeEdits)
- Updated UI components for 3-column layout
- Removed selection state from Firestore
- Added z-index persistence to Firestore
- Updated cursor display (color labels, not emails)
- Updated test count from 17 to 21 files
- Added conflict resolution visual indicators
- Added viewport independence

