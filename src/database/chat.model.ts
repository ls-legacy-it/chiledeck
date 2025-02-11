import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

const ChatSchema = new Schema(
  {
    chatId: { type: String, required: true, unique: true },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "agent",
      required: false,
    },
    pushName: { type: String, required: false },
    profilePic: { type: String, required: false },
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "message" }], // Reference to Message schema
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ws-sessions",
      required: true,
    },
    state: { type: Object }, // Can store connection information
    createdAt: { type: Date, default: Date.now }, // Creation timestamp
    followUpHistory: [
      {
        step: { type: String, required: true, default: 0 }, // El paso del pipeline asociado
        isSent: { type: Boolean, required: true, default: false }, // Mensaje enviado
      },
    ],
    welcomeMedia: {
      type: Boolean,
      default: false,
      required: false,
    },
  },
  { collection: "chat" }
);

const messageSchema = new Schema(
  {
    role: { type: String }, // Reference to the chat
    content: { type: String, required: true }, // The content of the message
    timestamp: { type: Date, default: Date.now }, // Time when the message was sent
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    }, // Status of the message
  },
  { collection: "message" }
);

function getModel(name: string, schema: any, collection: string) {
  return mongoose.models[name] || mongoose.model(name, schema, collection);
}

const ChatModel = getModel("chat", ChatSchema, "chat");

const MessageModel = getModel("message", messageSchema, "message");

export { ChatModel, MessageModel };

// Check if the model exists in mongoose.models before defining it
