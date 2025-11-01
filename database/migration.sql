-- InstaPlay Database Schema Migration
-- This file contains all SQL statements needed to set up the database for the InstaPlay application

-- Enable Row Level Security on all tables
-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  membership_level TEXT NOT NULL DEFAULT 'free_trial' CHECK (membership_level IN ('free_trial', 'free', 'basic', 'premium')),
  free_trial_remaining INTEGER NOT NULL DEFAULT 2000,
  daily_free_quota INTEGER NOT NULL DEFAULT 0,
  monthly_basic_quota INTEGER NOT NULL DEFAULT 0,
  max_devices INTEGER NOT NULL DEFAULT 1,
  verification_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_daily_reset TEXT NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
  last_monthly_reset TEXT NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create user_devices table
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, device_id)
);

-- Enable RLS on user_devices table
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_devices table
CREATE POLICY "Users can view their own devices" ON public.user_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices" ON public.user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices" ON public.user_devices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices" ON public.user_devices
  FOR DELETE USING (auth.uid() = user_id);

-- Create folders table
CREATE TABLE IF NOT EXISTS public.folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on folders table
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for folders table
CREATE POLICY "Users can view their own folders" ON public.folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders" ON public.folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" ON public.folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" ON public.folders
  FOR DELETE USING (auth.uid() = user_id);

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on bookmarks table
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bookmarks table
CREATE POLICY "Users can view their own bookmarks" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks" ON public.bookmarks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  paypal_subscription_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscriptions table
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Create voice_logs table
CREATE TABLE IF NOT EXISTS public.voice_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  source_url TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on voice_logs table
ALTER TABLE public.voice_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for voice_logs table
CREATE POLICY "Users can view their own voice logs" ON public.voice_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice logs" ON public.voice_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder_id ON public.bookmarks(folder_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_logs_user_id ON public.voice_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_logs_executed_at ON public.voice_logs(executed_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookmarks_updated_at BEFORE UPDATE ON public.bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle membership level changes
CREATE OR REPLACE FUNCTION handle_membership_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update max_devices based on membership level
  IF NEW.membership_level = 'free' THEN
    NEW.max_devices = 1;
  ELSIF NEW.membership_level = 'free_trial' THEN
    NEW.max_devices = 1;
  ELSIF NEW.membership_level = 'basic' THEN
    NEW.max_devices = 3;
  ELSIF NEW.membership_level = 'premium' THEN
    NEW.max_devices = 5;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for membership level changes
CREATE TRIGGER on_membership_change BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION handle_membership_change();

-- Create function to reset daily quotas
CREATE OR REPLACE FUNCTION reset_daily_quotas()
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET 
    daily_free_quota = 0,
    last_daily_reset = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
  WHERE last_daily_reset != TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');
END;
$$ language 'plpgsql';

-- Create function to reset monthly quotas
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET 
    monthly_basic_quota = 0,
    last_monthly_reset = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
  WHERE TO_CHAR(TO_DATE(last_monthly_reset, 'YYYY-MM-DD'), 'YYYY-MM') != TO_CHAR(CURRENT_DATE, 'YYYY-MM');
END;
$$ language 'plpgsql';

-- Note: To schedule these functions, you can use pg_cron or Supabase Edge Functions
-- Example with pg_cron (requires pg_cron extension):
-- SELECT cron.schedule('reset-daily-quotas', '0 0 * * *', 'SELECT reset_daily_quotas()');
-- SELECT cron.schedule('reset-monthly-quotas', '0 0 1 * *', 'SELECT reset_monthly_quotas()');
