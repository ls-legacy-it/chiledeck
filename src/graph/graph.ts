import { EventEmitter, graphStateEvent } from "./events";
import {
  GraphState,
  Edge,
  Node,
  Message,
  ConditionalEdge,
  InvokeParams,
  NodeResponse,
} from "./types";
import OpenAI from "openai";
import { callModel, callRedirectAgent, callSupervisorRouter } from "./actions";
import { GraphModel, NodeModel, AgentModel } from "../database/graph.model";
import { MongoClient } from "mongodb";

import { config } from "../config/config";

import { redirect } from "./tools/redirect";

export const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
export const mongo = new MongoClient(config.MONGO_URI);

const toolActions: {
  [key: string]: ((state: GraphState, node: Node) => Promise<any>) | undefined;
} = {
  redirect: redirect.action,

  // Add more tool types as needed
};

const webhooks: {
  [key: string]: ((state: GraphState, node: Node) => Promise<any>) | undefined;
} = {
  //callNotification: callNotification.action,
  // Add more tool types as needed
};

export class GraphConfig {
  static readonly START_NODE_ID = "START";
  static readonly END_NODE_ID = "END";
  static readonly EVENTS = {
    STATE_GRAPH_UPDATED: "state.graph.updated",
  };
}

// Represents the graph structure
export class Graph {
  // State of the graph
  private state: GraphState;
  // Map of nodes in the graph
  private readonly nodes: Map<string, Node>;
  // Event emitter for handling events in the graph
  private readonly eventEmitter: EventEmitter;
  // ID for the start node
  private readonly startNodeId = GraphConfig.START_NODE_ID;
  // ID for the end node
  private readonly endNodeId = GraphConfig.END_NODE_ID;
  // Map to track visited nodes

  // Constructor for initializing the graph
  constructor(initialState: Partial<GraphState> = {}) {
    // Initialize the map of nodes
    this.nodes = new Map<string, Node>(); // Initialize the map of visited nodes
    // Initialize the event emitter
    this.eventEmitter = new EventEmitter();
    // Create the initial state of the graph
    this.state = this.createContext(initialState);

    // Add the start and end nodes to the graph
    this.addNode({
      id: this.startNodeId,
      isActive: false,
      type: "start",

      description:
        "Initial Entry Point: Begins the workflow sequence, setting parameters and initializing dependencies. Acts as the primary trigger to activate subsequent nodes in sequence, establishing the scope and context for the entire process.",
      edges: [],
      conditionalEdges: [],
      action: this.startAction,
    });

    this.addNode({
      id: this.endNodeId,
      type: "end",
      isActive: false,
      description:
        "Finalization Point: Completes the workflow sequence, capturing results and wrapping up all active processes. This node acts as a boundary exit, ensuring all dependencies are finalized and resources released. Serves as the termination point, providing closure and marking the end of the automation flow.",

      edges: [],
      conditionalEdges: [],
      action: this.endAction,
    });
  }

  // Action performed when the workflow ends
  private async endAction(state: GraphState) {
    console.log("Workflow has ended.");
    // Aquí puedes agregar cualquier lógica al finalizar el flujo.
    return Promise.resolve();
  }

  private async voidAction(state: GraphState) {
    // Aquí puedes agregar cualquier lógica al finalizar el flujo.
    return;
  }

  // Action performed when the workflow starts
  private async startAction(state: GraphState) {
    console.log("Workflow has started.");
    // Aquí puedes agregar cualquier lógica inicial que necesites.
    return Promise.resolve();
  }

  // Create the context for the graph state
  private createContext(initialState: Partial<GraphState>): GraphState {
    const context: GraphState = {
      // Map of nodes in the graph
      nodes: this.nodes,
      // Indicates if the graph is active
      active: false,
      // Array of messages exchanged in the graph
      messages: [],
      // Spread in the initial state to include additional properties
      ...initialState,
    };
    return context;
  }

