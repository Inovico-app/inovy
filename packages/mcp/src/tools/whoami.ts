import type { ToolDefinition } from "../utils/register-tool";

export const whoamiToolDefinition: ToolDefinition<Record<string, never>> = {
  name: "whoami",
  config: {
    title: "Who am I?",
    description:
      "Returns the current authenticated identity and scopes (authInfo)",
    inputSchema: {},
  },
  handler: async (_args, extra) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              authInfo: extra.authInfo ?? null,
              requestInfo: extra.requestInfo ?? null,
            },
            null,
            2
          ),
        },
      ],
    };
  },
};

