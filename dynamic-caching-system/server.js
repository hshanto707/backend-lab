import express from "express";
import redis from "redis";

const app = express();
const PORT = process.env.PORT || 3000;
const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const client = redis.createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 10_000,
    reconnectStrategy: (retries) => Math.min(retries * 100, 3_000),
  },
});

client.on("error", (err) => console.error("Redis Client Error", err.message));

async function initredis() {
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
      console.error(
        `Redis connect attempt ${attempt}/${maxAttempts}:`,
        err.message,
      );
      await new Promise((r) => setTimeout(r, 1_000));
    }
  }
  console.error("Giving up on Redis after max attempts");
}

initredis();

let n = "10";

function calculateNextN() {
  const now = new Date();
  const msToNextMinute =
    60000 - (now.getSeconds() * 1000 + now.getMilliseconds());

  setTimeout(() => {
    n += "0";
    console.log(`[${new Date().toLocaleTimeString()}] n updated: ${n}`);

    setInterval(() => {
      n += "0";
      console.log(`[${new Date().toLocaleTimeString()}] n updated: ${n}`);
    }, 60000);
  }, msToNextMinute);
}

calculateNextN();

app.get("/api/sum", async (req, res) => {
  try {
    if (client.isReady) {
      const value = await client.get(n);

      if (value) {
        return res.json({ sum: value });
      }
    }
  } catch (err) {
    console.error("Redis GET error:", err.message);
  }

  let sum = 0;

  for (let i = 1; i <= Number(n); i++) sum += i;

  try {
    if (client.isReady) {
      /*
        Why putting await here?
        - Because we want to wait for the cache to be set before returning the response
        - If we don't put await here, the response will be sent before the cache is set
        - Without await, the response can go out before the write completes. If we just fire-and-forget, failures can surface as unhandled rejections
      */
      await client.set(n, sum.toString(), {
        EX: 120, // Cache expires in 120 seconds
      });
      console.log(
        `Cache set for key ${n}: ${sum} at ${new Date().toLocaleTimeString()}`,
      );
    }
  } catch (err) {
    console.error("Redis SET error:", err.message);
  }

  res.json({
    sum: sum,
  });
});

app.get("/api/healthz", (req, res) => {
  res.json({ status: "ok" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(
    `Express server running at http://localhost:${PORT} - ${new Date().toLocaleTimeString()}`,
  );
});
