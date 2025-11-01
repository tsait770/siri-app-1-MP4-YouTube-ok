# InstaPlay Database Setup Guide

This guide will help you set up the Supabase database for the InstaPlay application.

## Prerequisites

- Access to your Supabase project dashboard
- Database credentials (already configured in the app)

## Setup Instructions

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard: https://aqzecsrcttddwsnixlao.supabase.co
2. Navigate to the **SQL Editor** in the left sidebar
3. Click on **New Query**

### Step 2: Run the Migration Script

1. Open the `migration.sql` file in this directory
2. Copy all the SQL content
3. Paste it into the Supabase SQL Editor
4. Click **Run** to execute the migration

This will create:
- All necessary tables (users, user_devices, bookmarks, folders, subscriptions, voice_logs)
- Row Level Security (RLS) policies for data protection
- Indexes for performance optimization
- Triggers for automatic timestamp updates
- Functions for quota resets

### Step 3: Enable Google OAuth (Optional)

To enable Google sign-in:

1. Go to **Authentication** > **Providers** in your Supabase dashboard
2. Enable **Google** provider
3. Follow the instructions to set up OAuth credentials from Google Cloud Console
4. Configure the redirect URLs

### Step 4: Verify Setup

Run the following query in SQL Editor to verify tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see:
- users
- user_devices
- bookmarks
- folders
- subscriptions
- voice_logs

## Database Schema Overview

### Users Table
Stores user membership information and quota tracking.

**Key Fields:**
- `membership_level`: 'free_trial' | 'free' | 'basic' | 'premium'
- `free_trial_remaining`: Remaining trial usage count
- `daily_free_quota`: Daily usage for free members
- `monthly_basic_quota`: Monthly usage for basic members
- `max_devices`: Maximum allowed device bindings

### User Devices Table
Tracks devices bound to each user account.

### Bookmarks Table
Stores user's saved video URLs.

### Folders Table
Organizes bookmarks into folders (supports nesting).

### Subscriptions Table
Tracks PayPal subscription information.

### Voice Logs Table
Records all voice command usage for analytics and quota tracking.

## Quota Reset Automation

The migration includes functions to reset quotas automatically:

### Daily Reset
Resets `daily_free_quota` every day at midnight.

### Monthly Reset
Resets `monthly_basic_quota` on the 1st of each month.

**To enable automatic resets:**

Option 1 - Using Supabase Edge Functions (Recommended):
1. Create a new Edge Function to call the reset functions
2. Use a cron service (like GitHub Actions) to trigger it daily/monthly

Option 2 - Using pg_cron (if available):
```sql
SELECT cron.schedule('reset-daily-quotas', '0 0 * * *', 'SELECT reset_daily_quotas()');
SELECT cron.schedule('reset-monthly-quotas', '0 0 1 * *', 'SELECT reset_monthly_quotas()');
```

## Security

All tables have Row Level Security (RLS) enabled. Users can only:
- View their own data
- Modify their own data
- Cannot access other users' data

## Troubleshooting

### Issue: Permission Denied
**Solution:** Make sure you're running the migration as a database administrator.

### Issue: Table Already Exists
**Solution:** The migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times. Existing tables won't be affected.

### Issue: RLS Policies Not Working
**Solution:** Verify that RLS is enabled on all tables:
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

## Next Steps

After completing the database setup:
1. Test user registration through the app
2. Verify device binding functionality
3. Test bookmark creation and folder management
4. Monitor voice command logging

## Support

For issues or questions:
- Email: tsait770@gmail.com
- Check Supabase logs in the dashboard
- Review the application logs for detailed error messages
