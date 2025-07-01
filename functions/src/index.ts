import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { expensesHandler } from "./handlers/expenses";
import { sendNotificationHandler } from "./handlers/notifications";

// Initialize Firebase Admin
admin.initializeApp();

// Export the expenses function
export const expenses = onRequest(
  {
    secrets: ["SERVICE_ACCOUNT_CLIENT_EMAIL", "SERVICE_ACCOUNT_PRIVATE_KEY"],
  },
  expensesHandler
);

// Export the sendNotification function (not currently working)
export const sendNotification = onRequest(
  {
    secrets: ["SERVICE_ACCOUNT_CLIENT_EMAIL", "SERVICE_ACCOUNT_PRIVATE_KEY"],
  },
  sendNotificationHandler
);
