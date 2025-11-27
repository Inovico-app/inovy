import { logger } from "@/lib/logger";
import { err, ok, type Result } from "neverthrow";
import { ProjectQueries } from "../data-access/projects.queries";

export async function checkProjectNameUnique(
  name: string
): Promise<Result<boolean, string>> {
  try {
    const existing = await ProjectQueries.findByName(name);
    return ok(!existing);
  } catch (error) {
    const errorMessage = "Failed to check project name uniqueness";
    logger.error(
      errorMessage,
      {
        name,
      },
      error as Error
    );
    return err(errorMessage);
  }
}

