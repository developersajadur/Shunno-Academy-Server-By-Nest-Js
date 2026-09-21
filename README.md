# 🎓 Shunno Academy — Enterprise NestJS Backend Engine

<p align="center">
  <a href="https://shunnoacademy.com" target="_blank">
    <img src="https://img.shields.io/badge/Platform-Shunno%20Academy-FF6B00?style=for-the-badge&logo=google-classroom&logoColor=white" alt="Shunno Academy" />
  </a>
  <img src="https://img.shields.io/badge/Framework-NestJS%2011-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Language-TypeScript%205-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/ORM-Prisma%206-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL%2016-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Cache%20%26%20Queue-Redis%20%7C%20BullMQ-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Package%20Manager-pnpm%2011-F69220?style=for-the-badge&logo=pnpm&logoColor=white" alt="pnpm" />
</p>

<p align="center">
  <b>A production-grade, highly scalable, enterprise backend architecture designed for Bangladesh's premier skill development and technology education platform.</b>
</p>

<p align="center">
  <a href="#-executive-summary">Executive Summary</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-key-engineering-highlights">Key Highlights</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-module-catalog">Modules & APIs</a> •
  <a href="#-security--performance">Security & Performance</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-environment-variables">Environment Matrix</a>
</p>

---

## 📋 Executive Summary

**Shunno Academy (শূন্য একাডেমি)** is an online tech & vocational education platform serving thousands of learners across Bangladesh. This backend system is a complete enterprise rewrite into **NestJS 11** from an existing Express.js monolith. 

The rewrite was engineered from day one with:
- **Clean Architecture & SOLID Principles**: Absolute separation of concerns across Domain, Application, and Infrastructure layers.
- **Zero-Downtime Backward Compatibility**: 100% contract compliance with the existing Next.js frontend (`/api/v1/*` routes and unified `{ success, statusCode, message, meta, data }` envelopes).
- **High-Throughput Caching & Asynchronous Queues**: Sub-10ms response times for catalog browsing using Redis Cache-Aside and asynchronous job processing via BullMQ.
- **Fault-Tolerant Delivery Subsystems**: Dual-engine email dispatch (Resend HTTPS API fallback for restricted environments like Render, combined with verified Nodemailer SMTP).
- **Zero Cold-Start Resilience**: Integrated Keep-Alive self-ping daemon optimized for cloud PaaS deployments.

---

## 🏛️ System Architecture

The project follows a strict **Layered Clean Architecture** where domain business rules are decoupled from framework mechanics and database implementations.

```mermaid
flowchart TD
    Client["Client App (Next.js / Mobile)"] --> Cloudflare["Cloudflare / Reverse Proxy"]
    Cloudflare --> ExpressApp["NestJS HTTP Gateway (main.ts)"]

    subgraph Security_Middlewares ["Security & Preprocessing Pipeline"]
        ExpressApp --> Helmet["Helmet (CSP Disabled for Swagger)"]
        Helmet --> Cors["Strict Origin CORS Whitelist"]
        Cors --> Compression["HTTP Response Compression"]
        Compression --> CookieParser["Cookie Parser"]
        CookieParser --> GlobalPipes["Global ValidationPipe (class-validator)"]
    end

    subgraph Global_Interception ["Global Guards & Interceptors"]
        GlobalPipes --> JwtGuard["JwtAuthGuard (Single Active Session Check)"]
        JwtGuard --> RolesGuard["RolesGuard (ADMIN / TEACHER / STUDENT)"]
        RolesGuard --> TransformInterceptor["TransformInterceptor (Envelope Standardizer)"]
        RolesGuard --> GlobalFilter["GlobalExceptionFilter (Prisma & HTTP)"]
    end

    subgraph Domain_Modules ["14 Domain Modules (Clean Architecture)"]
        TransformInterceptor --> Controllers["Controllers (HTTP Adapters & Swagger Annotations)"]
        Controllers --> Services["Domain Services (Business Logic & Transactions)"]
        Services --> PrismaService["Prisma ORM (Data Layer)"]
        Services --> RedisService["Redis Service (Cache Aside & Invalidation)"]
        Services --> QueueService["BullMQ (Asynchronous Task Queue)"]
        Services --> EmailService["Email Service (Dual Engine: Resend / Nodemailer)"]
        Services --> StorageService["Storage Service (Cloudinary & Local Fallback)"]
    end

    subgraph Infrastructure ["Persistence & External Cloud Services"]
        PrismaService --> PostgreSQL[("PostgreSQL 16 Database")]
        RedisService --> Redis[("Redis 7+ In-Memory Store")]
        QueueService --> Redis
        EmailService --> Resend["Resend HTTPS API (Port 443)"]
        EmailService --> SMTP["Gmail / SMTP Server"]
        StorageService --> Cloudinary["Cloudinary CDN"]
    end
```

