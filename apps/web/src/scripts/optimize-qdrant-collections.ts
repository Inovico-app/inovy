/**
 * Script to optimize existing Qdrant collections
 *
 * This script:
 * 1. Checks current collection configuration
 * 2. Applies optimizations (quantization, on-disk payload, optimizer config)
 * 3. Triggers collection optimization (vacuum and segment merging)
 * 4. Logs optimization progress and results
 *
 * Usage:
 *   From apps/web directory:
 *     pnpm tsx src/scripts/optimize-qdrant-collections.ts [--collection=<name>] [--dry-run] [--wait]
 *
 *   Or use the npm script:
 *     pnpm run optimize-qdrant [--collection=<name>] [--dry-run] [--wait]
 *
 * Options:
 *   --collection=<name>  Target collection name (default: knowledge_base)
 *   --dry-run           Show what would be done without making changes
 *   --wait              Wait for optimization to complete before exiting
 */

import { logger } from "../lib/logger";
import { QdrantClientService } from "../server/services/rag/qdrant.service";
import type { CollectionUpdateOptions } from "../server/services/rag/types";

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: {
    collectionName?: string;
    dryRun: boolean;
    wait: boolean;
  } = {
    dryRun: false,
    wait: false,
  };

  for (const arg of args) {
    if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--wait") {
      parsed.wait = true;
    } else if (arg.startsWith("--collection=")) {
      parsed.collectionName = arg.split("=")[1];
    }
  }

  return parsed;
}

async function checkCollectionConfiguration(
  qdrantService: QdrantClientService,
  collectionName: string
) {
  try {
    // Access the internal client to get collection info
    // This is acceptable for a migration script
    const client = (
      qdrantService as unknown as {
        client: {
          getCollection: (name: string) => Promise<{
            config: {
              params: {
                vectors: unknown;
                quantization_config?: unknown;
                on_disk_payload?: boolean;
                optimizers_config?: unknown;
                hnsw_config?: unknown;
              };
            };
            points_count: number;
            segments_count: number;
            indexed_vectors_count: number;
          }>;
        };
      }
    ).client;

    const collection = await client.getCollection(collectionName);

    logger.info("Current collection configuration", {
      collectionName,
      config: {
        vectors: collection.config.params.vectors,
        quantization: collection.config.params.quantization_config,
        on_disk_payload: collection.config.params.on_disk_payload,
        optimizer: collection.config.params.optimizers_config,
        hnsw: collection.config.params.hnsw_config,
      },
      stats: {
        points: collection.points_count,
        segments: collection.segments_count,
        indexed: collection.indexed_vectors_count,
      },
    });

    return collection;
  } catch (error) {
    logger.error("Failed to get collection configuration", {
      collectionName,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function optimizeCollection(
  qdrantService: QdrantClientService,
  collectionName: string,
  dryRun: boolean,
  wait: boolean
) {
  logger.info("Starting Qdrant collection optimization", {
    collectionName,
    dryRun,
    wait,
  });

  // Check current configuration
  const currentConfig = await checkCollectionConfiguration(
    qdrantService,
    collectionName
  );

  const config = currentConfig as {
    config: {
      params: {
        quantization_config?: unknown;
        on_disk_payload?: boolean;
        optimizers_config?: unknown;
      };
    };
    points_count: number;
    segments_count: number;
    indexed_vectors_count: number;
  };

  // Determine what optimizations are needed
  const needsQuantization = !config.config.params.quantization_config;
  const needsOnDiskPayload = config.config.params.on_disk_payload !== true;
  const needsOptimizerConfig = !config.config.params.optimizers_config;

  const optimizationsNeeded: string[] = [];
  if (needsQuantization) optimizationsNeeded.push("quantization");
  if (needsOnDiskPayload) optimizationsNeeded.push("on_disk_payload");
  if (needsOptimizerConfig) optimizationsNeeded.push("optimizer_config");

  if (optimizationsNeeded.length === 0) {
    logger.info("Collection is already optimized", {
      collectionName,
    });
  } else {
    logger.info("Optimizations needed", {
      collectionName,
      optimizations: optimizationsNeeded,
    });

    if (dryRun) {
      logger.info("DRY RUN: Would apply optimizations", {
        collectionName,
        optimizations: optimizationsNeeded,
      });
      return;
    }

    // Prepare update options
    const updateOptions: CollectionUpdateOptions = {};

    if (needsQuantization) {
      updateOptions.quantization_config = {
        scalar: {
          type: "int8",
          always_ram: true,
        },
      };
      logger.info("Will enable scalar quantization (int8)", {
        collectionName,
      });
    }

    if (needsOnDiskPayload) {
      updateOptions.on_disk_payload = true;
      logger.info("Will enable on-disk payload storage", {
        collectionName,
      });
    }

    if (needsOptimizerConfig) {
      updateOptions.optimizers_config = {
        default_segment_number: 2,
        max_segment_size: 100000,
        memmap_threshold: 50000,
        indexing_threshold: 20000,
      };
      logger.info("Will configure optimizer settings", {
        collectionName,
      });
    }

    // Apply optimizations
    const updateResult = await qdrantService.updateCollection(
      updateOptions,
      collectionName
    );

    if (updateResult.isErr()) {
      logger.error("Failed to update collection configuration", {
        collectionName,
        error: updateResult.error,
      });
      process.exit(1);
    }

    logger.info("Collection configuration updated successfully", {
      collectionName,
      optimizations: optimizationsNeeded,
    });

    // Note: Enabling quantization on existing collections may require reindexing
    if (needsQuantization) {
      logger.warn(
        "Quantization enabled. Collection may need reindexing for full effect.",
        {
          collectionName,
          note: "Consider running a full optimization cycle",
        }
      );
    }
  }

  // Trigger optimization (vacuum and segment merging)
  if (!dryRun) {
    logger.info("Triggering collection optimization", {
      collectionName,
      wait,
    });

    const optimizeResult = await qdrantService.optimizeCollection(
      collectionName,
      { wait }
    );

    if (optimizeResult.isErr()) {
      logger.error("Failed to optimize collection", {
        collectionName,
        error: optimizeResult.error,
      });
      process.exit(1);
    }

    const status = optimizeResult.value;
    logger.info("Collection optimization completed", {
      collectionName,
      optimized: status.optimized,
      optimizing: status.optimizing,
      segments: status.segments_count,
      points: status.points_count,
      indexed: status.indexed_points_count,
    });
  } else {
    logger.info("DRY RUN: Would trigger collection optimization", {
      collectionName,
    });
  }
}

async function main() {
  const args = parseArgs();
  const collectionName = args.collectionName ?? "knowledge_base";

  logger.info("Qdrant Collection Optimization Script", {
    collectionName,
    dryRun: args.dryRun,
    wait: args.wait,
  });

  try {
    const qdrantService = QdrantClientService.getInstance();

    // Health check
    const healthResult = await qdrantService.healthCheck();
    if (healthResult.isErr()) {
      logger.error("Qdrant health check failed", {
        error: healthResult.error.message,
      });
      process.exit(1);
    }

    if (!healthResult.value.healthy) {
      logger.error("Qdrant health check failed", {
        error: healthResult.value.message,
      });
      process.exit(1);
    }

    logger.info("Qdrant connection healthy");

    // Optimize collection
    await optimizeCollection(
      qdrantService,
      collectionName,
      args.dryRun,
      args.wait
    );

    logger.info("Optimization script completed successfully", {
      collectionName,
    });
  } catch (error) {
    logger.error("Optimization script failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Unhandled error in optimization script", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});

