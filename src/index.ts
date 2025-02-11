import {
  Chat,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WAMessage,
  WASocket,
  makeWASocket,
  ConnectionState,
} from "@whiskeysockets/baileys";
import { promises as fs } from "fs";
import path from "path";
import {
  deleteEverythingInDirectory,
  getProfilePicture,
  downloadAudio,
  downloadOptions,
  transcribeAudio,
  removeAudioFile,
  sendMediaFiles,
  sendImage,
} from "./ws.actions";
import OpenAI from "openai";
import { Boom } from "@hapi/boom";
import "dotenv/config";
import { ChatModel } from "./database/chat.model";
import { WSSessionModel } from "./database/ws.sessions.model";
import { MessageModel } from "./database/chat.model";
import { connectMongo } from "./database/mongodb";
import { Flow, Message, WhatsappState } from "./types";
import { config } from "./config/config";
import { PipelineModel } from "./database/crm.model";
import { SESSION_ID } from "./main";

export const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });

export class Whatsapp {
  state: string;
  socket: WASocket | null;
  qr: string | undefined;
  chatsState: Record<string, WhatsappState>;
  flows: Flow[];
  session: string;
  // Set para los IDs de mensaje ya procesados
  processedMessageIds: Set<string>;

  constructor(session: string) {
    this.state = "mounted";
    this.socket = null;
    this.qr = "";
    this.chatsState = {};
    this.flows = [];
    this.session = session;
    this.processedMessageIds = new Set();
    this.initialize();
  }

