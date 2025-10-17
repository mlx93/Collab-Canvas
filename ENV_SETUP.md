# Environment Setup

## Local Development

The Firebase credentials are stored in `.env` files that are **not tracked in Git** for security.

### Setup Instructions:

1. **For local development**, copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your Firebase credentials** from Firebase Console

3. **For staging builds**, ensure you have `.env.staging` locally:
   - Contact the project maintainer for the staging credentials
   - Or get them from Firebase Console for the staging project

4. **For production builds**, ensure you have `.env.production` locally:
   - Contact the project maintainer for the production credentials
   - Or get them from Firebase Console for the production project

## Why aren't these in Git?

- GitHub flags committed API keys as security risks
- While Firebase API keys are designed to be public (they're in the browser), we prefer not to commit them
- Security is handled by Firebase Security Rules (see `firestore.rules` and `database.rules.json`)

## Files:

- `.env.local` - Your local development credentials (ignored by Git)
- `.env.staging` - Staging environment credentials (ignored by Git, needed for staging builds)
- `.env.production` - Production credentials (ignored by Git, needed for production builds)
- `.env.example` - Template file with dummy values (tracked in Git)
