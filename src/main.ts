import OpenAI from "openai";
import path from "path";
import { Whatsapp, client } from ".";
import { Graph } from "./graph/graph";
import { initServer } from "./http";
import fs from "fs";
import { connectMongo } from "./database/mongodb";
import { Message } from "./types";
import cron from "node-cron";
import { processPipelines } from "./pipeline";

export const PUBLIC_NAME = "CHILE DECK";

export const AGENT_ID = "67a64dcc471a5bfba490312f";
export const SESSION_ID = "67a64d85471a5bfba490310d";
export const SESSION_NAME = "chiledeck:ws:session";
export const SESSION = `sessions/${SESSION_NAME}`;
export const ALL_INCOMING_MESSAGES = "*";
export const AMERICA_SANTIAGO = "America/Santiago";
export const USER_ID = "67a64d03471a5bfba49030f2";

async function main() {
  //Socket initialization
  const bot = new Whatsapp(SESSION);

  bot
    .addKeyword(ALL_INCOMING_MESSAGES)
    .addAction(async (chatId: string, messageHistory: Message[]) => {
      let date = new Date().toLocaleDateString("es-CL", {
        timeZone: AMERICA_SANTIAGO,
      });
      let messages = bot.chatsState[chatId].messageHistory;
      let graph = await new Graph().resetFromAgent(AGENT_ID);
      if (messages.length > 31) {
        messages = messages.slice(messages.length - 31); // Solo mantenemos los últimos 31 mensajes
      }

      console.log(graph);
      let response = await graph.run({
        messages,
        metadata: { date },
        thread_id: chatId,
      });
      if (response) {
        await bot.sendMessage(chatId, response);
      }
    });

  await connectMongo();
  initServer({ bot });

  cron.schedule("1 * * * *", async () => {
    console.log("[Cron Job] Checking time before executing...");

    // Obtener la hora actual en la zona horaria America/Santiago
    // Obtener la hora actual en la zona horaria America/Santiago
    const now = new Date();
    const santiagoTime = new Intl.DateTimeFormat("es-CL", {
      timeZone: "America/Santiago",
      hour: "numeric", // "numeric" en vez de "2-digit" para evitar strings innecesarios
      hourCycle: "h23",
    }).formatToParts(now);

    // Extraer la hora como número
    const currentHour = parseInt(
      santiagoTime.find((part) => part.type === "hour")?.value || "0",
      10
    );

    // Ejecutar solo si la hora está entre 08:00 y 23:00
    if (currentHour >= 8 && currentHour < 23) {
      console.log("[Cron Job] Starting follow-up pipeline processing...");

      try {
        await processPipelines();
        console.log("[Cron Job] Follow-up pipeline processing completed.");
      } catch (error) {
        console.error("[Cron Job] Error processing pipelines:", error);
      }
    } else {
      console.log(
        `[Cron Job] Skipped: Current time ${santiagoTime} is outside the allowed range (08:00 - 23:00).`
      );
    }
  });
}

main();