---

## 📁 Repository Structure

```
nest-server/
├── prisma/
│   ├── schema.prisma              # Production database schema (PostgreSQL)
│   └── seed.ts                    # Idempotent database seeder script
├── src/
│   ├── common/                    # Cross-cutting enterprise utilities
│   │   ├── constants/             # Global enums, cache keys & TTL constants
│   │   ├── decorators/            # @CurrentUser(), @Roles(), @Public(), @BypassTransform()
│   │   ├── filters/               # GlobalExceptionFilter (Prisma P2002/P2025/P2003 + HTTP)
│   │   ├── guards/                # JwtAuthGuard, RolesGuard (RBAC & Concurrent Session Killer)
│   │   ├── interceptors/          # TransformInterceptor ({ success, statusCode, message, meta, data })
│   │   ├── services/              # KeepAliveService (Auto-ping Render server)
│   │   └── utils/                 # Dynamic pagination & search query builders
│   ├── config/                    # Type-safe configuration factory (AppConfig)
│   ├── database/                  # AdminSeederService (Runs on ApplicationBootstrap)
│   ├── email/                     # Resend API + Nodemailer engine + Responsive HTML templates
│   ├── logger/                    # Winston structured logger with daily log file rotation
│   ├── queue/                     # BullMQ queues & workers with direct execution fallbacks
│   ├── redis/                     # RedisService (Cache-aside, pattern deletion via SCAN/UNLINK)
│   ├── storage/                   # Cloudinary media storage with base64 fallback
│   ├── modules/                   # 14 Isolated Domain Modules
│   │   ├── auth/                  # JWT auth, Google OAuth, OTP, Password Reset, Profile
│   │   ├── category/              # Course categories & slug-based resolution
│   │   ├── course/                # Course catalog, search, multi-faceted filtering
│   │   ├── course-module/         # Curriculum hierarchy, lessons & authorized video access
│   │   ├── email-campaign/        # Newsletter broadcast engine & preview tester
│   │   ├── employee/              # Staff & referral code verification engine
│   │   ├── enrollment/            # Enrollment state machine, order IDs, automated approval
│   │   ├── inquiry/               # Admission counseling inquiries & CRM lead capture
│   │   ├── mentor/                # Instructor showcase & teacher account provisioning
│   │   ├── payment/               # TrxID submission (bKash/Nagad/Rocket) & verification
│   │   ├── review/                # Testimonial moderation workflow & cached showcases
│   │   ├── stat/                  # Platform milestones & executive analytics dashboard
│   │   ├── upload/                # Cloudinary image/document upload & deletion
│   │   └── user/                  # User accounts, block/unblock toggles, search
│   ├── app.controller.ts          # Root (/) & health status (/api/v1/health) endpoints
│   ├── app.module.ts              # Root NestJS IoC dependency injection container
│   └── main.ts                    # Bootstrap: Swagger, Helmet, CORS, Pipes & Listeners
├── .env.example                   # Environment configuration template
├── package.json                   # Dependencies managed with pnpm
├── tsconfig.json                  # Strict TypeScript configuration
└── README.md                      # Comprehensive project documentation
```

---

## ⚡ Key Engineering Highlights

