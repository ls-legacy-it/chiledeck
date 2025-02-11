import { CustomNotification } from "./types";

export class NotificationSystem {
  private notifications: CustomNotification[] = [];

  // Add a new notification
  addNotification(
    message: string,
    type: "message" | "leadUpdate" | "journeyUpdate",
    customerId?: string
  ) {
    const notification: CustomNotification = {
      id: `${Date.now()}`,
      body: message,
      message,
      type,
      customerId,
      timestamp: new Date(),
      icon: "default-icon.png",
    };

    this.notifications.push(notification);
    this.showNotification(notification);
  }

  // Show notification to user (using a placeholder for actual display logic)
  showNotification(notification: CustomNotification) {
    console.log(`New Notification: ${notification.body}`);
  }

  sendNotification(customerId: string, message: string) {
    this.addNotification(message, "message", customerId);
  }

  // Method to retrieve all notifications
  getAllNotifications(): CustomNotification[] {
    return this.notifications;
  }
}
