# Digital Menu Management System

A Digital Menu Management System built with the T3 Stack, allowing restaurant owners to manage their menus and enabling customers to view them digitally through QR codes or shared links.

## 🚀 Live Demo

**Vercel-hosted link**: [Add your deployed Vercel link here after deployment]

## 📋 Features

### User Management

- Email + verification code login/registration
- User profile includes:
  - Full name
  - Valid country name

### Restaurant Management

- One user can create and manage multiple restaurants
- Each restaurant has:
  - Restaurant name
  - Location

### Menu Management

- Create categories under a restaurant
- Add dishes under categories
- A dish can belong to multiple categories
- Each dish must include:
  - Name
  - Image
  - Description
  - Spice level (optional)

### Customer Access

- View menu using:
  - QR code
  - Shared public link

### UI Requirements

- Matches provided reference images
- Category name stays fixed while scrolling
- Floating menu button for category navigation

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API**: tRPC
- **ORM**: Prisma
- **Database**: PostgreSQL (Supabase)
- **UI Components**: shadcn/ui
- **Hosting**: Vercel

## 📦 Setup Instructions

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Supabase or local)
- Git

### Installation

1. **Clone the repository:**

   ```bash
   git clone <your-repo-url>
   cd digital-menu-management
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your configuration:

   ```env
   DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
   NODE_ENV="development"
   ```

4. **Set up the database:**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup (Supabase)

1. Create a new project on Supabase
2. Get your database connection string from Project Settings > Database
3. Add it to your `.env` file as `DATABASE_URL`
4. Run migrations: `npx prisma db push`

## 🗄️ Database Schema

- **User**: User accounts with email, name, and country
- **Session**: Authentication sessions
- **VerificationCode**: Email verification codes
- **Restaurant**: Restaurant information
- **Category**: Menu categories
- **Dish**: Menu items
- **DishCategory**: Many-to-many relationship between dishes and categories

## 📁 Folder Structure

```
digital-menu-management/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── components/
│   │   └── ui/                # shadcn/ui components
│   ├── contexts/             # React contexts
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility functions
│   ├── pages/                 # Next.js pages
│   │   ├── api/              # API routes
│   │   ├── menu/              # Public menu view
│   │   └── restaurant/       # Restaurant management
│   └── server/
│       └── api/
│           └── routers/       # tRPC routers
└── public/                    # Static assets
```

## 🧪 Development Approach

### Brief Explanation

I approached this project by:

1. Setting up the T3 Stack foundation (Next.js, tRPC, Prisma, TypeScript, Tailwind)
2. Designing the database schema with proper relationships (User → Restaurants → Categories/Dishes)
3. Implementing custom email verification authentication (no NextAuth as required)
4. Building the admin interface for restaurant and menu management
5. Creating the public menu view with sticky headers and floating navigation
6. Adding QR code generation and sharing functionality

### IDE Used

**VS Code** (Cursor - VS Code-based editor with AI integration)

### AI Tools and Models Used

- **Primary AI Tool**: Claude (via Cursor's AI integration)
- **Model**: Claude Sonnet 3.5

### Example Prompts Used

1. "Initialize a T3 Stack project with Next.js, tRPC, Prisma, TypeScript, and Tailwind CSS. Skip NextAuth as specified in requirements."

2. "Create a Prisma schema for a restaurant menu management system with users, restaurants, categories, dishes, and a many-to-many relationship between dishes and categories. Include session management and email verification codes."

3. "Implement email verification authentication without NextAuth. Include verification code generation, expiration (10 minutes), session management, and proper error handling for expired/invalid codes."

4. "Create tRPC routers for authentication, restaurants, categories, and dishes with proper TypeScript types, error handling, and ownership verification."

5. "Build shadcn/ui components for the admin panel: buttons, inputs, dialogs, cards, and forms for restaurant and menu management."

6. "Create a customer-facing menu view that matches the reference images: fixed category header that updates on scroll, floating menu button for navigation, dish cards with images, descriptions, and spice levels."

7. "Add QR code generation for restaurant menu sharing using qrcode.react library."

### How Helpful AI Was

The AI tool was **extremely helpful** and significantly accelerated development:

**Strengths:**

- Rapid prototyping and boilerplate code generation
- Type-safe code generation for tRPC routers and Prisma queries
- Component generation with correct props and styling
- Architecture guidance for database schema design
- Error handling pattern suggestions
- Code consistency maintenance

**Areas Where Human Judgment Was Critical:**

- Business logic design (authentication flow, session management)
- UI/UX decisions (matching reference images, user experience)
- Edge case identification and handling
- Code review and security verification

### Mistakes Identified and Corrected

1. **tRPC Context Type Mismatch**: Initial implementation used incorrect request type. Fixed by using `CreateNextContextOptions` from `@trpc/server/adapters/next`.

2. **Missing Import in Restaurant Router**: `publicProcedure` was used but not imported for `getPublicMenu`. Added to imports.

3. **Menu View Category Selection Logic**: `useEffect` had `selectedCategory` in dependencies causing infinite loops. Removed from dependencies.

4. **Image Component Implementation**: Initially used regular `<img>` tags. Switched to Next.js `Image` component for better performance.

5. **Scroll-Based Category Update**: Category header didn't update based on scroll position. Added scroll event listener.

## ✅ All Edge Cases Handled

### Authentication Edge Cases

- Expired verification codes (10-minute expiration)
- Invalid verification codes (6-digit format validation)
- Session expiration (30-day expiration with cleanup)
- Unauthorized access (protected routes, ownership verification)
- Duplicate email registration (handles existing users)
- Missing user on login (clear error messages)

### Data Management Edge Cases

- Empty states (restaurant lists, categories, dishes)
- Dish-category relationships (dishes can exist without categories)
- Image handling (optional images, error handling)
- Data validation (required fields, spice level range 0-5)
- Concurrent operations (prevents duplicate category names)

### UI/UX Edge Cases

- Loading states (indicators for async operations)
- Error handling (toast notifications, inline validation)
- Responsive design (mobile-first approach)
- Scroll behavior (fixed header updates, smooth scrolling)
- Form state management (reset after submission, prevents duplicates)

## ⚠️ Edge Cases Not Handled + Future Plan

### 1. Email Service Integration

- **Issue**: Verification codes are logged to console in development mode
- **Impact**: Not production-ready; users can't actually receive codes
- **Future Plan**: Integrate Resend or SendGrid API with email templates and rate limiting

### 2. Image Upload Functionality

- **Issue**: Currently only accepts image URLs; no direct upload
- **Impact**: Users must host images elsewhere first
- **Future Plan**: Integrate Cloudinary or AWS S3 for direct uploads with compression and validation

### 3. Rate Limiting and Security

- **Issue**: No rate limiting on verification code requests
- **Impact**: Vulnerable to abuse (spam, DoS)
- **Future Plan**: Implement rate limiting per IP/email (e.g., 3 codes per hour) with CAPTCHA for suspicious activity

### 4. Data Validation on Client-Side Forms

- **Issue**: Some validation only happens server-side
- **Impact**: Poor UX with delayed error feedback
- **Future Plan**: Add real-time client-side validation using react-hook-form with zod schemas

### 5. Error Recovery and Retry Logic

- **Issue**: Network errors don't have automatic retry
- **Impact**: Users must manually retry failed operations
- **Future Plan**: Implement exponential backoff retry logic with "Retry" buttons

### 6. Performance Optimization

- **Issue**: No pagination for large menus
- **Impact**: Slow loading for restaurants with many dishes
- **Future Plan**: Implement infinite scroll or pagination with image lazy loading

## 🚢 Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string
   - `NODE_ENV`: `production`
4. Deploy

The application will be automatically deployed and available at your Vercel URL.

## 📄 License

This project was created as a test assignment.

---

**Note**: This project strictly follows the assignment requirements. For production use, additional security measures, error handling, and features would be recommended.
