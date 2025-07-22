# 🛡️ Nessus VA Report Portal

A Next.js-based vulnerability assessment reporting portal for managing Nessus scan results.

## 🚀 Setup Instructions

### 1. Environment Configuration

Add your Supabase credentials to `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://htiitlswlreodwppaidk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here

# Optional: Service role key for admin operations
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2. Database Setup

1. Open your Supabase dashboard
2. Go to SQL Editor
3. Run the schema from `database/schema.sql`
4. Verify tables are created

### 3. Install Dependencies & Run

```bash
npm install
npm run dev
```

### 4. Test Connection

Visit `http://localhost:3000` to test your Supabase connection.

## 📊 Database Schema

- **`organizations`** - Internal/External organizations
- **`reports`** - Main report metadata with cached summaries
- **`report_hosts`** - IP addresses scanned per report
- **`vulnerabilities`** - Detailed CVE information
- **`report_comparisons`** - Track iteration changes
- **`audit_log`** - Complete audit trail

## 🔧 API Endpoints

- `GET /api/test-connection` - Test database connectivity

## 🏗️ Architecture

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: API Routes with Service/Repository pattern
- **Database**: Supabase (PostgreSQL) with RLS
- **Validation**: Zod (to be added)
- **PDF Generation**: Puppeteer/React-PDF (to be added)

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── test-connection/
│   └── page.tsx
├── components/
│   └── ConnectionTest.tsx
└── lib/
    ├── supabase.ts          # Client-side Supabase config
    └── supabase-server.ts   # Server-side Supabase config
```

## 🎯 Next Steps

1. ✅ Database schema created
2. ✅ Supabase client configured
3. ✅ Connection testing implemented
4. 🔄 **Next**: Add your actual `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. 🔄 **Then**: Build upload functionality
6. 🔄 **Then**: Implement reporting pages

## 🔐 Security Notes

- RLS policies are basic - customize based on your auth requirements
- Service role key should only be used for admin operations
- Never expose service role key in client-side code
