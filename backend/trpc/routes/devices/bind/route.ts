import { protectedProcedure } from '../../../create-context';
import { z } from 'zod';

export const bindDeviceRoute = protectedProcedure
  .input(
    z.object({
      deviceId: z.string(),
      deviceName: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('max_devices')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('Failed to fetch user data');
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

    const { data: existingDevice } = await supabase
      .from('user_devices')
      .select('id')
      .eq('user_id', user.id)
      .eq('device_id', input.deviceId)
      .single();

    if (existingDevice) {
      const { error: updateError } = await supabase
        .from('user_devices')
        .update({ 
          last_login_at: new Date().toISOString(),
          device_name: input.deviceName,
        })
        .eq('id', existingDevice.id);

      if (updateError) {
        throw new Error('Failed to update device');
      }

      return { success: true, message: 'Device updated successfully' };
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

    return { success: true, message: 'Device bound successfully' };
  });
