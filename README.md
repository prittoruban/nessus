# Nessus Vulnerability Assessment Portal

A comprehensive web-based vulnerability assessment reporting platform built with Next.js, designed to streamline the management and analysis of Nessus security scan results.

## 🚀 Features

- **Interactive Dashboard** - Executive-level vulnerability analytics and insights
- **CSV File Upload** - Seamless Nessus scan data import and processing
- **Report Management** - Comprehensive vulnerability report generation and tracking
- **Risk Analytics** - Advanced vulnerability trend analysis and compliance scoring
- **PDF Export** - Professional vulnerability assessment report generation
- **Multi-Organization Support** - Internal and external assessment management
- **Real-time Data** - Live vulnerability metrics and statistics

## 🏗️ Technology Stack

- **Frontend**: Next.js 15.4.2 with TypeScript
- **UI Framework**: Tailwind CSS 4 with custom components
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Charts**: Chart.js with React Chart.js 2
- **PDF Generation**: Puppeteer for report exports
- **File Processing**: Papa Parse for CSV handling
- **Authentication**: Supabase Auth
- **Deployment**: Vercel-ready configuration

## 📁 Project Structure

```
nessus/
├── database/
│   └── schema.sql                    # Complete PostgreSQL database schema
├── public/
│   ├── HTC.png                      # Company logo assets
│   └── Methodology.png              # Assessment methodology diagrams
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── api/                     # API Routes
│   │   │   ├── pdf/generate/[reportId]/
│   │   │   │   └── route.ts         # PDF report generation endpoint
│   │   │   ├── test-connection/
│   │   │   │   └── route.ts         # Database connectivity testing
│   │   │   └── upload-scan/
│   │   │       └── route.ts         # CSV file upload and processing
│   │   ├── insights/
│   │   │   └── page.tsx             # Risk insights and analytics dashboard
│   │   ├── reports/
│   │   │   ├── page.tsx             # Reports listing and management
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Individual report detail view
│   │   ├── upload/
│   │   │   └── page.tsx             # Multi-step CSV upload wizard
│   │   ├── globals.css              # Global styles and Tailwind configuration
│   │   ├── layout.tsx               # Root layout with metadata
│   │   └── page.tsx                 # Main dashboard with analytics
│   ├── components/                  # Reusable React components
│   │   ├── AppLayout.tsx            # Main application layout wrapper
│   │   ├── BackToTop.tsx            # Scroll-to-top functionality
│   │   ├── ConnectionTest.tsx       # Database connection testing
│   │   ├── SearchFilters.tsx        # Advanced filtering components
│   │   └── Sidebar.tsx              # Navigation sidebar with collapse
│   └── lib/                         # Utilities and configurations
│       ├── supabase-server.ts       # Server-side Supabase client
│       └── supabase.ts              # Client-side Supabase configuration
├── eslint.config.mjs                # ESLint configuration
├── next-env.d.ts                    # Next.js TypeScript declarations
├── next.config.ts                   # Next.js configuration
├── package.json                     # Dependencies and scripts
├── postcss.config.mjs               # PostCSS configuration
└── tsconfig.json                    # TypeScript configuration
```

## 🗄️ Database Schema

The application uses a comprehensive PostgreSQL schema designed for vulnerability management:

### Core Tables

- **organizations** - Manages internal and external assessment targets
- **reports** - Vulnerability assessment report headers with metadata
- **report_hosts** - Individual IP addresses scanned per report
- **vulnerabilities** - Detailed CVE and vulnerability information
- **report_comparisons** - Historical trend analysis between iterations
- **audit_log** - Complete audit trail for compliance

### Key Features

- **Automated Triggers** - Real-time summary count updates
- **Row Level Security** - Configurable access control
- **Performance Indexes** - Optimized for large-scale data
- **Referential Integrity** - Complete data consistency

## 🔧 File Descriptions

### Frontend Components

