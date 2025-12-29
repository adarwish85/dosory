# Goalo CRM Platform

A comprehensive CRM/ERP SaaS platform built with Next.js and Firebase, designed for modern businesses to manage customers, leads, invoices, projects, and more.

## 🚀 Features

### Core Modules
- **Customers** - Full customer lifecycle management with contacts, notes, and activity tracking
- **Leads** - Lead capture, scoring, pipeline management, and conversion to customers
- **Invoices** - Create, send, and track invoices with payment recording
- **Estimates** - Generate estimates and convert to invoices
- **Proposals** - Create professional proposals for prospects
- **Projects** - Project management with task tracking
- **Support** - Customer support ticketing system

### Platform Features
- **Multi-tenant Architecture** - Organization-based data isolation
- **Role-based Access Control** - Granular permissions system
- **Real-time Updates** - Firestore-powered live data synchronization
- **Responsive Design** - Mobile-friendly interface
- **i18n Ready** - Internationalization support

---

## 🛠 Technology Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19, Tailwind CSS 4, Radix UI |
| **Backend** | Firebase (Firestore, Auth, Functions) |
| **State** | React Hooks, Zustand |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts |
| **PDF** | @react-pdf/renderer |
| **Testing** | Jest, Cypress |

---

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore and Authentication enabled

---

## 🔧 Setup & Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd platform
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env.local` file with your Firebase configuration:

```env
# Firebase Client Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (for server-side operations)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="your_private_key"

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password

# PayPal (optional)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
```

### 4. Deploy Firestore rules and indexes
```bash
firebase deploy --only firestore
```

### 5. Start development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
platform/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Main application pages
│   ├── login/             # Authentication pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── dashboard/         # Dashboard-specific components
│   ├── ui/                # Shadcn/ui components
│   └── onboarding/        # Onboarding flow components
├── lib/                   # Utilities and shared logic
│   ├── hooks/             # Custom React hooks
│   ├── email/             # Email templates
│   ├── schemas.ts         # Zod validation schemas
│   └── types.ts           # TypeScript type definitions
├── functions/             # Firebase Cloud Functions
├── tests/                 # Test files
└── firestore.rules        # Firestore security rules
```

---

## 🧪 Testing

### Run unit tests
```bash
npm run test
```

### Run E2E tests
```bash
npm run test:e2e
```

### Open Cypress UI
```bash
npm run cypress
```

---

## 🚢 Deployment

### Deploy to Firebase Hosting
```bash
npm run build
firebase deploy
```

### Deploy only functions
```bash
firebase deploy --only functions
```

### Deploy only Firestore rules
```bash
firebase deploy --only firestore:rules
```

---

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Jest tests |
| `npm run test:e2e` | Run Cypress E2E tests |
| `npm run cypress` | Open Cypress UI |

---

## 🔐 Security

- All data is isolated by organization (`orgId`)
- Firestore security rules enforce access control
- Firebase Authentication handles user management
- Environment variables store sensitive configuration

---

## 📚 Additional Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [API Documentation](./docs/API.md)
- [Test Plan](./tests/TEST_PLAN.md)

---

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run lint` and `npm run test`
4. Submit a pull request

---

## 📄 License

Proprietary - All rights reserved
