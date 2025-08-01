import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { expensesHandler } from "./handlers/expenses";
import { sendNotificationHandler } from "./handlers/notifications";
import { sendBasicNotificationHandler } from "./handlers/notifications/basic";
import { testExpenseNotificationHandler } from "./handlers/notifications/testExpense";

// Initialize Firebase Admin
admin.initializeApp();

// Export the expenses function
export const expenses = onRequest(
  {
    secrets: ["SERVICE_ACCOUNT_CLIENT_EMAIL", "SERVICE_ACCOUNT_PRIVATE_KEY"],
  },
  expensesHandler,
);

// Export the sendNotification function
export const sendNotification = onRequest(
  {
    secrets: ["SERVICE_ACCOUNT_CLIENT_EMAIL", "SERVICE_ACCOUNT_PRIVATE_KEY"],
  },
  sendNotificationHandler,
);

// Export the basic notification function for debugging
export const sendBasicNotification = onRequest(
  {
    secrets: ["SERVICE_ACCOUNT_CLIENT_EMAIL", "SERVICE_ACCOUNT_PRIVATE_KEY"],
  },
  sendBasicNotificationHandler,
);

// Export the test expense notification function (doesn't save to database)
export const testExpenseNotification = onRequest(
  {
    secrets: ["SERVICE_ACCOUNT_CLIENT_EMAIL", "SERVICE_ACCOUNT_PRIVATE_KEY"],
  },
  testExpenseNotificationHandler,
);
