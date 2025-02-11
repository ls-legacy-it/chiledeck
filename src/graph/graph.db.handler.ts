import { connect } from "mongoose"; // Import Mongoose for MongoDB
import { GraphModel, NodeModel } from "../database/graph.model"; // Import your database models
import { GraphState } from "./types";

export class GraphDatabaseHandler {
  /**
   * Guarda el estado del grafo en la base de datos.
   * @param graphState Estado del grafo a guardar.
   * @returns El documento del grafo guardado.
   */
  async saveGraphFromState(graphState: GraphState): Promise<any> {
    // Conexión a la base de datos

    try {
      // Crear documentos de nodos desde el estado
      const nodeDocuments = Array.from(graphState.nodes.values()).map(
        (node) => ({
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
        })
      );

      // Insertar nodos en la base de datos
      const insertedNodes = await NodeModel.insertMany(nodeDocuments);

      console.log("Nodos guardados en la base de datos:", insertedNodes);

      // Crear documento del grafo
      const graphDocument = new GraphModel({
        id: graphState.thread_id || "default_graph_id",
        nodes: insertedNodes.map((node) => node._id), // Referencia a los IDs de nodos
        active: graphState.active,
        messages: graphState.messages,
        metadata: graphState.metadata,
      });

      // Guardar el grafo en la base de datos
      const savedGraph = await graphDocument.save();

      console.log("Grafo guardado en la base de datos:", savedGraph);

      return savedGraph;
    } catch (error) {
      console.error("Error guardando el grafo en la base de datos:", error);
      throw new Error("Error guardando el grafo en la base de datos");
    }
  }
}
