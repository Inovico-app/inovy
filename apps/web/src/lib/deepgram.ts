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

  // return actual api key so we dont have a trillion keys floating around in dev
  if (process.env.NODE_ENV === "development") {
    return {
      result: {
        access_token: apiKey,
        expires_in: 3600,
      },
      error: null,
    };
  }

  return await deepgram.auth.grantToken();
};

