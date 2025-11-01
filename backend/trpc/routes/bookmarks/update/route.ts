import { protectedProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateBookmarkRoute = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      url: z.string().url().optional(),
      title: z.string().optional(),
      folderId: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const updateData: any = {};
    if (input.url !== undefined) updateData.url = input.url;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.folderId !== undefined) updateData.folder_id = input.folderId;
    if (input.tags !== undefined) updateData.tags = input.tags;

    const { data, error } = await supabase
      .from('bookmarks')
      .update(updateData)
      .eq('id', input.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update bookmark');
    }

    return data;
  });
