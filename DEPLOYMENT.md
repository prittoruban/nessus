# Production Deployment Guide

This guide covers deploying the Nessus Vulnerability Scanner to production environments.

## Prerequisites

- Node.js 18+ and npm 8+
- Supabase project with database setup
- Git repository

## Environment Setup

### 1. Environment Variables

Create a `.env.production` file with your production Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

### 2. Database Setup

Run the SQL from `database-setup.sql` in your Supabase SQL Editor:

```sql
-- Create the vulnerabilities table
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address TEXT NOT NULL,
    cve TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low', 'info')),
    plugin_name TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_ip_address ON vulnerabilities(ip_address);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_created_at ON vulnerabilities(created_at DESC);

-- Enable RLS and create policy
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for all users" ON vulnerabilities
    FOR ALL USING (true) WITH CHECK (true);
```

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Connect Repository**
   - Push your code to GitHub
   - Go to [vercel.com](https://vercel.com)
   - Import your repository

2. **Configure Environment Variables**
   - In Vercel dashboard, go to Project Settings > Environment Variables
   - Add your Supabase URL and anon key

3. **Deploy**
   - Vercel will automatically build and deploy your app
   - Your app will be available at `https://your-project.vercel.app`

### Option 2: Railway

1. **Connect Repository**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repository

2. **Configure Environment**
   - Add environment variables in Railway dashboard
   - Railway will automatically detect Next.js and build

3. **Deploy**
   - Railway will provide a URL for your app

### Option 3: DigitalOcean App Platform

1. **Create App**
   - Go to DigitalOcean App Platform
   - Connect your GitHub repository

2. **Configure Build**
   - Build Command: `npm run build`
   - Run Command: `npm start`
   - Environment: Node.js

3. **Add Environment Variables**
   - Add your Supabase credentials

### Option 4: Self-Hosted (Docker)

1. **Create Dockerfile**

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

2. **Create .dockerignore**

```
node_modules
.next
.git
.env*
```

3. **Build and Run**

```bash
docker build -t nessus-scanner .
docker run -p 3000:3000 -e NEXT_PUBLIC_SUPABASE_URL=your-url -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key nessus-scanner
```

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files to version control
- Use environment variables for all sensitive data
- Rotate API keys regularly

### 2. Database Security
- Enable Row Level Security (RLS) in Supabase
- Use service role keys only on the server side
- Implement proper authentication if needed

### 3. File Upload Security
- Validate file types and sizes
- Scan uploaded files for malware
- Implement rate limiting

### 4. HTTPS
- Always use HTTPS in production
- Configure proper SSL certificates
- Use security headers (already configured in next.config.ts)

## Performance Optimization

### 1. Build Optimization
```bash
npm run build
```

### 2. Database Optimization
- Add proper indexes (already included in setup)
- Use pagination for large datasets
- Implement caching where appropriate

### 3. CDN Configuration
- Configure CDN for static assets
- Use image optimization
- Enable compression

## Monitoring and Logging

### 1. Error Tracking
- Set up error tracking (Sentry, LogRocket)
- Monitor application performance
- Set up alerts for critical errors

### 2. Analytics
- Add analytics (Google Analytics, Plausible)
- Track user behavior
- Monitor upload success rates

## Backup and Recovery

### 1. Database Backups
- Enable automatic backups in Supabase
- Test restore procedures
- Document recovery processes

### 2. Code Backups
- Use Git for version control
- Set up automated deployments
- Keep deployment logs

## Maintenance

### 1. Regular Updates
- Keep dependencies updated
- Monitor security advisories
- Update Node.js and Next.js versions

### 2. Performance Monitoring
- Monitor application performance
- Track database query performance
- Optimize based on usage patterns

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Check if variables are set in deployment platform
   - Verify variable names match exactly
   - Restart application after changes

2. **Database Connection Issues**
   - Verify Supabase credentials
   - Check RLS policies
   - Test connection with Supabase dashboard

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for TypeScript errors

### Support

For issues specific to this application:
- Check the application logs
- Verify Supabase connection
- Test with the connection test page (`/test-connection`)

For platform-specific issues, refer to the deployment platform's documentation. 