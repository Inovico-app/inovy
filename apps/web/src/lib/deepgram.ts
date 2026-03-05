import { createClient } from "@deepgram/sdk";
import { ResultAsync } from "neverthrow";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY ?? "");

export const getDeepgramClient = () => {
  if (!process.env.DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY is not set");
  }
  return deepgram;
};

export const getTemporaryDeepgramToken = (): ResultAsync<
  { access_token: string },
  Error
> => {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return ResultAsync.fromPromise(
      Promise.reject(
        new Error("DEEPGRAM_API_KEY is not set in environment variables")
      ),
      (error) =>
        error instanceof Error
          ? error
          : new Error("Failed to generate Deepgram token")
    );
  }

  return ResultAsync.fromPromise(
    deepgram.auth.grantToken(),
    (error) =>
      error instanceof Error
        ? error
        : new Error("Failed to generate Deepgram token")
  );
};