  /**
   * Agrega un nodo al grafo.
   * @param node Nodo a agregar.
   * @returns Instancia del grafo.
   */
  addNode(
    node: Partial<Node> & {
      id: string;
    }
  ) {
    // Validate required properties
    if (!node.id) {
      throw new Error("Node must have an id.");
    }

    // Define acciones por tipo de nodo
    switch (node.type) {
      case "tool":
        node.action = toolActions[node.id];
        break;
      case "webhook":
        node.action = webhooks[node.id];
        break;

      case "completion.model":
        node.action = node.action || callModel;
        break;

      case "supervisor.router":
        node.action = node.action || this.voidAction;

        // Ensure that conditionalEdges is initialized with a default condition
        const defaultCondition: ConditionalEdge = {
          fromId: node.id, // From this node
          toIds: node.conditionalEdges?.length
            ? node.conditionalEdges[0].toIds
            : [], // Empty until we define real target nodes
          label: "Default Supervisor Router Condition", // Optional label
          metadata: {}, // Add any necessary metadata
          condition: callSupervisorRouter, // Default condition for this edge
        };

        node.conditionalEdges = [defaultCondition]; // Set the default edge
        break;
      case "completion.tool_call.redirect":
        node.action = callRedirectAgent;
        if (node.conditionalEdges && node.conditionalEdges.length > 0) {
          node.conditionalEdges[0].condition = callToolCondition;
        }
        break;

      default:
        node.action = node.action || ((state) => Promise.resolve(state));
        break;
    }

    // Apply default values for optional properties
    const newNode: Node = {
      ...node, // Spread any properties provided
      edges: node.edges || [], // Default to an empty array if not provided
      conditionalEdges: node.conditionalEdges || [], // Default to an empty array if not provided
      isActive: node.isActive ?? false, // Default to false if not provided
      model: node.model ?? "gpt-4o-mini",
      instructions: node.instructions ?? [
        { role: "system", content: "You are a helpful assistant." },
      ],
    };

    // Only add the node if it doesn't already exist in the graph
    if (!this.nodes.has(newNode.id)) {
      this.nodes.set(newNode.id, newNode); // Type-safe insertion
    }

    // Optionally update the graph state or context
    this.state = this.createContext(this.state);
    return this; // Return the graph instance for method chaining
  }

  removeEdge(id: string) {
    const [fromId, toId] = id.split("-");

    const node = this.state.nodes.get(fromId);

    if (node && node.edges?.length) {
      node.edges = node.edges.filter((e) => e.toId !== toId);
      this.state.nodes.set(fromId, node); // Mark the current node as active
    }

    console.log(this.state.nodes.get(fromId));
    return;
  }

  // Adds a regular edge from one node to another
  addEdge(fromId: string, toId: string): Graph {
    // Check if both nodes exist in the graph
    if (this.nodes.has(fromId) && this.nodes.has(toId)) {
      // Create an Edge instance
      const edge: Edge = {
        fromId,
        toId,
        // Optionally add a label or metadata if needed
        label: `Edge from ${fromId} to ${toId}`, // Example label
        metadata: {}, // You can include relevant metadata here if needed
      };

      this.nodes.get(fromId)!.edges?.push(edge);

      console.log("sucessfully");

      // Optionally, store the edge in a separate collection if needed
      // this.edges.push(edge); // Assuming you have an edges array in the Graph class

      return this; // Return the graph instance for method chaining
    } else {
      // Provide a more descriptive error message
      throw new Error(
        `Cannot add edge: Node '${fromId}' or '${toId}' does not exist in the graph.`
      );
    }
  }

