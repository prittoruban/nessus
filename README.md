# HTC Global VA Report Assistance Portal

A comprehensive vulnerability assessment reporting platform built with Next.js 15, TypeScript, and Tailwind CSS. This portal provides enterprise-grade vulnerability management with multi-organizational support and HTC Global VA Report format compliance.

## 🚀 Features

### Core Functionality
- **Multi-organizational Management**: Support for both internal and external assessments
- **HTC Global VA Report Format**: Complete compliance with industry-standard reporting formats
- **Vulnerability Assessment Processing**: CSV upload and processing with enhanced data validation
- **Interactive Dashboard**: Left sidebar navigation with Internal/External dropdown selection
- **PDF Report Generation**: Professional PDF exports with vulnerability summaries and detailed analysis

### Technical Features
- **Next.js 15**: Latest framework with App Router and TypeScript
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Type Safety**: Full TypeScript implementation with Zod validation schemas
- **Database Integration**: Supabase integration with enhanced schema support
- **Component Library**: Custom UI components with consistent design system

## 🏗️ Architecture

### Project Structure
```
src/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   ├── reports/                  # Reports listing and details
│   ├── upload/                   # File upload interface
│   ├── vulnerabilities/          # Vulnerability management
│   ├── overview-of-results/      # Results overview dashboard
│   └── risk-insights/            # Risk analysis and insights
├── components/                   # Reusable UI components
│   ├── layout/                   # Layout components (Header, Home)
│   └── ui/                       # UI primitives (Button, Card, Input, etc.)
├── lib/                          # Core business logic
│   ├── database/                 # Database client configuration
│   ├── errors/                   # Error handling utilities
│   ├── repositories/             # Data access layer
│   ├── services/                 # Business logic services
│   └── validators/               # Zod validation schemas
└── types/                        # TypeScript type definitions
```

### Database Schema
Enhanced multi-organizational schema supporting:
- Reports with organizational categorization
- Vulnerabilities with priority levels (P1-P5)
- Host management and iteration tracking
- Zero-day vulnerability classification

## 🛠️ Installation & Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0
- Supabase account (for database)

### Development Setup
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nessus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   ```bash
   # Run database migrations
   # Execute SQL files in database/ directory in order:
   # 01_initial_setup.sql
   # 02_reports_migration.sql
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Open Application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Usage

### Navigation
- **Left Sidebar**: Primary navigation with Internal/External assessment switching
- **Dashboard Pages**: 
  - Upload: CSV file upload and processing
  - Reports: Report listing and individual report details
  - Vulnerabilities: Vulnerability management and analysis
  - Overview of Results: Summary dashboards
  - Risk Insights: Risk analysis and trending

### File Upload Process
1. Select organization type (Internal/External)
2. Choose or create organization entry
3. Upload CSV vulnerability scan file
4. System processes and validates data
5. Generate comprehensive reports

### Report Generation
- **PDF Export**: Professional HTC Global VA format reports
- **Vulnerability Summaries**: IP-based and CVE-based groupings
- **Risk Prioritization**: P1-P5 priority classification system

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Create production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run format       # Format code with Prettier
```

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Validation**: Zod schemas
- **PDF Generation**: jsPDF with autoTable
- **File Processing**: CSV parsing with enhanced validation

## 🏢 Enterprise Features

### Multi-Organization Support
- Internal vs External assessment workflows
- Organization-specific reporting
- Iteration tracking for repeated assessments

### Security & Compliance
- HTC Global VA Report format compliance
- Professional vulnerability classification
- Zero-day vulnerability tracking
- CVSS scoring integration

### Scalability
- Optimized for large vulnerability datasets
- Efficient PDF generation for comprehensive reports
- Responsive design for various screen sizes

## 📝 Future Enhancements

Planned features for upcoming releases:
- Real-time vulnerability tracking
- Advanced analytics and trending
- Integration with additional security tools
- Multi-user authentication and authorization
- Custom report templates
- API integrations for automated scanning

## 🤝 Contributing

This is a production-ready enterprise application. For contributions:
1. Follow the established code patterns
2. Ensure TypeScript compliance
3. Maintain test coverage
4. Update documentation as needed

## 📄 License

Proprietary - HTC Global VA Report Assistance Portal

---

**Built with ❤️ using Next.js 15, TypeScript, and Tailwind CSS**

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
