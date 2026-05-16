import mongoose from "mongoose";

const DB_NAME = "nori";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  __mongooseCache?: MongooseCache;
};

const cache: MongooseCache =
  globalForMongoose.__mongooseCache ?? { conn: null, promise: null };
globalForMongoose.__mongooseCache = cache;

export async function connectDB() {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local before running the app.",
    );
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        dbName: DB_NAME,
        bufferCommands: false,
      })
      .then((m) => m);
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