### 1. 100% Contract Compliance with Frontend
All controller responses are intercepted by `TransformInterceptor`, guaranteeing the exact JSON response envelope expected by the client:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Courses retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPage": 5
  },
  "data": [ /* domain entities */ ]
}
```

### 2. Single Active Concurrent Session Enforcement
To prevent credential sharing across students:
- Every login issues a signed JWT containing the user's `updatedAt` / session timestamp.
- On each authenticated request, `JwtAuthGuard` checks the token against the active session in the database or Redis cache.
- If the student signs in from another device, older tokens immediately fail with:
  ```json
  {
    "success": false,
    "statusCode": 401,
    "errorCode": "SESSION_SUPERSEDED",
    "message": "You have been logged out because your account was logged in from another device."
  }
  ```

### 3. Dual-Engine Resilient Email Subsystem
Cloud hosting environments (e.g. Render Free Tier) frequently block outbound SMTP ports (`465` / `587`). Our `EmailService` resolves this with dual-mode delivery:
- **Primary**: Direct **Resend HTTPS REST API** (Port 443) — impervious to ISP or cloud port filtering.
- **Fallback**: **Nodemailer SMTP Pool** with pre-flight socket verification.
- **Queueing**: Email dispatches are offloaded to **BullMQ** background jobs so user requests return in milliseconds.

### 4. High-Performance Redis Cache-Aside & Pattern Invalidation
- High-frequency public read paths (`/courses`, `/categories`, `/stats`, `/reviews`) are cached in Redis with configurable TTLs.
- When an entity is created, modified, or deleted, `RedisService.delByPattern()` utilizes non-blocking `SCAN` + `UNLINK` commands, guaranteeing that cache updates never lock Redis single-threaded event loops.

### 5. Automatic Super Admin Seeding & Cold-Start Preventer
- **`AdminSeederService`**: Implements NestJS `OnApplicationBootstrap`. Checks if the Super Admin exists; if not, safely hashes the configured master password with bcrypt (12 rounds) and seeds the master record.
- **`KeepAliveService`**: Auto-detects Render hosting environment (`HOST_ON=render`) and sends self-pings to `/api/v1/health` every 10 minutes to prevent server sleep and cold starts.

---

## 🛠️ Tech Stack & Technical Rationale

| Category | Technology | Rationale |
|---|---|---|
| **Runtime & Framework** | [NestJS 11](https://nestjs.com/) + Node.js 22 | Enterprise-grade architecture, dependency injection, modular encapsulation, and TypeScript-native decorators. |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | End-to-end static type safety, autocompletion, compile-time validation, and maintainability. |
| **ORM & Database** | [Prisma 6](https://www.prisma.io/) + [PostgreSQL 16](https://www.postgresql.org/) | Declarative schema, automated migrations, type-safe queries, and zero risk of SQL injection. |
| **In-Memory Store** | [Redis 7+](https://redis.io/) via [ioredis](https://github.com/redis/ioredis) | Ultra-low latency key-value caching and session state management. |
| **Message Queue** | [BullMQ 5](https://docs.bullmq.io/) | Distributed job queues for asynchronous background tasks (emails, notifications, enrollments). |
| **Documentation** | [Swagger / OpenAPI 3.0](https://swagger.io/) | Self-generating interactive documentation at `/api/docs` with Bearer auth support. |
| **Logging** | [Winston 3](https://github.com/winstonjs/winston) | Daily rotating file logs (`combined` and `error` streams) + colorized console format. |
| **Package Manager** | [pnpm 11](https://pnpm.io/) | Strict dependency resolution, atomic node_modules via symlinks, and lightning-fast installations. |

---

## 🧭 Module & API Catalog

| Module | Route Prefix | Auth / Access | Description |
|---|---|---|---|
| **System** | `/` & `/api/v1/health` | Public | System status, version info, uptime metric, and Swagger pointer. |
| **Auth** | `/api/v1/auth` | Public & Authenticated | Registration, Password Login, Admin Login, Teacher Login, OTP (SMS/Email), Google OAuth, Token Refresh, Profile Updates, Password Change. |
| **Users** | `/api/v1/users` | Admin Only | User registry, advanced search, role filtering, account blocking/unblocking. |
| **Categories** | `/api/v1/categories` | Public / Admin | Course category taxonomy, slug resolution, order arrangement. |
| **Courses** | `/api/v1/courses` | Public / Admin | Full course catalog, pricing, multi-mode (Online/Offline/Hybrid), search & filtering. |
| **Curriculum** | `/api/v1/modules` | Public / Enrolled | Module structuring, lesson ordering, authorized video stream access tokens. |
| **Mentors** | `/api/v1/mentors` | Public / Admin | Instructor profiles, expertise tags, automated teacher login creation. |
| **Reviews** | `/api/v1/reviews` | Public / Student / Admin | Student reviews, star ratings, admin approval/moderation workflow. |
| **Enrollments** | `/api/v1/enrollments` | Student / Admin | Course registration, auto-generated order IDs (`ORD-YYYYMMDD-XXXX`), status workflow (`PENDING`, `APPROVED`, `CANCELLED`). |
| **Payments** | `/api/v1/payments` | Student / Admin | TrxID submission (bKash, Nagad, Rocket, Upay, Bank) and admin verification triggering automatic enrollment approval. |
| **Inquiries** | `/api/v1/inquiries` | Public / Admin | Counseling lead capture, student questions, status tracking. |
| **Stats** | `/api/v1/stats` | Public / Admin | Platform milestone metrics (graduates, satisfaction rate) and admin revenue/enrollment analytics. |
| **Upload** | `/api/v1/upload` | Authenticated | Cloudinary image and document management with fallback capability. |
| **Campaigns** | `/api/v1/campaigns` | Admin Only | Bulk email promotional broadcasts, test previews, delivery analytics. |
| **Employees** | `/api/v1/employees` | Public & Admin | Affiliate and staff referral codes (`verify/:code`), referral analytics. |

---

## 🔒 Security & Performance Blueprint

```
                     ┌──────────────────────────────────────┐
                     │          INCOMING REQUEST            │
                     └──────────────────┬───────────────────┘
                                        │
                         [Reverse Proxy / Cloudflare]
                         - Trust Proxy enabled (1 hop)
                                        │
                               [Security Layer]
                         - Helmet (X-Content-Type, HSTS)
                         - Strict Origin CORS Whitelist
                         - Request Body Limit (10MB)
                                        │
                         [Global Exception Filter]
                         - Prisma known errors mapped:
                           • P2002 -> 409 Conflict
                           • P2025 -> 404 Not Found
                           • P2003 -> 400 Bad Request
                                        │
                          [Authentication & RBAC]
                         - JWT Access Token (15m expiry)
                         - Refresh Token Rotation (7d-30d)
                         - Concurrent Session Killer
                         - Role Guards (ADMIN / TEACHER / STUDENT)
                                        │
                             [Controller / Service]
                         - Redis Cache-Aside Inspection
                         - DB Read / Write via Prisma
                         - Asynchronous BullMQ Job Queue
                                        │
                           [Standardized Envelope]
                         - TransformInterceptor { success, data, meta }
