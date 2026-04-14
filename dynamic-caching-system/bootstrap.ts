import express from "express";
import { createClient } from "redis";
import BaseRoute from "./src/routes/base.route.js";
import { CoreProvider } from "./src/providers/core.provider.js";
import { RedisCacheService } from "./src/adapters/redis-cache.service.js";

const PORT = process.env.PORT || 3000;
const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

async function connectRedis(client: ReturnType<typeof createClient>) {
  const maxAttempts = 30;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (!client.isOpen) {
        await client.connect();
      }
      await client.flushDb();
      console.log("Connected to Redis");
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Redis connect attempt ${attempt}/${maxAttempts}:`, msg);
      await new Promise((r) => setTimeout(r, 1_000));
    }
  }
  throw new Error("Giving up on Redis after max attempts");
}

async function main() {
  const app = express();

  const client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 10_000,
      reconnectStrategy: (retries) => Math.min(retries * 100, 3_000),
    },
  });

  client.on("error", (err) => console.error("Redis Client Error", err.message));

  await connectRedis(client);

  const cache = new RedisCacheService(client);
  CoreProvider.initialize({ cache });

  new BaseRoute(app);

  let n = "10";
  cache.set("n", n, 120);

  function calculateNextN() {
    const now = new Date();
    const msToNextMinute =
      60000 - (now.getSeconds() * 1000 + now.getMilliseconds());

    setTimeout(() => {
      n += "0";
      cache.set("n", n, 120);
      console.log(`[${new Date().toLocaleTimeString()}] n updated: ${n}`);

      setInterval(() => {
        n += "0";
        cache.set("n", n, 120);
        console.log(`[${new Date().toLocaleTimeString()}] n updated: ${n}`);
      }, 60000);
    }, msToNextMinute);
  }

  calculateNextN();

  // app.get("/api/sum", async (_req, res) => {
  //   try {
  //     if (client.isReady) {
  //       const value = await client.get(n);

  //       if (value) {
  //         return res.json({ sum: value });
  //       }
  //     }
  //   } catch (err) {
  //     const msg = err instanceof Error ? err.message : String(err);
  //     console.error("Redis GET error:", msg);
  //   }

  //   let sum = 0;

  //   for (let i = 1; i <= Number(n); i++) sum += i;

  //   try {
  //     if (client.isReady) {
  //       /*
  //         Why putting await here?
  //         - Because we want to wait for the cache to be set before returning the response
  //         - If we don't put await here, the response will be sent before the cache is set
  //         - Without await, the response can go out before the write completes. If we just fire-and-forget, failures can surface as unhandled rejections
  //       */
  //       await client.set(n, sum.toString(), {
  //         EX: 120, // Cache expires in 120 seconds
  //       });
  //       console.log(
  //         `Cache set for key ${n}: ${sum} at ${new Date().toLocaleTimeString()}`,
  //       );
  //     }
  //   } catch (err) {
  //     const msg = err instanceof Error ? err.message : String(err);
  //     console.error("Redis SET error:", msg);
  //   }

  //   res.json({
  //     sum: sum,
  //   });
  // });

  // app.get("/api/healthz", (req, res) => {
  //   res.json({ status: "ok" });
  // });

  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  app.listen(PORT, () => {
    console.log(
      `Express server running at http://localhost:${PORT} - ${new Date().toLocaleTimeString()}`,
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
