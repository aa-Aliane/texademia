import { serve } from "srvx/node";
import handler from "./dist/server/server.js";

serve({
  fetch: handler.fetch,
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  hostname: "0.0.0.0",
});
