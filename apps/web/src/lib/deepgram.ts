import { createClient } from "@deepgram/sdk";

let deepgramInstance: ReturnType<typeof createClient> | null = null;

export const getDeepgramClient = () => {
  if (!process.env.DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY is not set");
  }
  
  if (!deepgramInstance) {
    deepgramInstance = createClient(process.env.DEEPGRAM_API_KEY);
  }
  
  return deepgramInstance;
};

export const getTemporaryDeepgramToken = async () => {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY is not set in environment variables");
  }

  const client = getDeepgramClient();
  return await client.auth.grantToken();
};