  addConditionalEdge(
    fromId: string,
    toIds: string[],
    condition: (state: GraphState, node?: Node) => Promise<string> | string
  ) {
    // Check if the source node exists
    // Check if all target nodes exist
    // Add the conditional edge to the fromNode's conditionalEdges
    if (this.nodes.has(fromId) && toIds.every((id) => this.nodes.has(id))) {
      this.nodes
        .get(fromId)!
        .conditionalEdges?.push({ fromId, toIds, condition });
      return this; // Return the graph instance for method chaining
    } else {
      throw new Error("Both nodes must exist in the graph");
    }
  }
  updateConditionalEdge(fromId: string, toIds: string[]) {
    // Check if the source node exists
    // Check if all target nodes exist
    // Add the conditional edge to the fromNode's conditionalEdges
    let node = this.nodes.get(fromId);

    if (node?.conditionalEdges?.length) {
      const updatedCondition: ConditionalEdge = {
        fromId: fromId, // From this node
        toIds: toIds, // Empty until we define real target nodes
        label: "Default Supervisor Router Condition", // Optional label
        metadata: {}, // Add any necessary metadata
        condition: callSupervisorRouter, // Default condition for this edge
      };

      node!.conditionalEdges = [updatedCondition];

      this.state.nodes.set(fromId, node);
      return this;
    } else {
      throw new Error("Both nodes must exist in the graph");
    }
  }

  // Métodos y propiedades existentes...

  /**
   * Restaura el grafo al estado guardado en el documento Graph en la base de datos.
   * @param graphId ID del grafo a restaurar desde MongoDB.
   * @returns Promesa que resuelve cuando el grafo ha sido restaurado.
   */
  async resetGraphFromDocument(
    graphId: string
  ): Promise<GraphState | undefined> {
    try {
      await mongo.connect();

      // Obtener el documento del grafo desde la base de datos
      const graphDocument = await GraphModel.findById(graphId)
        .populate("nodes") // Popula los nodos para tener acceso completo a la estructura
        .exec();

      if (!graphDocument) {
        throw new Error(`No se encontró el grafo con ID ${graphId}`);
      }

      // Limpiar el estado actual del grafo
      this.nodes.clear(); // Limpia el mapa de nodos actual
      this.state.messages = []; // Limpia los mensajes del estado

      // Add the start and end nodes to the graph
      this.addNode({
        id: this.startNodeId,
        isActive: false,
        type: "start",

        description:
          "Initial Entry Point: Begins the workflow sequence, setting parameters and initializing dependencies. Acts as the primary trigger to activate subsequent nodes in sequence, establishing the scope and context for the entire process.",
        edges: [],
        conditionalEdges: [],
        action: this.startAction,
      });

      this.addNode({
        id: this.endNodeId,
        isActive: false,
        description:
          "Finalization Point: Completes the workflow sequence, capturing results and wrapping up all active processes. This node acts as a boundary exit, ensuring all dependencies are finalized and resources released. Serves as the termination point, providing closure and marking the end of the automation flow.",
        type: "end",

        edges: [],
        conditionalEdges: [],
        action: this.endAction,
      });

      // Restaurar nodos desde el documento de la base de datos
      graphDocument.nodes.forEach((nodeDoc: any) => {
        this.addNode({
          id: nodeDoc.id,
          type: nodeDoc.type,
          edges: nodeDoc.edges,
          conditionalEdges: nodeDoc.conditionalEdges,
          description: nodeDoc.description,
          model: nodeDoc.model,
          visited: nodeDoc.visited,
          role: nodeDoc.role,
          tools: nodeDoc.tools,
          instructions: nodeDoc.instructions,
          metadata: nodeDoc.metadata,
        });
      });

      // Restaurar mensajes desde el documento de la base de datos
      this.state.messages = graphDocument.messages.map((message: any) => ({
        role: message.role,
        content: message.content,
      }));

      // Configurar metadatos y el estado adicional
      this.state.active = false;
      this.state.thread_id = graphDocument.thread_id || null;
      this.state.metadata = graphDocument.metadata;

      console.log(`Grafo con ID ${graphId} restaurado exitosamente.`);
      return this.state;
    } catch (error) {
      console.error("Error al restaurar el grafo desde el documento:", error);
    }
  }

