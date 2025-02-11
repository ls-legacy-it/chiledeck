import mongoose from "mongoose";
import { Permission } from "../crm/types";

const { Schema, model, models } = mongoose;

// Define WorkflowStep Schema
export const WorkflowStepSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  action: {
    type: {
      type: String,
      required: true,
    },
    params: { type: Schema.Types.Mixed }, // Flexible parameters
  },
  assignedTo: { type: String },
  dueDate: { type: Date },
  status: { type: String, enum: ["pending", "completed"], required: true },
});

// Define Workflow Schema
const WorkflowSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  steps: [{ type: Schema.Types.ObjectId, ref: "WorkflowStep" }],
  status: { type: String, enum: ["active", "inactive"], required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

export const WorkflowModel =
  models.Workflow || model("Workflow", WorkflowSchema);

const CustomNotificationSchema = new Schema({
  id: { type: String, required: true },
  body: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ["message", "leadUpdate", "journeyUpdate"],
    required: true,
  },
  customerId: { type: String },
  leadId: { type: String },
  timestamp: { type: Date, default: Date.now },
  icon: { type: String },
  dir: { type: String, enum: ["auto", "ltr", "rtl"] },
  data: { type: Schema.Types.Mixed },
});

export const CustomNotificationModel =
  models.CustomNotification ||
  model("CustomNotification", CustomNotificationSchema);

const UserSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: {
    type: String,
    enum: ["admin", "manager", "sales", "support", "user", "share", "projects"],
    required: true,
  },
  agentId: {
    type: String,
    required: false,
  },
  projects: {
    type: [String],
    required: false,
    default: [],
  },
  permissions: {
    type: [String],
    enum: Object.values(Permission),
    required: true,
  },
  password: { type: String, required: true },
});

export const UserModel = models.User || model("User", UserSchema);

const TaskSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  customerId: { type: String, required: true },
  dueDate: { type: Date, required: true },
  priority: { type: String, enum: ["low", "medium", "high"], required: true },
  status: { type: String, enum: ["pending", "completed"], required: true },
});

export const TaskModel = models.Task || model("Task", TaskSchema);

const LeadSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  status: {
    type: String,
    enum: ["new", "contacted", "converted", "lost"],
    required: true,
  },
  pipelineStageId: { type: String },
});

export const LeadModel = models.Lead || model("Lead", LeadSchema);

const JourneyStageSchema = new Schema({
  stage: { type: String, required: true },
  date: { type: Date, required: true },
  notes: { type: String },
});

const InteractionSchema = new Schema({
  type: {
    type: String,
    enum: ["message", "notification", "call", "meeting", "redirect"],
    required: true,
  },
  timestamp: { type: String, required: true },
  details: { type: String, required: true },
  relatedMessageId: { type: String },
  relatedNotificationId: { type: String },
  journeyStage: { type: String },
  link: { type: String, required: false },
  email: { type: String, required: false },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "agent",
    required: false,
  },
  chatId: { type: String, required: false },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: false,
  },
});

const CustomerSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  notes: { type: [String] },
  journey: { type: [JourneyStageSchema], required: true },
  messages: { type: [Schema.Types.Mixed] }, // Message references or embedded docs
  customFields: { type: Schema.Types.Mixed },
  interactions: { type: [InteractionSchema] },
});

export const CustomerModel =
  models.Customer || model("Customer", CustomerSchema);

const MessageSchema = new Schema({
  id: { type: String, required: true },
  customerId: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  sender: { type: String, enum: ["user", "system"], required: true },
});

export const MessageModel = models.Message || model("Message", MessageSchema);
export const InteractionModel =
  models.Interaction || model("Interaction", InteractionSchema);

const FeedbackSchema = new Schema({
  customerId: { type: String, required: true },
  interactionId: { type: String },
  rating: { type: Number, required: true },
  comments: { type: String },
  date: { type: Date, required: true },
});

const SubscriptionSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    plan: {
      type: String,
      enum: ["start", "standard", "pro", "business"], // Subscription plans
      required: true,
    },
    startDate: {
      type: Date,
      default: function () {
        // Set the default timezone to Chile South America (America/Santiago)
        const tzOffset = -240; // Chile South America is UTC-4 in standard time
        const now = new Date();
        const adjustedTime = new Date(
          now.getTime() + tzOffset * 60 * 1000 + 60 * 60 * 1000
        ); // Adding 1 hour
        return adjustedTime;
      },

      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "expired"], // Subscription status
      default: "inactive", // Default to inactive
    },
    autoRenew: {
      type: Boolean,
      default: true, // Default to auto-renew enabled
    },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt`
  }
);

export const FeedbackModel =
  models.Feedback || model("Feedback", FeedbackSchema);

export const SubscriptionModel =
  models.Subscription || model("Subscription", SubscriptionSchema);

const PermissionSchema = new Schema({
  name: { type: String, required: true, unique: true }, // Name of the permission
  description: { type: String }, // Optional description of the permission
});

export const PermissionModel =
  models.Permission || model("Permission", PermissionSchema);

const PipelineSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Nombre del pipeline (e.g., "Seguimiento estándar")
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ws-sessions", // Reference to the User model
    required: true,
  },
  isActive: { type: Boolean, default: false },
  steps: [
    {
      step: { type: Number, required: true }, // Número de paso
      delayInHours: { type: Number, required: true }, // Retraso después del último mensaje
      messageTemplate: { type: String, required: true }, // Mensaje de seguimiento
    },
  ],
  createdAt: { type: Date, default: Date.now },
  chats: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Chat" }, // Referencia a la colección de chats
  ],
});

function getModel(name: string, schema: any, collection: string) {
  return mongoose.models[name] || mongoose.model(name, schema, collection);
}

const PipelineModel = getModel("pipeline", PipelineSchema, "pipeline");

export { PipelineModel };
