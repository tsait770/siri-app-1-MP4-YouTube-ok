import { protectedProcedure } from '../../../create-context';
import { z } from 'zod';

export const createBookmarkRoute = protectedProcedure
  .input(
    z.object({
      url: z.string().url(),
      title: z.string(),
      folderId: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: user.id,
        url: input.url,
        title: input.title,
        folder_id: input.folderId || null,
        tags: input.tags || [],
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create bookmark');
    }

    return data;
  });
