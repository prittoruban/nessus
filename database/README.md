# Database Setup Instructions

This directory contains the SQL scripts needed to set up your Nessus vulnerability scanner database.

## Files

- `01_initial_setup.sql` - Initial database schema and sample data (Legacy)
- `02_reports_migration.sql` - Migration to add reports functionality (Legacy)
- `03_enhanced_schema_migration.sql` - ⭐ **NEW** Enhanced schema for enterprise features
- `04_data_migration.sql` - ⭐ **NEW** Migrate existing data to new structure  
- `05_validation_check.sql` - ⭐ **NEW** Validate migration success

## Setup Instructions

### For New Installations:
1. Create a new Supabase project
2. Copy the connection details to your `.env.local` file
3. Run **only** `03_enhanced_schema_migration.sql` in the Supabase SQL editor

### For Existing Installations (Migration):
1. **BACKUP YOUR DATA FIRST** 
2. Run the following scripts **in exact order** in Supabase SQL Editor:
   - `03_enhanced_schema_migration.sql` - Add new tables and columns
   - `04_data_migration.sql` - Migrate existing data  
   - `05_validation_check.sql` - Verify everything worked

## Enhanced Schema Features

The new schema supports:
- ✅ **Multi-organization management** with iterations
- ✅ **Source type classification** (Internal/External)
- ✅ **Host-level aggregations** for detailed reporting
- ✅ **Enhanced vulnerability data** with solutions and zero-day flags
- ✅ **HTC Global report format** compatibility
- ✅ **Trend analysis** across scan iterations
- ✅ **Performance optimized** with proper indexing

## Schema Overview

```
organizations (1) → reports (*) → report_hosts (*)
                            └→ vulnerabilities (*)
                            └→ scan_configurations (1)
cve_database (reference data)
```

## Validation

After running migrations, check the validation results:
- All checks should show "PASS" status
- Review data summary counts
- Verify sample data looks correct
