export interface AuditContext {
  setResourceId(id: string): void;
  setMetadata(metadata: Record<string, unknown>): void;
}

export class AuditContextImpl implements AuditContext {
  resourceId: string | null = null;
  metadata: Record<string, unknown> | null = null;

  setResourceId(id: string): void {
    this.resourceId = id;
  }

  setMetadata(metadata: Record<string, unknown>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }
}
