import * as admin from "firebase-admin";
import { GoogleAuth } from "google-auth-library";
// @ts-ignore
import fetch from "node-fetch";
import { logAction } from "./logging";
import { google } from "googleapis";

// Define History interface for notifications
interface History {
  id?: number;
  date: string;
  type: string;
  category: string;
  description?: string;
  value: number;
  tags: string[];
  userEmail?: string;
  hsaAmount?: number;
  hsaDate?: string;
  hsaNotes?: string;
}

/**
 * Helper function to send expense notifications
 */
export const sendExpenseNotification = async (
  expense: History,
  actionType: "added" | "updated" | "deleted" = "added"
): Promise<void> => {
  let sheets: any;
  
  try {
    // Initialize Google Sheets API for logging
    const auth = new GoogleAuth({
      scopes: [
        "https://www.googleapis.com/auth/firebase.messaging",
        "https://www.googleapis.com/auth/spreadsheets"
      ],
    });
    sheets = google.sheets({ version: "v4", auth });
    
    // Get all FCM tokens from Firestore
    const tokensSnapshot = await admin
      .firestore()
      .collection("fcmTokens")
      .get();
    
    if (tokensSnapshot.empty) {
      console.log("[NotificationHelper] No FCM tokens found, skipping notification");
      await logAction(sheets, "NOTIFICATION_SKIPPED", {
        reason: "No FCM tokens found",
        expense: {
          category: expense.category,
          value: expense.value,
          actionType
        }
      });
      return;
    }

    const tokens = tokensSnapshot.docs.map((doc: any) => doc.data().token);
    const accessToken = await auth.getAccessToken();

    if (!accessToken) {
      const errorMsg = 'Failed to obtain access token';
      console.error('[NotificationHelper]', errorMsg);
      await logAction(sheets, "NOTIFICATION_ERROR", {
        expense: {
          category: expense.category,
          value: expense.value,
          actionType
        },
        tokensCount: tokens.length
      }, errorMsg);
      return;
    }

    // Create notification content
    const title = getNotificationTitle(expense, actionType);
    const body = getNotificationBody(expense, actionType);



    // Send notification to each token
    const promises = tokens.map(async (token: string) => {
      const message = {
        message: {
          token: token,
          data: {
            title: title,
            body: body,
            icon: "/favicon.ico",
            expenseId: expense.id?.toString() || "",
            actionType: actionType,
          },
          // Add notification object for better display on Android
          notification: {
            title: title,
            body: body,
          },
        },
      };



      try {
        const response = await fetch(
          "https://fcm.googleapis.com/v1/projects/budget-app-v3/messages:send",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
          }
        );



        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[NotificationHelper] Failed to send notification: ${response.status} - ${errorText}`);
        } else {

        }
      } catch (error: any) {
        console.error(`[NotificationHelper] Error sending notification: ${error.message}`);
      }
    });

    await Promise.allSettled(promises);
    console.log(`[NotificationHelper] Notification sent to ${tokens.length} devices`);
    
    // Log successful notification
    await logAction(sheets, "NOTIFICATION_SENT", {
      expense: {
        category: expense.category,
        value: expense.value,
        description: expense.description,
        userEmail: expense.userEmail,
        actionType
      },
      tokensCount: tokens.length,
      title,
      body
    });
    
  } catch (error: any) {
    console.error('[NotificationHelper] Error in sendExpenseNotification:', error.message);
    
    // Log notification error to Google Sheets
    try {
      if (sheets) {
        await logAction(sheets, "NOTIFICATION_ERROR", {
          expense: {
            category: expense.category,
            value: expense.value,
            actionType
          }
        }, error.message);
      }
    } catch (logError: any) {
      console.error('[NotificationHelper] Failed to log error:', logError.message);
    }
  }
};

/**
 * Generate notification title based on expense and action
 */
function getNotificationTitle(expense: History, actionType: string): string {
  const amount = formatCurrency(expense.value);
  
  switch (actionType) {
    case "added":
      return `💰 New Expense: ${amount}`;
    case "updated":
      return `✏️ Expense Updated: ${amount}`;
    case "deleted":
      return `🗑️ Expense Deleted: ${amount}`;
    default:
      return `💰 Expense: ${amount}`;
  }
}

/**
 * Generate notification body based on expense details
 */
function getNotificationBody(expense: History, actionType: string): string {
  const category = expense.category || "Uncategorized";
  const description = expense.description || "No description";
  const userEmail = expense.userEmail || "Unknown user";
  const userName = userEmail.split("@")[0]; // Get name part of email
  
  let bodyText = `${category}: ${description}`;
  
  if (actionType === "added") {
    bodyText += ` (by ${userName})`;
  }
  
  // Add HSA info if present
  if (expense.hsaAmount && expense.hsaAmount > 0) {
    bodyText += ` | HSA: ${formatCurrency(expense.hsaAmount)}`;
  }
  
  return bodyText;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(amount));
}
