import axios from "axios";
import { config } from "../../config/config";
import { ChatModel } from "../../database/chat.model";
import { InteractionModel } from "../../database/crm.model";
import { WSSessionModel } from "../../database/ws.sessions.model";
import { AGENT_ID, PUBLIC_NAME, SESSION_ID, USER_ID } from "../../main";
import { GraphState, Node } from "../types";

class RedirectConfig {
  static readonly ID = "redirect";
  static readonly TYPE = "tool";
  static readonly NOTIFICATION_ENDPOINT = `https://chiledeck.mocca-ia.cl/api/send-message`;
}

export const redirectTool = async (state: GraphState) => {
  let args;
  let tool_call_id;

  let finalMessage = state.messages[state.messages.length - 1];

  if (finalMessage && finalMessage.tool_calls?.length) {
    let tool_calls = finalMessage.tool_calls[0];
    args = tool_calls.function.arguments;
    tool_call_id = tool_calls.id;
    args = JSON.parse(args);
    console.log({ args });
  }

  //Crear una conversación
  await InteractionModel.create({
    type: "redirect",
    timestamp: new Date().toISOString(),
    details: args.reason,
    link: "",
    email: args.clientEmail,
    relatedMessageId: null,
    relatedNotificationId: null,
    journeyStage: null,
    agentId: AGENT_ID,
    chatId: state.thread_id,
    userId: USER_ID,
  });

  let phone_number = `${state.thread_id?.split("@")[0]}`;

  const notificationTemplate = `
  📢 *Notificación de Atención Requerida*  
  👤 *Cliente:* ${args.clientName}  
  📧 *Rut del Cliente:* ${args.clientRut}  
  📧 *Email del Cliente:* ${args.clientEmail}  
  📝 *Motivo de contacto:* ${args.reason}  
  ⏰ *Fecha y hora de solicitud:* ${new Date().toLocaleTimeString("es-CL", {
    timeZone: "America/Santiago",
  })}  
  
  📱 *Chat ID:* 
  https://wa.me/${phone_number}   
  
  🔔 *Equipo,* por favor asignar a alguien para atender esta solicitud lo antes posible. 🚀
  `;
  try {
    // if(tool.notify) Notificando por whatsapp
    await fetch(RedirectConfig.NOTIFICATION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: notificationTemplate,
        chatId: "56932184706@s.whatsapp.net", // ,
      }),
    });
  } catch (err) {
    console.log(err);
  }

  try {
    // if(tool.notify) Notificando por whatsapp
    await fetch(RedirectConfig.NOTIFICATION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: notificationTemplate,
        chatId: "56932646486@s.whatsapp.net", // ,
      }),
    });
  } catch (err) {
    console.log(err);
  }

  try {
    // if(tool.notify) Notificando por whatsapp
    await fetch(RedirectConfig.NOTIFICATION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: notificationTemplate,
        chatId: "56982100847@s.whatsapp.net", // ,
      }),
    });
  } catch (err) {
    console.log(err);
  }

  // if(tool.pause) Pausando el agente
  await WSSessionModel.findByIdAndUpdate(
    SESSION_ID,
    {
      $push: {
        ignore: state.thread_id, // `newNumber` is the value you want to push into the `ignore` array
      },
    },
    { new: true } // Optionally, return the updated document
  );

  try {
    await ChatModel.findOneAndUpdate(
      {
        chatId: state.thread_id,
        sessionId: SESSION_ID,
      },
      {
        followUpHistory: [
          { step: "4hr", isSent: true },
          { step: "24hr", isSent: true },
        ],
      }
    );
  } catch (err) {
    console.log(err);
  }

  return [
    {
      role: "tool",
      content: `🎉 ¡Gracias por compartir tus datos! 🚀 Nuestro equipo ya está trabajando en tu solicitud y en menos de 24 horas recibirás la respuesta en tu correo. 📩`,
      tool_call_id,
    },
  ];
};

export const redirect: Node = {
  id: RedirectConfig.ID,
  type: RedirectConfig.TYPE,
  action: redirectTool,
};
