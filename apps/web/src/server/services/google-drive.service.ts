import { randomUUID } from "crypto";
import { google } from "googleapis";
import { err, ok } from "neverthrow";
import { createGoogleOAuthClient } from "../../features/integrations/google/lib/google-oauth";
import { logger } from "../../lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { GoogleOAuthService } from "./google-oauth.service";

/**
 * Google Drive Service
 * Manages Google Drive API interactions for folder monitoring
 */
export class GoogleDriveService {
  /**
   * Get authenticated Drive client for a user
   */
  static async getDriveClient(
    userId: string
  ): Promise<ActionResult<ReturnType<typeof google.drive>>> {
    try {
      const tokenResult = await GoogleOAuthService.getValidAccessToken(userId);

      if (tokenResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get valid access token",
            tokenResult.error,
            "GoogleDriveService.getDriveClient"
          )
        );
      }

      const accessToken = tokenResult.value;
      const oauth2Client = createGoogleOAuthClient();
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const drive = google.drive({ version: "v3", auth: oauth2Client });
      return ok(drive);
    } catch (error) {
      logger.error("Failed to create Drive client", { userId }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to create Drive client",
          error as Error,
          "GoogleDriveService.getDriveClient"
        )
      );
    }
  }

  /**
   * Start watching a Drive folder
   * Creates a watch subscription via Drive API
   */
  static async startWatch(
    userId: string,
    folderId: string,
    webhookUrl: string
  ): Promise<
    ActionResult<{
      channelId: string;
      resourceId: string;
      expiration: number;
    }>
  > {
    try {
      const driveResult = await this.getDriveClient(userId);

      if (driveResult.isErr()) {
        return err(driveResult.error);
      }

      const drive = driveResult.value;
      const channelId = randomUUID();

      logger.info("Creating Drive watch subscription", {
        component: "GoogleDriveService.startWatch",
        userId,
        folderId,
        generatedChannelId: channelId,
        webhookUrl,
      });

      const watchResponse = await drive.files.watch({
        fileId: folderId,
        requestBody: {
          id: channelId,
          type: "web_hook",
          address: webhookUrl,
        },
      });

      if (
        !watchResponse.data.id ||
        !watchResponse.data.resourceId ||
        !watchResponse.data.expiration
      ) {
        return err(
          ActionErrors.internal(
            "Invalid watch response from Google Drive API",
            undefined,
            "GoogleDriveService.startWatch"
          )
        );
      }

      const returnedChannelId = watchResponse.data.id;

      // Verify Google returned the same channelId we sent
      if (returnedChannelId !== channelId) {
        logger.warn("Channel ID mismatch between sent and returned", {
          component: "GoogleDriveService.startWatch",
          userId,
          folderId,
          sentChannelId: channelId,
          returnedChannelId,
        });
      }

      logger.info("Started Drive watch", {
        component: "GoogleDriveService.startWatch",
        userId,
        folderId,
        channelId: returnedChannelId,
        resourceId: watchResponse.data.resourceId,
        expiration: watchResponse.data.expiration,
        webhookUrl,
      });

      return ok({
        channelId: returnedChannelId,
        resourceId: watchResponse.data.resourceId,
        expiration: parseInt(watchResponse.data.expiration),
      });
    } catch (error) {
      logger.error(
        "Failed to start Drive watch",
        { userId, folderId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to start Drive watch",
          error as Error,
          "GoogleDriveService.startWatch"
        )
      );
    }
  }

  /**
   * Stop watching a Drive folder
   * Stops a watch subscription via Drive API
   */
  static async stopWatch(
    userId: string,
    channelId: string,
    resourceId: string
  ): Promise<ActionResult<boolean>> {
    try {
      const driveResult = await this.getDriveClient(userId);

      if (driveResult.isErr()) {
        return err(driveResult.error);
      }

      const drive = driveResult.value;

      await drive.channels.stop({
        requestBody: {
          id: channelId,
          resourceId,
        },
      });

      logger.info("Stopped Drive watch", { userId, channelId });
      return ok(true);
    } catch (error) {
      logger.error(
        "Failed to stop Drive watch",
        { userId, channelId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to stop Drive watch",
          error as Error,
          "GoogleDriveService.stopWatch"
        )
      );
    }
  }

  /**
   * Get files from a Drive folder
   * Fetches files with metadata from the specified folder
   */
  static async getFolderFiles(
    userId: string,
    folderId: string,
    options?: {
      pageSize?: number;
      orderBy?: string;
      fields?: string;
    }
  ): Promise<
    ActionResult<
      Array<{
        id: string;
        name: string;
        mimeType: string;
        createdTime?: string;
        modifiedTime?: string;
        size?: string;
      }>
    >
  > {
    try {
      const driveResult = await this.getDriveClient(userId);

      if (driveResult.isErr()) {
        return err(driveResult.error);
      }

      const drive = driveResult.value;

      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields:
          options?.fields ??
          "files(id, name, mimeType, createdTime, modifiedTime, size)",
        orderBy: options?.orderBy ?? "modifiedTime desc",
        pageSize: options?.pageSize ?? 100,
      });

      const files =
        response.data.files?.map((file) => ({
          id: file.id!,
          name: file.name!,
          mimeType: file.mimeType!,
          createdTime: file.createdTime ?? undefined,
          modifiedTime: file.modifiedTime ?? undefined,
          size: file.size ?? undefined,
        })) ?? [];

      logger.info("Fetched Drive folder files", {
        userId,
        folderId,
        fileCount: files.length,
      });

      return ok(files);
    } catch (error) {
      logger.error(
        "Failed to get Drive folder files",
        { userId, folderId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get Drive folder files",
          error as Error,
          "GoogleDriveService.getFolderFiles"
        )
      );
    }
  }

  /**
   * Download a file from Drive
   * Returns file buffer
   */
  static async downloadFile(
    userId: string,
    fileId: string
  ): Promise<ActionResult<Buffer>> {
    try {
      const driveResult = await this.getDriveClient(userId);

      if (driveResult.isErr()) {
        return err(driveResult.error);
      }

      const drive = driveResult.value;

      const response = await drive.files.get(
        {
          fileId,
          alt: "media",
        },
        {
          responseType: "arraybuffer",
        }
      );

      const buffer = Buffer.from(response.data as ArrayBuffer);

      logger.info("Downloaded Drive file", {
        userId,
        fileId,
        size: buffer.length,
      });
      return ok(buffer);
    } catch (error) {
      logger.error(
        "Failed to download Drive file",
        { userId, fileId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to download Drive file",
          error as Error,
          "GoogleDriveService.downloadFile"
        )
      );
    }
  }

  /**
   * Get file metadata from Drive
   */
  static async getFileMetadata(
    userId: string,
    fileId: string
  ): Promise<
    ActionResult<{
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      createdTime?: string;
      modifiedTime?: string;
    }>
  > {
    try {
      const driveResult = await this.getDriveClient(userId);

      if (driveResult.isErr()) {
        return err(driveResult.error);
      }

      const drive = driveResult.value;

      const response = await drive.files.get({
        fileId,
        fields: "id, name, mimeType, size, createdTime, modifiedTime",
      });

      if (!response.data.id || !response.data.name || !response.data.mimeType) {
        return err(
          ActionErrors.internal(
            "Invalid file metadata response from Google Drive API",
            undefined,
            "GoogleDriveService.getFileMetadata"
          )
        );
      }

      return ok({
        id: response.data.id,
        name: response.data.name,
        mimeType: response.data.mimeType,
        size: response.data.size ?? undefined,
        createdTime: response.data.createdTime ?? undefined,
        modifiedTime: response.data.modifiedTime ?? undefined,
      });
    } catch (error) {
      logger.error(
        "Failed to get Drive file metadata",
        { userId, fileId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get Drive file metadata",
          error as Error,
          "GoogleDriveService.getFileMetadata"
        )
      );
    }
  }
}

