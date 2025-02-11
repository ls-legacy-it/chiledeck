import { EventEmitter } from "./events";

export type NodeResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Representa una herramienta en el grafo
export type Tool = {
  // Nombre de la herramienta
  name: string;
  // Función que define la lógica de la herramienta
  // Esta función puede recibir parámetros y retornar un resultado
  execute?: (params: Record<string, any>) => Promise<any>;

  // Parámetros que la herramienta puede requerir
  parameters?: Record<string, any>;

  // Descripción opcional de la herramienta
  description?: string;
};

// Parameters for invoking a model
export type InvokeParams = {
  // Optional prompt for the model
  prompt?: Message | null;
  // Optional messages exchanged in the graph
  messages?: Message[] | null;
  // Optional thread ID for context
  thread_id?: string | null;

  metadata?: Record<string, any> | null; //

  maxIterations?: number | null;
};

export type Model = {
  // Nombre de la herramienta
  name: string;
  // Función que define la lógica de la herramienta
  // Esta función puede recibir parámetros y retornar un resultado
  invoke: (params: InvokeParams) => Promise<any>;

  // Parámetros que la herramienta puede requerir
  parameters?: Record<string, any>;

  apiKey: string;
  // Descripción opcional de la herramienta
  description?: string;
};

// Represents a basic edge in a graph
export type Edge = {
  // ID of the node from which this edge originates
  fromId: string;

  // An array of IDs to which this edge connects
  toId: string;

  // Optional label for the edge
  label?: string;
  // Optional metadata associated with the edge
  metadata?: Record<string, any>;
};

// Represents a conditional edge in a graph
export type ConditionalEdge = {
  // ID of the node from which this edge originates
  fromId: string;
  // An array of IDs to which this edge connects
  toIds: string[];

  // A function that defines the condition under which this edge can be traversed
  // Receives the current state of the graph as an argument
  // Returns a boolean indicating whether traversal is allowed
  condition: (state: GraphState, node?: Node) => string | Promise<string>; // Updated type from string to boolean for clarity
  // Optional label for the conditional edge
  label?: string;
  // Optional metadata associated with the conditional edge
  metadata?: Record<string, any>;
};

// Represents the state of the graph at any given moment.
export type GraphState = {
  id?: string;

  name?: string;
  // A map of nodes identified by their IDs.
  // This allows quick access to nodes based on their unique identifiers.

  nodes: Map<string, Node>;

  // Indicates if the graph is currently active or not.
  // This could control whether the graph processes actions or not.
  active: boolean;

  errors?: string[];

  // A record of agent nodes, where keys are agent IDs and values are Node objects.
  // This may represent entities that perform actions or hold information in the graph.
  models?: Model[];

  // A record of tool nodes, where keys are tool IDs and values are Node objects.
  // Tools can be utilities that the agents or nodes use to perform tasks.
  tools?: Tool[];

  // An array to store messages exchanged within the graph.
  // This can be useful for logging interactions or maintaining context.
  messages: Message[];

  // Allows for additional properties to be added dynamically.
  // This is useful for extending the GraphState with custom attributes as needed.
  [key: string]: any;

  // The ID of the currently active node.
  // This is helpful for tracking which node is being processed at any given time.
  currentNodeId?: string | null;

  nextNodeId?: string | null;

  // Optional user context holds information about the current user interacting with the graph
  userContext?: Record<string, any>;

  // Optional event handlers are functions that respond to specific events within the graph
  eventHandlers?: Record<string, (payload: any) => void>;

  // Optional data associated with the graph state
  data?: Record<string, any>;
  // Optional metadata associated with the graph state
  metadata?: null | Record<string, any>;
  // Optional thread ID for maintaining context across actions
  thread_id?: string | null;
};

// Represents a single node in the graph.
export type Node = {
  // Unique identifier for the node.
  // This allows each node to be distinct and easily referenced.
  id: string;

  description?: string;

  type?:
    | "completion.model"
    | "completion.tool_call"
    | "streaming.model"
    | "tool"
    | "function"
    | "webook"
    | "database.connection"
    | "integration"
    | "structured.output"
    | "vector.database"
    | "embedding"
    | "start"
    | "end"
    | "supervisor.router"
    | string;

  model?: "gpt-4o" | "gpt-4o-mini" | "gpt-3.5-turbo" | "" | string;

  // An array of IDs representing the edges connected to this node.
  // These edges define the possible paths that can be taken from this node.
  edges?: Edge[];

  // An array of conditional edges that determine alternative paths based on conditions.
  // These provide flexibility in navigating the graph based on the state.
  conditionalEdges?: ConditionalEdge[];

  // A function that defines the action to be performed when this node is activated.
  // Returns a promixse to handle asynchronous actions, allowing for integration with APIs or other async operations.
  action?: (state: GraphState, node: Node) => Promise<any>;

  eventTrigger?: string;

  // Optional property to provide instructions or additional information.
  // This can help users or developers understand how to interact with this node.
  instructions?: Message[];

  // The role associated with this node, which could represent different responsibilities.
  // For example, a node may have roles like "initiator", "handler", or "terminator".
  role?: "system" | "user" | "assistant" | "tool" | string;

  tools?: Tool[];

  // Allows for additional properties to be added dynamically.
  // Useful for custom attributes that may not be predefined in this structure.
  [key: string]: any;

  // Indicates if the node is currently active, which affects its behavior in the graph.
  // If inactive, the node may not respond to actions or be traversable.
  isActive?: boolean;

  // Metadata holds additional information about the node that may be useful for tracking or analytics.
  // This could include timestamps, source of creation, or any custom data relevant to this node.
  metadata?: Record<string, any>;

  visited?: number;
};

// Represents a message exchanged within the graph context.
export type Message = {
  // The role of the message sender, indicating the source of the message.
  // Possible roles include system, user, assistant, or tool, helping to categorize the message.
  role: "system" | "user" | "assistant" | "tool" | string;

  // The actual content of the message being sent.
  // This contains the information or query that is relevant to the current context.
  content: string;

  // Optional identifier for the message, which can be null if not applicable.
  // This helps in referencing specific messages for replies or logs.
  name?: string | null;

  refusal?: string | null;
  tool_calls?: [any] | null;
};

// Represents an event that occurs within the graph
export type Event = {
  // Name of the event
  name: "state.updated" | string;
  // Payload associated with the event
  payload: Record<string, any>;
};
