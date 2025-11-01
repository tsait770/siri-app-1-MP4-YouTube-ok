import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const initAuth = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      const id = await getOrCreateDeviceId();
      setDeviceId(id);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const getOrCreateDeviceId = async (): Promise<string> => {
    try {
      let id: string;
      if (Platform.OS === 'web') {
        id = localStorage.getItem('deviceId') || '';
        if (!id) {
          id = Crypto.randomUUID();
          localStorage.setItem('deviceId', id);
        }
      } else {
        id = await AsyncStorage.getItem('deviceId') || '';
        if (!id) {
          id = Crypto.randomUUID();
          await AsyncStorage.setItem('deviceId', id);
        }
      }
      return id;
    } catch (error) {
      console.error('Error getting/creating device ID:', error);
      return Crypto.randomUUID();
    }
  };

  const signInWithGoogle = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: Platform.OS === 'web' 
            ? window.location.origin 
            : 'myapp://',
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      return { data: null, error };
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error signing in with email:', error);
      return { data: null, error };
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email!,
          membership_level: 'free_trial',
          free_trial_remaining: 2000,
          daily_free_quota: 0,
          monthly_basic_quota: 0,
          max_devices: 1,
          last_daily_reset: new Date().toISOString(),
          last_monthly_reset: new Date().toISOString(),
        });
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error signing up with email:', error);
      return { data: null, error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error('Error signing out:', error);
      return { error };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error('Error resetting password:', error);
      return { error };
    }
  }, []);

  return useMemo(() => ({
    user,
    session,
    deviceId,
    isLoading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword,
  }), [user, session, deviceId, isLoading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, resetPassword]);
});
