// No-op mock for `server-only` package in Vitest
// The real package throws when imported outside React Server Components,
// which breaks unit tests that transitively import server modules.
export {};
