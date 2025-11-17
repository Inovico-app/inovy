# Inovy

> AI-Powered Meeting Recording & Management Platform

Inovy is a modern web application that helps organizations manage meeting recordings with AI-powered transcription, summaries, and task extraction. Built with enterprise-level architecture patterns and best practices.

## 🚀 Features

### Core Functionality

- **Project Management** - Organize meeting recordings by project context
- **AI Processing** - Automatic transcription and intelligent summarization
- **Task Extraction** - AI-powered action item identification and prioritization
- **User Management** - Multi-organization support with role-based access
- **Real-time Dashboard** - Overview of projects, recordings, and pending tasks

### Technical Features

- **Clean Architecture** - Separation of concerns with proper data access patterns
- **Type Safety** - Full TypeScript implementation with comprehensive DTOs
- **Enterprise Security** - Kinde authentication with session management
- **Caching Layer** - Redis for performance optimization
- **Modern UI** - Responsive design with Shadcn/UI and Tailwind CSS
- **Database** - PostgreSQL with Drizzle ORM for type-safe queries

## 🛠 Tech Stack

### Frontend

- **Next.js 16** - React framework with App Router
- **React 19** - Latest React with Server Components
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS 4** - Utility-first CSS framework
- **Shadcn/UI** - Beautiful and accessible component library
- **Radix UI** - Unstyled, accessible UI primitives
- **React Query** - Server state management

### Backend

- **Next.js API Routes** - Full-stack React framework
- **Drizzle ORM** - Type-safe database operations
- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage
- **Kinde** - Authentication and user management

### Development

- **Turborepo** - Monorepo build system
- **TypeScript** - End-to-end type safety
- **Neverthrow** - Functional error handling
- **Zod** - Runtime type validation
- **ESLint** - Code linting and formatting

## 🏗️ Architecture

Inovy follows **Clean Architecture** principles with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                 Presentation Layer                      │
│              (Pages & Components)                       │
├─────────────────────────────────────────────────────────┤
│                  Action Layer                           │
│               (Server Actions)                          │
├─────────────────────────────────────────────────────────┤
│                 Service Layer                           │
│               (Business Logic)                          │
├─────────────────────────────────────────────────────────┤
│               Data Access Layer                         │
│            (Database Queries & DTOs)                    │
├─────────────────────────────────────────────────────────┤
│                Database Layer                           │
│          (PostgreSQL via Drizzle ORM)                   │
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

- **Presentation Layer**: UI components, pages, client-side logic
- **Action Layer**: Server actions, form handling, route handlers
- **Service Layer**: Business logic, authentication, authorization
- **Data Access Layer**: Pure database operations, no business logic
- **Database Layer**: Schema definitions, migrations, constraints

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis instance
- Kinde authentication account

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd inovy
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Environment Setup**

   Create `.env.local` in `apps/web/`:

   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/inovy"

   # Redis
   UPSTASH_REDIS_REST_URL="your-redis-url"
   UPSTASH_REDIS_REST_TOKEN="your-redis-token"

   # Kinde Auth
   KINDE_CLIENT_ID="your-kinde-client-id"
   KINDE_CLIENT_SECRET="your-kinde-client-secret"
   KINDE_ISSUER_URL="https://your-domain.kinde.com"
   KINDE_SITE_URL="http://localhost:3000"
   KINDE_POST_LOGOUT_REDIRECT_URL="http://localhost:3000"
   KINDE_POST_LOGIN_REDIRECT_URL="http://localhost:3000"
   ```

4. **Database Setup**

   ```bash
   # Generate migration files
   cd apps/web
   npm run db:generate

   # Apply schema to database
   npm run db:push

   # (Optional) Open database studio
   npm run db:studio
   ```

5. **Start Development Server**

   ```bash
   # From project root
   pnpm dev

   # Or start web app only
   cd apps/web
   npm run dev
   ```

6. **Access Application**
   - Web App: [http://localhost:3000](http://localhost:3000)
   - Database Studio: [http://localhost:4983](http://localhost:4983)
   - Cache Health: [http://localhost:3000/api/cache/health](http://localhost:3000/api/cache/health)

## 📁 Project Structure

```
inovy/
├── apps/
│   └── web/                          # Next.js Application
│       ├── src/
│       │   ├── app/                  # App Router (Pages & Layouts)
│       │   │   ├── api/              # API Routes
│       │   │   ├── projects/         # Project Management Pages
│       │   │   └── page.tsx          # Dashboard
│       │   ├── components/           # React Components
│       │   │   ├── ui/               # Shadcn/UI Components
│       │   │   └── projects/         # Feature Components
│       │   ├── lib/                  # Utilities & Configurations
│       │   │   ├── auth.ts           # Authentication Helpers
│       │   │   ├── logger.ts         # Enterprise Logging
│       │   │   └── user-sync.ts      # User Synchronization
│       │   ├── server/               # Backend Logic
│       │   │   ├── actions/          # Server Actions
│       │   │   ├── services/         # Business Logic Layer
│       │   │   │   ├── project.service.ts
│       │   │   │   └── cache-health.service.ts
│       │   │   ├── data-access/      # Database Query Layer
│       │   │   │   ├── projects.queries.ts
│       │   │   │   ├── users.queries.ts
│       │   │   │   └── organizations.queries.ts
│       │   │   ├── dto/              # Data Transfer Objects
│       │   │   │   ├── project.dto.ts
│       │   │   │   ├── user.dto.ts
│       │   │   │   └── organization.dto.ts
│       │   │   ├── cache/            # Caching Layer
│       │   │   │   └── cache.service.ts
│       │   │   ├── middleware/       # Request Middleware
│       │   │   │   └── cache.middleware.ts
│       │   │   └── db/               # Database Configuration
│       │   └── db/                   # Database Schema
│       │       └── schema/           # Drizzle Schema Files
│       ├── drizzle.config.ts         # Drizzle Configuration
│       └── package.json              # Dependencies
├── assign-fields.sh                  # GitHub Project Setup
├── setup-github-project.sh          # GitHub Automation
├── MVP.md                            # Product Requirements
├── USER_STORIES.md                   # Development Stories
└── README.md                         # This file
```

## 🗃️ Data Access Layer

### Query Classes

- **ProjectQueries** - Project database operations with intelligent caching
- **UserQueries** - User management queries with Redis caching
- **OrganizationQueries** - Organization data access with cache optimization

### DTOs (Data Transfer Objects)

- **CreateProjectDto** - Project creation data with validation
- **ProjectWithCreatorDto** - Project with creator details
- **UserDto** - User data structure with type safety
- **OrganizationDto** - Organization data structure

### Service Layer

- **ProjectService** - Project business logic with authentication
- **OrganizationService** - Organization business logic with authentication
- **UserService** - User business logic with authentication
- **CacheService** - Cache management with Upstash Redis
- **CacheHealthService** - Cache monitoring and management
- Authentication & authorization
- Data validation and transformation

## 🚀 Smart Caching Strategy

### Multi-Layer Caching Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    API Layer                            │
│              (Response Caching)                         │
├─────────────────────────────────────────────────────────┤
│                  Service Layer                          │
│            (Business Logic Caching)                     │
├─────────────────────────────────────────────────────────┤
│               Data Access Layer                         │
│              (Query Result Caching)                     │
├─────────────────────────────────────────────────────────┤
│                 Redis Cache                             │
│              (Upstash Redis)                            │
└─────────────────────────────────────────────────────────┘
```

