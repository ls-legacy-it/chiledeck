import axios from "axios";

import { config } from "./config/config";
import { ChatModel } from "./database/chat.model";
import { PipelineModel } from "./database/crm.model";
import { connectMongo } from "./database/mongodb";
import { SESSION_ID } from "./main";
import { sleep } from "./ws.actions";

// Function to get chats that need follow-up
async function getChatsToFollowUp(pipeline: any, hours: number) {
  const now = new Date();

  const chats = await ChatModel.find({
    _id: { $in: pipeline.chats },
  })
    .populate({
      path: "messages",
      options: { sort: { timestamp: -1 } }, // Sort messages by latest
    })
    .lean();

  console.log({ chats });

  return chats.filter((chat) => {
    const lastMessage = chat.messages.filter((c: any) => c.role === "user")[0];

    if (!lastMessage) return false;

    const timeDiff = now - new Date(lastMessage.timestamp);
    const hoursDiff = timeDiff / (60 * 60 * 1000);

    console.log({ hoursDiff });

    return hoursDiff >= hours;
  });
}

// Function to process pipelines and send messages
export async function processPipelines() {
  try {
    console.log("Connecting to MongoDB...");
    await connectMongo();

    console.log("Fetching the pipeline...");
    const pipeline = await PipelineModel.findOne({
      sessionId: SESSION_ID,
    });

    if (!pipeline || !pipeline.chats || pipeline.chats.length === 0) {
      console.log("No active pipeline or chats found.");
      return;
    }

    console.log("Identifying chats for follow-up...");
    const chats_4hr = await getChatsToFollowUp(pipeline, 4);
    const chats_24hr = await getChatsToFollowUp(pipeline, 24);

    if (chats_4hr.length === 0) {
      console.log("No chats require follow-up.");
      return;
    }

    console.log(`Processing ${chats_4hr.length} chats...`);
    for (const chat of chats_4hr) {
      if (!chat.followUpHistory || chat.followUpHistory.length === 0) {
        continue;
      }
      //First Step
      let four = chat.followUpHistory.filter((f: any) => f.step === "4hr")[0];

      //First Validation
      if (four && !four.isSent) {
        const message = pipeline.steps[0].messageTemplate;
        await sleep(2000);
        await axios.post(
          `https://chiledeck.mocca-ia.cl/api/send-message`,
          {
            body: message,
            chatId: chat.chatId,
          },
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        await ChatModel.findByIdAndUpdate(chat._id, {
          $set: {
            followUpHistory: [
              { step: "4hr", isSent: true },
              { step: "24hr", isSent: false },
            ],
          },
        });
      }
    }

    if (chats_24hr.length === 0) {
      console.log("No chats require follow-up.");
      return;
    }

    for (const chat of chats_24hr) {
      console.log("Entering 24hours");
      if (!chat.followUpHistory || chat.followUpHistory.length === 0) {
        continue;
      }
      //First Step
      //Second Step
      let twenty_four = chat.followUpHistory.filter(
        (f: any) => f.step === "24hr"
      )[0];

      if (twenty_four && !twenty_four.isSent) {
        const message = pipeline.steps[1].messageTemplate;

        console.log("NOT SENDED 24hours");
        await sleep(2000);

        await axios.post(
          `https://chiledeck.mocca-ia.cl/api/send-message`,
          {
            body: message,
            chatId: chat.chatId,
          },
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        await ChatModel.findByIdAndUpdate(chat._id, {
          $set: {
            followUpHistory: [
              { step: "4hr", isSent: true },
              { step: "24hr", isSent: true },
            ],
          },
        });
        return;
      }
    }

    return;
  } catch (error) {
    console.error("Error processing pipelines:", error);
  }
}
