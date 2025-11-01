import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://aqzecsrcttddwsnixlao.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemVjc3JjdHRkZHdzbml4bGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MDQ4MTAsImV4cCI6MjA3NzQ4MDgxMH0.sJzDOSJEl32ZofoVArTU2b--qX_mni6uHgkSFWLUcjA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          membership_level: 'free_trial' | 'free' | 'basic' | 'premium';
          free_trial_remaining: number;
          daily_free_quota: number;
          monthly_basic_quota: number;
          max_devices: number;
          verification_code: string | null;
          created_at: string;
          updated_at: string;
          last_daily_reset: string;
          last_monthly_reset: string;
        };
        Insert: {
          id: string;
          email: string;
          membership_level?: 'free_trial' | 'free' | 'basic' | 'premium';
          free_trial_remaining?: number;
          daily_free_quota?: number;
          monthly_basic_quota?: number;
          max_devices?: number;
          verification_code?: string | null;
          created_at?: string;
          updated_at?: string;
          last_daily_reset?: string;
          last_monthly_reset?: string;
        };
        Update: {
          id?: string;
          email?: string;
          membership_level?: 'free_trial' | 'free' | 'basic' | 'premium';
          free_trial_remaining?: number;
          daily_free_quota?: number;
          monthly_basic_quota?: number;
          max_devices?: number;
          verification_code?: string | null;
          created_at?: string;
          updated_at?: string;
          last_daily_reset?: string;
          last_monthly_reset?: string;
        };
      };
      user_devices: {
        Row: {
          id: string;
          user_id: string;
          device_id: string;
          device_name: string;
          last_login_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_id: string;
          device_name: string;
          last_login_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          device_id?: string;
          device_name?: string;
          last_login_at?: string;
          created_at?: string;
        };
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          folder_id: string | null;
          url: string;
          title: string;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          folder_id?: string | null;
          url: string;
          title: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          folder_id?: string | null;
          url?: string;
          title?: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      folders: {
        Row: {
          id: string;
          user_id: string;
          parent_folder_id: string | null;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          parent_folder_id?: string | null;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          parent_folder_id?: string | null;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          paypal_subscription_id: string;
          plan_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          paypal_subscription_id: string;
          plan_id: string;
          status: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          paypal_subscription_id?: string;
          plan_id?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      voice_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          source_url: string | null;
          executed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          source_url?: string | null;
          executed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          source_url?: string | null;
          executed_at?: string;
        };
      };
    };
  };
};
