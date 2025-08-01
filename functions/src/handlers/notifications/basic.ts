import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { GoogleAuth } from "google-auth-library";
// @ts-ignore
import fetch from "node-fetch";
import { logAction } from "../../utils/logging";
import { google } from "googleapis";
import { SECRET_TOKEN } from "../../config/constants";

/**
 * Send basic notification with minimal FCM payload for debugging
 */
export const sendBasicNotificationHandler = async (req: Request, res: Response) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, X-Notification-Secret");

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
        "https://www.googleapis.com/auth/spreadsheets"
      ],
    });
    sheets = google.sheets({ version: "v4", auth });

    // Verify secret token
    const providedSecret = req.headers["x-notification-secret"];
    if (providedSecret !== SECRET_TOKEN) {
      await logAction(sheets, "BASIC_NOTIFICATION_UNAUTHORIZED", {
        providedSecret: providedSecret ? "provided" : "missing",
        ip: req.ip
      }, "Invalid or missing notification secret");
      
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    // Get notification data from request
    const { title, body, data } = req.body;

    if (!title || !body) {
      res.status(400).json({ error: "Title and body are required" });
      return;
    }

    // Get all FCM tokens from Firestore
    const tokensSnapshot = await admin
      .firestore()
      .collection("fcmTokens")
      .get();

    if (tokensSnapshot.empty) {
      await logAction(sheets, "BASIC_NOTIFICATION_SKIPPED", {
        reason: "No FCM tokens found",
        title,
        body
      });
      
      res.status(200).json({ 
        status: "skipped", 
        message: "No FCM tokens found",
        tokenCount: 0
      });
      return;
    }

    // Extract and validate tokens
    const rawTokens = tokensSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      console.log(`[BasicNotification] Token doc data:`, data);
      return data.token;
    });
    
    const tokens = rawTokens.filter((token: string) => {
      const isValid = token && typeof token === 'string' && token.trim().length > 0;
      if (!isValid) {
        console.log(`[BasicNotification] Invalid token found:`, token);
      }
      return isValid;
    });
    
    console.log(`[BasicNotification] Found ${tokens.length} valid tokens out of ${rawTokens.length} total`);
    
    if (tokens.length === 0) {
      await logAction(sheets, "BASIC_NOTIFICATION_SKIPPED", {
        reason: "No valid FCM tokens found",
        title,
        body,
        totalDocs: tokensSnapshot.docs.length
      });
      
      res.status(200).json({ 
        status: "skipped", 
        message: "No valid FCM tokens found",
        tokenCount: 0,
        totalDocs: tokensSnapshot.docs.length
      });
      return;
    }
    
    const accessToken = await auth.getAccessToken();

    if (!accessToken) {
      const errorMsg = 'Failed to obtain access token';
      await logAction(sheets, "BASIC_NOTIFICATION_ERROR", {
        title,
        body,
        tokensCount: tokens.length
      }, errorMsg);
      
      res.status(500).json({ error: errorMsg });
      return;
    }

    // Send basic notification to each token (minimal payload)
    const promises = tokens.map(async (token: string) => {
      const message = {
        token,
        notification: {
          title,
          body,
        },
        // Include data payload if provided
        ...(data && { data }),
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
          console.error(`[BasicNotification] Failed to send to token: ${response.status} - ${errorText}`);
          return { success: false, error: `${response.status}: ${errorText}` };
        } else {
          return { success: true };
        }
      } catch (error: any) {
        console.error(`[BasicNotification] Error sending to token: ${error.message}`);
        return { success: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    // Log the basic notification attempt
    await logAction(sheets, "BASIC_NOTIFICATION_SENT", {
      title,
      body,
      data: data || {},
      tokensCount: tokens.length,
      successful,
      failed
    });

    res.status(200).json({
      status: "sent",
      message: `Basic notification sent to ${tokens.length} tokens`,
      results: {
        successful,
        failed,
        total: tokens.length
      }
    });

  } catch (error: any) {
    console.error('[BasicNotification] Error:', error.message);
    
    // Log error to Google Sheets
    try {
      if (sheets) {
        await logAction(sheets, "BASIC_NOTIFICATION_ERROR", {
          title: req.body.title,
          body: req.body.body
        }, error.message);
      }
    } catch (logError: any) {
      console.error('[BasicNotification] Failed to log error:', logError.message);
    }

    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
};
