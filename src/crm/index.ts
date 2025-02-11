// Example usage
// ... [Existing CRM and interface code]

import { CRM } from "./core.crm";
import {
  Customer,
  Feedback,
  Interaction,
  Lead,
  Permission,
  Pipeline,
  User,
  UserRole,
} from "./types";

const crm = new CRM();

const user1: User = {
  id: "1",
  name: "User1",
  role: UserRole.Admin,
  permissions: [
    Permission.ViewCustomers,
    Permission.AddCustomer,
    Permission.DeleteCustomer,
  ],
};
const user2: User = {
  id: "2",
  name: "User2",
  role: UserRole.Sales,
  permissions: [Permission.ViewCustomers, Permission.SendMessage],
};

crm.addUser(user1);
crm.addUser(user2);

// Adding customers with journey tracking
const alice: Customer = {
  id: "1",
  name: "Alice",
  email: "alice@example.com",
  journey: [],
};
const bob: Customer = {
  id: "2",
  name: "Bob",
  email: "bob@example.com",
  journey: [],
};

crm.addCustomer(user1, alice);
crm.addCustomer(user2, bob);

// Adding journey stages for Alice
crm.addJourneyStage("1", "Awareness", "Alice signed up for the newsletter.");
crm.addJourneyStage("1", "Consideration", "Alice attended a webinar.");

// Adding messaging for Alice
crm.addMessage("1", "Hi Alice, how can we help you today?", "system");
crm.addMessage("1", "I would like to know more about your services.", "user");

// Adding leads
crm.addLead({
  id: "l1",
  name: "Charlie",
  email: "charlie@example.com",
  status: "new",
});
crm.addLead({
  id: "l2",
  name: "David",
  email: "david@example.com",
  status: "contacted",
});

// Updating a customer
crm.updateCustomer("1", { phone: "987-654-3210" });

// Updating a lead's status
crm.updateLeadStatus("l1", "converted");

// Adding multiple pipelines
const salesPipeline: Pipeline = {
  id: "pipeline-1",
  name: "Sales Pipeline",
  stages: [
    { id: "stage-1", name: "Lead", order: 1 },
    { id: "stage-2", name: "Contacted", order: 2 },
    { id: "stage-3", name: "Qualified", order: 3 },
    { id: "stage-4", name: "Proposal", order: 4 },
    { id: "stage-5", name: "Closed", order: 5 },
  ],
};

const marketingPipeline: Pipeline = {
  id: "pipeline-2",
  name: "Marketing Pipeline",
  stages: [
    { id: "stage-1", name: "Awareness", order: 1 },
    { id: "stage-2", name: "Interest", order: 2 },
    { id: "stage-3", name: "Consideration", order: 3 },
    { id: "stage-4", name: "Intent", order: 4 },
    { id: "stage-5", name: "Evaluation", order: 5 },
    { id: "stage-6", name: "Purchase", order: 6 },
  ],
};

const supportPipeline: Pipeline = {
  id: "pipeline-3",
  name: "Support Pipeline",
  stages: [
    { id: "stage-1", name: "New Ticket", order: 1 },
    { id: "stage-2", name: "In Progress", order: 2 },
    { id: "stage-3", name: "Resolved", order: 3 },
    { id: "stage-4", name: "Closed", order: 4 },
  ],
};

// Add pipelines to the CRM
crm.addPipeline(salesPipeline);
crm.addPipeline(marketingPipeline);
crm.addPipeline(supportPipeline);

// Assigning leads to pipeline stages
crm.assignLeadToPipelineStage("l1", "stage-2"); // Charlie moves to 'Contacted' stage

// Adding message templates
crm.addMessageTemplate({
  id: "template-1",
  name: "Welcome Message",
  content: "Hello {name}, welcome to our service! We're glad to have you here.",
});

crm.addMessageTemplate({
  id: "template-2",
  name: "Follow-up Message",
  content:
    "Hi {name}, just checking in to see how you’re doing. Let us know if you need anything!",
});

// Using a template to send a message to a customer
crm.sendMessageUsingTemplate("template-1", "1"); // Sending to Alice

// Retrieving all message templates

crm.setCustomField("1", "preferences", {
  newsletter: true,
  contactMethod: "email",
});
crm.setCustomField("1", "specialNotes", "VIP customer with special discounts.");

// Retrieving a custom field
const preferences = crm.getCustomField("1", "preferences");
const specialNotes = crm.getCustomField("1", "specialNotes");
console.log(`Alice's preferences:`, preferences);
console.log(`Alice's preferences:`, specialNotes);