  async resetFromAgent(agentId: string): Promise<Graph> {
    try {
      await mongo.connect();

      // Obtener el documento del grafo desde la base de datos
      const agentDocument = await AgentModel.findById(agentId)
        .populate("nodes") // Popula los nodos para tener acceso completo a la estructura
        .exec();

      if (!agentDocument) {
        throw new Error(`No se encontró el agente con ID ${agentId}`);
      }

      // Limpiar el estado actual del grafo
      this.nodes.clear(); // Limpia el mapa de nodos actual
      this.state.messages = []; // Limpia los mensajes del estado

      // Restaurar nodos desde el documento de la base de datos
      agentDocument.nodes.forEach((nodeDoc: any) => {
        this.addNode({
          id: nodeDoc.id,
          type: nodeDoc.type,
          edges: nodeDoc.edges,
          conditionalEdges: nodeDoc.conditionalEdges,
          description: nodeDoc.description,
          model: nodeDoc.model,
          visited: nodeDoc.visited,
          role: nodeDoc.role,
          tools: nodeDoc.tools,
          instructions: nodeDoc.instructions,
          metadata: nodeDoc.metadata,
        });
      });

      // Configurar metadatos y el estado adicional
      this.state.active = false;
      this.state.thread_id = null;
      this.state.metadata = agentDocument.metadata;

      console.log(`Grafo con Agent ID ${agentId} restaurado exitosamente.`);
      return this;
    } catch (error) {
      console.error("Error al restaurar el grafo desde el documento:", error);
      return this;
    }
  }

  async default(): Promise<GraphState | undefined> {
    try {
      // Limpiar el estado actual del grafo
      this.nodes.clear(); // Limpia el mapa de nodos actual
      this.state.messages = []; // Limpia los mensajes del estado

      // Add the start and end nodes to the graph
      this.addNode({
        id: this.startNodeId,
        isActive: false,
        type: "start",
        description:
          "Initial Entry Point: Begins the workflow sequence, setting parameters and initializing dependencies. Acts as the primary trigger to activate subsequent nodes in sequence, establishing the scope and context for the entire process.",
        edges: [],
        conditionalEdges: [],
        action: this.startAction,
      });

      this.addNode({
        id: this.endNodeId,
        type: "end",
        isActive: false,
        description:
          "Finalization Point: Completes the workflow sequence, capturing results and wrapping up all active processes. This node acts as a boundary exit, ensuring all dependencies are finalized and resources released. Serves as the termination point, providing closure and marking the end of the automation flow.",

        edges: [],
        conditionalEdges: [],
        action: this.endAction,
      });

      // Configurar metadatos y el estado adicional
      this.state.active = false;
      this.state.thread_id = null;
      this.state.metadata = null;

      console.log(`Grafo restaurado exitosamente.`);
      return this.state;
    } catch (error) {
      console.error("Error al restaurar el grafo desde el documento:", error);
    }
  }

  async saveGraphFromState(): Promise<any> {
    // Conexión a la base de datos

    try {
      // Crear documentos de nodos desde el estado
      const nodeDocuments = Array.from(this.state.nodes.values()).map(
        (node) => ({
          ...node,
        })
      );

      nodeDocuments.map((n) => {
        console.log(n.edges);
      });

      // Insertar nodos en la base de datos
      const insertedNodes = await NodeModel.insertMany(nodeDocuments);

      console.log("Nodos guardados en la base de datos:", insertedNodes);

      // Crear documento del grafo
      const agentDocument = new AgentModel({
        id: this.state.id || "default_graph_id",
        nodes: insertedNodes.map((node) => node._id), // Referencia a los IDs de nodos
        metadata: this.state.metadata,
      });

      await agentDocument.save();

      console.log("Agent guardado en la base de datos:", agentDocument);

      return agentDocument;
    } catch (error) {
      console.error("Error guardando el grafo en la base de datos:", error);
      throw new Error("Error guardando el grafo en la base de datos");
    }
  }

