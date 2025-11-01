import { protectedProcedure } from '../../../create-context';

export const listFoldersRoute = protectedProcedure
  .query(async ({ ctx }) => {
    const { supabase, user } = ctx;

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch folders');
    }

    return data;
  });
