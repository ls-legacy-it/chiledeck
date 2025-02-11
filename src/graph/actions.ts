import { client } from "./graph";
import { GraphState, Message, Node } from "./types";
import OpenAI from "openai";
import { zodFunction, zodResponseFormat } from "openai/helpers/zod";

import { z } from "zod";

export async function callModel(state: GraphState, node: Node) {
  try {
    let thread_messages: Message[] = [...state.messages];

    if (node.instructions?.length) {
      thread_messages = [node.instructions[0], ...state.messages];
    }

    let response = await client.chat.completions.create({
      model: node.model as OpenAI.Chat.ChatModel,
      messages:
        thread_messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      temperature: 0.1,
    });

    return response;
  } catch (err) {
    console.log(err);
    throw new Error(`${err}`);
  }
}

export async function callSupervisorRouter(
  state: GraphState,
  node?: Node
): Promise<string> {
  if (!node) {
    return "END"; // Return a default value
  }
  try {
    let thread_messages: Message[] = [...state.messages];
    let toIds: string[] = [];

    // Safeguard: Ensure the node has conditionalEdges and toIds.

    if (node.conditionalEdges?.length) {
      toIds = node.conditionalEdges[0].toIds;
    }

    // Ensure toIds is not empty, throw error if it is
    if (!toIds.length) {
      console.error("No valid 'toIds' found for supervisor.router.");
      return "END"; // Default fallback if no toIds are available
    }

    const routerTool = z.object({
      next: z.enum(toIds as [string, ...string[]]), // Ensure the array is non-empty
    });

    console.log({ toIds });

    // Optionally include instructions in the thread of messages

    if (node.instructions?.length) {
      thread_messages = [node.instructions[0], ...state.messages];
    }

    let response = await client.chat.completions.create({
      model: node.model as OpenAI.Chat.ChatModel,
      messages:
        thread_messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      response_format: zodResponseFormat(routerTool, "router"),
    });

    // Handle the response from the model
    if (response.choices[0].message.content) {
      console.log(response.choices[0].message.content);
      try {
        // Attempt to parse the response
        let output = JSON.parse(response.choices[0].message.content);
        if (output && output.next) {
          console.log(output);
          return output.next; // Return the next node ID from the output
        }
      } catch (jsonError) {
        console.error("Error parsing response content", jsonError);
        return "END";
      }
    }

    return "END";
  } catch (err) {
    console.log(err);
    return "END";
  }
}

export const callRedirectAgent = async (state: GraphState, node: Node) => {
  const notificationSchema = z.object({
    clientName: z.string().describe("El nombre del cliente es requerido"),
    clientEmail: z.string().describe("El email del cliente es requerido"),
    clientRut: z.string().describe("El Rut del cliente es requerido"),
    reason: z.string().describe("El motivo de contacto es requerido"),
  });

  const tools = [
    zodFunction({
      name: "redirect",
      parameters: notificationSchema,
    }),
  ];

  let date = new Date().toLocaleDateString("es-CL", {
    timeZone: "America/Santiago",
  });

  let time = new Date().toLocaleTimeString("es-CL", {
    timeZone: "America/Santiago",
  });

  let thread_messages: Message[] = [...state.messages];

  if (node.instructions?.length) {
    thread_messages = [
      node.instructions[0],
      ...state.messages,
      { role: "system", content: `FECHA Y HORA: ${date}-${time}` },
    ];
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages:
        thread_messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      tools: tools as OpenAI.Chat.Completions.ChatCompletionTool[],
      tool_choice: "auto",
      parallel_tool_calls: false,
      temperature: 0.2,
    });

    console.log(response);

    return response;
  } catch (err) {
    console.error("Error calling OpenAI:", err);
    throw new Error("Error calling OpenAI:");
  }
};
