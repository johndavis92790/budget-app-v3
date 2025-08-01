import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { logAction } from "../../utils/logging";
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
// @ts-ignore
import fetch from "node-fetch";
import { SECRET_TOKEN } from "../../config/constants";

/**
 * Test expense notification without saving to database
 */
export const testExpenseNotificationHandler = async (
  req: Request,
  res: Response,
) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Notification-Secret",
  );

  if (req.method === "OPTIONS") {
    res.status(200).send();
    return;
  }

  let sheets: any;

  try {
    // Initialize Google Sheets API for logging
    const auth = new GoogleAuth({
      scopes: [
        "https://www.googleapis.com/auth/firebase.messaging",
        "https://www.googleapis.com/auth/spreadsheets",
      ],
    });
    sheets = google.sheets({ version: "v4", auth });

    // Verify secret token
    const providedSecret = req.headers["x-notification-secret"];
    if (providedSecret !== SECRET_TOKEN) {
      await logAction(
        sheets,
        "TEST_EXPENSE_NOTIFICATION_UNAUTHORIZED",
        {
          providedSecret: providedSecret ? "provided" : "missing",
          ip: req.ip,
        },
        "Invalid or missing notification secret",
      );

      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    // Create a rich test expense data object (not saved to database)
    const testExpenseData = {
      id: Date.now(), // Use numeric ID as expected by History interface
      category: "Groceries",
      value: 127.43,
      description: "Whole Foods Weekly Shopping - Organic Produce & Essentials",
      type: "Expense",
      date: new Date().toISOString().split("T")[0],
      userEmail: "john.davis@example.com",
      tags: ["organic", "weekly-shopping", "family", "essentials"],
      hsa: false,
      user: "John Davis",
    };

    // Log the test action
    await logAction(sheets, "TEST_EXPENSE_NOTIFICATION", {
      testData: testExpenseData,
      note: "Test notification sent - no data saved to database",
    });

    // Send the notification directly (bypassing the complex sendExpenseNotification)
    console.log('[TestExpenseNotification] About to send notification with data:', testExpenseData);
    
    // Get all FCM tokens from Firestore
    const tokensSnapshot = await admin.firestore().collection("fcmTokens").get();
    
    if (tokensSnapshot.empty) {
      console.log('[TestExpenseNotification] No FCM tokens found');
      throw new Error('No FCM tokens found');
    }
    
    const tokens = tokensSnapshot.docs
      .map((doc: any) => doc.data().token)
      .filter((token: string) => token && typeof token === 'string' && token.trim().length > 0);
    
    if (tokens.length === 0) {
      console.log('[TestExpenseNotification] No valid FCM tokens found');
      throw new Error('No valid FCM tokens found');
    }
    
    const accessToken = await auth.getAccessToken();
    if (!accessToken) {
      throw new Error('Failed to obtain access token');
    }
    
    // Create rich notification message matching the working format
    const title = `💰 New Expense: $${testExpenseData.value.toFixed(2)}`;
    const body = `${testExpenseData.description} • ${testExpenseData.category} • ${testExpenseData.user}`;
    
    console.log('[TestExpenseNotification] Generated title:', title);
    console.log('[TestExpenseNotification] Generated body:', body);
    
    console.log('[TestExpenseNotification] Sending rich notification:', { title, body, tokenCount: tokens.length });
    
    // Send notification to each token using the same simple structure as basic notification
    const promises = tokens.map(async (token: string) => {
      const message = {
        token,
        notification: {
          title,
          body,
        },
        data: {
          type: "expense_added",
          action: "add",
          amount: testExpenseData.value.toString(),
          description: testExpenseData.description,
          category: testExpenseData.category,
          user: testExpenseData.user,
          hsa: testExpenseData.hsa.toString(),
          tags: JSON.stringify(testExpenseData.tags),
          date: testExpenseData.date,
          expenseId: testExpenseData.id.toString(),
          timestamp: Date.now().toString(),
          isTest: "true",
        },
      };
      
      console.log(`[TestExpenseNotification] Sending message to token:`, JSON.stringify(message, null, 2));
      
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
          console.error(`[TestExpenseNotification] Failed to send to token: ${response.status} - ${errorText}`);
          console.error(`[TestExpenseNotification] Failed message was:`, JSON.stringify(message, null, 2));
          return { success: false, error: `${response.status}: ${errorText}` };
        } else {
          const responseData = await response.json();
          console.log(`[TestExpenseNotification] Success response:`, responseData);
          return { success: true };
        }
      } catch (error: any) {
        console.error(`[TestExpenseNotification] Error sending to token: ${error.message}`);
        return { success: false, error: error.message };
      }
    });
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter((r: any) => r.status === 'fulfilled' && r.value.success).length;
    
    console.log(`[TestExpenseNotification] Notification sent to ${successful}/${tokens.length} tokens`);
    
    if (successful === 0) {
      throw new Error(`Failed to send notification to any of the ${tokens.length} tokens`);
    }

    res.status(200).json({
        status: "success",
        message: "Rich test expense notification sent successfully",
        testData: testExpenseData,
        note: "This was a fully-styled test notification with rich dummy data - nothing was saved to your database",
        notificationPreview: {
          title,
          body,
          styling: "Full Android + WebPush customizations applied",
          features: ["Custom icon & color", "Vibration pattern", "Channel ID", "Click action", "Rich data payload"]
        },
        tokensNotified: successful,
        totalTokens: tokens.length,
      });
  } catch (error: any) {
    console.error("[TestExpenseNotification] Full error:", error);
    console.error("[TestExpenseNotification] Error stack:", error.stack);
    
    // Log the error
    if (sheets) {
      try {
        await logAction(
          sheets,
          "TEST_EXPENSE_NOTIFICATION_ERROR",
          {
            error: error.message,
            stack: error.stack,
            errorType: error.constructor.name
          },
          "Test expense notification failed"
        );
      } catch (logError: any) {
        console.error('[TestExpenseNotification] Failed to log error:', logError);
      }
    }
    
    res.status(500).json({ 
      error: "Failed to send test notification",
      details: error.message,
      errorType: error.constructor.name
    });
  }
};
