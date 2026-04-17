import mongoose from "mongoose";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;

/**
 * Connect to MongoDB with exponential-backoff retry.
 * Each retry waits BASE_DELAY * 2^attempt (2s, 4s, 8s, 16s, 32s).
 * Exits the process only after all retries are exhausted.
 */
export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not defined in environment variables");
    process.exit(1);
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri, { dbName: "helixo-timers" });
      console.log("Connected to MongoDB Atlas");
      return;
    } catch (error) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.error(
        `MongoDB connection failed (attempt ${attempt + 1}/${MAX_RETRIES}): ${error.message}`
      );

      if (attempt < MAX_RETRIES - 1) {
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error("All MongoDB connection attempts failed. Exiting.");
  process.exit(1);
}

export default connectToDatabase;
