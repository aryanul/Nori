import { MongoClient } from "mongodb";

const globalForMongo = globalThis as unknown as {
  __mongoClientPromise?: Promise<MongoClient>;
};

function makeClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local before running the app.",
    );
  }
  return new MongoClient(uri).connect();
}

const clientPromise: Promise<MongoClient> =
  process.env.NODE_ENV === "development"
    ? (globalForMongo.__mongoClientPromise ??= makeClient())
    : makeClient();

export default clientPromise;
