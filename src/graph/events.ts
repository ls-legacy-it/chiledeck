import { GraphConfig } from "./graph";
import { GraphState } from "./types";

export class EventEmitter {
  private events: { [event: string]: ((args: any) => void)[] };

  constructor() {
    this.events = {};
  }

  /**
   * Registra un oyente para un evento específico.
   * @param event Nombre del evento.
   * @param listener Función que se ejecutará cuando se emita el evento.
   */
  on(event: string, listener: (args: any) => void) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  /**
   * Emite un evento y ejecuta todos los oyentes registrados.
   * @param event Nombre del evento.
   * @param args Argumentos que se pasarán a los oyentes.
   */
  emit(event: string, args: any) {
    if (this.events[event]) {
      this.events[event].forEach((listener) => listener(args));
    }
  }

  /**
   * Elimina un oyente registrado para un evento específico.
   * @param event Nombre del evento.
   * @param listener Función que se eliminará.
   */
  off(event: string, listener: (args: any) => void) {
    if (!this.events[event]) return;

    this.events[event] = this.events[event].filter((l) => l !== listener);
  }
}

// Crear una instancia de EventEmitter

export function graphStateEvent(state: GraphState) {
  let dataEvent = {
    ...state,
    _nodes: Array.from(state.nodes.entries()).map(([id, data]) => ({
      ...data,
    })),
  };
  const stateUpdateMessage = `event: ${
    GraphConfig.EVENTS.STATE_GRAPH_UPDATED
  }\ndata: ${JSON.stringify(dataEvent)}\n\n`;

  return stateUpdateMessage;
}
