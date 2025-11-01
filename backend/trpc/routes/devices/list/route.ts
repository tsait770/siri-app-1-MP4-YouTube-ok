import { protectedProcedure } from '../../../create-context';

export const listDevicesRoute = protectedProcedure
  .query(async ({ ctx }) => {
    const { supabase, user } = ctx;

    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', user.id)
      .order('last_login_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch devices');
    }

    return data;
  });
