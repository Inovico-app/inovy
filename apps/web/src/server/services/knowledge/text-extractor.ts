import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import mammoth from "mammoth";
import { err, ok } from "neverthrow";
import pdfParse from "pdf-parse";

/**
 * TextExtractor
 *
 * Extracts raw text from various file formats (text, PDF, DOCX)
 * and provides text cleaning/normalization utilities.
 *
 * Ported from DocumentService.Processor to a standalone module.
 */
export class TextExtractor {
  /**
   * Extract text from file based on file type
   */
  static async extractText(
    file: File | { url: string; type: string; name: string },
  ): Promise<ActionResult<string>> {
    try {
      const fileType = file.type.toLowerCase();

      if (fileType === "text/plain" || fileType === "text/markdown") {
        return await this.extractFromText(file);
      } else if (fileType === "application/pdf") {
        return await this.extractFromPDF(file);
      } else if (
        fileType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        fileType === "application/msword"
      ) {
        return await this.extractFromDocx(file);
      } else {
        return err(
          ActionErrors.badRequest(
            `Unsupported file type: ${fileType}`,
            "TextExtractor.extractText",
          ),
        );
      }
    } catch (error) {
      logger.error("Failed to extract text from file", {
        component: "TextExtractor",
        fileType: file.type,
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Failed to extract text from file",
          error as Error,
          "TextExtractor.extractText",
        ),
      );
    }
  }

  /**
   * Clean and normalize text
   */
  static cleanText(text: string): string {
    return text
      .replace(/\n{3,}/g, "\n\n") // Normalize excessive line breaks first
      .replace(/[^\S\n]+/g, " ") // Collapse spaces/tabs but preserve newlines
      .trim();
  }

  /**
   * Extract text from TXT/MD files
   */
  private static async extractFromText(
    file: File | { url: string; type: string; name: string },
  ): Promise<ActionResult<string>> {
    try {
      if (file instanceof File) {
        return ok(await file.text());
      } else {
        const response = await fetch(file.url);
        if (!response.ok) {
          return err(
            ActionErrors.internal(
              `Failed to fetch document: ${response.statusText}`,
              "TextExtractor.extractFromText",
            ),
          );
        }
        return ok(await response.text());
      }
    } catch (error) {
      return err(
        ActionErrors.internal(
          "Failed to extract text from file",
          error as Error,
          "TextExtractor.extractFromText",
        ),
      );
    }
  }

  /**
   * Extract text from PDF files
   */
  private static async extractFromPDF(
    file: File | { url: string; type: string; name: string },
  ): Promise<ActionResult<string>> {
    try {
      let buffer: Buffer;

      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        const response = await fetch(file.url);
        if (!response.ok) {
          return err(
            ActionErrors.internal(
              `Failed to fetch PDF: ${response.statusText}`,
              "TextExtractor.extractFromPDF",
            ),
          );
        }
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }

      const data = await pdfParse(buffer);
      return ok(data.text);
    } catch (error) {
      logger.error("Failed to parse PDF", {
        component: "TextExtractor",
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Failed to extract text from PDF",
          error as Error,
          "TextExtractor.extractFromPDF",
        ),
      );
    }
  }

  /**
   * Extract text from DOCX files
   */
  private static async extractFromDocx(
    file: File | { url: string; type: string; name: string },
  ): Promise<ActionResult<string>> {
    try {
      let buffer: Buffer;

      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        const response = await fetch(file.url);
        if (!response.ok) {
          return err(
            ActionErrors.internal(
              `Failed to fetch DOCX: ${response.statusText}`,
              "TextExtractor.extractFromDocx",
            ),
          );
        }
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }

      const result = await mammoth.extractRawText({ buffer });
      return ok(result.value);
    } catch (error) {
      logger.error("Failed to parse DOCX", {
        component: "TextExtractor",
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Failed to extract text from DOCX",
          error as Error,
          "TextExtractor.extractFromDocx",
        ),
      );
    }
  }
}
