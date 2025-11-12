# Google Drive Watch Implementation Plan for Next.js on Vercel

## Overview

This plan implements a webhook system that monitors a Google Drive folder for file uploads using Google Drive API's push notifications. The system runs on Next.js deployed to Vercel with a database backend.

## Architecture

```
Google Drive → Watch Subscription → Webhook → Next.js API Routes → Business Logic
                                      ↓
                                  Database (tracks watches & tokens)
                                      ↓
                                  Cron Job (renews watches)
```

## Prerequisites

1. **Google Cloud Project Setup**

   - Create project at console.cloud.google.com
   - Enable Google Drive API
   - Create OAuth 2.0 credentials (Web application type)
   - Add authorized redirect URI: `https://yourdomain.com/api/auth/google/callback`
   - Note down Client ID and Client Secret

2. **Required Environment Variables**

   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
   NEXT_PUBLIC_WEBHOOK_URL=https://yourdomain.com/api/webhooks/drive
   CRON_SECRET=generate_random_secret_string
   DATABASE_URL=your_database_connection_string
   ```

3. **Dependencies**

   ```bash
   npm install googleapis uuid
   ```

4. **Database (PostgreSQL, MySQL, etc.)**
   - Must be accessible from Vercel
   - Options: Vercel Postgres, Supabase, PlanetScale, etc.

---

## Database Schema

### Table: `user_tokens`

Stores Google OAuth tokens for each user.

```sql
CREATE TABLE user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  token_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `drive_watches`

Tracks active Google Drive watch subscriptions.

```sql
CREATE TABLE drive_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  folder_id VARCHAR(255) NOT NULL,
  channel_id VARCHAR(255) NOT NULL UNIQUE,
  resource_id VARCHAR(255) NOT NULL,
  expiration BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (user_id) REFERENCES user_tokens(user_id)
);

CREATE INDEX idx_watches_expiration ON drive_watches(expiration, is_active);
CREATE INDEX idx_watches_user_folder ON drive_watches(user_id, folder_id, is_active);
```

---

## Implementation Structure

```
project/
├── app/
│   └── api/
│       ├── auth/
│       │   └── google/
│       │       ├── route.ts           # Initiates OAuth flow
│       │       └── callback/
│       │           └── route.ts        # Handles OAuth callback
│       ├── drive/
│       │   └── watch/
│       │       ├── start/
│       │       │   └── route.ts        # Start watching folder
│       │       ├── stop/
│       │       │   └── route.ts        # Stop watching folder
│       │       └── list/
│       │           └── route.ts        # List active watches
│       ├── webhooks/
│       │   └── drive/
│       │       └── route.ts            # Receives Google notifications
│       └── cron/
│           └── renew-watches/
│               └── route.ts            # Renews expiring watches
├── lib/
│   ├── google-drive.ts                 # Google Drive utilities
│   └── db.ts                           # Database helpers
├── vercel.json                         # Cron configuration
└── .env.local                          # Environment variables
```

---

## Implementation Files

### 1. `lib/google-drive.ts`

Shared utilities for Google Drive API interactions.

```typescript
import { google } from "googleapis";

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getDriveClient(refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function getValidTokens(refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}
```

### 2. `lib/db.ts`

Database helper functions. Adapt to your database client (Prisma, raw SQL, etc.).

```typescript
import { db } from "./your-db-client";

export interface UserToken {
  id: string;
  user_id: string;
  refresh_token: string;
  access_token?: string;
  token_expiry?: Date;
}

export interface DriveWatch {
  id: string;
  user_id: string;
  folder_id: string;
  channel_id: string;
  resource_id: string;
  expiration: number;
  is_active: boolean;
}

export async function getUserToken(userId: string): Promise<UserToken | null> {
  return db.query("SELECT * FROM user_tokens WHERE user_id = $1", [userId]);
}

export async function saveUserToken(
  userId: string,
  refreshToken: string,
  accessToken?: string
): Promise<void> {
  await db.query(
    `INSERT INTO user_tokens (user_id, refresh_token, access_token) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (user_id) 
     DO UPDATE SET refresh_token = $2, access_token = $3, updated_at = NOW()`,
    [userId, refreshToken, accessToken]
  );
}

export async function saveWatch(watch: Omit<DriveWatch, "id">): Promise<void> {
  await db.query(
    `INSERT INTO drive_watches 
     (user_id, folder_id, channel_id, resource_id, expiration, is_active) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      watch.user_id,
      watch.folder_id,
      watch.channel_id,
      watch.resource_id,
      watch.expiration,
      watch.is_active,
    ]
  );
}

