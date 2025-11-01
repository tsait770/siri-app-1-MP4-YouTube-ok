import { protectedProcedure } from '../../../create-context';

export const generateBindingCodeRoute = protectedProcedure
  .mutation(async ({ ctx }) => {
    const { supabase, user } = ctx;

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const { error } = await supabase
      .from('users')
      .update({ verification_code: verificationCode })
      .eq('id', user.id);

    if (error) {
      throw new Error('Failed to generate verification code');
    }

    return { 
      verificationCode,
      expiresIn: 300,
    };
  });
