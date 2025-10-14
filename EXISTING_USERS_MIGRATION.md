# Existing Users Migration Guide

## Background
As of PR #6, we added `firstName` and `lastName` fields to user profiles. These fields are used for displaying user names in collaboration indicators instead of email addresses.

## Handling Existing Users (Pre-PR #6)

Users created before PR #6 don't have `firstName` and `lastName` in their Firestore documents.

### Automatic Fallbacks
The app automatically handles this:
- **Default values on sign-in**: `firstName: 'User'`, `lastName: ''`
- **Display logic**: If firstName is missing or 'User', the app shows the email username (part before @) instead

### Manual Update via Firebase Console

To manually update existing users' names:

1. Go to Firebase Console → Firestore Database
2. Navigate to `users` collection
3. Click on the user document (by userId)
4. Click "Edit Document"
5. Add two fields:
   - `firstName` (string): User's first name
   - `lastName` (string): User's last name
6. Click "Update"

The changes will take effect on next sign-in.

## Future Enhancement: Profile Edit Feature

**TODO (Post-PR #6):** Add a profile settings page where users can:
- View their current profile (email, firstName, lastName)
- Edit their firstName and lastName
- Save changes to Firestore

This will allow users to update their own names without needing Firebase Console access.

### Suggested Implementation:
- Add a "Profile" dropdown in the Header (next to Sign Out)
- Create a `ProfileModal` component with editable fields
- Add `updateProfile` function in `auth.service.ts`
- Update Firestore security rules to allow users to update their own profile

## Firestore Security Rules Update

Ensure users can update their own `firstName` and `lastName`:

```javascript
match /users/{userId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.auth.uid == userId;
  allow update: if request.auth != null && request.auth.uid == userId 
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['firstName', 'lastName']);
}
```

This rule allows users to update only their firstName/lastName fields, not email or userId.

