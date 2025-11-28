import { drizzle } from "drizzle-orm/node-postgres";
import { seed } from "drizzle-seed";
import { organizations, users } from "./schema/auth";

async function main() {
  const db = drizzle(process.env.DATABASE_URL!);
  await seed(db, { user: users, organization: organizations });
}
main();

