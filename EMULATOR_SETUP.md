# Firebase Emulator Setup Guide

## Current Issue
The Firebase emulators require Java 21 or higher, but the system currently has Java 1.7. This causes the emulators to fail with the error:
```
java.lang.UnsupportedClassVersionError: Unsupported major.minor version 55.0
```

## Solutions

### Option 1: Install Java 21+ (Recommended for Development)
1. Install Java 21 using Homebrew:
   ```bash
   brew install openjdk@21
   ```

2. Set Java 21 as default:
   ```bash
   sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
   ```

3. Update your shell profile (`.zshrc` or `.bash_profile`):
   ```bash
   export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
   export PATH="$JAVA_HOME/bin:$PATH"
   ```

4. Verify installation:
   ```bash
   java --version
   ```

5. Start emulators:
   ```bash
   firebase emulators:start --only auth,firestore,database
   ```

### Option 2: Use Mocked Tests (Current Implementation)
The test suite has been configured to work without emulators by mocking Firebase services. This is already implemented in `src/setupTests.ts`.

## Test Configuration
- Tests use mocked Firebase services instead of real emulators
- Environment variables are set in `.env.test`
- All Firebase operations are mocked for testing

## Running Tests
```bash
npm test
```

## Running with Emulators (After Java 21+ Installation)
1. Start emulators:
   ```bash
   firebase emulators:start --only auth,firestore,database
   ```

2. Set environment variable:
   ```bash
   export REACT_APP_USE_EMULATORS=true
   ```

3. Run tests:
   ```bash
   npm test
   ```

## Emulator URLs
- Emulator UI: http://127.0.0.1:4000
- Auth: http://127.0.0.1:9099
- Firestore: http://127.0.0.1:8080
- Realtime Database: http://127.0.0.1:9000
