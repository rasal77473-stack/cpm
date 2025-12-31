# Hostel Phone Management System

## Overview

This is a Next.js 16 web application for managing student phone deposits and withdrawals in a hostel environment. Staff members can track when students check their phones in or out, view transaction history, and administrators have access to student management, reports, and system settings.

The application uses a role-based authentication system with two roles: admin and staff. Admins have full access to student management and system configuration, while staff members can manage phone check-in/check-out operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 16 with App Router and React Server Components enabled
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS 4 with CSS variables for theming (light/dark mode support)
- **Icons**: Lucide React
- **State Management**: React hooks with localStorage for session persistence

### Backend Architecture
- **API Routes**: Next.js API routes in `app/api/` directory
- **Authentication**: Simple token-based auth stored in localStorage (mock implementation with hardcoded credentials)
- **Database ORM**: Drizzle ORM configured for PostgreSQL

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema**: Two main tables defined in `db/schema.ts`:
  - `students`: Stores student information (admission_number, name, locker_number)
  - `phone_status`: Tracks phone IN/OUT status with timestamps and staff attribution
- **Connection**: Uses `pg` Pool with `DATABASE_URL` environment variable

### Authentication Flow
- Login page at `/login` validates credentials against hardcoded users
- Token stored in localStorage along with staffId, staffName, and role
- Protected routes check for token presence and redirect to login if missing
- Admin routes additionally verify role is "admin"

### Page Structure
- `/` - Root redirects to login or dashboard based on auth state
- `/login` - Staff authentication
- `/dashboard` - Main phone management interface for staff
- `/history` - Transaction history view
- `/admin` - Admin panel with overview
- `/admin/manage-students` - CRUD operations for students with Excel import
- `/admin/reports` - Analytics and statistics
- `/admin/settings` - System configuration

## External Dependencies

### Third-Party Services
- **Vercel Analytics**: Integrated via `@vercel/analytics` for usage tracking

### Key NPM Packages
- **drizzle-orm / drizzle-kit**: Database ORM and migrations
- **pg**: PostgreSQL client for Node.js
- **xlsx**: Excel file parsing for bulk student import
- **react-hook-form / @hookform/resolvers**: Form handling with validation
- **date-fns**: Date formatting utilities
- **next-themes**: Theme switching support
- **vaul**: Drawer component
- **embla-carousel-react**: Carousel functionality
- **react-day-picker**: Calendar/date picker
- **cmdk**: Command palette component
- **recharts**: Charts for reports (via chart component)

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string for Drizzle ORM