import type { ChunkingOptions } from "@/server/services/types/document-processing.types";

/**
 * SemanticChunker
 *
 * Handles recursive character-based chunking with semantic awareness.
 * Splits text using hierarchical separators (paragraphs, lines, sentences, words)
 * and applies configurable overlap between chunks.
 *
 * Ported from DocumentService.SemanticChunker to a standalone module.
 */
export class SemanticChunker {
  /**
   * Chunk text using recursive character splitting with semantic awareness
   */
  static async chunk(
    text: string,
    options: ChunkingOptions,
  ): Promise<string[]> {
    const separators = this.getSeparators(options);
    return this.recursiveSplit(text, separators, options);
  }

  /**
   * Get separators based on chunking options
   */
  private static getSeparators(options: ChunkingOptions): string[] {
    const separators = ["\n\n", "\n", ". ", " ", ""];

    if (options.respectParagraphBoundaries) {
      return ["\n\n\n", "\n\n", ...separators];
    }

    return separators;
  }

  /**
   * Recursively split text using separators
   */
  private static recursiveSplit(
    text: string,
    separators: string[],
    options: ChunkingOptions,
  ): string[] {
    const chunks: string[] = [];
    const separator = separators[0];

    if (!separator) {
      return this.splitByCharacter(
        text,
        options.chunkSize,
        options.chunkOverlap,
      );
    }

    const splits = text.split(separator);
    let currentChunk = "";

    for (const split of splits) {
      const potentialChunk = currentChunk
        ? currentChunk + separator + split
        : split;

      if (potentialChunk.length <= options.chunkSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        if (split.length > options.chunkSize) {
          const subChunks = this.recursiveSplit(
            split,
            separators.slice(1),
            options,
          );
          chunks.push(...subChunks);
          currentChunk = "";
        } else {
          currentChunk = split;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return this.applyOverlap(chunks, options.chunkOverlap, options.chunkSize);
  }

  /**
   * Apply overlap between chunks
   * Overlap is prepended from the previous chunk, but the final chunk length
   * is clamped to chunkSize to ensure no chunk exceeds the configured limit.
   */
  private static applyOverlap(
    chunks: string[],
    overlap: number,
    chunkSize: number,
  ): string[] {
    if (overlap === 0 || chunks.length === 0) {
      return chunks;
    }

    const overlappedChunks: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i] ?? "";

      if (i > 0) {
        const prevChunk = chunks[i - 1] ?? "";
        const overlapText = prevChunk.slice(-overlap);
        chunk = overlapText + chunk;
        // Clamp to chunkSize after applying overlap to prevent exceeding the limit
        chunk = chunk.slice(0, chunkSize);
      }

      overlappedChunks.push(chunk);
    }

    return overlappedChunks;
  }

  /**
   * Split text by character as fallback
   */
  private static splitByCharacter(
    text: string,
    chunkSize: number,
    overlap: number,
  ): string[] {
    const chunks: string[] = [];

    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    return chunks.length > 0 ? chunks : [text];
  }
}
