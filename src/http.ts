import express, { Request, Response } from "express";
import cors from "cors";

import { Whatsapp } from ".";
import { sendImage } from "./ws.actions";
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8014;

export const initServer = ({ bot }: { bot: Whatsapp }) => {
  app.get("/", async (req: Request, res: Response) => {
    res.status(200).send("Connected");
  });

  app.post("/api/send-message", async (req: Request, res: Response) => {
    try {
      const { body, chatId } = req.body;

      await bot.sendMessage(chatId, body);
      res.status(200).send({ status: "Completed" });
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  });
  app.post("/api/send-image", async (req: Request, res: Response) => {
    try {
      const { url, chatId } = req.body;

      await bot.sendImage(chatId, url);
      res.status(200).send({ status: "Completed" });
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  });

  app.get("/api/get-connection", async (req: Request, res: Response) => {
    console.log("GET");
    if (bot.state === "open") {
      res.status(200).send("open");
      return;
    }

    let qr = bot.getQR();
    res.status(200).send(qr);
  });

  /*   app.post("/api/followup", async (req: Request, res: Response) => {
    try {
      const { chatId } = req.body;

      await bot.sendFollowupAudio(chatId);
      res.status(200).send({ status: "Completed" });
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  }); */

  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
};
