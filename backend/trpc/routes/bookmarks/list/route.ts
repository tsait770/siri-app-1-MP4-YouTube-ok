import { protectedProcedure } from '../../../create-context';
import { z } from 'zod';

export const listBookmarksRoute = protectedProcedure
  .input(
    z.object({
      folderId: z.string().optional(),
    }).optional()
  )
  .query(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    let query = supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id);

    if (input?.folderId) {
      query = query.eq('folder_id', input.folderId);
    } else {
      query = query.is('folder_id', null);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch bookmarks');
    }

    return data;
  });