  async saveTemplateFromState(): Promise<any> {
    // Conexión a la base de datos

    try {
      // Crear documentos de nodos desde el estado
      const nodeDocuments = Array.from(this.state.nodes.values()).map(
        (node) => ({
          ...node,
        })
      );

      nodeDocuments.map((n) => {
        console.log(n.edges);
      });

      // Insertar nodos en la base de datos
      const insertedNodes = await NodeModel.insertMany(nodeDocuments);

      console.log("Nodos guardados en la base de datos:", insertedNodes);

      // Crear documento del grafo
      const agentDocument = new AgentModel({
        id: this.state.id || "default_graph_id",
        nodes: insertedNodes.map((node) => node._id), // Referencia a los IDs de nodos
        metadata: this.state.metadata,
      });

      await agentDocument.save();

      console.log("Agent guardado en la base de datos:", agentDocument);

      return agentDocument;
    } catch (error) {
      console.error("Error guardando el grafo en la base de datos:", error);
      throw new Error("Error guardando el grafo en la base de datos");
    }
  }

  async updateAgentFromState(graphId: string): Promise<any> {
    try {
      // Verificar si el grafo ya existe
      const existingGraph = await AgentModel.findById(graphId).exec();

      if (!existingGraph) {
        throw new Error(`No se encontró un grafo con ID ${graphId}`);
      }

      // Crear o actualizar los documentos de nodos desde el estado
      const nodeDocuments = Array.from(this.state.nodes.values())
        .filter(
          (node) =>
            node.id !== GraphConfig.START_NODE_ID &&
            node.id !== GraphConfig.END_NODE_ID
        )
        .map((node) => ({
          id: node.id,
          type: node.type,
          edges: node.edges,
          conditionalEdges: node.conditionalEdges,
          description: node.description,
          model: node.model,
          visited: node.visited,
          role: node.role,
          tools: node.tools,
          eventTrigger: node.eventTrigger,
          instructions: node.instructions,
          metadata: node.metadata,
        }));

      // Procesar nodos: Actualizar o insertar según corresponda
      for (const nodeData of nodeDocuments) {
        const existingNode = await NodeModel.findOne({
          id: nodeData.id,
        }).exec();

        if (existingNode) {
          // Actualizar el nodo existente
          await NodeModel.updateOne({ id: nodeData.id }, nodeData).exec();
        } else {
          // Insertar un nuevo nodo
          const newNode = new NodeModel(nodeData);
          await newNode.save();
          existingGraph.nodes.push(newNode._id); // Agregar referencia al grafo
        }
      }

      // Guardar los cambios en el documento del grafo
      const updatedGraph = await existingGraph.save();

      console.log("Grafo actualizado en la base de datos:", updatedGraph);

      return updatedGraph;
    } catch (error) {
      console.error("Error actualizando el grafo en la base de datos:", error);
      throw new Error("Error actualizando el grafo en la base de datos");
    }
  }

