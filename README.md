# fullcircl

A community lending platform where people can borrow what they need or share what they're giving away.

**DAHA** = "Does Anyone Have A..." (request to borrow)
**DAWA** = "Does Anyone Want A..." (offer to donate)

## Features

- Two feed types: borrow requests (DAHA) and donation offers (DAWA)
- Group-based communities with admin approval for new members
- Invite codes and QR codes for joining groups
- In-app chat between borrowers and lenders
- Trust score system based on review feedback
- Badges for active community members
- Push notifications for new offers, messages, announcements
- Customizable themes
- User profiles with photos, bio, and grade tags

## Tech Stack

- **Frontend**: React Native + Expo SDK 54
- **Navigation**: React Navigation (bottom tabs + native stack)
- **UI**: React Native Paper (Material Design 3)
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Cloud Functions**: Firebase Cloud Functions (TypeScript)
- **Push Notifications**: Expo Notifications + Expo Push Service
- **Image Caching**: expo-image
- **Form Handling**: react-hook-form + zod
- **Language**: TypeScript

## Setup

### Prerequisites
- Node.js 18+
- Xcode (for iOS) or Android Studio (for Android)
- A Firebase project (Auth, Firestore, Storage enabled)

### 1. Clone and install dependencies

```bash
git clone https://github.com/katyw19/dahatest.git
cd dahatest
npm install
```

### 2. Set up environment variables

Create a `.env` file in the project root with your Firebase credentials:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_APP_ENV=dev
```

You can get these values from Firebase Console → Project Settings → Your apps.

### 3. Deploy Firestore rules (one time)

```bash
npm install -g firebase-tools
firebase login
firebase use --add  # select your project
firebase deploy --only firestore:rules
```

### 4. Deploy Cloud Functions (for push notifications)

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Note: requires Firebase Blaze plan (pay-as-you-go).

### 5. Run the app

In Expo Go (simulator only, no push notifications):
```bash
npx expo start --go
```

In a development build (real device with push notifications):
```bash
npx expo run:ios --device
# or
npx expo run:android --device
```

## Project Structure

```
src/
├── components/        # Reusable UI components
├── context/           # React contexts (auth, profile)
├── models/            # TypeScript types for Firestore documents
├── navigation/        # React Navigation setup
├── screens/           # All app screens
│   ├── auth/          # Sign in / sign up
│   └── groups/        # All group-scoped screens
├── services/          # Firebase service functions
├── theme/             # Theme configuration
└── utils/             # Helper utilities

functions/             # Firebase Cloud Functions (Node.js)
└── src/index.ts       # Push notification triggers
```

## Firestore Schema

```
groups/{groupId}/
├── posts/{postId}              # DAHA requests + DAWA donations
│   └── offers/{offerId}        # Offers/bids on posts
├── threads/{threadId}          # Chat threads
│   └── messages/{messageId}
├── members/{uid}               # Group memberships with stats
├── joinRequests/{requestId}    # Pending join requests
├── announcements/{id}          # Pinned admin announcements
├── reports/{reportId}          # User-reported content
└── adminActions/{actionId}     # Audit log

users/{uid}/                    # User profiles + push token
└── memberships/{groupId}       # User's groups (mirror)
```

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make changes and commit: `git commit -m "your message"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request on GitHub
