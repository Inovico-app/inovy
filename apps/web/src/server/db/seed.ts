import { drizzle } from "drizzle-orm/node-postgres";
import { seed } from "drizzle-seed";
import { organization, user } from "./schema/auth";

async function main() {
  const db = drizzle(process.env.DATABASE_URL!);
  await seed(db, { user: user, organization: organization });
}
main();