  async updateGraphFromState(graphId: string): Promise<any> {
    try {
      // Verificar si el grafo ya existe
      const existingGraph = await GraphModel.findById(graphId).exec();

      if (!existingGraph) {
        throw new Error(`No se encontró un grafo con ID ${graphId}`);
      }

      // Crear o actualizar los documentos de nodos desde el estado
      const nodeDocuments = Array.from(this.state.nodes.values())
        .filter(
          (node) =>
            node.id !== GraphConfig.START_NODE_ID &&
            node.id !== GraphConfig.END_NODE_ID
        )
        .map((node) => ({
          id: node.id,
          type: node.type,
          edges: node.edges,
          conditionalEdges: node.conditionalEdges,
          description: node.description,
          model: node.model,
          visited: node.visited,
          role: node.role,
          tools: node.tools,
          eventTrigger: node.eventTrigger,
          instructions: node.instructions,
          metadata: node.metadata,
        }));

      // Procesar nodos: Actualizar o insertar según corresponda
      for (const nodeData of nodeDocuments) {
        const existingNode = await NodeModel.findOne({
          id: nodeData.id,
        }).exec();

        if (existingNode) {
          // Actualizar el nodo existente
          await NodeModel.updateOne({ id: nodeData.id }, nodeData).exec();
        } else {
          // Insertar un nuevo nodo
          const newNode = new NodeModel(nodeData);
          await newNode.save();
          existingGraph.nodes.push(newNode._id); // Agregar referencia al grafo
        }
      }

      // Guardar los cambios en el documento del grafo
      const updatedGraph = await existingGraph.save();

      console.log("Grafo actualizado en la base de datos:", updatedGraph);

      return updatedGraph;
    } catch (error) {
      console.error("Error actualizando el grafo en la base de datos:", error);
      throw new Error("Error actualizando el grafo en la base de datos");
    }
  }

  compile(): Graph {
    this.validateNodes();
    this.reorderEndNode();

    // If all checks pass, the graph is ready for execution
    console.log("Graph compiled successfully and is ready for execution.");
    return this;
  }

  async streamEvents({
    thread_id = null,
    metadata = null,
    prompt = null,
    maxIterations = 6,
    messages = null,
  }: InvokeParams) {
    // Check if the starting node exists
    const startNode = this.nodes.get(GraphConfig.START_NODE_ID);
    if (!startNode) {
      throw new Error(
        `Start node with ID '${GraphConfig.START_NODE_ID}' does not exist.`
      );
    }

    this.state.active = true;
    this.state.thread_id = thread_id;
    this.state.metadata = metadata;
    this.state.prompt = prompt;
    this.state.currentNodeId = GraphConfig.START_NODE_ID;

    if (messages) {
      this.eventEmitter.emit(
        GraphConfig.EVENTS.STATE_GRAPH_UPDATED,
        graphStateEvent(this.state)
      );
      this.state.messages = [...messages];
    }

    if (prompt?.role && prompt.content) {
      this.eventEmitter.emit(
        GraphConfig.EVENTS.STATE_GRAPH_UPDATED,
        graphStateEvent(this.state)
      );
      this.state.messages = [...this.state.messages, prompt];
    }

    this.eventEmitter.emit(
      GraphConfig.EVENTS.STATE_GRAPH_UPDATED,
      graphStateEvent(this.state)
    );

    let iterationCount = 0;
    while (true) {
      if (!this.state.currentNodeId) break;

      let NODE = this.state.nodes.get(this.state.currentNodeId);

      if (!NODE) {
        throw new Error(
          `Node with ID ${this.state.currentNodeId} does not exist.`
        );
      }

      //Activate Node and clear state nodes
      this.state.nodes.set(NODE.id, { ...NODE, isActive: true }); // Mark the current node as active

      this.eventEmitter.emit(
        GraphConfig.EVENTS.STATE_GRAPH_UPDATED,
        graphStateEvent(this.state)
      );

      // Visit the current node

      await this.visitNode(this.state.currentNodeId);

      this.state.nodes.set(NODE.id, { ...NODE, isActive: false }); // Mark the current node as active

      // If the END node is reached, terminate the loop
      if (this.state.currentNodeId === GraphConfig.END_NODE_ID) break;

      // Increment the iteration count and check for max iterations
      iterationCount++;
      if (maxIterations && iterationCount >= maxIterations) {
        console.warn(
          "Max iterations reached. Terminating to prevent infinite loop."
        );
        break;
      }

      await this.getNextNodeId(this.state.currentNodeId);
      this.eventEmitter.emit(
        GraphConfig.EVENTS.STATE_GRAPH_UPDATED,
        graphStateEvent(this.state)
      );
    }

    this.state.active = false;
    const finalMessage = this.state.messages[this.state.messages.length - 1];

    console.log(finalMessage);
    this.eventEmitter.emit(
      GraphConfig.EVENTS.STATE_GRAPH_UPDATED,
      graphStateEvent(this.state)
    );
    /*     this.eventEmitter.emit(
      GraphConfig.EVENTS.STATE_GRAPH_UPDATED,
      graphStateEvent(this.state)
    ); */
  }

