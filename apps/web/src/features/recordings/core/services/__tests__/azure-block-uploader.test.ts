import { AzureBlockUploader } from "../chunk-persistence/azure-block-uploader";

describe("AzureBlockUploader", () => {
  let uploader: AzureBlockUploader;
  const baseBlobUrl =
    "https://account.blob.core.windows.net/container/test.webm";
  const sasToken = "sv=2024-01-01&sig=test";

  beforeEach(() => {
    uploader = new AzureBlockUploader();
    uploader.initialize(`${baseBlobUrl}?${sasToken}`);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 201 })),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stages a block with correct URL and headers", async () => {
    await uploader.stageBlock("block-000001", new Blob(["audio"]));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("comp=block"),
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("stages a block with base64-encoded block ID in URL", async () => {
    await uploader.stageBlock("block-000001", new Blob(["audio"]));

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    const expectedBlockId = btoa("block-000001");
    expect(url).toContain(`blockid=${encodeURIComponent(expectedBlockId)}`);
  });

  it("stages a block with x-ms-blob-type header", async () => {
    await uploader.stageBlock("block-000001", new Blob(["audio"]));

    const options = vi.mocked(fetch).mock.calls[0][1];
    expect(options?.headers).toEqual(
      expect.objectContaining({ "x-ms-blob-type": "BlockBlob" }),
    );
  });

  it("throws when stageBlock response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
    );

    await expect(
      uploader.stageBlock("block-000001", new Blob(["audio"])),
    ).rejects.toThrow();
  });

  it("commits block list with XML body", async () => {
    await uploader.commitBlockList(["block-000001", "block-000002"]);

    const call = vi
      .mocked(fetch)
      .mock.calls.find((c) => (c[0] as string).includes("comp=blocklist"));
    expect(call).toBeDefined();
    const body = call![1]?.body as string;
    expect(body).toContain("<Latest>");
  });

  it("commits block list with base64-encoded block IDs in XML", async () => {
    await uploader.commitBlockList(["block-000001", "block-000002"]);

    const call = vi
      .mocked(fetch)
      .mock.calls.find((c) => (c[0] as string).includes("comp=blocklist"));
    const body = call![1]?.body as string;
    expect(body).toContain(`<Latest>${btoa("block-000001")}</Latest>`);
    expect(body).toContain(`<Latest>${btoa("block-000002")}</Latest>`);
  });

  it("commits block list with application/xml content-type", async () => {
    await uploader.commitBlockList(["block-000001"]);

    const call = vi
      .mocked(fetch)
      .mock.calls.find((c) => (c[0] as string).includes("comp=blocklist"));
    const headers = call![1]?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/xml");
  });

  it("throws when commitBlockList response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
    );

    await expect(uploader.commitBlockList(["block-000001"])).rejects.toThrow();
  });

  it("refreshes SAS token for subsequent requests", async () => {
    const newSas = "sv=2024-02-01&sig=new";
    uploader.refreshSasToken(`${baseBlobUrl}?${newSas}`);

    await uploader.stageBlock("block-000001", new Blob(["audio"]));

    expect(vi.mocked(fetch).mock.calls[0][0]).toContain(newSas);
  });

  it("preserves blob URL when refreshing SAS token", async () => {
    const newSas = "sv=2024-02-01&sig=new";
    uploader.refreshSasToken(`${baseBlobUrl}?${newSas}`);

    await uploader.stageBlock("block-000001", new Blob(["audio"]));

    expect(vi.mocked(fetch).mock.calls[0][0]).toContain(baseBlobUrl);
  });

  it("throws when used before initialize", () => {
    const uninitializedUploader = new AzureBlockUploader();

    expect(() =>
      uninitializedUploader.stageBlock("block-000001", new Blob(["audio"])),
    ).toThrow();
  });
});