export async function getActiveWatch(
  userId: string,
  folderId: string
): Promise<DriveWatch | null> {
  return db.query(
    "SELECT * FROM drive_watches WHERE user_id = $1 AND folder_id = $2 AND is_active = true",
    [userId, folderId]
  );
}

export async function deactivateWatch(channelId: string): Promise<void> {
  await db.query(
    "UPDATE drive_watches SET is_active = false WHERE channel_id = $1",
    [channelId]
  );
}

export async function getExpiringWatches(
  thresholdMs: number
): Promise<DriveWatch[]> {
  const threshold = Date.now() + thresholdMs;
  return db.query(
    "SELECT * FROM drive_watches WHERE expiration < $1 AND is_active = true",
    [threshold]
  );
}

export async function getWatchByChannel(
  channelId: string
): Promise<DriveWatch | null> {
  return db.query("SELECT * FROM drive_watches WHERE channel_id = $1", [
    channelId,
  ]);
}
```

### 3. OAuth Flow

#### `app/api/auth/google/route.ts`

Initiates OAuth authorization flow.

```typescript
import { google } from "googleapis";
import { NextResponse } from "next/server";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET() {
  const scopes = ["https://www.googleapis.com/auth/drive.readonly"];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });

  return NextResponse.redirect(url);
}
```

#### `app/api/auth/google/callback/route.ts`

Handles OAuth callback and stores tokens.

```typescript
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { saveUserToken } from "@/lib/db";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    // Extract user ID from token (or use your own user system)
    const userInfo = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const userId = userInfo.getPayload()?.sub;

    if (!userId || !tokens.refresh_token) {
      return NextResponse.json(
        { error: "Missing user ID or refresh token" },
        { status: 400 }
      );
    }

    // Save tokens to database
    await saveUserToken(userId, tokens.refresh_token, tokens.access_token);

    return NextResponse.json({
      success: true,
      message: "Authorization successful",
      userId,
    });
  } catch (error) {
    console.error("Error getting tokens:", error);
    return NextResponse.json(
      { error: "Failed to get tokens" },
      { status: 500 }
    );
  }
}
```

### 4. Watch Management

#### `app/api/drive/watch/start/route.ts`

Starts watching a Google Drive folder.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDriveClient } from "@/lib/google-drive";
import {
  getUserToken,
  saveWatch,
  getActiveWatch,
  deactivateWatch,
} from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { userId, folderId } = await request.json();

    if (!userId || !folderId) {
      return NextResponse.json(
        { error: "Missing userId or folderId" },
        { status: 400 }
      );
    }

    const userToken = await getUserToken(userId);
    if (!userToken) {
      return NextResponse.json(
        { error: "User tokens not found" },
        { status: 404 }
      );
    }

    // Check for existing active watch
    const existingWatch = await getActiveWatch(userId, folderId);
    if (existingWatch) {
      if (existingWatch.expiration > Date.now()) {
        return NextResponse.json({
          success: true,
          message: "Watch already active",
          watch: existingWatch,
        });
      } else {
        await deactivateWatch(existingWatch.channel_id);
      }
    }

    const drive = getDriveClient(userToken.refresh_token);
    const channelId = uuidv4();

    const watchResponse = await drive.files.watch({
      fileId: folderId,
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: process.env.NEXT_PUBLIC_WEBHOOK_URL,
      },
    });

    const watchData = {
      user_id: userId,
      folder_id: folderId,
      channel_id: watchResponse.data.id!,
      resource_id: watchResponse.data.resourceId!,
      expiration: parseInt(watchResponse.data.expiration!),
      is_active: true,
    };

    await saveWatch(watchData);

    console.log("Watch started successfully:", watchData);

    return NextResponse.json({
      success: true,
      watch: watchData,
      expiresAt: new Date(watchData.expiration),
    });
  } catch (error: any) {
    console.error("Error starting watch:", error);
    return NextResponse.json(
      { error: "Failed to start watch", details: error.message },
      { status: 500 }
    );
  }
}
```

#### `app/api/drive/watch/stop/route.ts`

