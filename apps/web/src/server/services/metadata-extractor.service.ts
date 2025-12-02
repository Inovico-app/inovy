import { logger } from "@/lib/logger";
import pdfParse from "pdf-parse";
import type { DocumentMetadata } from "./types/document-processing.types";

/**
 * Metadata Extractor Service
 *
 * Extracts comprehensive metadata from files and content including:
 * - File metadata: filename, fileType, fileSize, uploadDate
 * - PDF metadata: title, author, pageCount
 * - Content metadata: title, author, date, language, headings, sections, wordCount
 */
export class MetadataExtractor {
  /**
   * Extract comprehensive metadata from file and text content
   */
  static async extract(
    file: File | { url: string; type: string; name: string },
    text: string,
    existingMetadata: DocumentMetadata = {}
  ): Promise<DocumentMetadata> {
    const metadata: DocumentMetadata = {
      filename: file.name,
      fileType: file.type,
      uploadDate: new Date().toISOString(),
      ...existingMetadata,
    };

    // Extract file size if available
    if (file instanceof File) {
      metadata.fileSize = file.size;
    }

    // Extract PDF-specific metadata
    if (file.type === "application/pdf") {
      const pdfMetadata = await this.extractPDFMetadata(file);
      if (pdfMetadata.title) {
        metadata.title = pdfMetadata.title;
      }
      if (pdfMetadata.author) {
        metadata.author = pdfMetadata.author;
      }
      if (pdfMetadata.pageCount) {
        metadata.pageCount = pdfMetadata.pageCount;
      }
    }

    // Extract content metadata
    const contentMetadata = this.extractContentMetadata(text);
    if (contentMetadata.language) {
      metadata.language = contentMetadata.language;
    }
    if (contentMetadata.headings.length > 0) {
      metadata.headings = contentMetadata.headings;
    }
    if (contentMetadata.sections.length > 0) {
      metadata.sections = contentMetadata.sections;
    }
    if (contentMetadata.title && !metadata.title) {
      metadata.title = contentMetadata.title;
    }
    if (contentMetadata.author && !metadata.author) {
      metadata.author = contentMetadata.author;
    }
    if (contentMetadata.date) {
      metadata.date = contentMetadata.date;
    }
    metadata.wordCount = contentMetadata.wordCount;

    return metadata;
  }

