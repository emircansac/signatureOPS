import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers";
import { createTRPCContext } from "@/server/trpc";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
    onError({ error }) {
      if (process.env.SENTRY_DSN) {
        void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
      } else {
        console.error(error);
      }
    },
  });

export { handler as GET, handler as POST };
