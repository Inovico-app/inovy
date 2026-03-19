/**
 * Client-side Azure Block Blob uploader using raw fetch().
 *
 * Stages individual audio chunks as blocks and commits the full block list
 * once the recording is finalized. Uses SAS tokens for authentication so
 * no Azure SDK is required on the client.
 */
export class AzureBlockUploader {
  private sasUrl: string | null = null;

  /**
   * Store the full SAS URL (blob URL + query params).
   */
  initialize(sasUrl: string): void {
    this.sasUrl = sasUrl;
  }

  /**
   * PUT a single block to Azure Blob Storage.
   *
   * @param blockId - A padded string identifier (e.g. "block-000001").
   *                  Will be base64-encoded for the Azure API.
   * @param data    - The audio chunk as a Blob.
   */
  stageBlock(blockId: string, data: Blob): Promise<void> {
    const url = this.buildUrl();
    const encodedBlockId = encodeURIComponent(btoa(blockId));

    return fetch(`${url}&comp=block&blockid=${encodedBlockId}`, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
      },
      body: data,
    }).then((response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to stage block ${blockId}: ${response.status} ${response.statusText}`,
        );
      }
    });
  }

  /**
   * Commit a list of previously staged blocks, finalizing the blob.
   *
   * @param blockIds - Ordered list of block IDs (plain strings, will be base64-encoded).
   */
  commitBlockList(blockIds: string[]): Promise<void> {
    const url = this.buildUrl();

    const latestEntries = blockIds
      .map((id) => `    <Latest>${btoa(id)}</Latest>`)
      .join("\n");

    const xml = [
      '<?xml version="1.0" encoding="utf-8"?>',
      "<BlockList>",
      latestEntries,
      "</BlockList>",
    ].join("\n");

    return fetch(`${url}&comp=blocklist`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/xml",
      },
      body: xml,
    }).then((response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to commit block list: ${response.status} ${response.statusText}`,
        );
      }
    });
  }

  /**
   * Replace the stored SAS URL (e.g. after token refresh).
   */
  refreshSasToken(newSasUrl: string): void {
    this.sasUrl = newSasUrl;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildUrl(): string {
    if (!this.sasUrl) {
      throw new Error(
        "AzureBlockUploader has not been initialized. Call initialize() first.",
      );
    }
    return this.sasUrl;
  }
}