  /**
   * Extract metadata from PDF files
   */
  private static async extractPDFMetadata(
    file: File | { url: string; type: string; name: string }
  ): Promise<{
    title?: string;
    author?: string;
    pageCount?: number;
  }> {
    try {
      let buffer: Buffer;

      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        const response = await fetch(file.url);
        if (!response.ok) {
          logger.warn("Failed to fetch PDF for metadata extraction", {
            component: "MetadataExtractor",
            url: file.url,
          });
          return {};
        }
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }

      const data = await pdfParse(buffer);
      return {
        title: data.info?.Title || undefined,
        author: data.info?.Author || undefined,
        pageCount: data.numpages || undefined,
      };
    } catch (error) {
      logger.warn("Failed to extract PDF metadata", {
        component: "MetadataExtractor",
        error: error instanceof Error ? error.message : String(error),
      });
      return {};
    }
  }

  /**
   * Extract metadata from content (text analysis)
   */
  private static extractContentMetadata(text: string): {
    title?: string;
    author?: string;
    date?: string;
    language: string;
    headings: string[];
    sections: string[];
    wordCount: number;
  } {
    const headings = this.extractHeadings(text);
    const sections = this.extractSections(text);
    const language = this.detectLanguage(text);
    const wordCount = text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    // Try to extract title from first heading or first line
    let title: string | undefined;
    if (headings.length > 0) {
      title = headings[0];
    } else {
      const firstLine = text.split("\n")[0]?.trim();
      if (firstLine && firstLine.length > 0 && firstLine.length < 200) {
        title = firstLine;
      }
    }

    // Try to extract author from common patterns
    const author = this.extractAuthor(text);

    // Try to extract date from common patterns
    const date = this.extractDate(text);

    return {
      title,
      author,
      date,
      language,
      headings,
      sections,
      wordCount,
    };
  }

  /**
   * Extract headings from markdown or HTML content
   */
  private static extractHeadings(text: string): string[] {
    const headings: string[] = [];

    // Extract markdown headings (# Heading)
    const markdownHeadings = text.match(/^#{1,6}\s+(.+)$/gm);
    if (markdownHeadings) {
      headings.push(
        ...markdownHeadings.map((h) => h.replace(/^#+\s+/, "").trim())
      );
    }

    // Extract HTML headings (<h1>Heading</h1>)
    const htmlHeadings = text.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi);
    if (htmlHeadings) {
      headings.push(
        ...htmlHeadings.map((h) =>
          h
            .replace(/<h[1-6][^>]*>/, "")
            .replace(/<\/h[1-6]>/, "")
            .trim()
        )
      );
    }

    // Remove duplicates and empty headings
    return Array.from(new Set(headings.filter((h) => h.length > 0)));
  }

  /**
   * Extract sections from content by detecting paragraph breaks and heading boundaries
   */
  private static extractSections(text: string): string[] {
    const sections: string[] = [];

    // Split by double line breaks (paragraph breaks)
    const paragraphs = text.split(/\n\n+/);

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      // Consider paragraphs with headings or substantial content as sections
      if (
        trimmed.length > 50 &&
        (trimmed.match(/^#{1,6}\s+/) || trimmed.match(/<h[1-6]/i))
      ) {
        // Extract section title (first line or heading)
        const firstLine = trimmed.split("\n")[0]?.trim();
        if (firstLine && firstLine.length > 0 && firstLine.length < 200) {
          sections.push(
            firstLine.replace(/^#+\s+/, "").replace(/<[^>]+>/g, "")
          );
        }
      }
    }

    return Array.from(new Set(sections.filter((s) => s.length > 0)));
  }

  /**
   * Detect language using simple heuristics
   * Checks for common Dutch vs English words
   */
  private static detectLanguage(text: string): string {
    const sample = text.substring(0, 1000).toLowerCase();

    // Common Dutch words
    const dutchWords = [
      "de",
      "het",
      "een",
      "en",
      "van",
      "in",
      "is",
      "op",
      "te",
      "voor",
      "dat",
      "met",
      "zijn",
      "aan",
      "ook",
      "als",
      "bij",
      "die",
      "er",
      "maar",
    ];

    // Common English words
    const englishWords = [
      "the",
      "be",
      "to",
      "of",
      "and",
      "a",
      "in",
      "that",
      "have",
      "i",
      "it",
      "for",
      "not",
      "on",
      "with",
      "he",
      "as",
      "you",
      "do",
      "at",
    ];

    let dutchCount = 0;
    let englishCount = 0;

    for (const word of dutchWords) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      if (regex.test(sample)) {
        dutchCount++;
      }
    }

    for (const word of englishWords) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      if (regex.test(sample)) {
        englishCount++;
      }
    }

    // Return detected language or default to English
    if (dutchCount > englishCount && dutchCount > 2) {
      return "nl";
    } else if (englishCount > dutchCount && englishCount > 2) {
      return "en";
    }

    // Default to English if unclear
    return "en";
  }

  /**
   * Extract author from common patterns in text
   */
  private static extractAuthor(text: string): string | undefined {
    // Common patterns: "Author: Name", "By: Name", "Written by: Name"
    const patterns = [
      /(?:author|by|written by|auteur|geschreven door)[:\s]+([A-Z][a-zA-Z\s]+)/i,
      /^([A-Z][a-zA-Z\s]+)\s*[-–—]\s*(?:author|writer|auteur|schrijver)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const author = match[1].trim();
        if (author.length > 2 && author.length < 100) {
          return author;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract date from common patterns in text
   */
  private static extractDate(text: string): string | undefined {
    // Common patterns: "Date: YYYY-MM-DD", "Published: DD/MM/YYYY", etc.
    const patterns = [
      /(?:date|published|created|datum|gepubliceerd)[:\s]+(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
      /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/,
      /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }
}

