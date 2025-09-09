# Firebase Expense Tracker

A modern expense tracking application built with React, TypeScript, Tailwind CSS, and Firebase.

## Features

- 🔐 Google Authentication
- 💰 Add, edit, and delete expenses
- 📊 Real-time data synchronization with Firestore
- 📱 Mobile-responsive design
- 🗂️ Categorize expenses
- ✅ Track reimbursement status
- 📈 Monthly expense grouping with totals
- 🔍 Filter expenses by reimbursement status

## Setup

### 1. Firebase Configuration

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database
3. Enable Authentication with Google provider
4. Copy your Firebase configuration

### 2. Environment Variables

1. Copy `.env.example` to `.env`
2. Replace the placeholder values with your actual Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your-actual-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

### 3. Firestore Security Rules

Set up the following security rules in your Firestore Database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own expenses
    match /expenses/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start Development Server

```bash
npm run dev
```

## Usage

1. Sign in with your Google account
2. Add expenses using the "Add Expense" button
3. Edit or delete expenses using the action buttons
4. Filter expenses by reimbursement status
5. View monthly totals and overall summaries

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Firebase** - Backend services
  - Firestore - Database
  - Authentication - User management
- **Vite** - Build tool
- **Lucide React** - Icons

## Project Structure

```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── config/             # Configuration files
└── App.tsx             # Main application component
```