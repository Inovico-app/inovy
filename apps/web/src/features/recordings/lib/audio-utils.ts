/**
 * Converts an audio blob to MP3 format using the browser's MediaRecorder API.
 * If MP3 encoding is not supported, falls back to the original format.
 *
 * @param audioBlob - The audio blob to convert
 * @param fileName - Optional custom filename (without extension)
 * @returns A Promise that resolves to a File object in MP3 format
 */
export async function convertBlobToMp3(
  audioBlob: Blob,
  fileName?: string
): Promise<File> {
  // Check if the browser supports MP3 encoding
  const mp3MimeType = "audio/mpeg";
  const isMP3Supported = MediaRecorder.isTypeSupported(mp3MimeType);

  // If already MP3, just convert to File
  if (audioBlob.type === mp3MimeType) {
    return new File(
      [audioBlob],
      fileName ? `${fileName}.mp3` : `recording-${Date.now()}.mp3`,
      { type: mp3MimeType }
    );
  }

  // If MP3 encoding is supported, convert via MediaRecorder
  if (isMP3Supported) {
    try {
      // Create an audio element to play the blob
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // Create a MediaStream from the audio element
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(audio);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);

      // Record as MP3
      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: mp3MimeType,
      });

      const chunks: Blob[] = [];

      return new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const mp3Blob = new Blob(chunks, { type: mp3MimeType });
          const mp3File = new File(
            [mp3Blob],
            fileName ? `${fileName}.mp3` : `recording-${Date.now()}.mp3`,
            { type: mp3MimeType }
          );
          URL.revokeObjectURL(audioUrl);
          audioContext.close();
          resolve(mp3File);
        };

        mediaRecorder.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          audioContext.close();
          reject(error);
        };

        // Play audio and record it
        audio.play();
        mediaRecorder.start();

        // Stop recording when audio ends
        audio.onended = () => {
          mediaRecorder.stop();
        };
      });
    } catch (error) {
      console.warn("Failed to convert to MP3, using original format:", error);
      // Fall through to fallback
    }
  }

  // Fallback: Return the original blob as a File with appropriate extension
  const fileExtension = getMimeTypeExtension(audioBlob.type);
  return new File(
    [audioBlob],
    fileName
      ? `${fileName}.${fileExtension}`
      : `recording-${Date.now()}.${fileExtension}`,
    { type: audioBlob.type }
  );
}

/**
 * Gets the file extension for a given MIME type
 */
function getMimeTypeExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "video/webm": "webm",
  };

  return mimeToExt[mimeType] || "webm";
}

/**
 * Simpler utility that just wraps a blob in a File object with proper naming
 * Use this when you don't need actual format conversion
 */
export function blobToFile(
  blob: Blob,
  fileName?: string,
  mimeType?: string
): File {
  const finalMimeType = mimeType ?? blob.type;
  const extension = getMimeTypeExtension(finalMimeType);
  const finalFileName = fileName
    ? `${fileName}.${extension}`
    : `recording-${Date.now()}.${extension}`;

  return new File([blob], finalFileName, { type: finalMimeType });
}