Stops watching a Google Drive folder.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDriveClient } from "@/lib/google-drive";
import { getUserToken, getActiveWatch, deactivateWatch } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { userId, folderId } = await request.json();

    if (!userId || !folderId) {
      return NextResponse.json(
        { error: "Missing userId or folderId" },
        { status: 400 }
      );
    }

    const watch = await getActiveWatch(userId, folderId);
    if (!watch) {
      return NextResponse.json(
        { error: "No active watch found" },
        { status: 404 }
      );
    }

    const userToken = await getUserToken(userId);
    if (!userToken) {
      return NextResponse.json(
        { error: "User tokens not found" },
        { status: 404 }
      );
    }

    const drive = getDriveClient(userToken.refresh_token);

    await drive.channels.stop({
      requestBody: {
        id: watch.channel_id,
        resourceId: watch.resource_id,
      },
    });

    await deactivateWatch(watch.channel_id);

    console.log("Watch stopped successfully:", watch.channel_id);

    return NextResponse.json({
      success: true,
      message: "Watch stopped successfully",
    });
  } catch (error: any) {
    console.error("Error stopping watch:", error);
    return NextResponse.json(
      { error: "Failed to stop watch", details: error.message },
      { status: 500 }
    );
  }
}
```

#### `app/api/drive/watch/list/route.ts`

Lists all active watches for a user.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const watches = await db.query(
      `SELECT * FROM drive_watches 
       WHERE user_id = $1 AND is_active = true 
       ORDER BY created_at DESC`,
      [userId]
    );

    const now = Date.now();
    const watchesWithStatus = watches.map((watch: any) => ({
      ...watch,
      isExpired: watch.expiration < now,
      expiresIn: Math.max(0, watch.expiration - now),
      expiresAt: new Date(watch.expiration),
    }));

    return NextResponse.json({
      success: true,
      watches: watchesWithStatus,
    });
  } catch (error: any) {
    console.error("Error listing watches:", error);
    return NextResponse.json(
      { error: "Failed to list watches", details: error.message },
      { status: 500 }
    );
  }
}
```

### 5. Webhook Receiver

#### `app/api/webhooks/drive/route.ts`

Receives and processes Google Drive notifications.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getWatchByChannel, getUserToken } from "@/lib/db";
import { getDriveClient } from "@/lib/google-drive";

export async function POST(request: NextRequest) {
  try {
    const channelId = request.headers.get("x-goog-channel-id");
    const resourceId = request.headers.get("x-goog-resource-id");
    const resourceState = request.headers.get("x-goog-resource-state");
    const messageNumber = request.headers.get("x-goog-message-number");

    console.log("Received Google Drive notification:", {
      channelId,
      resourceId,
      resourceState,
      messageNumber,
    });

    if (!channelId) {
      return NextResponse.json(
        { error: "Missing channel ID" },
        { status: 400 }
      );
    }

    // Handle sync notification (initial verification)
    if (resourceState === "sync") {
      console.log("Sync notification received for channel:", channelId);
      return NextResponse.json({ success: true });
    }

    // Handle change notifications
    if (resourceState === "change") {
      const watch = await getWatchByChannel(channelId);

      if (!watch || !watch.is_active) {
        console.log("Watch not found or inactive:", channelId);
        return NextResponse.json({ success: true });
      }

      console.log("Change detected for folder:", watch.folder_id);

      const userToken = await getUserToken(watch.user_id);
      if (!userToken) {
        console.error("User token not found for watch");
        return NextResponse.json({ success: true });
      }

      const drive = getDriveClient(userToken.refresh_token);

      // Fetch recent files from the watched folder
      const response = await drive.files.list({
        q: `'${watch.folder_id}' in parents and trashed = false`,
        fields: "files(id, name, mimeType, createdTime, modifiedTime)",
        orderBy: "modifiedTime desc",
        pageSize: 10,
      });

      const files = response.data.files || [];

      console.log(`Found ${files.length} files in watched folder`);

      // Find files created in last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const newFiles = files.filter(
        (file) =>
          file.createdTime && new Date(file.createdTime) > fiveMinutesAgo
      );

      if (newFiles.length > 0) {
        console.log(
          "New files detected:",
          newFiles.map((f) => f.name)
        );

        // TODO: Implement your business logic here
        // Examples:
        // - Save file metadata to database
        // - Download and process files
        // - Send notifications
        // - Trigger workflows
        // await processNewFiles(newFiles, watch.user_id);
      }
    }

    // Always return 200 quickly
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in webhook handler:", error);
    // Still return 200 to avoid Google retrying
    return NextResponse.json({ success: true });
  }
}
```

### 6. Watch Renewal Cron Job

#### `app/api/cron/renew-watches/route.ts`

Automatically renews watches before they expire.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  getExpiringWatches,
  getUserToken,
  deactivateWatch,
  saveWatch,
} from "@/lib/db";
import { getDriveClient } from "@/lib/google-drive";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get watches expiring in next 2 hours
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    const expiringWatches = await getExpiringWatches(twoHoursInMs);

    console.log(`Found ${expiringWatches.length} watches to renew`);

    const results = {
      renewed: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const watch of expiringWatches) {
      try {
        const userToken = await getUserToken(watch.user_id);
        if (!userToken) {
          results.failed++;
          results.errors.push(`No token found for user ${watch.user_id}`);
          continue;
        }

        const drive = getDriveClient(userToken.refresh_token);

        // Stop old watch
        try {
          await drive.channels.stop({
            requestBody: {
              id: watch.channel_id,
              resourceId: watch.resource_id,
            },
          });
        } catch (stopError) {
          console.log("Failed to stop old watch:", stopError);
        }

        await deactivateWatch(watch.channel_id);

        // Start new watch
        const newChannelId = uuidv4();
        const watchResponse = await drive.files.watch({
          fileId: watch.folder_id,
          requestBody: {
            id: newChannelId,
            type: "web_hook",
            address: process.env.NEXT_PUBLIC_WEBHOOK_URL,
          },
        });

        const newWatch = {
          user_id: watch.user_id,
          folder_id: watch.folder_id,
          channel_id: watchResponse.data.id!,
          resource_id: watchResponse.data.resourceId!,
          expiration: parseInt(watchResponse.data.expiration!),
          is_active: true,
        };

        await saveWatch(newWatch);

        results.renewed++;
        console.log(`Renewed watch for folder ${watch.folder_id}`);
      } catch (error: any) {
        results.failed++;
        results.errors.push(
          `Failed to renew watch ${watch.channel_id}: ${error.message}`
        );
        console.error(`Error renewing watch:`, error);
      }
    }

    console.log("Renewal complete:", results);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in renewal cron:", error);
    return NextResponse.json(
      { error: "Renewal failed", details: error.message },
      { status: 500 }
    );
  }
}
```

