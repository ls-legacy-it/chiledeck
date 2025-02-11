import {
  User,
  UserRole,
  Permission,
  Task,
  Feedback,
  Message,
  Customer,
  Interaction,
  Pipeline,
  PipelineStage,
  MessageTemplate,
  Lead,
} from "./types";

import { Logger } from "./logger";
import { FeedbackManager } from "./feedback";
import { NotificationSystem } from "./notification";
// Clase para manejar la recopilación de comentarios de los clientes

class Platform {
  public notificationSystem: NotificationSystem;
  protected logger: Logger;
  protected users: User[] = [];
  protected permissions: Permission[] = [];
  protected notifications: Notification[] = [];

  constructor() {
    this.logger = new Logger();
    this.notificationSystem = new NotificationSystem();
  }

  addUser(user: User) {
    this.logger.log("info", `New user is added ${user.name}`);
    this.users.push(user);
  }

  addPermission(permission: Permission) {
    this.permissions.push(permission);
  }

  logAction(action: string) {
    this.logger.log("info", action);
  }

  notifyUser(userId: string, message: string) {
    this.notificationSystem.sendNotification(userId, message);
  }

  // Any other shared functionality can go here
}

// CRM Class
export class CRM extends Platform {
  private tasks: Task[] = [];
  private customers: Customer[] = [];
  private leads: Lead[] = [];
  private messages: Message[] = []; // New property to track messages
  private pipelines: Pipeline[] = []; // New property to manage pipelines
  private messageTemplates: MessageTemplate[] = [];
  public feedbackManager: FeedbackManager;

  constructor() {
    super();
    this.logger = new Logger();
    this.feedbackManager = new FeedbackManager(); // Initialize the notification system with customers
  }

  public addUser(user: User) {
    super.addUser(user); // Call the protected method from Platform
    // Additional logic for adding a user in CRM context
  }

  private hasPermission(user: User, permission: Permission): boolean {
    return user.permissions.includes(permission);
  }
  public viewCustomers() {
    if (this.customers.length === 0) {
      console.log("No customers found.");
    } else {
      console.log("Customers:", this.customers.map((c) => c.name).join(", "));
    }
  }

  public viewUsers() {
    if (this.users.length === 0) {
      console.log("No users found.");
    } else {
      console.log("Users:", this.users.map((u) => u.name).join(", "));
    }
  }

  // Method to bulk update the status of leads
  bulkUpdateLeadStatus(leadIds: string[], newStatus: Lead["status"]): void {
    this.leads.forEach((lead) => {
      if (leadIds.includes(lead.id)) {
        lead.status = newStatus;
        this.notificationSystem.addNotification(
          `Lead ${lead.name} status updated to "${newStatus}".`,
          "leadUpdate",
          lead.id
        );
      }
    });
    console.log(
      `Bulk status update completed for leads: ${leadIds.join(", ")}`
    );
  }

  public afterInteraction(
    customerId: string,
    rating: number,
    comments: string
  ): void {
    const feedback: Feedback = {
      customerId,
      rating,
      comments,
      date: new Date(),
    };
    this.feedbackManager.collectFeedback(feedback);
    // Opcional: enviar una notificación al cliente
    this.notificationSystem.sendNotification(
      customerId,
      "Gracias por tu feedback!"
    );
  }

  sendBulkMessages(
    customerIds: string[],
    content: string,
    sender: "user" | "system"
  ): void {
    customerIds.forEach((customerId) => {
      const message: Message = {
        id: `${customerId}-${Date.now()}`, // Unique message ID
        customerId,
        content,
        timestamp: new Date(),
        sender,
      };

      const customer = this.getCustomerById(customerId);
      if (customer) {
        if (!customer.messages) {
          customer.messages = []; // Initialize if not present
        }
        customer.messages.push(message);

        // Create a notification for the new message
        this.notificationSystem.addNotification(
          `New message from ${sender}: ${content}`,
          "message",
          customerId // Associate the notification with the customer ID
        );
      }
    });
    console.log(`Bulk messages sent to customers: ${customerIds.join(", ")}`);
  }

  addInteraction(customerId: string, interaction: Interaction): void {
    const customer = this.getCustomerById(customerId);
    if (customer) {
      if (!customer.interactions) {
        customer.interactions = []; // Initialize if not present
      }
      customer.interactions.push(interaction);
      console.log(`Added interaction for customer ${customerId}:`, interaction);
    } else {
      console.log(`Customer ${customerId} not found.`);
    }
  }

