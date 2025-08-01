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
    console.log('[NotificationHelper] Creating notification for expense:', expense);
    const title = getNotificationTitle(expense);
    console.log('[NotificationHelper] Generated title:', title);
    const body = getNotificationBody(expense);
    console.log('[NotificationHelper] Generated body:', body);

    // Send notification to each token
    const promises = tokens.map(async (token: string) => {
      const message = {
        token,
        notification: {
          title,
          body,
        },
        android: {
          notification: {
            title,
            body,
            icon: "ic_notification", // Custom notification icon
            color: "#2E7D32", // Rich green accent color for money/budget theme
            priority: "high",
            default_sound: true,
            channel_id: "budget_expenses",
            tag: `expense_${expense.category}_${Date.now()}`, // Prevent grouping of different expenses
          },
          priority: "high",
        },
        webpush: {
          notification: {
            title,
            body,
            icon: "/icon-192x192.png", // PWA icon
            badge: "/badge-72x72.png", // Small badge icon
            requireInteraction: false, // Don't require user interaction to dismiss
            silent: false,
          },
          headers: {
            Urgency: "high",
          },
        },
        data: {
          title: title,
          body: body,
          icon: "/favicon.ico",
          expenseId: expense.id?.toString() || "",
          actionType: actionType,
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
            body: JSON.stringify({ message }),
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
 * Generate notification title for new expense
 */
function getNotificationTitle(expense: History): string {
  const amount = formatCurrency(expense.value);
  const category = expense.category || "Expense";
  const type = expense.type || "";
  
  // Use dollar sign icon for all money-related notifications
  return `💲 New ${type ? type + ' - ' : ''}${category}: ${amount}`;
}

/**
 * Generate notification body for new expense
 */
function getNotificationBody(expense: History): string {
  const description = expense.description?.trim();
  const userEmail = expense.userEmail || "Unknown user";
  // Extract username from email (e.g., "john.smith@gmail.com" -> "john.smith")
  const userName = userEmail.split("@")[0];
  const amount = formatCurrency(expense.value);
  const category = expense.category || "Uncategorized";
  const type = expense.type || "";
  
  let bodyParts: string[] = [];
  
  // Always show amount and category as primary info
  bodyParts.push(`${amount} • ${category}`);
  
  // Add type if available
  if (type) {
    bodyParts.push(`Type: ${type}`);
  }
  
  // Add description if available and meaningful
  if (description && description.toLowerCase() !== "no description" && description !== "") {
    bodyParts.push(`"${description}"`);
  }
  
  // Add user info (who added the expense)
  bodyParts.push(`Added by ${userName}`);
  
  // Add HSA info if present
  if (expense.hsaAmount && expense.hsaAmount > 0) {
    bodyParts.push(`HSA Reimbursable: ${formatCurrency(expense.hsaAmount)}`);
  }
  
  // Add date if not today
  if (expense.date) {
    const expenseDate = new Date(expense.date);
    const today = new Date();
    const isToday = expenseDate.toDateString() === today.toDateString();
    
    if (!isToday) {
      bodyParts.push(`Date: ${expenseDate.toLocaleDateString()}`);
    }
  }
  
  return bodyParts.join(" • ");
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  // Validate the amount to prevent RangeError
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    console.warn('[NotificationHelper] Invalid amount for formatting:', amount);
    return '$0.00';
  }
  
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount));
  } catch (error: any) {
    console.error('[NotificationHelper] Error formatting currency:', error.message, 'Amount:', amount);
    return `$${Math.abs(amount).toFixed(2)}`;
  }
}