  async run({
    thread_id = null,
    metadata = null,
    prompt = null,
    maxIterations = 6,
    messages = null,
  }: InvokeParams) {
    // Check if the starting node exists
    const startNode = this.nodes.get(GraphConfig.START_NODE_ID);
    if (!startNode) {
      throw new Error(
        `Start node with ID '${GraphConfig.START_NODE_ID}' does not exist.`
      );
    }

    this.state.active = true;
    this.state.thread_id = thread_id;
    this.state.metadata = metadata;
    this.state.prompt = prompt;
    this.state.currentNodeId = GraphConfig.START_NODE_ID;

    if (prompt) {
      this.state.messages = [...this.state.messages, prompt];
    }

    if (messages) {
      this.state.messages = [...messages];
    }

    let iterationCount = 0;

    while (true) {
      if (!this.state.currentNodeId) break;

      let NODE = this.state.nodes.get(this.state.currentNodeId);

      if (!NODE) {
        throw new Error(
          `Node with ID ${this.state.currentNodeId} does not exist.`
        );
      }

      //Activate Node and clear state nodes
      this.state.nodes.set(NODE.id, { ...NODE, isActive: true }); // Mark the current node as active

      // Visit the current node
      await this.visitNode(this.state.currentNodeId);

      this.state.nodes.set(NODE.id, { ...NODE, isActive: false }); // Mark the current node as active

      this.eventEmitter.emit(
        GraphConfig.EVENTS.STATE_GRAPH_UPDATED,
        graphStateEvent(this.state)
      );

      // If the END node is reached, terminate the loop
      if (this.state.currentNodeId === GraphConfig.END_NODE_ID) break;

      // Increment the iteration count and check for max iterations
      iterationCount++;
      if (maxIterations && iterationCount >= maxIterations) {
        console.warn(
          "Max iterations reached. Terminating to prevent infinite loop."
        );
        break;
      }

      await this.getNextNodeId(this.state.currentNodeId);
    }

    this.state.active = false;

    const finalMessage = this.state.messages[this.state.messages.length - 1];

    if (finalMessage && finalMessage.role !== "assistant") {
      return null;
    }

    return finalMessage ? finalMessage.content : "";
  }

  private async visitNode(nodeId: string) {
    console.log({ nodeId });
    // Check if the node exists
    const node = this.nodes.get(nodeId);
    if (!node) {
      console.error(`Node with ID ${nodeId} does not exist.`);
      return; // Early exit if the node is not found
    }

    //Executing Actions
    let response = await this.execute(node);

    console.log({ response });

    if (response) this.handleResponse(response, node);

    return;
  }

  private async execute(node: Node): Promise<NodeResponse<any>> {
    try {
      const data = node.action && (await node.action(this.state, node));

      return { success: true, data };
    } catch (error) {
      console.error(`Error executing action for node ${node.id}:`, error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      };
    }
  }

  private handleResponse(response: NodeResponse<any>, node: Node) {
    if (response.success) {
      // Process successful response

      switch (node.type) {
        case "completion.model":
          this.completion(response.data);
          break;
        case "supervisor.router":
          return;
        case "tool":
          return this.addMessages(response.data);
        case "webhook":
          return;
        case "completion.tool_call.redirect":
          this.completion(response.data);
          break;
        default:
          return;
      }
      // Additional logic based on the data type can go here
    } else {
      // Handle error case
      console.error("Error:", response.error);
    }
  }

