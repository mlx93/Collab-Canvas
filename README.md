# CollabCanvas MVP

A real-time collaborative design tool with multiplayer synchronization, built with React, TypeScript, and Firebase.

## Features (MVP)

- **Real-time Collaboration**: Multiple users can work on the same canvas simultaneously
- **Optimistic Updates**: Instant local feedback with "last write wins" conflict resolution
- **Rectangle Creation**: Create, move, resize, recolor, and delete rectangles
- **Z-Index System**: Automatic layering (most recent to front) with manual override
- **Multiplayer Cursors**: See other users' cursors with color labels at 60 FPS
- **Presence Awareness**: See who's online in the top header
- **Pan & Zoom**: Navigate the 5000x5000px canvas (10%-800% zoom)
- **3-Column UI**: Left toolbar, center canvas, right properties panel

## Tech Stack

- **Frontend**: React + TypeScript, Konva.js, Tailwind CSS
- **Backend**: Firebase (Firestore + Realtime Database + Authentication + Hosting)
- **State Management**: React Context API
- **Testing**: Jest + React Testing Library

## Architecture

- **Firestore**: Persistent data (shapes with z-index, metadata)
- **Realtime Database**: Ephemeral data (cursors, selections, presence, activeEdits)
- **Hybrid Approach**: 97% cheaper for high-frequency updates, 3x lower latency

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Firebase account (free tier works)
- Firebase CLI: `npm install -g firebase-tools`

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mlx93/Collab-Canvas.git
   cd Collab-Canvas/collabcanvas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```bash
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Start the development server**
   ```bash
   npm start
   ```
   
   Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Firebase Emulators (Local Development)

Run tests and develop locally without hitting production Firebase:

```bash
# Start all emulators
npm run emulators

# Emulator ports:
# - Auth: localhost:9099
# - Firestore: localhost:8080
# - Realtime Database: localhost:9000
# - Emulator UI: localhost:4000
```

## Available Scripts

- `npm start` - Run development server
- `npm test` - Run test suite
- `npm run build` - Build for production
- `npm run emulators` - Start Firebase emulators (add this to package.json)

## Project Structure

```
src/
├── components/
│   ├── Auth/          # Login, Signup, AuthLayout
│   ├── Canvas/        # Canvas, LeftToolbar, PropertiesPanel, Rectangle, FPSCounter
│   ├── Collaboration/ # CursorOverlay, EditingIndicator, ActiveUsers
│   └── Layout/        # Header, MainLayout
├── context/           # AuthContext, CanvasContext
├── hooks/             # useAuth, useCanvas, useCursors, usePresence, useFPS
├── services/          # firebase, auth, canvas, cursor, presence, selection, activeEdits, zIndex
├── types/             # user.types, canvas.types, cursor.types
├── utils/             # constants, helpers, colors, throttle
└── __tests__/         # Integration tests
```

## Key Constants

- **Canvas ID**: `default-canvas` (single shared canvas)
- **Canvas Size**: 5000x5000px
- **Canvas Background**: Off-white (#FAFAFA)
- **Rectangle Default**: 100x100px at viewport center
- **Colors**: Blue, Green, Red, Orange, Black (Material Design)
- **Zoom Limits**: 10% - 800%

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test auth.service.test.ts

# Run with coverage
npm test -- --coverage
```

## Deployment

Deploy to Firebase Hosting:

```bash
# Build production bundle
npm run build

# Deploy
firebase deploy --only hosting

# Your app will be live at:
# https://your-project-id.web.app
```

## Development Workflow

Follow the PR-by-PR approach outlined in `tasks.md`:

1. **PR #1**: Project Setup ✅ (Current)
2. **PR #2**: Authentication
3. **PR #3**: UI Layout & Canvas
4. **PR #4**: Rectangle Operations
5. **PR #5**: Firestore Integration
6. **PR #6**: Optimistic Updates & Conflict Resolution
7. **PR #7**: Multiplayer Cursors
8. **PR #8**: Presence Awareness
9. **PR #9**: Deployment & Polish

## Contributing

This is an MVP project. Follow the tasks.md file for implementation order.

## License

MIT

## Contact

For questions or issues, please open a GitHub issue.
