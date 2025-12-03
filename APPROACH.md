# 🍽️ Digital Menu Management System

A modern, scalable platform that allows restaurants to manage their menus digitally and enables customers to access menus via QR codes or shareable links.

Built with the T3 Stack (Next.js + tRPC + Prisma + Tailwind + TypeScript) and powered by PostgreSQL (Supabase).

## 📌 Table of Contents

- [Overview](#-overview)
- [Features](#-key-features)
- [Architecture](#️-architecture)
- [Tech Stack](#️-tech-stack)
- [Database Design](#️-database-design)
- [Authentication Flow](#-authentication-flow)
- [API Layer (tRPC)](#-trpc-architecture)
- [Frontend Architecture](#️-frontend-architecture)
- [Installation & Setup](#️-installation--setup)
- [Environment Variables](#-environment-variables)
- [Scripts](#-scripts)
- [Deployment](#-deployment)
- [Security](#-security-features)
- [Performance](#-performance-optimizations)
- [Future Enhancements](#-future-enhancements)

## ✅ Overview

This system allows restaurant owners to:

- Register/login using email + verification code
- Manage restaurants, categories & dishes
- Generate QR codes and public menu links
- Share menu with customers instantly
- Update menu in real-time without reprinting

Customers can:

- Open menu using QR code
- Browse by category
- View item details (price, description, image)

## 🚀 Key Features

- ✅ Passwordless authentication (Email + OTP)
- ✅ Multiple restaurant support per user
- ✅ Category & dish management
- ✅ QR Code generation
- ✅ Responsive UI (mobile-first)
- ✅ Server-side rendering (SEO optimized)
- ✅ Fully type-safe (end to end)
- ✅ Secure session handling
- ✅ Scalable architecture

## 🏗️ Architecture

```text
Client (Next.js + React + Tailwind)
        ↓
      tRPC API Layer
        ↓
   Prisma ORM + PostgreSQL (Supabase)
```

### Layers

- **Frontend**: Next.js 14 + Tailwind + shadcn/ui
- **API**: tRPC routers & procedures
- **DB**: PostgreSQL via Prisma
- **Auth**: Custom OTP & session-based auth
- **State**: React Query + Context API

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | Frontend + Backend |
| TypeScript | Type safety |
| tRPC | Type-safe API |
| Prisma | ORM |
| PostgreSQL | Database |
| Supabase | Hosted DB |
| Tailwind CSS | UI |
| shadcn/ui | Components |
| React Query | Data fetching |
| Zod | Validation |
| Resend | Email OTP |
| qrcode.react | QR generation |

## 🗄️ Database Design

### Relationships

- User (1) → (N) Restaurant
- Restaurant (1) → (N) Category
- Restaurant (1) → (N) Dish
- Dish (N) → (N) Category
- User (1) → (N) Session

### Main Models

- User
- Session
- VerificationCode
- Restaurant
- Category
- Dish
- DishCategory

### Special Notes

- `cuid()` used for IDs
- Codes expire in 10 min
- Sessions expire in 30 days
- Cascade deletes enabled
- Indexed for performance

## 🔐 Authentication Flow

1. User enters email
2. System sends 6-digit OTP
3. OTP verified via tRPC
4. Session token generated
5. Stored in local storage
6. Added to API header

```http
Authorization: Bearer <SESSION_TOKEN>
```

### Middleware Protection

All private routes are protected using:

```typescript
if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
```

## 🧠 tRPC Architecture

### Routers

- auth
- restaurant
- category
- dish

### Procedures

- publicProcedure
- protectedProcedure

Every mutation checks resource ownership:

```typescript
if (restaurant.userId !== ctx.userId) {
  throw new TRPCError({ code: "FORBIDDEN" });
}
```

## 🖥️ Frontend Architecture

- `/dashboard` – Restaurant Admin UI
- `/menu/[restaurantId]` – Public menu
- `/auth` – Login/Register

### State Management

- React Query = Server State
- Context API = Auth
- localStorage = Token

### Uses

- lucide-react icons
- shadcn/ui components
- Tailwind for styling

## ⚙️ Installation & Setup

### 1️⃣ Clone

```bash
git clone https://github.com/yourname/digital-menu-system.git
cd digital-menu-system
```

### 2️⃣ Install dependencies

```bash
pnpm install
```

### 3️⃣ Setup Prisma

```bash
npx prisma migrate dev
npx prisma generate
```

### 4️⃣ Start dev server

```bash
pnpm dev
```

Visit: <http://localhost:3000>

## 🔑 Environment Variables

Create `.env`:

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
NEXT_PUBLIC_BASE_URL=http://localhost:3000
RESEND_API_KEY=your_key
```

For production use Vercel or Supabase env settings

## 📦 Scripts

```bash
pnpm dev      # run dev server
pnpm build    # production build
pnpm start    # start prod server
pnpm lint     # lint code
pnpm format   # format with prettier
```

## 🔒 Security Features

- ✅ OTP expiration (10 mins)
- ✅ Session expiration (30 days)
- ✅ Tokenized authentication
- ✅ Route protection
- ✅ Input validation with Zod
- ✅ SQL injection prevention via Prisma

### Future security upgrades

- HttpOnly cookies
- 2FA
- Rate limiting

## ⚡ Performance Optimizations

- 🚀 Server Side Rendering (SSR)
- 🚀 React Query caching
- 🚀 Lazy loading for media
- 🚀 Indexed DB queries
- 🚀 Code splitting in Next.js
- 🚀 Static menu pages

## 📦 Deployment

**Recommended**: Vercel + Supabase

1. Push to GitHub
2. Import project in Vercel
3. Add env variables
4. Set Build Command = `pnpm build`

## 🔮 Future Enhancements

- Stripe payment integration
- Multi-language support
- Menu scheduling
- Image CDN (Cloudinary)
- Role based access
- Analytics dashboard
- PWA Offline Mode
