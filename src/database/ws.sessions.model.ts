import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

enum ChatbotState {
  MOUNTED = "mounted", // The chatbot is loaded into memory but not initialized.
  INIT = "init", // The chatbot is initializing.
  ONLINE = "online", // The chatbot is active and operational.
  OFFLINE = "offline", // The chatbot is inactive or not operational.
}

const wsSessionSchema = new Schema(
  {
    userId: { type: String, required: true },
    domain: { type: String, default: "https://agent.mocca-ia.cl" },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "agent",
      required: false,
    }, // Optional agentId
    chats: { type: [mongoose.Schema.Types.ObjectId], ref: "chat", default: [] }, // Default empty array for chats
    sessionId: { type: String, required: true, unique: true },
    state: {
      type: String,
      enum: ["mounted", "init", "online", "offline"], // Enumeration for valid states
      default: "mounted", // Default state
    },
    createdAt: { type: Date, default: Date.now }, // Automatically set creation time
    ignore: {
      type: [String],
      default: [],
    },
  },
  { collection: "ws-sessions" }
);

// Check if the model exists in mongoose.models before defining it
export const WSSessionModel =
  models["ws-sessions"] || model("ws-sessions", wsSessionSchema);
