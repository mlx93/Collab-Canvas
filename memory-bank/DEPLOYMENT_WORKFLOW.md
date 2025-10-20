# Git & Firebase Deployment Workflow

**Last Updated**: October 18, 2025  
**Status**: Production Guide

---

## Overview

CollabCanvas uses a two-environment deployment strategy:
- **Staging**: `collab-canvas-mlx93-staging` (for testing)
- **Production**: `collab-canvas-mlx93` (live users)

---

## Git Branch Strategy

### Branch Structure

```
main (production)
  └── staging (pre-production testing)
```

- **`staging` branch**: All development work, testing, and AI Agent updates
- **`main` branch**: Production-ready code only

### Key Principles

1. **Always develop on `staging` branch**
2. **Never commit directly to `main`**
3. **Merge `staging` → `main` only after testing**
4. **Keep `staging` branch intact** (don't delete after merge)

---

## Environment Files

### Location
```
collabcanvas/
├── .env.local          # Local development (gitignored)
├── .env.staging        # Staging environment (gitignored)
└── .env.production     # Production environment (gitignored)
```

### Why Gitignored?
- Security best practice (even though Firebase API keys are public-safe)
- Prevents accidental commits of credentials
- Each developer maintains their own local copies

### File Contents

**`.env.staging`**:
```bash
REACT_APP_FIREBASE_API_KEY=AIzaSyDQ0qrcx-DR8bg0PzvV2XQ0WgsgPciQTeA
REACT_APP_FIREBASE_AUTH_DOMAIN=collab-canvas-mlx93-staging.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://collab-canvas-mlx93-staging-default-rtdb.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=collab-canvas-mlx93-staging
REACT_APP_FIREBASE_STORAGE_BUCKET=collab-canvas-mlx93-staging.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=722173311895
REACT_APP_FIREBASE_APP_ID=1:722173311895:web:42fbb49a2d7ee5cf2322d2
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XK1EQRESFB
```

**`.env.production`**:
```bash
REACT_APP_FIREBASE_API_KEY=AIzaSyAOGUuhjhrtL9vqBTgvqxxe51f_rgo5Pcw
REACT_APP_FIREBASE_AUTH_DOMAIN=collab-canvas-mlx93.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://collab-canvas-mlx93-default-rtdb.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=collab-canvas-mlx93
REACT_APP_FIREBASE_STORAGE_BUCKET=collab-canvas-mlx93.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=927884216357
REACT_APP_FIREBASE_APP_ID=1:927884216357:web:4eebc7a326c613e664d7cc
REACT_APP_FIREBASE_MEASUREMENT_ID=G-WDCDN3NQW8
```

---

## Staging Deployment Workflow

### 1. Develop and Test Locally

```bash
cd /Users/mylessjs/Desktop/Collab-Canvas/collabcanvas

# Ensure you're on staging branch
git checkout staging

# Make your changes, test locally
npm start
```

### 2. Commit Changes to Staging

```bash
# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "Your descriptive commit message"

# Push to staging branch
git push origin staging
```

### 3. Build for Staging

```bash
# Build with staging environment variables
npm run build:staging

# This runs: npm run clean && env-cmd -f .env.staging react-scripts build
```

### 4. Build Cloud Functions

```bash
cd functions
npm run build
cd ..
```

### 5. Deploy to Staging Firebase

```bash
# Switch to staging Firebase project
firebase use staging

# Deploy everything
firebase deploy

# Or deploy specific services:
firebase deploy --only functions
firebase deploy --only firestore
firebase deploy --only hosting
```

### 6. Verify Staging

Visit: https://collab-canvas-mlx93-staging.web.app

**Test Checklist**:
- ✅ Authentication works (Google login)
- ✅ Canvas operations (create, move, delete shapes)
- ✅ AI Agent commands
- ✅ Multi-user collaboration
- ✅ No console errors

---

## Production Deployment Workflow

### 1. Merge Staging to Main

```bash
cd /Users/mylessjs/Desktop/Collab-Canvas/collabcanvas

# Ensure staging is clean
git status

# Switch to main branch
git checkout main

# Merge staging into main (keeps staging branch)
git merge staging -m "Merge staging to main: [description]"

# Push to main
git push origin main
```

### 2. Build for Production

```bash
# Build with production environment variables
npm run build:production

# This runs: npm run clean && env-cmd -f .env.production react-scripts build
```

### 3. Build Cloud Functions

```bash
cd functions
npm run build
cd ..
```

### 4. Deploy to Production Firebase

```bash
# Switch to production Firebase project
firebase use default

# Deploy everything
firebase deploy

# Or deploy specific services:
firebase deploy --only functions
firebase deploy --only firestore
firebase deploy --only hosting
```

### 5. Verify Production

Visit: https://collab-canvas-mlx93.web.app

**Final Verification**:
- ✅ All staging tests pass
- ✅ No breaking changes
- ✅ AI Agent functioning correctly
- ✅ Performance is acceptable

---

## Quick Reference Commands

### Staging Deployment (One-Liner)
```bash
cd /Users/mylessjs/Desktop/Collab-Canvas/collabcanvas && \
git checkout staging && \
git add -A && \
git commit -m "Your message" && \
git push origin staging && \
npm run build:staging && \
cd functions && npm run build && cd .. && \
firebase use staging && \
firebase deploy
```

### Production Deployment (One-Liner)
```bash
cd /Users/mylessjs/Desktop/Collab-Canvas/collabcanvas && \
git checkout main && \
git merge staging && \
git push origin main && \
npm run build:production && \
cd functions && npm run build && cd .. && \
firebase use default && \
firebase deploy
```

---

## Firebase Project Aliases

```bash
# View current project
firebase use

# Switch to staging
firebase use staging
# → collab-canvas-mlx93-staging

# Switch to production
firebase use default
# → collab-canvas-mlx93
```

---

## Common Issues & Solutions

### Issue 1: `auth/unauthorized-domain` Error

**Problem**: Google Auth fails in production

**Cause**: Built with wrong environment (used `npm run build` instead of `npm run build:production`)

**Solution**:
```bash
npm run build:production  # Use correct build command
firebase deploy --only hosting
```

---

### Issue 2: `.env.production` Not Found

**Problem**: `env-cmd` can't find `.env.production` file

**Cause**: File is gitignored and not present locally

**Solution**: Create the file manually (see "File Contents" section above)

---

### Issue 3: Functions Deployment Fails

**Problem**: `Error: There was an error deploying functions`

**Cause**: Google Cloud APIs not fully activated

**Solution**:
```bash
# Wait 30-60 seconds, then retry
firebase deploy --only functions
```

---

### Issue 4: Old Build Deployed

**Problem**: Changes not appearing on live site

**Cause**: Browser cache or wrong environment used

**Solution**:
```bash
# Force rebuild with correct environment
npm run clean
npm run build:production
firebase deploy --only hosting

# Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

---

### Issue 5: Git Merge Conflicts

**Problem**: Conflicts when merging staging to main

**Solution**:
```bash
# Abort the merge
git merge --abort

# Pull latest main
git checkout main
git pull origin main

# Try merge again
git merge staging

# If conflicts, resolve manually, then:
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

---

## Important URLs

### Firebase Consoles
- **Staging Console**: https://console.firebase.google.com/project/collab-canvas-mlx93-staging/overview
- **Production Console**: https://console.firebase.google.com/project/collab-canvas-mlx93/overview

### Live Applications
- **Staging App**: https://collab-canvas-mlx93-staging.web.app
- **Production App**: https://collab-canvas-mlx93.web.app

### Cloud Functions
- **Staging AI Function**: https://us-central1-collab-canvas-mlx93-staging.cloudfunctions.net/aiCommand
- **Production AI Function**: https://us-central1-collab-canvas-mlx93.cloudfunctions.net/aiCommand

### GitHub Repository
- **Repo**: https://github.com/mlx93/Collab-Canvas
- **Main Branch**: https://github.com/mlx93/Collab-Canvas/tree/main
- **Staging Branch**: https://github.com/mlx93/Collab-Canvas/tree/staging

---

## Build Script Reference

### From `package.json`:

```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",                    // ❌ DON'T USE (no env)
    "clean": "rm -rf build",
    "build:staging": "npm run clean && env-cmd -f .env.staging react-scripts build",
    "build:production": "npm run clean && env-cmd -f .env.production react-scripts build",
    "test": "react-scripts test",
    "deploy:staging": "npm run build:staging && firebase use staging && firebase deploy",
    "deploy:production": "npm run build:production && firebase use production && firebase deploy"
  }
}
```

### Automated Deployment Scripts:

**Deploy to Staging**:
```bash
npm run deploy:staging
```

**Deploy to Production**:
```bash
npm run deploy:production
```

---

## Pre-Deployment Checklist

### Before Staging Deploy:
- [ ] All code changes committed
- [ ] Local tests pass
- [ ] No TypeScript/linting errors
- [ ] `.env.staging` file exists
- [ ] On `staging` branch

### Before Production Deploy:
- [ ] Staging fully tested
- [ ] All critical bugs fixed
- [ ] Team approval received
- [ ] `.env.production` file exists
- [ ] `staging` merged to `main`
- [ ] On `main` branch

---

## Rollback Procedure

### If Production Has Issues:

**Option 1: Rollback to Previous Hosting Version**
```bash
# List recent versions
firebase hosting:channel:list

# Deploy specific version
firebase hosting:rollback
```

**Option 2: Redeploy Last Known Good Version**
```bash
# Find last good commit
git log --oneline

# Checkout that commit
git checkout <commit-hash>

# Build and deploy
npm run build:production
firebase deploy --only hosting

# Return to main
git checkout main
```

**Option 3: Quick Fix Forward**
```bash
# Make fix on staging
git checkout staging
# ... make fixes ...
git commit -m "Hotfix: [issue]"
git push origin staging

# Test on staging, then merge to main
git checkout main
git merge staging
git push origin main

# Deploy to production
npm run build:production
firebase deploy
```

---

## Monitoring & Logs

### View Logs

**Cloud Functions Logs**:
```bash
firebase functions:log --project collab-canvas-mlx93
```

**Real-time Logs**:
```bash
firebase functions:log --project collab-canvas-mlx93 --only aiCommand
```

### Firebase Console Logs
- Staging: https://console.firebase.google.com/project/collab-canvas-mlx93-staging/functions/logs
- Production: https://console.firebase.google.com/project/collab-canvas-mlx93/functions/logs

---

## Security Notes

1. **API Keys**: Firebase API keys in `.env` files are safe to be public (they're in the browser anyway)
2. **Security Rules**: Real security is enforced by Firestore Security Rules (`firestore.rules`)
3. **Authentication**: All sensitive operations require Firebase Authentication
4. **CORS**: Cloud Functions have CORS configured for specific domains only
5. **Git**: Never commit `.env` files (already in `.gitignore`)

---

## Emergency Contacts

- **Firebase Support**: https://firebase.google.com/support
- **GitHub Issues**: https://github.com/mlx93/Collab-Canvas/issues
- **Team Communication**: [Add your team communication channel]

---

## Version History

| Date | Version | Changes | Deployed By |
|------|---------|---------|-------------|
| Oct 18, 2025 | v1.1 | AI Agent fixes: multi-delete, size %, z-index | System |
| Oct 17, 2025 | v1.0 | AI Agent implementation complete | System |
| Earlier | v0.x | MVP features and collaboration | Team |

---

**Last Updated**: October 18, 2025  
**Next Review**: After next major feature deployment

