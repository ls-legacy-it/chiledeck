import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

const ConfigSchema = new Schema(
  {
    personality: {
      type: String,
      required: true,
      trim: true,
      description: "The personality of the role (e.g., friendly, analytical).",
    },
    step_by_step: {
      type: [String],
      required: false,
      validate: {
        validator: function (v: any) {
          return v.length > 0;
        },
        message: "At least one step is required in the step-by-step field.",
      },
    },
    objectives: {
      type: [String],
      required: true,
      description: "List of objectives for the role.",
      validate: {
        validator: function (v: any) {
          return v.length > 0;
        },
        message: "At least one objective is required.",
      },
    },
    examples: {
      type: [String],
      required: false,
      description: "Specific examples demonstrating the role.",
    },
    key_information: {
      type: String,
      required: false,
      description: "Essential information related to the role.",
    },
    constraints: {
      type: [String],
      required: false,
      description: "Applicable restrictions for the role.",
    },
    general_information: {
      type: String,
      required: false,
      description: "Additional general information about the role.",
    },
  },
  { collection: "config" }
);

// Esquema de Node
const NodeSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    edges: {
      type: [
        {
          fromId: { type: String, required: true },
          toId: { type: String, required: true },
          label: { type: String },
        },
      ],
      default: [],
    },
    conditionalEdges: {
      type: [
        {
          fromId: { type: String, required: true },
          toIds: {
            type: [{ type: String, required: true }],
            default: [],
          },
          label: { type: String },
          action: { type: String },
        },
      ],
      default: [],
    },
    model: { type: String, default: "" },
    visited: { type: Number, default: 0 },
    role: { type: String, default: "assistant" },
    tools: [
      {
        name: { type: String, required: true },
        description: { type: String, required: false },
      },
    ],
    instructions: [
      {
        role: { type: String, required: true },
        content: { type: String, required: true },
      },
    ],

    // Integrating buildConfig
    buildConfig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "config" as const,
      required: false,

      description: "Detailed configuration for the node's role and behavior.",
    },
    metadata: {
      createdAt: { type: Date, default: Date.now },
    },
  },
  { collection: "node" }
);

// Esquema de Graph
const GraphSchema = new Schema(
  {
    id: { type: String, required: true },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "agent" as const,
      required: false,
    },
    nodes: [{ type: mongoose.Schema.Types.ObjectId, ref: "node" as const }],
    messages: [
      {
        role: { type: String, required: true },
        content: { type: String, required: true },
      },
    ],
    eventHandlers: {
      type: Map,
      of: String, // Puedes cambiar el tipo a algo más específico si es necesario
      default: {},
    },
    metadata: {
      createdAt: { type: Date, default: Date.now },
    },
    thread_id: { type: String },
  },
  { collection: "graph" }
);

const AgentSchema = new Schema(
  {
    id: { type: String, required: true },
    nodes: [{ type: mongoose.Schema.Types.ObjectId, ref: "node" as const }],
    graphs: [{ type: mongoose.Schema.Types.ObjectId, ref: "graph" as const }],
    metadata: {
      createdAt: { type: Date, default: Date.now },
    },
  },
  { collection: "agent" }
);

const TemplateSchema = new Schema(
  {
    id: { type: String, required: true },
    nodes: [{ type: mongoose.Schema.Types.ObjectId, ref: "node" as const }],
    metadata: {
      createdAt: { type: Date, default: Date.now },
    },
  },
  { collection: "template" }
);

// @ts-ignore
function getModel(name, schema, collection) {
  return mongoose.models[name] || mongoose.model(name, schema, collection);
}

const NodeModel = getModel("node", NodeSchema, "node");
const GraphModel = getModel("graph", GraphSchema, "graph");
const AgentModel = getModel("agent", AgentSchema, "agent");
const TemplateModel = getModel("template", TemplateSchema, "template");
const ConfigModel = getModel("config", ConfigSchema, "config");

export { NodeModel, GraphModel, AgentModel, TemplateModel, ConfigModel };
