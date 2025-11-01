import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqzecsrcttddwsnixlao.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemVjc3JjdHRkZHdzbml4bGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MDQ4MTAsImV4cCI6MjA3NzQ4MDgxMH0.sJzDOSJEl32ZofoVArTU2b--qX_mni6uHgkSFWLUcjA';

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const authHeader = opts.req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  let user = null;
  if (token) {
    const { data: { user: authUser } } = await supabase.auth.getUser(token);
    user = authUser;
  }

  return {
    req: opts.req,
    supabase,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use((opts) => {
  const { ctx } = opts;
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }
  return opts.next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});