### Cache Strategy Details

**Cache TTL (Time To Live):**

- **Projects**: 15 minutes (moderate volatility)
- **Users**: 1 hour (low volatility)
- **Organizations**: 1 hour (very low volatility)
- **API Responses**: 5 minutes (high volatility)

**Cache Keys:**

```typescript
// Hierarchical cache key structure
project:{id}                    // Individual project
project:org:{orgId}:active     // Organization projects
user:kinde:{kindeId}           // User by Kinde ID
org:{kindeId}                  // Organization by Kinde ID
api:/projects:?status=active   // API response cache
```

**Cache Invalidation:**

- **Smart Invalidation**: Automatic cache invalidation on data mutations
- **Pattern-Based**: Bulk invalidation using Redis pattern matching
- **Cascade Invalidation**: Related data invalidation (e.g., project updates invalidate org cache)

**Performance Benefits:**

- **Database Load Reduction**: 80-90% reduction in database queries
- **Response Time**: Sub-10ms response times for cached data
- **Scalability**: Handles high-load scenarios with minimal database impact
- **Cost Optimization**: Reduced database connection usage

## 🔧 Available Scripts

### Development

```bash
pnpm dev                    # Start development server
pnpm build                  # Build for production
pnpm start                  # Start production server
pnpm lint                   # Run ESLint
```

### Database Management

```bash
# From apps/web directory
npm run db:generate         # Generate migration files
npm run db:push            # Apply schema to database
npm run db:studio          # Open Drizzle Studio
npm run db:migrate         # Run migrations
```

### Cache Management

```bash
# Cache health monitoring
curl http://localhost:3000/api/cache/health

# View cache in Redis (if using local Redis)
redis-cli monitor
redis-cli keys "inovy:*"
```

### Project Management

```bash
pnpm check-types           # TypeScript validation
```

## 🔐 Authentication Flow

1. **User Login** - Redirected to Kinde authentication
2. **Session Creation** - Kinde manages user session
3. **User Sync** - Auto-sync user data to local database
4. **Organization Assignment** - Users assigned to organizations
5. **Protected Routes** - Middleware protects authenticated routes

## 📊 Database Schema

### Core Entities

- **Organizations** - Multi-tenant organization structure
- **Users** - User profiles linked to Kinde authentication
- **Projects** - Project containers for recordings
- **Recordings** - Meeting recordings with metadata _(Coming Soon)_
- **Tasks** - AI-extracted action items _(Coming Soon)_

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the established architecture patterns
4. Add proper DTOs and type safety
5. Include comprehensive error handling
6. Submit a pull request

## 📄 License

This project is private and proprietary.

## 🙋‍♂️ Support

For questions and support, please refer to the project documentation or contact the development team.

