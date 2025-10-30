import { NextRequest } from "next/server";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { logger } from "@/lib/logger";

/**
 * WebSocket-based live transcription endpoint
 * 
 * Note: Next.js doesn't natively support WebSocket in API routes.
 * This endpoint is designed to work with a WebSocket upgrade approach.
 * For production, consider using a separate WebSocket server or
 * implementing this with the Next.js custom server.
 */
export async function GET(request: NextRequest) {
  try {
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY || "");

    // Check if we can upgrade to WebSocket
    const upgradeHeader = request.headers.get("upgrade");
    
    if (upgradeHeader !== "websocket") {
      return new Response(
        JSON.stringify({
          error: "This endpoint requires WebSocket connection",
          info: "Please connect using WebSocket protocol",
        }),
        {
          status: 426,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    logger.info("Live transcription WebSocket connection initiated", {
      component: "LiveTranscriptionRoute",
    });

    // Create Deepgram live connection
    const connection = deepgram.listen.live({
      model: "nova-3",
      language: "nl",
      smart_format: true,
      diarize: true,
      punctuate: true,
      utterances: true,
      interim_results: true,
    });

    // Handle Deepgram connection events
    connection.on(LiveTranscriptionEvents.Open, () => {
      logger.info("Deepgram connection opened", {
        component: "LiveTranscriptionRoute",
      });
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      logger.info("Deepgram connection closed", {
        component: "LiveTranscriptionRoute",
      });
    });

    connection.on(LiveTranscriptionEvents.Error, (error) => {
      logger.error("Deepgram connection error", {
        component: "LiveTranscriptionRoute",
        error,
      });
    });

    // Return successful response
    return new Response(
      JSON.stringify({
        status: "WebSocket endpoint ready",
        config: {
          model: "nova-3",
          language: "nl",
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logger.error("Error in live transcription endpoint", {
      component: "LiveTranscriptionRoute",
      error,
    });

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Export POST for compatibility
export { GET as POST };

