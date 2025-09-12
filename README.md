# Firebase Expense Tracker

A modern expense tracking application built with React, TypeScript, Tailwind CSS, and Firebase. Features intelligent receipt parsing for UberEats and DoorDash receipts with advanced reimbursement matching capabilities.

## Features

- 🔐 **Google Authentication** - Secure login with Firebase Auth
- 💰 **Full Expense Management** - Add, edit, delete, and duplicate expenses
- 📊 **Real-time Data Sync** - Live updates with Firestore database
- 📱 **Mobile-Responsive Design** - Optimized for both desktop and mobile devices
- 🗂️ **Expense Categories** - Organize expenses into predefined categories (Food & Dining, Transportation, Shopping, etc.)
- ✅ **Reimbursement Tracking** - Mark expenses as reimbursed or pending with one-click toggle
- 📈 **Monthly Grouping** - Automatic grouping by month with total, reimbursed, and pending amounts
- 🔍 **Smart Filtering** - Filter expenses by reimbursement status (All, Reimbursed, Pending)
- 📄 **PDF Receipt Parsing** - Upload UberEats or DoorDash PDF receipts and automatically extract expense data
- 🔄 **Bulk Upload** - Upload multiple receipts at once for batch processing
- 📋 **Expense Duplication** - Quickly duplicate existing expenses with one click
- 🏷️ **Summary Dashboard** - View total, reimbursed, and pending amounts at a glance
- 🧮 **Smart Reimbursement Matching** - Advanced algorithm to find optimal expense combinations that match reimbursement amounts

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

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI (interactive mode)
npm run test:ui
```

## Usage

1. **Sign In** - Use your Google account for secure authentication
2. **Add Expenses** - Manually enter expense details or upload PDF receipt files (up to 10MB)
3. **Smart Receipt Processing** - Automatic extraction of merchant name, amount, date, and category from UberEats and DoorDash receipts with fallback to manual entry
4. **Bulk Operations** - Upload multiple receipts simultaneously or duplicate existing expenses
5. **Track Reimbursements** - Toggle individual expenses or use smart matching to find optimal combinations that match your reimbursement amounts
6. **Filter & Monitor** - Use filters to view expenses by status and check real-time summary cards with monthly breakdowns

## Technologies Used

- **React 18** - UI framework with hooks and modern patterns
- **TypeScript** - Type safety and enhanced developer experience
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **Firebase** - Backend-as-a-Service platform
  - Firestore - NoSQL database with real-time synchronization
  - Authentication - Google OAuth integration
- **Vite** - Fast build tool and development server
- **Vitest** - Fast unit test framework with native ESM support
- **React Testing Library** - Simple and complete testing utilities
- **PDF.js** - Client-side PDF parsing for receipt processing
- **React Hot Toast** - User-friendly notifications
- **Lucide React** - Modern icon library
- **UUID** - Unique identifier generation

## Project Structure

```
src/
├── components/                    # React components
│   ├── AuthScreen.tsx            # Google authentication screen
│   ├── EmptyState.tsx            # Empty state with contextual messaging
│   ├── ExpenseForm.tsx           # Add/edit expense form with receipt upload
│   ├── ExpenseList.tsx           # Expense list with actions (edit, delete, duplicate)
│   ├── ExpenseTableRow.tsx       # Individual expense row component
│   ├── FilterBar.tsx             # Reimbursement status filter controls
│   ├── Header.tsx                # Application header with user info
│   ├── LoadingSpinner.tsx        # Loading state component
│   ├── ReimbursementModal.tsx    # Smart reimbursement matching interface
│   └── SummaryCards.tsx          # Financial summary dashboard
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts                # Firebase authentication hook
│   ├── useExpenses.ts            # Expense data management hook
│   └── useMediaQuery.ts          # Responsive design hook
├── types/                        # TypeScript type definitions
│   └── expense.ts                # Expense and form data interfaces
├── utils/                        # Utility functions
│   ├── baseReceiptParser.ts      # Base class for receipt parsing
│   ├── doorDashParser.ts         # DoorDash-specific receipt parsing
│   ├── expenseUtils.ts           # Currency formatting and grouping utilities
│   ├── parsingLogger.ts          # Receipt parsing logging utilities
│   ├── receiptParser.ts          # Main receipt parsing orchestrator
│   ├── reimbursementMatcher.ts   # Advanced reimbursement matching algorithm
│   └── uberEatsParser.ts         # UberEats-specific receipt parsing
├── test/                         # Test configuration
│   └── setup.ts                  # Vitest test setup
├── config/                       # Configuration files
│   └── firebase.ts               # Firebase initialization
├── App.tsx                       # Main application component
└── main.tsx                      # Application entry point
```
