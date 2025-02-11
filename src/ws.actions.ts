import {
  downloadMediaMessage,
  MediaDownloadOptions,
  WAMessage,
  WASocket,
} from "@whiskeysockets/baileys";
import { promises as fs } from "fs";
import { createReadStream } from "fs";
import path from "path";
import { client } from ".";

export const downloadOptions: MediaDownloadOptions = {
  startByte: 0, // Optional: specify where to start the download (e.g., byte range)
  endByte: 500000, // Optional: specify where to end the download (e.g., byte range)
  options: {
    // Optional: additional Axios config options
    headers: {
      "User-Agent": "Mocca/1.0",
    },
  },
};

export async function sendMediaFiles(
  filename: string,
  socket: WASocket,
  chatId: string
) {
  // Generar la ruta absoluta relativa al directorio raíz del proyecto
  const mediaPath = path.resolve("./media", filename);

  try {
    // Leer el archivo para asegurarse de que exista
    await fs.readFile(mediaPath);

    // Enviar el archivo multimedia
    await socket.sendMessage(chatId, {
      image: {
        url: "https://cdn.shopify.com/s/files/1/0833/3151/4660/files/IMG_9220.jpg?v=1730838776",
      }, // Usar buffer para enviar datos binarios
      mimetype: "image/jpeg",
    });
  } catch (err) {
    console.error(`Error al leer el archivo ${filename}:`, err);
  }
}
export async function sendImage(url: string, socket: WASocket, chatId: string) {
  // Generar la ruta absoluta relativa al directorio raíz del proyecto

  try {
    // Leer el archivo para asegurarse de que exista

    // Enviar el archivo multimedia
    await socket.sendMessage(chatId, {
      image: {
        url: url,
      }, // Usar buffer para enviar datos binarios
      mimetype: "image/jpeg",
    });
  } catch (err) {
    console.error(`Error al leer el archivo ${url}:`, err);
  }
}

/**
 * Deletes all contents in a specified directory, including subdirectories and files.
 * @param directoryPath - The path of the directory to clear.
 */
export const deleteEverythingInDirectory = async (
  directoryPath: string
): Promise<void> => {
  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });

    // Use Promise.all to handle deletions concurrently
    await Promise.all(
      entries.map(async (entry) => {
        const currentPath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively delete contents of the directory
          await deleteEverythingInDirectory(currentPath);
          await fs.rmdir(currentPath); // Remove the empty directory
        } else {
          // Delete the file
          await fs.unlink(currentPath);
        }
      })
    );

    console.log(`All contents in ${directoryPath} have been deleted.`);
  } catch (error) {
    console.error(`Error deleting contents of ${directoryPath}:`, error);
    throw error; // Rethrow the error for further handling if needed
  }
};

export async function getProfilePicture(
  socket: any,
  jid: string
): Promise<string | null> {
  try {
    // Fetch the profile picture URL
    const profilePicUrl = await socket.profilePictureUrl(jid, "image"); // 'image' fetches low resolution, 'preview' fetches higher resolution
    return profilePicUrl || null; // Return the URL or null if none exists
  } catch (error) {
    console.error(`Error fetching profile picture for ${jid}:`, error);
    return null; // Return null if there's an error or no profile picture
  }
}

export async function downloadAudio(
  socket: any,
  message: WAMessage,
  outputPath: string,
  options?: MediaDownloadOptions
) {
  try {
    // Check if the message contains an audio file
    const mediaMessage = message.message?.audioMessage;
    if (!mediaMessage) {
      console.log("No audio file found in the message.");
      return;
    }

    // Download the audio file with custom options if provided
    const mediaBuffer = await downloadMediaMessage(
      message,
      "buffer",
      downloadOptions
    );

    // Save the audio file to the specified path
    fs.writeFile(outputPath, mediaBuffer);

    console.log(`Audio file downloaded and saved to ${outputPath}`);
  } catch (error) {
    console.error("Error downloading audio:", error);
  }
}

export async function transcribeAudio(path: string) {
  try {
    // Provide the path to the audio file

    // Stream the audio file
    const audioStream = createReadStream(path);

    // Use Whisper to transcribe the audio
    const transcription = await client.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
    });

    // Log the transcription text
    return transcription.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
  }
}

export async function removeAudioFile(outputFilePath: string) {
  try {
    // Check if the file exists before attempting to delete it
    await fs.access(outputFilePath);

    // Delete the file
    await fs.unlink(outputFilePath);
    console.log(`File ${outputFilePath} was deleted successfully.`);
  } catch (error) {
    console.error(`Error removing file: ${error}`);
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
