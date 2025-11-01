import { protectedProcedure } from '../../../create-context';
import { z } from 'zod';

export const unbindDeviceRoute = protectedProcedure
  .input(
    z.object({
      deviceId: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const { error } = await supabase
      .from('user_devices')
      .delete()
      .eq('user_id', user.id)
      .eq('device_id', input.deviceId);

    if (error) {
      throw new Error('Failed to unbind device');
    }

    return { success: true, message: 'Device unbound successfully' };
  });
