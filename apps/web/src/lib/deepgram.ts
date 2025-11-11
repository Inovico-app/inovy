import { createClient } from "@deepgram/sdk";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY ?? "");

export const getDeepgramClient = () => {
  if (!process.env.DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY is not set");
  }
  return deepgram;
};

export const getTemporaryDeepgramToken = async () => {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY is not set in environment variables");
  }

  return await deepgram.auth.grantToken();
};

