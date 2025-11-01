import { protectedProcedure } from '../../../create-context';
import { z } from 'zod';

export const verifyBindingCodeRoute = protectedProcedure
  .input(
    z.object({
      code: z.string(),
      deviceId: z.string(),
      deviceName: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('verification_code, max_devices')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('Failed to fetch user data');
    }

    if (userData.verification_code !== input.code) {
      throw new Error('Invalid verification code');
    }

    const { data: existingDevices, error: devicesError } = await supabase
      .from('user_devices')
      .select('id')
      .eq('user_id', user.id);

    if (devicesError) {
      throw new Error('Failed to fetch existing devices');
    }

    if (existingDevices.length >= userData.max_devices) {
      throw new Error(`Device limit reached. Maximum ${userData.max_devices} devices allowed.`);
    }

    const { error: insertError } = await supabase
      .from('user_devices')
      .insert({
        user_id: user.id,
        device_id: input.deviceId,
        device_name: input.deviceName,
        last_login_at: new Date().toISOString(),
      });

    if (insertError) {
      throw new Error('Failed to bind device');
    }

    await supabase
      .from('users')
      .update({ verification_code: null })
      .eq('id', user.id);

    return { success: true, message: 'Device bound successfully' };
  });
