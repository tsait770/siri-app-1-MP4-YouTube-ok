import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './use-auth';

export type MembershipTier = 'free_trial' | 'free' | 'basic' | 'premium';

export interface MembershipStatus {
  tier: MembershipTier;
  usageCount: number;
  dailyUsageCount: number;
  lastResetDate: string;
  trialUsed: boolean;
  registrationDate: string;
}

export interface MembershipLimits {
  dailyLimit: number;
  monthlyLimit: number;
  totalLimit: number;
  canAccessAllSources: boolean;
}

const MEMBERSHIP_LIMITS: Record<MembershipTier, MembershipLimits> = {
  free_trial: {
    dailyLimit: -1, // unlimited
    monthlyLimit: -1, // unlimited
    totalLimit: 2000,
    canAccessAllSources: true,
  },
  free: {
    dailyLimit: 30,
    monthlyLimit: -1, // unlimited
    totalLimit: -1, // unlimited
    canAccessAllSources: true,
  },
  basic: {
    dailyLimit: 40, // daily login bonus
    monthlyLimit: 1500,
    totalLimit: -1, // unlimited
    canAccessAllSources: true,
  },
  premium: {
    dailyLimit: -1, // unlimited
    monthlyLimit: -1, // unlimited
    totalLimit: -1, // unlimited
    canAccessAllSources: true,
  },
};

export const [MembershipProvider, useMembership] = createContextHook(() => {
  const { user, isLoading: authLoading } = useAuth();
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>({
    tier: 'free_trial',
    usageCount: 0,
    dailyUsageCount: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    trialUsed: false,
    registrationDate: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadMembershipStatus = useCallback(async () => {
    try {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        console.error('Error loading membership status:', error);
        setIsLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      let needsUpdate = false;
      let updatedData = { ...data };

      if (data.last_daily_reset !== today) {
        updatedData.daily_free_quota = 0;
        updatedData.last_daily_reset = today;
        needsUpdate = true;
      }

      const currentMonth = new Date().toISOString().slice(0, 7);
      const lastMonthReset = data.last_monthly_reset?.slice(0, 7);
      if (lastMonthReset !== currentMonth) {
        updatedData.monthly_basic_quota = 0;
        updatedData.last_monthly_reset = today;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await supabase
          .from('users')
          .update({
            daily_free_quota: updatedData.daily_free_quota,
            monthly_basic_quota: updatedData.monthly_basic_quota,
            last_daily_reset: updatedData.last_daily_reset,
            last_monthly_reset: updatedData.last_monthly_reset,
          })
          .eq('id', user.id);
      }

      setMembershipStatus({
        tier: updatedData.membership_level,
        usageCount: updatedData.free_trial_remaining,
        dailyUsageCount: updatedData.daily_free_quota,
        lastResetDate: updatedData.last_daily_reset,
        trialUsed: updatedData.membership_level !== 'free_trial',
        registrationDate: updatedData.created_at,
      });
    } catch (error) {
      console.error('Error loading membership status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadMembershipStatus();
    }
  }, [user, authLoading, loadMembershipStatus]);

  const incrementUsage = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const limits = MEMBERSHIP_LIMITS[membershipStatus.tier];
      const today = new Date().toISOString().split('T')[0];
      
      let currentStatus = { ...membershipStatus };
      if (currentStatus.lastResetDate !== today) {
        currentStatus.dailyUsageCount = 0;
        currentStatus.lastResetDate = today;
      }

      if (limits.dailyLimit > 0 && currentStatus.dailyUsageCount >= limits.dailyLimit) {
        return false;
      }
      
      if (limits.totalLimit > 0 && currentStatus.usageCount >= limits.totalLimit) {
        if (currentStatus.tier === 'free_trial') {
          currentStatus.tier = 'free';
          currentStatus.trialUsed = true;
          
          await supabase
            .from('users')
            .update({ membership_level: 'free' })
            .eq('id', user.id);
        } else {
          return false;
        }
      }

      currentStatus.usageCount += 1;
      currentStatus.dailyUsageCount += 1;

      await supabase
        .from('users')
        .update({
          free_trial_remaining: currentStatus.usageCount,
          daily_free_quota: currentStatus.dailyUsageCount,
          last_daily_reset: currentStatus.lastResetDate,
        })
        .eq('id', user.id);

      setMembershipStatus(currentStatus);
      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  }, [user, membershipStatus]);

  const upgradeMembership = useCallback(async (newTier: MembershipTier) => {
    if (!user) return;

    try {
      await supabase
        .from('users')
        .update({ membership_level: newTier })
        .eq('id', user.id);

      const updatedStatus = {
        ...membershipStatus,
        tier: newTier,
      };
      setMembershipStatus(updatedStatus);
    } catch (error) {
      console.error('Error upgrading membership:', error);
    }
  }, [user, membershipStatus]);

  const getRemainingUsage = useCallback(() => {
    const limits = MEMBERSHIP_LIMITS[membershipStatus.tier];
    const today = new Date().toISOString().split('T')[0];
    
    let currentStatus = { ...membershipStatus };
    if (currentStatus.lastResetDate !== today) {
      currentStatus.dailyUsageCount = 0;
    }

    return {
      dailyRemaining: limits.dailyLimit > 0 ? Math.max(0, limits.dailyLimit - currentStatus.dailyUsageCount) : -1,
      totalRemaining: limits.totalLimit > 0 ? Math.max(0, limits.totalLimit - currentStatus.usageCount) : -1,
      canUse: (limits.dailyLimit <= 0 || currentStatus.dailyUsageCount < limits.dailyLimit) &&
              (limits.totalLimit <= 0 || currentStatus.usageCount < limits.totalLimit),
    };
  }, [membershipStatus]);

  const getMembershipLimits = useCallback(() => MEMBERSHIP_LIMITS[membershipStatus.tier], [membershipStatus.tier]);

  return useMemo(() => ({
    membershipStatus,
    isLoading,
    incrementUsage,
    upgradeMembership,
    getRemainingUsage,
    getMembershipLimits,
    MEMBERSHIP_LIMITS,
  }), [membershipStatus, isLoading, incrementUsage, upgradeMembership, getRemainingUsage, getMembershipLimits]);
});