  public async initialize() {
    if (this.socket) {
      console.log("Limpiando listeners del socket anterior...");
      this.socket.ev.removeAllListeners("connection.update");
      this.socket.ev.removeAllListeners("creds.update");
      this.socket.ev.removeAllListeners("messages.upsert");
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.session);

    console.log({ state });

    // Obtener la última versión de WhatsApp
    const { version } = await fetchLatestBaileysVersion();

    console.log({ version });

    // Crear el cliente de Baileys
    this.socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
    });

    // Manejar eventos de conexión
    this.socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr, isOnline } = update;
      this.qr = qr;

      console.log({ isOnline });

      try {
        switch (connection) {
          case "close":
            await this.handleConnectionClose(lastDisconnect);
            break;

          case "open":
            this.handleConnectionOpen();
            break;

          default:
            console.log("Estado de conexión desconocido:", connection);
            break;
        }
      } catch (error) {
        console.error("Error al manejar la actualización de conexión:", error);
      }
    });

    // Guardar credenciales cuando se actualicen
    this.socket.ev.on("creds.update", saveCreds);

    // Manejar eventos de mensajes
    this.socket.ev.removeAllListeners("messages.upsert");
    this.socket.ev.on("messages.upsert", async (msg) => {
      if (msg.type === "notify") {
        await this.processMessages(msg.messages);
      }
    });
  }

  /**
   * Inicializa el estado del chat si no existe.
   * @param chatId - ID del chat a inicializar.
   */
  private initializeChatState(chatId: string) {
    if (!this.chatsState[chatId]) {
      this.chatsState[chatId] = {
        lastGreeting: null,
        lastGoodbye: null,
        messageHistory: [],
        isMuted: false, // Asegúrate de inicializar isMuted
        waiting: false,
      };
    }
  }

  /**
   * Maneja la lógica cuando la conexión se cierra.
   * @param lastDisconnect - Información sobre la última desconexión.
   */
  private async handleConnectionClose(lastDisconnect: any) {
    await connectMongo();
    let sessionId = this.session.split("/")[1];
    let session = await WSSessionModel.findOne({ sessionId });

    const shouldReconnect =
      (lastDisconnect?.error as Boom)?.output?.statusCode !==
      DisconnectReason.loggedOut;

    if (shouldReconnect) {
      console.log("Reconectando...");
      await this.initialize();
    } else {
      console.log("Conexión cerrada. Has cerrado sesión.");
      await this.cleanupSession();
      await this.initialize();
    }
  }

  /**
   * Maneja la lógica cuando la conexión se abre.
   */
  private async handleConnectionOpen() {
    this.state = "open";
  }

  /**
   * Realiza la limpieza de la sesión, incluyendo la eliminación de archivos.
   */
  private async cleanupSession() {
    const FOLDER_PATH = path.join(process.cwd(), `${this.session}`);
    await deleteEverythingInDirectory(FOLDER_PATH);
  }

  public async getState() {
    return this.state;
  }

  private async processMessages(messages: WAMessage[]): Promise<void> {
    const MAX_PROCESSED_IDS = 1000; // o el valor que consideres adecuado
    if (this.processedMessageIds.size > MAX_PROCESSED_IDS) {
      this.processedMessageIds.clear();
      console.log(
        "Se ha limpiado el historial de mensajes procesados por alcanzar el límite."
      );
    }
    const now = Math.floor(Date.now() / 1000);
    for (const message of messages) {
      const messageId = message.key.id;
      // Verificar que messageId sea un string válido
      if (!messageId) {
        console.warn("ID de mensaje no definido. Se omite el procesamiento.");
        continue;
      }

      // Usar una clave única robusta combinando remoteJid y el id del mensaje
      const messageKey = `${message.key.remoteJid}-${messageId}`;

      // Verifica que messageTimestamp no sea null o undefined
      if (message.messageTimestamp == null) {
        console.warn(
          "messageTimestamp es null o undefined, se omite el mensaje."
        );
        continue;
      }

      // Asegura que el timestamp sea un número
      const timestamp =
        typeof message.messageTimestamp === "number"
          ? message.messageTimestamp
          : message.messageTimestamp.toNumber();

      // Filtrar mensajes antiguos (por ejemplo, más de 10 segundos)
      if (now - timestamp > 10) {
        console.warn(`Mensaje antiguo descartado: ${messageKey}`);
        continue;
      }
      // Si ya se procesó este mensaje, se salta el procesamiento
      if (this.processedMessageIds.has(messageKey)) {
        console.warn(`Mensaje duplicado detectado: ${messageKey}`);
        continue;
      }

      this.processedMessageIds.add(messageKey);

      const fromMe = message.key.fromMe;
      const chatId = message.key.remoteJid!; // Ensure remoteJid is not null
      const content = this.extractMessageContent(message);

      if (content) {
        console.log("Mensaje recibido:", content);
        await this.handleMessage(chatId, content, fromMe, message);
      } else {
        console.warn("Mensaje sin contenido válido:", message);
      }
    }
  }

  private extractMessageContent(message: WAMessage): string | null {
    // Define a map of message types to their corresponding handler functions
    const messageHandlers: { [key: string]: () => string | null } = {
      conversation: () => message.message?.conversation ?? null,
      extendedTextMessage: () =>
        message.message?.extendedTextMessage?.text ?? null,
      imageMessage: () => message.message?.imageMessage?.caption ?? null,
      videoMessage: () => message.message?.videoMessage?.caption ?? null,
      audioMessage: () => {
        const audio = message.message?.audioMessage;
        if (audio) {
          return audio.ptt ? "Nota de voz" : "Audio";
        }
        return null;
      },
      // Add other message types as needed
    };

    // Iterate through the handlers to find a valid message type
    for (const [type, handler] of Object.entries(messageHandlers)) {
      const content = handler();
      if (content) {
        return content; // Return the first valid content found
      }
    }

    // Log a warning if no valid content is found
    console.warn("Unsupported message format:", message);
    return null; // Return null if no content is found
  }
  // Método para manejar mensajes entrantes
  private async handleMessage(
    chatId: string,
    messageBody: string,
    fromMe: boolean | null | undefined,
    message: WAMessage
  ) {
    // Initialize chat state if it doesn't exist
    this.initializeChatState(chatId);

    console.log({ message });

    // Exit early for group messages, own messages, or if waiting for a response
    if (message.key.participant || fromMe) {
      return;
    }

    // Database Connection
    await connectMongo();

    // Multi Connection Server
    let sessionId = this.session.split("/")[1];
    let session = await WSSessionModel.findOne({ sessionId: sessionId });

    if (session.state !== "online") {
      return;
    }

    // Ignore chats with database as data source
    if (session && session.ignore.includes(chatId)) {
      return;
    }

    // Database persistent message history
    // Fetch chat history from the database
    let chatHistory = await this.getChatHistory(chatId, session, message);

    /*     if (!chatHistory.welcomeMedia && this.socket) {
      await sendMediaFiles("welcome.jpeg", this.socket, chatId);
      await ChatModel.findOneAndUpdate(
        { chatId, sessionId: session._id },
        { welcomeMedia: true }
      );
    } */

    // Handle audio messages
    if (messageBody === "Nota de voz" || messageBody === "Audio") {
      await this.handleAudioMessage(chatId, message);
    } else {
      await this.handleTextMessage(chatId, messageBody, fromMe, chatHistory);
    }

    // Execute flow actions based on keywords
    await this.executeFlowActions(chatId, messageBody);
  }

  /**
   * Executes flow actions based on keywords found in the message body.
   */
  private async executeFlowActions(chatId: string, messageBody: string) {
    if (this.chatsState[chatId].waiting) {
      return;
    }
    if (!this.chatsState[chatId].waiting) {
      this.chatsState[chatId].waiting = true;
      this.socket?.sendPresenceUpdate("composing", chatId);

      setTimeout(async () => {
        this.chatsState[chatId].waiting = false;

        for (const flow of this.flows) {
          if (flow.keyword === "*" || messageBody.includes(flow.keyword)) {
            await flow.action(chatId, this.chatsState[chatId].messageHistory);
          }
        }
      }, 1000 * 10);
    }
  }

  /**
   * Handles text messages and updates the chat history.
   */
  private async handleTextMessage(
    chatId: string,
    messageBody: string,
    fromMe: boolean | null | undefined,
    chatHistory: any
  ) {
    this.chatsState[chatId].messageHistory.push({
      role: fromMe ? "assistant" : "user",
      content: messageBody.toLowerCase(),
    });

    const newMessage = await MessageModel.create({
      role: fromMe ? "assistant" : "user",
      content: messageBody.toLowerCase(),
    });

    await this.updateChatHistory(chatId, newMessage);
  }

  /**
   * Handles audio messages by downloading and transcribing them.
   */
  private async handleAudioMessage(chatId: string, message: WAMessage) {
    const outputDirectory = path.join(__dirname, "..", "downloads");
    const outputFilePath = path.join(
      outputDirectory,
      `${chatId}_${Date.now()}.mp3`
    );

    await fs.mkdir(outputDirectory, { recursive: true });

    // Download and save the audio file
    await downloadAudio(this.socket, message, outputFilePath, downloadOptions);

    const transcription = await transcribeAudio(outputFilePath);
    await removeAudioFile(outputFilePath);

    if (transcription) {
      this.chatsState[chatId].messageHistory.push({
        role: "user",
        content: transcription,
      });
      const newMessage = await MessageModel.create({
        role: "user",
        content: transcription,
      });
      await this.updateChatHistory(chatId, newMessage);
    }
  }

  /**
   * Updates the chat history with the new message.
   */
  private async updateChatHistory(chatId: string, newMessage: any) {
    let sessionId = this.session.split("/")[1];

    let session = await WSSessionModel.findOne({ sessionId: sessionId });
    const chatHistory = await ChatModel.findOne({
      chatId,
      sessionId: session._id,
    });

    chatHistory.messages.push(newMessage._id);
    await chatHistory.save();
  }

  /**
   * Retrieves chat history from the database and syncs it with the session.
   */
  private async getChatHistory(
    chatId: string,
    session: any,
    message: WAMessage
  ) {
    let chatHistory = await ChatModel.findOne({
      chatId,
      sessionId: session._id,
    })
      .populate("messages")
      .exec();

    if (chatHistory) {
      this.chatsState[chatId].messageHistory = chatHistory.messages.map(
        (m: any) => ({
          role: m.role,
          content: m.content,
        })
      );

      if (!session.chats.includes(chatHistory._id)) {
        session.chats.push(chatHistory._id);
        await session.save();
      }
    } else {
      const profilePic = (await getProfilePicture(this.socket, chatId)) || "";
      chatHistory = await ChatModel.create({
        chatId,
        sessionId: session._id,
        pushName: message.pushName,
        profilePic,
        followUpHistory: [
          { step: "4hr", isSent: false },
          { step: "24hr", isSent: false },
        ],
      });
      session.chats.push(chatHistory._id);
      await session.save();
    }

    const pipeline = await PipelineModel.findOne({
      sessionId: SESSION_ID,
    });

    if (pipeline.chats) {
      if (!pipeline.chats.includes(chatHistory._id)) {
        pipeline.chats.push(chatHistory._id);
        await pipeline.save();
      }
    }

    return chatHistory;
  }

  public async close(sessionId: string) {
    const FOLDER_PATH = path.join(process.cwd(), `sessions/${sessionId}`);
    deleteEverythingInDirectory(FOLDER_PATH);
  }

  public addKeyword(keyword: string) {
    this.flows.push({
      keyword: keyword,
      action: async (chatId, messagesHistory) => {},
    });

    return this;
  }

  public addAnswer(answer: string) {
    const flow = this.flows[this.flows.length - 1];
    flow.action = async (chatId: string, messageHistory: Message[]) => {
      this.chatsState[chatId].lastGoodbye = new Date();
      await this.sendMessage(chatId, answer);
    };

    return this;
  }

  public addAction(
    action: (chatId: string, messageHistory: Message[]) => Promise<void>
  ) {
    const flow = this.flows[this.flows.length - 1];
    flow.action = action;

    return this;
  }

  public getQR() {
    return this.qr;
  }

  // Método para enviar un mensaje
  async sendMessage(chatId: string, text: string) {
    if (this.socket) {
      await this.socket.sendMessage(chatId, { text });
      let sessionId = this.session.split("/")[1];

      let session = await WSSessionModel.findOne({ sessionId: sessionId });
      let chatHistory = await ChatModel.findOne({
        chatId,
        sessionId: session._id,
      });

      if (chatHistory) {
        let isSessionSync = session.chats.includes(chatHistory._id);

        if (!isSessionSync) {
          session.chats.push(chatHistory._id);
          await session.save();
        }
      }
      if (!chatHistory) {
        chatHistory = await ChatModel.create({
          chatId,
          sessionId: session._id,
        });

        session.chats.push(chatHistory._id);
        await session.save();
      }
      if (!this.chatsState[chatId]) {
        this.chatsState[chatId] = {
          lastGreeting: null,
          lastGoodbye: null,
          messageHistory: [],
          waiting: false,
        };
      }
      this.chatsState[chatId].messageHistory.push({
        role: "assistant",
        content: text,
      });

      const newMessage = await MessageModel.create({
        role: "assistant",
        content: text,
      });

      chatHistory.messages.push(newMessage._id);
      chatHistory.save();
    }
  }

  async sendImage(chatId: string, url: string) {
    console.log();
    if (this.socket) {
      await sendImage(url, this.socket, chatId);
    }
  }
}
