import type { PermissionSubject, PermissionContext } from "../types";

export interface ScopeResolver {
  readonly scope: string;
  resolve(
    subject: PermissionSubject,
    context: PermissionContext,
  ): Promise<boolean>;
}

export class ScopeResolverRegistry {
  private resolvers = new Map<string, ScopeResolver>();

  register(resolver: ScopeResolver): void {
    this.resolvers.set(resolver.scope, resolver);
  }

  get(scope: string): ScopeResolver | undefined {
    return this.resolvers.get(scope);
  }

  has(scope: string): boolean {
    return this.resolvers.has(scope);
  }
}
