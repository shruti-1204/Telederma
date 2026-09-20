const Redis = require("ioredis");
const env = require("./env");

class MemoryStore {
  constructor() {
    this.store = new Map();
    this.expiries = new Map();
  }

  async get(key) {
    if (this.expiries.has(key) && Date.now() > this.expiries.get(key)) {
      this.store.delete(key);
      this.expiries.delete(key);
      return null;
    }
    return this.store.get(key) || null;
  }

  async set(key, value, mode, duration) {
    this.store.set(key, typeof value === "string" ? value : JSON.stringify(value));
    if (mode === "EX" && duration) {
      this.expiries.set(key, Date.now() + duration * 1000);
    }
    return "OK";
  }

  async del(key) {
    this.store.delete(key);
    this.expiries.delete(key);
    return 1;
  }

  async keys(pattern) {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    const matched = [];
    for (const key of this.store.keys()) {
      if (this.expiries.has(key) && Date.now() > this.expiries.get(key)) {
        this.store.delete(key);
        this.expiries.delete(key);
        continue;
      }
      if (regex.test(key)) {
        matched.push(key);
      }
    }
    return matched;
  }
}

let redisClient = null;

if (env.REDIS_URL) {
  try {
    const client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // don't loop indefinitely
    });

    client.on("error", (err) => {
      console.warn("Redis connection error, falling back to memory store:", err.message);
      redisClient = new MemoryStore();
    });

    client.connect().then(() => {
      console.log("Connected to Redis successfully");
      redisClient = client;
    }).catch(() => {
      console.warn("Redis unavailable at startup, using in-memory store fallback");
      redisClient = new MemoryStore();
    });
  } catch (err) {
    console.warn("Redis init failed, using in-memory fallback:", err.message);
    redisClient = new MemoryStore();
  }
} else {
  redisClient = new MemoryStore();
}

module.exports = {
  get: async (key) => (redisClient ? redisClient.get(key) : null),
  set: async (key, val, mode, duration) => (redisClient ? redisClient.set(key, val, mode, duration) : "OK"),
  del: async (key) => (redisClient ? redisClient.del(key) : 1),
  keys: async (pattern) => (redisClient ? redisClient.keys(pattern) : []),
};
