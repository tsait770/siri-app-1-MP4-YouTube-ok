import { protectedProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteFolderRoute = protectedProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', input.id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error('Failed to delete folder');
    }

    return { success: true, message: 'Folder deleted successfully' };
  });