// Removing a custom field
/* crm.removeCustomField("1", "specialNotes"); */
crm.addTask({
  id: "task-1",
  title: "Follow up with Alice about her inquiry",
  customerId: "1",
  dueDate: new Date("2024-11-10"),
  priority: "high",
  status: "pending",
});

crm.addTask({
  id: "task-2",
  title: "Send marketing email to Alice",
  customerId: "1",
  dueDate: new Date("2024-11-15"),
  priority: "medium",
  status: "pending",
});

// Retrieving tasks for Alice
const tasksForAlice = crm.getTasksForCustomer("1");
console.log("Tasks for Alice:", tasksForAlice);

// Updating a task status
crm.updateTaskStatus("task-1", "completed");

// Removing a task
crm.removeTask("task-2");

// Retrieve all tasks to see the current state
console.log("All tasks:", crm.getAllTasks());

// Example: Adding a message interaction
const messageInteraction: Interaction = {
  type: "message",
  timestamp: new Date(),
  details: "Sent a follow-up message regarding the inquiry.",
  relatedMessageId: "1-1234567890", // Assuming this is the ID of the sent message
  journeyStage: "consideration", // Link to the current journey stage
};

crm.addMessage("1", "Follow up on your inquiry", "system"); // Send a message
crm.addInteraction("1", messageInteraction); // Log the message interaction

// Example: Adding a notification interaction
const notificationInteraction: Interaction = {
  type: "notification",
  timestamp: new Date(),
  details: "New promotional offer notification sent.",
  relatedNotificationId: "notification-123",
  journeyStage: "awareness",
};

crm.notificationSystem.addNotification(
  "New promotional offer for our valued customers!",
  "message",
  "1" // Notify customer with ID "1"
);
crm.addInteraction("1", notificationInteraction); // Log the notification interaction

// Example: Adding a call interaction
const callInteraction: Interaction = {
  type: "call",
  timestamp: new Date(),
  details: "Discussed product features during the call.",
  journeyStage: "decision",
};

crm.addInteraction("1", callInteraction); // Log the call interaction

// Example: Adding a meeting interaction
const meetingInteraction: Interaction = {
  type: "meeting",
  timestamp: new Date(),
  details: "Scheduled a meeting to finalize the deal.",
  journeyStage: "conversion",
};

crm.addInteraction("1", meetingInteraction); // Log the meeting interaction

// Retrieve all interactions for the customer
const customerInteractions = crm.getCustomerById("1")?.interactions;
console.log(`All interactions for customer 1:`, customerInteractions);

// Adding leads
const charlie: Lead = {
  id: "l1",
  name: "Charlie",
  email: "charlie@example.com",
  status: "new",
};
const david: Lead = {
  id: "l2",
  name: "David",
  email: "david@example.com",
  status: "contacted",
};
const emma: Lead = {
  id: "l3",
  name: "Emma",
  email: "emma@example.com",
  status: "new",
};
crm.addLead(charlie);
crm.addLead(david);
crm.addLead(emma);

// Bulk update status of leads
crm.bulkUpdateLeadStatus(["l1", "l3"], "contacted");

// Sending bulk messages to customers
crm.sendBulkMessages(
  ["1", "2"], // Assuming customer IDs
  "We have a special offer for you!",
  "system"
);

// Checking notifications for confirmation

// Ejemplo: Enviar una encuesta de satisfacción después de una interacción de llamada
const callInteractionFeedback: Feedback = {
  customerId: "1",
  interactionId: "interaction-001",
  rating: 5,
  comments: "Muy satisfecho con el servicio durante la llamada.",
  date: new Date(),
};

crm.feedbackManager.collectFeedback(callInteractionFeedback);

// Ejemplo: Enviar una encuesta después de una reunión
const meetingInteractionFeedback: Feedback = {
  customerId: "1",
  interactionId: "interaction-002",
  rating: 4,
  comments: "Reunión productiva, aunque hubo algunos problemas técnicos.",
  date: new Date(),
};

crm.feedbackManager.collectFeedback(meetingInteractionFeedback);

// Ejemplo: Enviar una encuesta de satisfacción general
const generalFeedback: Feedback = {
  customerId: "2",
  interactionId: "general-001",
  rating: 3,
  comments: "En general satisfecho, pero podría mejorar la comunicación.",
  date: new Date(),
};

crm.feedbackManager.collectFeedback(generalFeedback);

// Recuperar todos los feedbacks de un cliente
const customerFeedbacks = crm.feedbackManager.getFeedbackByCustomerId("1");
console.log(`Todos los feedbacks del cliente 1:`, customerFeedbacks);

// Notificar al cliente agradeciéndole por su feedback
crm.notificationSystem.addNotification(
  "1",
  "message",
  "¡Gracias por tu feedback!"
);
