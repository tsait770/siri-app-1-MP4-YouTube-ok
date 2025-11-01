import { protectedProcedure } from '../../../create-context';
import { z } from 'zod';

export const createFolderRoute = protectedProcedure
  .input(
    z.object({
      name: z.string(),
      parentFolderId: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const { data, error } = await supabase
      .from('folders')
      .insert({
        user_id: user.id,
        name: input.name,
        parent_folder_id: input.parentFolderId || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create folder');
    }

    return data;
  });
