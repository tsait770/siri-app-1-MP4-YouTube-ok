import { protectedProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateFolderRoute = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      parentFolderId: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.parentFolderId !== undefined) updateData.parent_folder_id = input.parentFolderId;

    const { data, error } = await supabase
      .from('folders')
      .update(updateData)
      .eq('id', input.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update folder');
    }

    return data;
  });
