"use client";

import { getDeepgramClientTokenAction } from "@/actions/deepgram";
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
  undefined,
);

interface DeepgramContextProviderProps {
  children: ReactNode;
}

const DeepgramContextProvider: FunctionComponent<
  DeepgramContextProviderProps
> = ({ children }) => {
  const [connection, setConnection] = useState<LiveClient | null>(null);
  const [connectionState, setConnectionState] = useState<SOCKET_STATES>(
    SOCKET_STATES.closed,
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
      setConnectionState(SOCKET_STATES.connecting);

      const result = await getDeepgramClientTokenAction();

      if (result.serverError) {
        throw new Error(`Server action error: ${result.serverError}`);
      }

      const token = result.data?.data.token;

      if (!token) {
        throw new Error(
          "Failed to get Deepgram client token: no token returned",
        );
      }

      const deepgram = createClient({ accessToken: token });
      const conn = deepgram.listen.live(options, endpoint);

      // Wait for connection to open
      await new Promise<void>((resolve, reject) => {
        let timeoutId: NodeJS.Timeout | null = null;

        const openHandler = () => {
          cleanupInitialListeners();
          setConnectionState(SOCKET_STATES.open);
          resolve();
        };

        const errorHandler = (error: unknown) => {
          cleanupInitialListeners();
          reject(
            new Error(
              `Deepgram connection error: ${
                (error as { message?: string })?.message ?? "Unknown error"
              }. This often indicates an invalid API key or authentication issue.`,
            ),
          );
        };

        const closeHandler = () => {
          cleanupInitialListeners();
          reject(
            new Error(
              "Deepgram WebSocket closed before connection was established",
            ),
          );
        };

        const timeoutHandler = () => {
          cleanupInitialListeners();
          reject(
            new Error(
              "Connection timeout: Failed to connect to Deepgram within 10 seconds",
            ),
          );
        };

        const cleanupInitialListeners = () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          conn.removeListener(LiveTranscriptionEvents.Open, openHandler);
          conn.removeListener(LiveTranscriptionEvents.Error, errorHandler);
          conn.removeListener(LiveTranscriptionEvents.Close, closeHandler);
        };

        conn.addListener(LiveTranscriptionEvents.Open, openHandler);
        conn.addListener(LiveTranscriptionEvents.Error, errorHandler);
        conn.addListener(LiveTranscriptionEvents.Close, closeHandler);

        timeoutId = setTimeout(timeoutHandler, 10000);
      });

      // Add persistent listeners to track connection state after initial open
      conn.addListener(LiveTranscriptionEvents.Close, () => {
        setConnectionState(SOCKET_STATES.closed);
      });

      conn.addListener(LiveTranscriptionEvents.Error, () => {
        setConnectionState(SOCKET_STATES.closed);
      });

      setConnection(conn);
    } catch (error) {
      setConnectionState(SOCKET_STATES.closed);
      throw error;
    }
  };

  const disconnectFromDeepgram = () => {
    if (connection) {
      connection.requestClose();
      setConnection(null);
      setConnectionState(SOCKET_STATES.closed);
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
      "useDeepgram must be used within a DeepgramContextProvider",
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