  private addMessages(messages: OpenAI.Chat.ChatCompletionMessage[]) {
    this.state.messages = [...this.state.messages, ...(messages as Message[])];
  }

  private completion(response: any) {
    let msg = this.hasChoices(response);
    if (msg) this.message(msg);
  }

  private message(msg: OpenAI.Chat.ChatCompletionMessage) {
    this.state.messages = [...this.state.messages, msg as Message];
  }

  private hasChoices(response: any) {
    if (
      response.choices.length > 0 &&
      (response.choices[0].message as OpenAI.Chat.ChatCompletionMessage)
    ) {
      return response.choices[0].message as OpenAI.Chat.ChatCompletionMessage;
    }
    return false;
  }

  private async getNextNodeId(nodeId: string): Promise<void> {
    let node = this.nodes.get(nodeId);

    if (node?.conditionalEdges) {
      // Check conditional edges first
      for (const condEdge of node.conditionalEdges) {
        const nextNodeId = await condEdge.condition(this.state, node);
        console.log(nextNodeId);
        if (nextNodeId && this.nodes.has(nextNodeId)) {
          this.state.currentNodeId = nextNodeId; // Return the first valid conditional edge
          return;
        }
      }
    }

    if (node?.edges) {
      // If no conditional edges were valid, check regular edges
      for (const edge of node.edges) {
        if (this.nodes.has(edge.toId)) {
          this.state.currentNodeId = edge.toId;
          return;
          // Return the first valid regular edge
        }
      }
    }

    this.state.currentNodeId = null; // No next node found
    return;
  }

  private validateNodes(): void {
    // Check for the presence of start and end nodes
    if (!this.nodes.has(GraphConfig.START_NODE_ID)) {
      throw new Error(
        `Graph must include a start node with ID '${GraphConfig.START_NODE_ID}'.`
      );
    }

    if (!this.nodes.has(GraphConfig.END_NODE_ID)) {
      throw new Error(
        `Graph must include an end node with ID '${GraphConfig.END_NODE_ID}'.`
      );
    }

    this.nodes.forEach((node) => {
      let hasEdges = false;
      node.edges?.forEach(({ toId }) => {
        if (!this.nodes.has(toId)) {
          throw new Error(
            `Node '${node.id}' has an edge to non-existing node '${toId}'.`
          );
        }
        hasEdges = true;
      });

      node.conditionalEdges?.forEach((condEdge) => {
        condEdge.toIds.forEach((toId) => {
          if (!this.nodes.has(toId)) {
            throw new Error(
              `Conditional edge from '${node.id}' to non-existing node '${toId}'.`
            );
          }
          hasEdges = true;
        });
      });
    });
  }

  private reorderEndNode(): void {
    const endNode = this.nodes.get(GraphConfig.END_NODE_ID);
    this.nodes.delete(GraphConfig.END_NODE_ID);
    this.nodes.set(GraphConfig.END_NODE_ID, endNode!);
  }

  onStateChange(listener: (state: GraphState) => void) {
    this.eventEmitter.on(GraphConfig.EVENTS.STATE_GRAPH_UPDATED, listener);
  }

  offStateChange(listener: (state: GraphState) => void) {
    this.eventEmitter.off(GraphConfig.EVENTS.STATE_GRAPH_UPDATED, listener);
  }

  getGraphNodes(): Node[] {
    return Array.from(this.nodes.values());
  }
  getState() {
    console.log(this.state);
    let state = {
      ...this.state,
      _nodes: Array.from(this.state.nodes.entries()).map(([id, data]) => ({
        ...data,
      })),
    };

    return state;
  }
}

async function callToolCondition(state: GraphState, node?: Node) {
  if (state.messages[state.messages.length - 1].tool_calls) {
    return state.messages?.[state.messages.length - 1]?.tool_calls?.[0]
      ?.function?.name;
  }

  return GraphConfig.END_NODE_ID;
}
