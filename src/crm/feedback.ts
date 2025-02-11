import { Feedback } from "./types";
export class FeedbackManager {
  private feedbacks: Feedback[] = [];

  // Método para solicitar comentarios de satisfacción
  public requestFeedback(customerId: string): void {
    // Simulación de envío de encuesta al cliente
    console.log(`Enviando encuesta de satisfacción al cliente ${customerId}`);
    // Aquí podrías integrar con un servicio de encuestas (por ejemplo, un correo electrónico o un SMS)
  }

  // Retrieves feedbacks for a specific customer by their ID
  public getFeedbackByCustomerId(customerId: string): Feedback[] {
    return this.feedbacks.filter(
      (feedback) => feedback.customerId === customerId
    );
  }

  // Método para recibir comentarios de los clientes
  public collectFeedback(feedback: Feedback): void {
    this.feedbacks.push({ ...feedback });
    console.log(
      `Comentarios recibidos de ${feedback.customerId}: ${feedback.comments} con una calificación de ${feedback.rating}`
    );
  }

  // Método para analizar comentarios (puedes expandir esta lógica)
  public analyzeFeedback(): void {
    const totalRatings = this.feedbacks.reduce(
      (sum, feedback) => sum + feedback.rating,
      0
    );
    const averageRating = totalRatings / this.feedbacks.length;

    console.log(`Calificación promedio de satisfacción: ${averageRating}`);
    // Aquí podrías implementar más análisis, como tendencias en comentarios o categorización
  }
}
