import { input, select } from "@inquirer/prompts";

import { CRM } from "./core.crm";
import { Customer, Permission, UserRole } from "./types";

const crm = new CRM();

async function main() {
  while (true) {
    const response = await select({
      message: "What would you like to do? 🌟",
      choices: [
        "➕ Add Customer",
        "👁️ View Customers",
        "👤 Add User",
        "📩 Send Message",
        "❌ Exit",
      ],
    });

    switch (response) {
      case "➕ Add Customer":
        await addCustomer();
        break;
      case "👁️ View Customers":
        crm.viewCustomers();
        break;
      case "👤 Add User":
        await addUser();
        break;
      case "📩 Send Message":
        await sendMessage();
        break;
      case "❌ Exit":
        console.log("Exiting... 👋");
        process.exit(0);
    }
  }
}

async function addCustomer() {
  const name = await input({
    message: "Customer Name: 🧑‍🤝‍🧑",
    required: true,
  });

  const email = await input({
    message: "Customer Email: 📧",
    required: true,
  });

  const customer: Customer = {
    id: `${Date.now()}`, // Unique ID for customer
    name,
    email,
    journey: [],
    // Other properties as needed
  };

  crm.addCustomer(
    {
      id: `${Date.now()}`,
      role: UserRole.Admin,
      name: "admin",
      permissions: [Permission.AddCustomer],
    },
    customer
  );
  console.log("Customer added successfully! 🎉");
}

async function addUser() {
  const userName = await input({ message: "User Name: 🧑‍💻" });

  crm.addUser({
    id: `${Date.now()}`,
    role: UserRole.Admin,
    name: userName,
    permissions: [Permission.AddCustomer],
  });
  console.log("User added successfully! 🎉");
}

async function sendMessage() {
  const customerId = await input({ message: "Customer ID: 🆔" });
  const content = await input({ message: "Message Content: 📝" });

  crm.addMessage(customerId, content, "user");
  console.log("Message sent! 📬");
}

main();
