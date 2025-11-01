import { protectedProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteBookmarkRoute = protectedProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', input.id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error('Failed to delete bookmark');
    }

    return { success: true, message: 'Bookmark deleted successfully' };
  });