```

- **Password Hashing**: Bcrypt with configurable salt rounds (Default: `12`).
- **Rate Limiting & DDOS Protection**: Throttler protection on authentication and OTP endpoints.
- **SQL Injection Prevention**: Prisma's parameterized queries guarantee compile-time and runtime SQL safety.
- **Cross-Site Scripting (XSS)**: Handled via Helmet headers and sanitized DTO inputs via `class-validator`.

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js**: `v20.0.0` or `v22.x` (Recommended)
- **pnpm**: `v9.x` or `v11.x` (`npm install -g pnpm` or `corepack enable`)
- **PostgreSQL**: `v14+`
- **Redis**: `v6+` (Optional for local development; queue and cache fallback automatically)

### 2. Installation
```bash
# Navigate to the nest-server directory
cd nest-server

# Install all dependencies using pnpm
pnpm install
```

### 3. Environment Configuration
Copy the template and fill in your credentials:
```bash
cp .env.example .env
```

### 4. Database Setup & Seeding
```bash
# Generate Prisma Client
pnpm prisma:generate

# Push schema directly to database
pnpm prisma:push

# (Optional) Run database seed script
pnpm prisma:seed
```

### 5. Running the Application
```bash
# Development mode with hot-reload
pnpm run start:dev

# Production build and execution
pnpm run build
pnpm run start:prod
```

### 6. Interactive API Documentation
Once running, open your browser and navigate to:
- **Swagger Documentation**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **Health Check Status**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)
- **API Base Route**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)

---

## ⚙️ Environment Variables Matrix

| Variable | Description | Default / Example | Required |
|---|---|---|:---:|
| `NODE_ENV` | Application environment (`development` / `production`) | `development` | Yes |
| `PORT` | HTTP server port | `5000` | Yes |
| `DATABASE_URL` | PostgreSQL connection string with schema & SSL mode | `postgresql://user:pass@host:5432/db` | **Yes** |
| `CLIENT_URL` | Frontend client URL for CORS authorization | `http://localhost:3000` | **Yes** |
| `REDIS_HOST` | Redis hostname | `127.0.0.1` | No |
| `REDIS_PORT` | Redis port | `6379` | No |
| `REDIS_PASSWORD`| Redis authentication password | `""` | No |
| `REDIS_TLS` | Enable TLS encryption for cloud Redis (Upstash) | `false` | No |
| `JWT_ACCESS_SECRET` | Secret key for signing Access Tokens (32+ chars) | `your_jwt_access_secret` | **Yes** |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifespan | `15m` | Yes |
| `JWT_REFRESH_SECRET` | Secret key for signing Refresh Tokens (32+ chars) | `your_jwt_refresh_secret` | **Yes** |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifespan | `7d` | Yes |
| `SALT_ROUNDS` | Bcrypt salt rounds for password hashing | `12` | Yes |
| `SUPER_ADMIN_NAME` | Master account default display name | `Super Admin` | Yes |
| `SUPER_ADMIN_EMAIL` | Master account email (auto-seeded on launch) | `admin@shunnoacademy.com` | **Yes** |
| `SUPER_ADMIN_PASSWORD` | Master account password (auto-seeded on launch) | `YourStrongPass123!` | **Yes** |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name | `""` | No |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `""` | No |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `""` | No |
| `RESEND_API_KEY` | Resend API Key for HTTPS-based email delivery | `re_...` | Recommended |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` | No |
| `SMTP_PORT` | SMTP server port | `587` | No |
| `SMTP_USER` | SMTP username | `shunnoacademy0@gmail.com` | No |
| `SMTP_PASS` | SMTP application password | `""` | No |
| `HOST_ON` | Set to `render` to activate 10-min keep-alive ping | `render` | No |

---

## 🧰 Available Scripts

| Command | Action |
|---|---|
| `pnpm run start:dev` | Starts the server in development mode with watch & hot-reload |
| `pnpm run build` | Compiles TypeScript into optimized JavaScript inside `dist/` |
| `pnpm run start:prod` | Runs the compiled production distribution (`dist/main.js`) |
| `pnpm run format` | Runs Prettier across all TypeScript source files |
| `pnpm run lint` | Runs ESLint and automatically resolves fixable lint issues |
| `pnpm run prisma:generate` | Generates TypeScript types and Prisma Client |
| `pnpm run prisma:push` | Synchronizes database schema directly with PostgreSQL |
| `pnpm run prisma:studio` | Launches Prisma Studio visual database GUI |
| `pnpm run prisma:seed` | Populates database with default seed entities |

---

## 👨‍💻 Engineering Quality & Standards

This project follows the strict engineering standards defined in `AGENTS.md`:
- **DRY (Don't Repeat Yourself)**: Shared pagination, search utilities, and response envelopes.
- **KISS (Keep It Simple, Stupid)**: Straightforward service contracts without unnecessary abstraction overhead.
- **SOLID Principles**: Single responsibility controllers, injectable decoupled services, and interface-driven dependencies.
- **Zero Orphaned Logic**: Every route, guard, and DTO is tested, compiled, and mapped to domain requirements.

---

<p align="center">
  <b>Designed and Developed for Shunno Academy (শূন্য একাডেমি)</b><br>
  <i>Empowering Bangladesh through Next-Generation Technology Education.</i>
</p>
