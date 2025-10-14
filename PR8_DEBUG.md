# PR #8 Debug - Connection Lost Issue

## Issue
- "Connection lost. Reconnecting..." showing in dev
- "0 users online" even with 2 browsers open
- After deploying RTDB rules

## Debugging Steps

### 1. Check Browser Console
Open Developer Tools → Console tab and look for:
- Red error messages about Firebase
- Permission denied errors
- Connection errors

**Expected console logs:**
```
[presence.service] User set online: <userId>
[presence.service] Connection state: online
[usePresence] Setting user online: <userId>
[usePresence] Online users: <number>
```

**Problem indicators:**
```
permission_denied
Failed to set user online
Connection state: offline
```

### 2. Check Network Tab
Developer Tools → Network tab:
- Filter by "firebase"
- Look for failed requests (red)
- Check if RTDB requests are going through

### 3. Verify Firebase Config
Check that `src/services/firebase.ts` has correct production credentials

### 4. Check RTDB Rules in Console
1. Go to Firebase Console: https://console.firebase.google.com/project/collab-canvas-mlx93/database
2. Click "Realtime Database" → "Rules"
3. Verify presence rules exist:
```json
"presence": {
  "$canvasId": {
    ".read": "auth != null",
    "$userId": {
      ".write": "auth != null && auth.uid == $userId"
    }
  }
}
```

### 5. Restart Dev Server
Sometimes the dev server needs a restart to pick up changes:
```bash
# Kill the existing dev server (Ctrl+C)
cd /Users/mylessjs/Desktop/Collab-Canvas/collabcanvas
npm start
```

### 6. Hard Refresh Browsers
After restarting dev server:
- Chrome/Edge: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Safari: Cmd+Option+R

---

## Most Likely Causes

### Cause 1: Dev Server Didn't Reload
**Fix:** Restart `npm start`

### Cause 2: Browser Cache
**Fix:** Hard refresh both browsers

### Cause 3: RTDB Rules Not Published
**Fix:** Verify in Firebase Console, redeploy if needed

### Cause 4: User Missing firstName/lastName
**Fix:** Check if logged-in user has firstName and lastName fields

---

## Quick Test
Run this in browser console to test RTDB connection:
```javascript
// Check if RTDB is connected
import { ref, onValue } from 'firebase/database';
import { rtdb } from './services/firebase';

onValue(ref(rtdb, '.info/connected'), (snapshot) => {
  console.log('RTDB Connected:', snapshot.val());
});
```