  // Method to retrieve interaction history for a customer
  getInteractionHistory(customerId: string): Interaction[] | undefined {
    const customer = this.customers.find((c) => c.id === customerId);
    if (customer) {
      return customer.interactions;
    } else {
      console.log(`Customer with ID ${customerId} not found.`);
      return undefined;
    }
  }

  // Method to add a new task
  addTask(task: Task): void {
    this.tasks.push(task);
    console.log(`Task "${task.title}" added for customer ${task.customerId}.`);
  }

  // Method to retrieve all tasks for a specific customer
  getTasksForCustomer(customerId: string): Task[] {
    return this.tasks.filter((task) => task.customerId === customerId);
  }

  // Method to update a task's status
  updateTaskStatus(taskId: string, status: "pending" | "completed"): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = status;
      console.log(`Task "${taskId}" status updated to ${status}.`);
    } else {
      console.log(`Task "${taskId}" not found.`);
    }
  }

  // Method to remove a task
  removeTask(taskId: string): void {
    this.tasks = this.tasks.filter((task) => task.id !== taskId);
    console.log(`Task "${taskId}" removed.`);
  }

  // Method to retrieve all tasks
  getAllTasks(): Task[] {
    return this.tasks;
  }

  // Method to add a new message template
  addMessageTemplate(template: MessageTemplate): void {
    this.messageTemplates.push(template);
    console.log(`Message template "${template.name}" added.`);
  }

  // Method to retrieve a message template by ID
  getMessageTemplateById(templateId: string): MessageTemplate | undefined {
    return this.messageTemplates.find((template) => template.id === templateId);
  }

  // Method to delete a message template
  deleteMessageTemplate(templateId: string): void {
    this.messageTemplates = this.messageTemplates.filter(
      (template) => template.id !== templateId
    );
    console.log(`Message template "${templateId}" deleted.`);
  }

  // Method to retrieve all message templates
  getAllMessageTemplates(): MessageTemplate[] {
    return this.messageTemplates;
  }

  // Method to add a new customer
  public addCustomer(user: User, customer: Customer): void {
    if (!user || !customer) {
      console.error("Invalid user or customer data provided.");
      return;
    }

    if (this.hasPermission(user, Permission.AddCustomer)) {
      this.customers.push(customer);
      this.logger.info(`Customer ${customer.name} added by ${user.name}.`);
    } else {
      this.logger.warn(
        `${user.name} does not have permission to add customers.`
      );
    }
  }

  // Method to retrieve a customer by ID
  getCustomerById(customerId: string): Customer | undefined {
    return this.customers.find((customer) => customer.id === customerId);
  }

  // Method to update customer information
  updateCustomer(customerId: string, updatedInfo: Partial<Customer>): void {
    const customer = this.getCustomerById(customerId);
    if (customer) {
      Object.assign(customer, updatedInfo);
      console.log(`Customer ${customerId} updated.`);
    } else {
      console.log(`Customer ${customerId} not found.`);
    }
  }

  // Method to delete a customer
  public deleteCustomer(user: User, customerId: string): void {
    if (this.hasPermission(user, Permission.DeleteCustomer)) {
      this.customers = this.customers.filter((c) => c.id !== customerId);
      console.log(`Customer ${customerId} deleted by ${user.name}.`);
    } else {
      console.log(`${user.name} does not have permission to delete customers.`);
    }
  }

  // Method to add a new lead
  addLead(lead: Lead): void {
    this.leads.push(lead);
    console.log(`Lead ${lead.name} added.`);
  }

  // Method to update lead status
  updateLeadStatus(
    leadId: string,
    status: "new" | "contacted" | "converted" | "lost"
  ): void {
    const lead = this.leads.find((lead) => lead.id === leadId);
    if (lead) {
      lead.status = status;
      console.log(`Lead ${leadId} status updated to ${status}.`);

      // Create a notification for the lead status update
      this.notificationSystem.addNotification(
        `Lead ${leadId} status updated to ${status}.`,
        "leadUpdate",
        leadId
      );
    } else {
      console.log(`Lead ${leadId} not found.`);
    }
  }

  // Method to add a journey stage for a customer
  addJourneyStage(customerId: string, stage: string, notes?: string): void {
    const customer = this.getCustomerById(customerId); // Assuming this method exists
    if (customer) {
      // Add the journey stage to the customer's journey
      customer.journey.push({ stage, date: new Date(), notes });
      console.log(`Added stage "${stage}" for customer ${customerId}.`);

      // Create a notification for the journey stage update
      this.notificationSystem.addNotification(
        `Customer ${customerId} has reached the "${stage}" stage.`,
        "journeyUpdate",
        customerId
      );
    } else {
      console.log(`Customer ${customerId} not found.`);
    }
  }

  addMessage(
    customerId: string,
    content: string,
    sender: "user" | "system"
  ): void {
    const message: Message = {
      id: `${customerId}-${Date.now()}`, // Unique message ID
      customerId,
      content,
      timestamp: new Date(),
      sender,
    };

    const customer = this.customers.find((c) => c.id === customerId);
    if (customer) {
      if (!customer.messages) {
        customer.messages = []; // Initialize if not present
      }
      customer.messages.push(message);

      // Create a notification for the new message
      this.notificationSystem.addNotification(
        `New message from ${sender}: ${content}`,
        "message",
        customerId // Associate the notification with the customer ID
      );

      // Log the interaction
      this.addInteraction(customerId, {
        type: "message",
        timestamp: new Date(),
        details: `Message sent: "${content}"`,
        relatedMessageId: message.id,
      });
    }
  }

  // Method to add a message for a customer

  // Method to get all messages for a customer
  getMessagesForCustomer(customerId: string): Message[] {
    return this.messages.filter((message) => message.customerId === customerId);
  }

  // Method to get all customers
  getAllCustomers(): Customer[] {
    return this.customers;
  }

  // Method to get all leads
  getAllLeads(): Lead[] {
    return this.leads;
  }

  // Method to add a new pipeline
  addPipeline(pipeline: Pipeline): void {
    this.pipelines.push(pipeline);
    console.log(`Pipeline ${pipeline.name} added.`);
  }

  // Method to add a stage to a pipeline
  addStageToPipeline(pipelineId: string, stage: PipelineStage): void {
    const pipeline = this.pipelines.find((p) => p.id === pipelineId);
    if (pipeline) {
      pipeline.stages.push(stage);
      console.log(`Stage ${stage.name} added to pipeline ${pipelineId}.`);
    } else {
      console.log(`Pipeline ${pipelineId} not found.`);
    }
  }

  // Method to assign a lead to a pipeline stage
  assignLeadToPipelineStage(leadId: string, stageId: string): void {
    const lead = this.leads.find((l) => l.id === leadId);
    if (lead) {
      lead.pipelineStageId = stageId; // Assign the pipeline stage ID to the lead
      console.log(`Lead ${leadId} assigned to pipeline stage ${stageId}.`);
    } else {
      console.log(`Lead ${leadId} not found.`);
    }
  }

  // Method to retrieve all pipelines
  getAllPipelines(): Pipeline[] {
    return this.pipelines;
  }

  // Method to send a message using a message template
  sendMessageUsingTemplate(templateId: string, customerId: string): void {
    const template = this.getMessageTemplateById(templateId);
    const customer = this.getCustomerById(customerId);

    if (template && customer) {
      // Replace placeholders in the template content
      let messageContent = template.content.replace("{name}", customer.name);
      // You can add more placeholder replacements here as needed

      // Send the message
      this.addMessage(customerId, messageContent, "system"); // Assuming the sender is 'system'
      console.log(
        `Message sent to ${customer.name} using template "${template.name}".`
      );
    } else {
      if (!template) {
        console.log(`Template ${templateId} not found.`);
      }
      if (!customer) {
        console.log(`Customer ${customerId} not found.`);
      }
    }
  }

  // Method to set a custom field for a customer
  setCustomField(customerId: string, fieldName: string, value: any): void {
    const customer = this.getCustomerById(customerId);
    if (customer) {
      if (!customer.customFields) {
        customer.customFields = {}; // Initialize if not present
      }
      customer.customFields[fieldName] = value; // Set the custom field
      console.log(
        `Custom field "${fieldName}" set for customer ${customerId}.`
      );
    } else {
      console.log(`Customer ${customerId} not found.`);
    }
  }

  // Method to get a custom field for a customer
  getCustomField(customerId: string, fieldName: string): any {
    const customer = this.getCustomerById(customerId);
    if (customer && customer.customFields) {
      return customer.customFields[fieldName]; // Retrieve the custom field value
    }
    console.log(
      `Custom field "${fieldName}" not found for customer ${customerId}.`
    );
    return null;
  }

  // Method to remove a custom field
  removeCustomField(customerId: string, fieldName: string): void {
    const customer = this.getCustomerById(customerId);
    if (
      customer &&
      customer.customFields &&
      fieldName in customer.customFields
    ) {
      delete customer.customFields[fieldName]; // Remove the custom field
      console.log(
        `Custom field "${fieldName}" removed for customer ${customerId}.`
      );
    } else {
      console.log(
        `Custom field "${fieldName}" not found for customer ${customerId}.`
      );
    }
  }
}
