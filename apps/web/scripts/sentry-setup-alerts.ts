/**
 * Sentry Alert Rules Setup Script
 *
 * Creates alert rules in Sentry for critical error monitoring.
 * Idempotent: checks for existing rules by name before creating.
 *
 * Prerequisites:
 *   SENTRY_AUTH_TOKEN — API token with project:write scope
 *
 * Usage:
 *   npx tsx scripts/sentry-setup-alerts.ts
 */

const SENTRY_ORG = "inovy";
const SENTRY_PROJECT = "sentry-inovy";
const SENTRY_API_BASE = "https://sentry.io/api/0";

interface AlertRule {
  name: string;
  conditions: Array<Record<string, unknown>>;
  filters: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  frequency: number;
}

const ALERT_RULES: AlertRule[] = [
  {
    name: "Bot failure rate >10/hr",
    conditions: [
      {
        id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
        value: 10,
        comparisonType: "count",
        interval: "1h",
      },
    ],
    filters: [
      {
        id: "sentry.rules.filters.tagged_event.TaggedEventFilter",
        key: "component",
        match: "eq",
        value: "recall-webhook",
      },
      {
        id: "sentry.rules.filters.level.LevelFilter",
        match: "eq",
        level: "40",
      },
    ],
    actions: [
      {
        id: "sentry.mail.actions.NotifyEmailAction",
        targetType: "IssueOwners",
        fallthroughType: "ActiveMembers",
      },
    ],
    frequency: 60,
  },
  {
    name: "Unhandled exception spike >20/hr",
    conditions: [
      {
        id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
        value: 20,
        comparisonType: "count",
        interval: "1h",
      },
    ],
    filters: [
      {
        id: "sentry.rules.filters.tagged_event.TaggedEventFilter",
        key: "handled",
        match: "eq",
        value: "no",
      },
    ],
    actions: [
      {
        id: "sentry.mail.actions.NotifyEmailAction",
        targetType: "IssueOwners",
        fallthroughType: "ActiveMembers",
      },
    ],
    frequency: 60,
  },
  {
    name: "Stripe webhook errors",
    conditions: [
      {
        id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
        value: 1,
        comparisonType: "count",
        interval: "1h",
      },
    ],
    filters: [
      {
        id: "sentry.rules.filters.tagged_event.TaggedEventFilter",
        key: "component",
        match: "eq",
        value: "stripe-webhook",
      },
      {
        id: "sentry.rules.filters.level.LevelFilter",
        match: "eq",
        level: "40",
      },
    ],
    actions: [
      {
        id: "sentry.mail.actions.NotifyEmailAction",
        targetType: "IssueOwners",
        fallthroughType: "ActiveMembers",
      },
    ],
    frequency: 60,
  },
];

async function getExistingRules(
  token: string,
): Promise<Array<{ name: string }>> {
  const response = await fetch(
    `${SENTRY_API_BASE}/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/rules/`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch existing rules: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<Array<{ name: string }>>;
}

async function createRule(token: string, rule: AlertRule): Promise<void> {
  const response = await fetch(
    `${SENTRY_API_BASE}/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/rules/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: rule.name,
        actionMatch: "all",
        filterMatch: "all",
        conditions: rule.conditions,
        filters: rule.filters,
        actions: rule.actions,
        frequency: rule.frequency,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to create rule "${rule.name}": ${response.status} ${body}`,
    );
  }
}

async function main() {
  const token = process.env.SENTRY_AUTH_TOKEN;

  if (!token) {
    console.error("SENTRY_AUTH_TOKEN environment variable is required");
    process.exit(1);
  }

  console.log(
    `Setting up Sentry alert rules for ${SENTRY_ORG}/${SENTRY_PROJECT}...\n`,
  );

  const existingRules = await getExistingRules(token);
  const existingNames = new Set(existingRules.map((r) => r.name));

  for (const rule of ALERT_RULES) {
    if (existingNames.has(rule.name)) {
      console.log(`SKIPPED: "${rule.name}" (already exists)`);
      continue;
    }

    await createRule(token, rule);
    console.log(`CREATED: "${rule.name}"`);
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
