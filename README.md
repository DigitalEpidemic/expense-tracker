# Firebase Expense Tracker

A modern expense tracking application built with React, TypeScript, Tailwind CSS, and Firebase.

## Features

- 🔐 **Google Authentication** - Secure login with Firebase Auth
- 💰 **Full Expense Management** - Add, edit, delete, and duplicate expenses
- 📊 **Real-time Data Sync** - Live updates with Firestore database
- 📱 **Mobile-Responsive Design** - Optimized for both desktop and mobile devices
- 🗂️ **Expense Categories** - Organize expenses into predefined categories (Food & Dining, Transportation, Shopping, etc.)
- ✅ **Reimbursement Tracking** - Mark expenses as reimbursed or pending with one-click toggle
- 📈 **Monthly Grouping** - Automatic grouping by month with total, reimbursed, and pending amounts
- 🔍 **Smart Filtering** - Filter expenses by reimbursement status (All, Reimbursed, Pending)
- 📄 **Receipt Upload & Parsing** - Upload receipt images (JPG, PNG, WebP) or PDFs and automatically extract expense data
- 🔄 **Bulk Upload** - Upload multiple receipts at once for batch processing
- 📋 **Expense Duplication** - Quickly duplicate existing expenses with one click
- 🏷️ **Summary Dashboard** - View total, reimbursed, and pending amounts at a glance
- 🔒 **Secure Data Storage** - User-specific data isolation with Firestore security rules
- 🎨 **Modern UI/UX** - Clean, intuitive interface with smooth animations and transitions

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

1. **Sign In** - Use your Google account for secure authentication
2. **Add Expenses** - Click "Add Expense" to manually enter expense details or upload receipt files
3. **Receipt Upload** - Drag and drop or select receipt images/PDFs for automatic data extraction
4. **Bulk Upload** - Upload multiple receipts at once for efficient data entry
5. **Manage Expenses** - Use action buttons to edit, duplicate, or delete expenses
6. **Track Reimbursements** - Toggle reimbursement status with one click
7. **Filter & View** - Use filters to view all, reimbursed, or pending expenses
8. **Monitor Totals** - Check summary cards and monthly breakdowns for financial insights

## Receipt Processing

The application includes intelligent receipt parsing capabilities:

- **Supported Formats**: JPG, PNG, WebP images and PDF files (max 10MB each)
- **Drag & Drop**: Intuitive drag-and-drop interface for file uploads
- **Automatic Extraction**: Automatically extracts merchant name, amount, date, and category from UberEats receipts
- **Bulk Processing**: Upload multiple receipts simultaneously for batch processing
- **Smart Parsing**: Uses PDF.js for client-side PDF text extraction and pattern matching
- **Fallback Handling**: Manual form completion when automatic parsing fails
- **Duplicate Detection**: Prevents duplicate file uploads

## Technologies Used

- **React 18** - UI framework with hooks and modern patterns
- **TypeScript** - Type safety and enhanced developer experience
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **Firebase** - Backend-as-a-Service platform
  - Firestore - NoSQL database with real-time synchronization
  - Authentication - Google OAuth integration
- **Vite** - Fast build tool and development server
- **PDF.js** - Client-side PDF parsing for receipt processing
- **React Hot Toast** - User-friendly notifications
- **Lucide React** - Modern icon library
- **UUID** - Unique identifier generation

## Project Structure

```
src/
├── components/          # React components
│   ├── AuthScreen.tsx   # Google authentication screen
│   ├── ExpenseForm.tsx  # Add/edit expense form with receipt upload
│   ├── ExpenseList.tsx  # Expense list with actions (edit, delete, duplicate)
│   ├── FilterBar.tsx    # Reimbursement status filter controls
│   ├── Header.tsx       # Application header with user info
│   └── SummaryCards.tsx # Financial summary dashboard
├── hooks/               # Custom React hooks
│   ├── useAuth.ts       # Firebase authentication hook
│   └── useExpenses.ts   # Expense data management hook
├── types/               # TypeScript type definitions
│   └── expense.ts       # Expense and form data interfaces
├── utils/               # Utility functions
│   ├── expenseUtils.ts  # Currency formatting and grouping utilities
│   └── receiptParser.ts # PDF/image receipt parsing with PDF.js
├── config/              # Configuration files
│   └── firebase.ts      # Firebase initialization
├── App.tsx              # Main application component
└── main.tsx             # Application entry point
```