#### Core Pages
- **`src/app/page.tsx`** - Executive dashboard with vulnerability analytics, charts, and compliance scoring
- **`src/app/upload/page.tsx`** - Three-step wizard for uploading Nessus CSV files with validation
- **`src/app/reports/page.tsx`** - Searchable report management interface with export capabilities
- **`src/app/insights/page.tsx`** - Advanced risk analytics and trend visualization

#### Layout & Navigation
- **`src/components/AppLayout.tsx`** - Main layout wrapper with animation and responsive design
- **`src/components/Sidebar.tsx`** - Collapsible navigation with tooltips and mobile support
- **`src/components/SearchFilters.tsx`** - Advanced filtering for organizations and reports

#### Utility Components
- **`src/components/BackToTop.tsx`** - Smooth scroll-to-top functionality
- **`src/components/ConnectionTest.tsx`** - Real-time database connectivity testing

### Backend API Routes

#### Data Processing
- **`src/app/api/upload-scan/route.ts`** - Comprehensive CSV processing with validation, organization management, and vulnerability parsing
- **`src/app/api/test-connection/route.ts`** - Database health check and connectivity testing

#### Report Generation
- **`src/app/api/pdf/generate/[reportId]/route.ts`** - Professional PDF report generation with charts and executive summaries

### Configuration & Setup

#### Database
- **`database/schema.sql`** - Complete database schema with triggers, views, and RLS policies

#### Configuration Files
- **`package.json`** - All dependencies including Chart.js, Supabase, Puppeteer, and development tools
- **`next.config.ts`** - Next.js configuration for Supabase integration
- **`tsconfig.json`** - TypeScript configuration with strict type checking
- **`tailwind.config.js`** - Custom Tailwind CSS configuration

#### Utilities
- **`src/lib/supabase.ts`** - Client-side Supabase configuration
- **`src/lib/supabase-server.ts`** - Server-side Supabase client for API routes

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (or Supabase account)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/prittoruban/nessus.git
   cd nessus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Database Setup**
   ```bash
   # Run the schema in your Supabase SQL editor
   psql -f database/schema.sql your_database_url
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open [http://localhost:3000](http://localhost:3000)

## 📊 Core Functionality

### CSV Upload & Processing
- **Multi-step wizard** with organization selection
- **Flexible CSV parsing** with automatic field detection
- **Data validation** and error handling
- **Iteration tracking** for historical comparisons

### Dashboard Analytics
- **Executive metrics** with risk scoring
- **Vulnerability distribution** charts
- **Compliance framework** scoring (CIS, NIST, ISO 27001)
- **Trend analysis** across multiple assessments

### Report Management
- **Searchable interface** with advanced filtering
- **PDF export** with professional formatting
- **Status tracking** (processing, completed, failed)
- **Bulk operations** support

### Risk Analytics
- **Vulnerability trends** over time
- **Host-level breakdown** with risk scoring
- **Compliance scoring** against security frameworks
- **Executive summaries** with actionable insights

## 🔒 Security Features

- **Row Level Security (RLS)** for multi-tenant access
- **Input validation** with Zod schemas
- **SQL injection protection** via parameterized queries
- **File upload restrictions** with type and size validation

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Code Quality

- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for code formatting
<!-- - **Strict mode** enabled -->

<!-- ## 📈 Performance Optimizations

- **Database indexing** for fast queries
- **Lazy loading** for large datasets
- **Optimized images** with Next.js Image component
- **Bundle splitting** for faster page loads
- **Caching strategies** for API responses -->

<!-- ## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Support

For support, email [support@example.com](mailto:support@example.com) or create an issue in this repository.

## 🏢 Enterprise Features

- **Multi-tenant architecture** ready
- **SSO integration** capability
- **Advanced reporting** with custom templates
- **API endpoints** for external integrations
- **Compliance reporting** for audit requirements -->

---

<!-- **Built with ❤️ for cybersecurity professionals** -->
