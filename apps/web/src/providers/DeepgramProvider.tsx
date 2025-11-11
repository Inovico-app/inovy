"use client";

import { getDeepgramClientTokenAction } from "@/actions/deepgram";
import { ActionErrors, logger } from "@/lib";
import {
  createClient,
  type LiveClient,
  type LiveSchema,
  type LiveTranscriptionEvent,
  LiveTranscriptionEvents,
  SOCKET_STATES,
} from "@deepgram/sdk";

import {
  createContext,
  type FunctionComponent,
  type ReactNode,
  useContext,
  useState,
} from "react";

interface DeepgramContextType {
  connection: LiveClient | null;
  connectToDeepgram: (options: LiveSchema, endpoint?: string) => Promise<void>;
  disconnectFromDeepgram: () => void;
  connectionState: SOCKET_STATES;
}

const DeepgramContext = createContext<DeepgramContextType | undefined>(
  undefined
);

interface DeepgramContextProviderProps {
  children: ReactNode;
}

const DeepgramContextProvider: FunctionComponent<
  DeepgramContextProviderProps
> = ({ children }) => {
  const [connection, setConnection] = useState<LiveClient | null>(null);
  const [connectionState, setConnectionState] = useState<SOCKET_STATES>(
    SOCKET_STATES.closed
  );

  /**
   * Connects to the Deepgram speech recognition service and sets up a live transcription session.
   *
   * @param options - The configuration options for the live transcription session.
   * @param endpoint - The optional endpoint URL for the Deepgram service.
   * @returns A Promise that resolves when the connection is established.
   */
  const connectToDeepgram = async (options: LiveSchema, endpoint?: string) => {
    try {
      const { data } = await getDeepgramClientTokenAction();

      if (!data?.data.success) {
        throw ActionErrors.internal(
          "Failed to get Deepgram client token",
          undefined,
          "DeepgramContextProvider.connectToDeepgram"
        );
      }

      const token = data.data.token ?? "";

      if (!token) {
        throw new Error("Deepgram token is empty");
      }

      const deepgram = createClient({ accessToken: token });

      const conn = deepgram.listen.live(options, endpoint);

      // Wait for connection to open
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          logger.error(
            "Connection timeout - WebSocket did not open in 10 seconds",
            {
              component: "DeepgramContextProvider.connectToDeepgram",
              options,
              endpoint,
            }
          );
          reject(
            new Error(
              "Connection timeout: Failed to connect to Deepgram within 10 seconds"
            )
          );
        }, 10000); // 10 second timeout

        conn.addListener(LiveTranscriptionEvents.Open, () => {
          logger.info("WebSocket connection opened successfully", {
            component: "DeepgramContextProvider.connectToDeepgram",
            options,
            endpoint,
          });
          clearTimeout(timeout);
          setConnectionState(SOCKET_STATES.open);
          resolve();
        });

        conn.addListener(LiveTranscriptionEvents.Error, (error) => {
          clearTimeout(timeout);

          // Extract more details from the error
          const errorDetails = {
            name: error?.name,
            message: error?.message,
            readyState: error?.readyState,
            url: error?.url,
          };
          logger.error("Deepgram connection error event:", {
            error: errorDetails,
            component: "DeepgramContextProvider.connectToDeepgram",
            options,
            endpoint,
          });

          reject(
            new Error(
              `Deepgram connection error: ${
                error?.message ?? "Unknown error"
              }. This often indicates an invalid API key or authentication issue.`
            )
          );
        });

        conn.addListener(LiveTranscriptionEvents.Close, (event) => {
          logger.info("WebSocket connection closed:", {
            event,
            component: "DeepgramContextProvider.connectToDeepgram",
            options,
            endpoint,
          });
          setConnectionState(SOCKET_STATES.closed);
        });
      });

      setConnection(conn);
      logger.info("Successfully connected to Deepgram", {
        component: "DeepgramContextProvider.connectToDeepgram",
        options,
        endpoint,
      });
    } catch (error) {
      logger.error("Failed to connect to Deepgram:", {
        error,
        component: "DeepgramContextProvider.connectToDeepgram",
        options,
        endpoint,
      });
      setConnectionState(SOCKET_STATES.closed);
      throw error;
    }
  };

  const disconnectFromDeepgram = () => {
    if (connection) {
      connection.requestClose();
      setConnection(null);
    }
  };

  return (
    <DeepgramContext.Provider
      value={{
        connection,
        connectToDeepgram,
        disconnectFromDeepgram,
        connectionState,
      }}
    >
      {children}
    </DeepgramContext.Provider>
  );
};

function useDeepgram(): DeepgramContextType {
  const context = useContext(DeepgramContext);
  if (context === undefined) {
    throw new Error(
      "useDeepgram must be used within a DeepgramContextProvider"
    );
  }
  return context;
}

export {
  DeepgramContextProvider,
  SOCKET_STATES as LiveConnectionState,
  LiveTranscriptionEvents,
  useDeepgram,
  type LiveTranscriptionEvent,
};

