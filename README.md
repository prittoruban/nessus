# Nessus VA Report Portal

A comprehensive web application for managing and visualizing Nessus vulnerability assessment reports. Built with Next.js, TypeScript, Supabase, and TailwindCSS.

## Features

- 📊 **Dashboard Analytics** - Overview of vulnerability statistics and trends
- 📄 **Report Management** - Upload, view, and manage Nessus scan reports
- 🏢 **Organization Support** - Handle both internal and external assessments
- 📈 **Data Visualization** - Charts and graphs for vulnerability metrics
- 🔒 **Secure Database** - Row Level Security (RLS) with Supabase
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🖨️ **PDF Generation** - Generate professional vulnerability reports

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: TailwindCSS 4
- **Database**: Supabase (PostgreSQL)
- **Charts**: Chart.js with react-chartjs-2
- **Icons**: Heroicons
- **File Processing**: Papa Parse (CSV), Multer (file uploads)
- **PDF Generation**: Puppeteer

## Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Supabase account and project

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd nessus
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `database/schema.sql` in your Supabase SQL editor
3. Apply any additional fixes from `database/temp-rls-fix.sql` if needed

### 5. Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── pdf/generate/  # PDF generation endpoint
│   │   ├── test-connection/ # Database connection test
│   │   └── upload-scan/   # Scan upload handler
│   ├── reports/           # Reports pages
│   └── upload/            # Upload interface
├── components/            # Reusable React components
├── lib/                   # Utility libraries
└── types/                 # TypeScript type definitions
```

## Key Features

### Upload Nessus Reports
- Support for .nessus XML files
- Automatic parsing and data extraction
- Organization assignment (internal/external)

### Dashboard Analytics
- Total vulnerability counts
- Critical vulnerability tracking
- Recent activity monitoring
- Organization statistics

### Report Viewing
- Detailed vulnerability listings
- Filterable and sortable data
- Export capabilities
- PDF report generation

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Database Schema

The application uses a PostgreSQL database with the following main tables:
- `organizations` - Internal and external organizations
- `reports` - Scan report metadata
- `vulnerabilities` - Individual vulnerability findings
- `hosts` - Scanned host information

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Supabase Documentation](https://supabase.com/docs) - Learn about Supabase features
- [TailwindCSS Documentation](https://tailwindcss.com/docs) - Learn about TailwindCSS

## Deployment

### Vercel (Recommended)

The easiest way to deploy is using [Vercel](https://vercel.com/new):

1. Connect your GitHub repository
2. Add environment variables
3. Deploy

### Other Platforms

This Next.js application can be deployed on any platform that supports Node.js applications.
