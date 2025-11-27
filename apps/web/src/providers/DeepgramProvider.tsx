"use client";

import { getDeepgramClientTokenAction } from "@/actions/deepgram";
import { ActionErrors } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
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
  useEffect,
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
        let timeoutId: NodeJS.Timeout | null = null;

        // Define listener callbacks to ensure proper cleanup
        const openHandler = () => {
          logger.info("WebSocket connection opened successfully", {
            component: "DeepgramContextProvider.connectToDeepgram",
            options,
            endpoint,
          });
          cleanup();
          setConnectionState(SOCKET_STATES.open);
          resolve();
        };

        const errorHandler = (error: unknown) => {
          // Extract more details from the error
          const errorDetails = {
            name: (error as { name?: string })?.name,
            message: (error as { message?: string })?.message,
            readyState: (error as { readyState?: number })?.readyState,
            url: (error as { url?: string })?.url,
          };
          logger.error("Deepgram connection error event:", {
            error: errorDetails,
            component: "DeepgramContextProvider.connectToDeepgram",
            options,
            endpoint,
          });

          cleanup();
          reject(
            new Error(
              `Deepgram connection error: ${
                (error as { message?: string })?.message ?? "Unknown error"
              }. This often indicates an invalid API key or authentication issue.`
            )
          );
        };

        const closeHandler = (event: unknown) => {
          logger.info("WebSocket connection closed:", {
            event,
            component: "DeepgramContextProvider.connectToDeepgram",
            options,
            endpoint,
          });
          setConnectionState(SOCKET_STATES.closed);
        };

        const timeoutHandler = () => {
          logger.error(
            "Connection timeout - WebSocket did not open in 10 seconds",
            {
              component: "DeepgramContextProvider.connectToDeepgram",
              options,
              endpoint,
            }
          );
          cleanup();
          reject(
            new Error(
              "Connection timeout: Failed to connect to Deepgram within 10 seconds"
            )
          );
        };

        // Cleanup function to remove all listeners and clear timeout
        const cleanup = () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          conn.removeListener(LiveTranscriptionEvents.Open, openHandler);
          conn.removeListener(LiveTranscriptionEvents.Error, errorHandler);
          conn.removeListener(LiveTranscriptionEvents.Close, closeHandler);
        };

        // Register event listeners
        conn.addListener(LiveTranscriptionEvents.Open, openHandler);
        conn.addListener(LiveTranscriptionEvents.Error, errorHandler);
        conn.addListener(LiveTranscriptionEvents.Close, closeHandler);

        // Set timeout
        timeoutId = setTimeout(timeoutHandler, 10000); // 10 second timeout
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

  // Cleanup effect: ensure connection is closed on component unmount
  useEffect(() => {
    return () => {
      if (connection) {
        connection.requestClose();
      }
    };
  }, [connection]);

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

