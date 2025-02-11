// src/lib/mongo.ts

import mongoose from "mongoose";
import { config } from "../config/config";

const MONGO_URI = config.MONGO_URI; // Asegúrate de configurar correctamente tu URI

// Almacenar la conexión
let cachedDb: mongoose.Connection | null = null;

async function connectMongo(): Promise<mongoose.Connection> {
  if (cachedDb) {
    return cachedDb; // Si ya está conectada, devolver la conexión
  }

  try {
    // Conectar a MongoDB
    const connection = await mongoose.connect(MONGO_URI);
    cachedDb = connection.connection; // Guardar la conexión para futuras consultas
    console.log("MongoDB conectado");
    return cachedDb;
  } catch (error) {
    console.error("Error al conectar con MongoDB:", error);
    throw new Error("Error al conectar con MongoDB");
  }
}

export { connectMongo };