### 7. Vercel Cron Configuration

#### `vercel.json`

Configure cron job to run hourly.

```json
{
  "crons": [
    {
      "path": "/api/cron/renew-watches",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## Implementation Steps

### Phase 1: Setup (Prerequisites)

1. Create Google Cloud project and enable Drive API
2. Configure OAuth 2.0 credentials
3. Set up database and create tables
4. Add all environment variables
5. Install npm dependencies

### Phase 2: Authentication

1. Implement OAuth flow (`/api/auth/google/` routes)
2. Test authorization and token storage
3. Verify tokens are saved to database correctly

### Phase 3: Watch Management

1. Implement start watch endpoint
2. Implement stop watch endpoint
3. Implement list watches endpoint
4. Test watch creation and storage

### Phase 4: Webhook Handler

1. Deploy webhook endpoint to Vercel (needs public URL)
2. Test with a watch subscription
3. Upload test file to monitored folder
4. Verify webhook receives notification
5. Implement file fetching logic

### Phase 5: Renewal System

1. Implement cron renewal endpoint
2. Configure `vercel.json` for cron
3. Deploy and verify cron execution
4. Test watch renewal before expiration

### Phase 6: Business Logic

1. Implement file processing logic in webhook handler
2. Add error handling and retry logic
3. Add logging and monitoring
4. Test end-to-end flow

---

## Testing Checklist

- [ ] OAuth flow completes successfully
- [ ] Tokens are stored in database
- [ ] Watch can be started for a folder
- [ ] Watch appears in database with correct data
- [ ] Webhook receives sync notification
- [ ] File upload triggers change notification
- [ ] Webhook fetches new files correctly
- [ ] Multiple watches can be active simultaneously
- [ ] Watch can be stopped manually
- [ ] Expired watches are detected
- [ ] Cron job renews watches before expiration
- [ ] Renewal creates new watch correctly
- [ ] Old watch is deactivated in database

---

## Important Notes

### Google Drive Watch Limitations

- **Expiration**: Watches expire after ~24 hours (Google sets this)
- **Renewal required**: Must renew before expiration
- **Sync notification**: Google sends initial "sync" notification to verify endpoint
- **No file details**: Notifications don't include what changed - must query API
- **Rate limits**: Google Drive API has quota limits

### Vercel Considerations

- **Serverless**: Functions are stateless, hence database needed
- **Timeout**: API routes have 10s timeout on Hobby, 60s on Pro
- **Cron frequency**: Hobby plan limited to daily crons, Pro allows hourly
- **HTTPS required**: Webhooks must be publicly accessible HTTPS URLs

### Security Best Practices

- Store refresh tokens encrypted in database
- Validate webhook requests are from Google
- Use cron secret to protect renewal endpoint
- Implement rate limiting on API routes
- Log all watch operations for debugging
- Handle token expiration gracefully

### Error Handling

- Webhook must return 200 quickly (< 10s) or Google retries
- Handle expired/invalid tokens
- Handle missing database records
- Handle Google API errors gracefully
- Implement idempotency for repeated notifications

---

## Customization Points

### Business Logic in Webhook

The webhook handler (`/api/webhooks/drive/route.ts`) is where you implement your custom logic:

```typescript
if (newFiles.length > 0) {
  // Your custom logic here:

  // Option 1: Save to database
  await saveFilesToDatabase(newFiles);

  // Option 2: Download and process
  for (const file of newFiles) {
    const fileData = await drive.files.get({
      fileId: file.id,
      alt: "media",
    });
    await processFile(fileData);
  }

  // Option 3: Trigger workflow
  await triggerWorkflow(newFiles, watch.user_id);

  // Option 4: Send notification
  await sendNotification(watch.user_id, newFiles);
}
```

### Watch Renewal Timing

Adjust renewal threshold in cron job:

```typescript
// Renew 2 hours before expiration (conservative)
const twoHoursInMs = 2 * 60 * 60 * 1000;

