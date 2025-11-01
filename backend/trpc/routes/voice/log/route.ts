import { protectedProcedure } from '../../../create-context';
import { z } from 'zod';

export const logVoiceCommandRoute = protectedProcedure
  .input(
    z.object({
      action: z.string(),
      sourceUrl: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const { error } = await supabase
      .from('voice_logs')
      .insert({
        user_id: user.id,
        action: input.action,
        source_url: input.sourceUrl || null,
        executed_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error('Failed to log voice command');
    }

    return { success: true, message: 'Voice command logged successfully' };
  });
