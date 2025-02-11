// Define an interface for Workflow
export interface Workflow {
  id: string; // Unique identifier for the workflow
  name: string; // Name of the workflow
  description?: string; // Optional description of the workflow
  steps: WorkflowStep[]; // Array of steps in the workflow
  status: "active" | "inactive"; // Status of the workflow
  createdBy: string; // ID of the user who created the workflow
  createdAt: Date; // Date the workflow was created
  updatedAt?: Date; // Date the workflow was last updated
}

// Define an interface for Workflow Steps
export interface WorkflowStep {
  id: string; // Unique identifier for the step
  name: string; // Name of the step
  action: WorkflowAction; // Action to be performed in this step
  assignedTo?: string; // Optional ID of the user the step is assigned to
  dueDate?: Date; // Optional due date for the step
  status: "pending" | "completed"; // Current status of the step
}

// Define an interface for Workflow Action
export interface WorkflowAction {
  type: string; // The type of action (e.g., "send_email", "create_task")
  params?: Record<string, any>; // Optional parameters specific to the action
}

/** This Custom Notification interface is used for CRM-specific notifications. */
export interface CustomNotification {
  id: string; // Unique identifier for the notification
  body: string; // The body content of the notification
  message: string; // The notification message
  type: "message" | "leadUpdate" | "journeyUpdate"; // Type of notification
  customerId?: string; // Optional: associated customer ID
  leadId?: string; // Optional: associated lead ID
  timestamp: Date; // Time when the notification was created
  icon?: string; // Optional: icon URL for the notification
  dir?: "auto" | "ltr" | "rtl"; // Optional: text direction
  data?: any; // Optional: any additional data associated with the notification
}

export enum UserRole {
  Admin = "admin",
  Manager = "manager",
  Sales = "sales",
  Support = "support",
}

export interface User {
  id: string; // Unique identifier for the user
  name: string; // User's name
  role: UserRole; // User's role
  permissions: Permission[]; // List of permissions assigned to the user
}

export enum Permission {
  ViewCustomers = "view_customers",
  AddCustomer = "add_customer",
  EditCustomer = "edit_customer",
  DeleteCustomer = "delete_customer",
  ViewLeads = "view_leads",
  ManageTasks = "manage_tasks",
  SendMessage = "send_message",
  ViewFeedback = "view_feedback",
  ManagePipelines = "manage_pipelines",
  MoccaManager = "mocca:manager",
}

// Define an interface for Task
export interface Task {
  id: string; // Unique identifier for the task
  title: string; // Title of the task
  customerId: string; // ID of the customer associated with the task
  dueDate: Date; // Due date for the task
  priority: "low" | "medium" | "high"; // Priority level of the task
  status: "pending" | "completed"; // Current status of the task
}

// Define an interface for Lead
export interface Lead {
  id: string;
  name: string;
  email: string;
  status: "new" | "contacted" | "converted" | "lost"; // Status of the lead
  pipelineStageId?: string; // Optional field to track the current pipeline stage
}

// Define an interface for Message Template
export interface MessageTemplate {
  id: string;
  name: string; // Name of the template
  content: string; // Content of the template message
}

// Define an interface for Pipeline Stage
export interface PipelineStage {
  id: string;
  name: string; // Name of the stage
  order: number; // Order of the stage in the pipeline
}

// Define an interface for Pipeline
export interface Pipeline {
  id: string;
  name: string; // Name of the pipeline
  stages: PipelineStage[]; // Stages within this pipeline
}

// Define an interface for Customer Journey Stage
export interface JourneyStage {
  stage: string; // e.g., 'Awareness', 'Consideration', 'Decision'
  date: Date; // Date when the customer reached this stage
  notes?: string; // Optional notes about the stage
}

export interface Interaction {
  type: "message" | "notification" | "call" | "meeting";
  timestamp: Date;
  details: string;
  relatedMessageId?: string; // Optional, for message interactions
  relatedNotificationId?: string; // Optional, for notification interactions
  journeyStage?: string; // Optional, links to the journey
}
// Extend the Customer interface to include the journey
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string[];
  journey: JourneyStage[]; // New property to track customer journey
  messages?: Message[];
  customFields?: Record<string, any>; // New property for customizable fields
  interactions?: Interaction[];
}

// Define an interface for Messaging
export interface Message {
  id: string;
  customerId: string; // ID of the customer this message is associated with
  content: string;
  timestamp: Date;
  sender: "user" | "system"; // Who sent the message
}

// Definición de tipos para Feedback y OverallFeedback
export interface Feedback {
  customerId: string;
  interactionId?: string;
  rating: number;
  comments: string;
  date: Date;
}