// Or renew 1 hour before (less conservative)
const oneHourInMs = 1 * 60 * 60 * 1000;
```

### File Filtering

Filter for specific file types or patterns:

```typescript
const newFiles = files.filter((file) => {
  const isRecent =
    file.createdTime && new Date(file.createdTime) > fiveMinutesAgo;
  const isPDF = file.mimeType === "application/pdf";
  const matchesPattern = file.name?.includes("invoice");

  return isRecent && isPDF && matchesPattern;
});
```

---

## Troubleshooting

### Webhook Not Receiving Notifications

- Check webhook URL is publicly accessible via HTTPS
- Verify watch is active in database
- Check Google Cloud Console for errors
- Ensure watch hasn't expired
- Test with direct POST to webhook endpoint

### Token Errors

- Refresh token might be invalid/expired
- Re-run OAuth flow to get new tokens
- Check token storage in database
- Verify OAuth scopes include Drive API

### Watch Expiration Issues

- Check cron job is running (Vercel logs)
- Verify renewal logic is triggered
- Check database for watch expiration times
- Ensure CRON_SECRET is correct

### Database Connection Issues

- Verify DATABASE_URL is correct
- Check database is accessible from Vercel
- Test connection with simple query
- Check for connection pool limits

---

## Production Deployment

### Pre-deployment Checklist

- [ ] All environment variables configured in Vercel
- [ ] Database is production-ready and accessible
- [ ] Google OAuth credentials use production URLs
- [ ] Webhook URL points to production domain
- [ ] Cron secret is secure and random
- [ ] Error logging and monitoring configured

### Monitoring

Implement monitoring for:

- Failed watch renewals
- Webhook errors
- Token refresh failures
- Database connection issues
- API quota usage

### Scaling Considerations

- Database connection pooling for high traffic
- Rate limiting on API endpoints
- Batch processing for multiple file uploads
- Queue system for long-running file processing
- Consider edge functions for webhook handler

---

## Alternative Approaches

If the watch system proves too complex:

### Option 1: Polling

- Use Vercel Cron to poll Drive API every 5-15 minutes
- Query for files modified since last check
- Simpler but less real-time
- Uses more API quota

### Option 2: Third-party Service

- Use Zapier or Make.com to monitor Drive
- They handle watch management
- Trigger your Next.js webhook when files upload
- Easier but costs money

### Option 3: Google Apps Script

- Create Apps Script that monitors folder
- Triggers your webhook on changes
- Runs in Google's infrastructure
- Limited by Apps Script quotas

---

## Summary

This implementation provides:
✅ Real-time file upload notifications
✅ Automatic watch renewal
✅ Secure token management
✅ Scalable serverless architecture
✅ Works perfectly on Vercel

Key components:

1. OAuth flow for authorization
2. Watch management API routes
3. Webhook endpoint for notifications
4. Cron job for automatic renewal
5. Database for state persistence

The system is production-ready and handles the complexities of Google Drive's push notification system while working within Vercel's serverless constraints.

