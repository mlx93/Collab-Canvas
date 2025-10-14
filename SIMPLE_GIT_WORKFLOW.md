# Simplified Git Workflow for Collab-Canvas

## Philosophy
As a **solo developer**, feature branching adds unnecessary complexity. Work directly on `main` for faster iteration.

## Daily Workflow

### 1. Start Working
```bash
cd /Users/mylessjs/Desktop/Collab-Canvas/collabcanvas
git pull origin main  # Get latest changes (if working across machines)
npm start             # Start development server
```

### 2. Make Changes
- Edit files in your IDE
- Test locally: `npm test`
- Check browser: http://localhost:3000

### 3. Commit & Push
```bash
# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "feat: Add new feature X

- Did this
- Changed that
- Fixed the other thing"

# Push to GitHub
git push origin main
```

### 4. Deploy to Production
```bash
# Build production bundle
npm run build

# Deploy to Firebase
npx firebase deploy

# Or deploy only hosting (faster)
npx firebase deploy --only hosting
```

## Commit Message Convention

Use conventional commits for clarity:

```bash
feat: New feature
fix: Bug fix
docs: Documentation changes
style: Formatting, missing semicolons, etc
refactor: Code restructuring
test: Adding tests
chore: Maintenance tasks
```

Examples:
```bash
git commit -m "feat: Add delete button to properties panel"
git commit -m "fix: Canvas pan now works correctly on mobile"
git commit -m "docs: Update README with new features"
git commit -m "refactor: Extract canvas logic into custom hook"
```

## When Things Go Wrong

### Undo Last Commit (Not Pushed Yet)
```bash
git reset --soft HEAD~1  # Keeps your changes, just uncommits
```

### Discard All Local Changes
```bash
git reset --hard HEAD    # WARNING: Loses all uncommitted work!
```

### Pull Latest After Conflicts
```bash
git pull origin main --rebase
```

## Quick Commands Reference

```bash
# See what changed
git status

# See commit history
git log --oneline --graph -10

# See what you changed
git diff

# Undo changes to a specific file
git checkout -- src/components/MyFile.tsx
```

## Typical PR Workflow (Without Branches)

For each PR (like PR #6, PR #7, etc):

```bash
# 1. Work on your changes
# Edit files...

# 2. Test everything
npm test                    # Run unit tests
npm run build              # Verify build works
# Manual testing in browser

# 3. Commit with PR context
git add -A
git commit -m "feat: PR #6 - Real-time synchronization

✨ Features:
- Added feature A
- Implemented feature B
- Updated feature C

✅ Testing:
- All 130 tests passing
- Manual testing confirmed

📝 Documentation:
- Updated tasks.md
- Added code comments"

# 4. Push to GitHub
git push origin main

# 5. Deploy to production
npm run build
npx firebase deploy
```

## Benefits of This Approach

✅ **Simpler**: No branch management overhead  
✅ **Faster**: Commit and deploy immediately  
✅ **Clear History**: Linear commit log easy to follow  
✅ **No Merge Conflicts**: Working directly on main  
✅ **Perfect for Solo Dev**: No need for PR reviews  

## When You MIGHT Want Branches

Consider branching only if:
- Experimenting with a major refactor you might abandon
- Working on something that will take days/weeks
- Need to maintain multiple versions simultaneously

Otherwise, **keep it simple** and work on main! 🚀

## PR #3 and PR #4 Reference

For historical reference, PR #3 and PR #4 commits are preserved on the `feat/rectangle-operations` branch:
- `0c306f1` - PR #3: Canvas UI & Basic Pan/Zoom
- `d101064` - PR #4: Rectangle operations

You can view these anytime with:
```bash
git show 0c306f1  # View PR #3
git show d101064  # View PR #4
```

The code from these PRs is already in main (came through PR #5), so the functionality is all there.

