import { Request, Response } from "express";
// Removing unused onRequest import
import * as admin from "firebase-admin";
import { GoogleAuth } from "google-auth-library";
// @ts-ignore - Ignoring node-fetch type issues since we're preserving the original code
import fetch from "node-fetch";
import { SECRET_TOKEN } from "../../config/constants";

// This function doesn't currently work, but we're keeping it for future implementation
export const sendNotificationHandler = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    // CORS settings
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, x-secret-token");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Only allow POST requests
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    // Verify secret token
    const token = req.headers["x-secret-token"];
    if (token !== SECRET_TOKEN) {
      return res.status(403).send("Forbidden");
    }

    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).send("Missing title or body");
    }

    try {
      // Retrieve all tokens from Firestore
      const tokensSnapshot = await admin
        .firestore()
        .collection("fcmTokens")
        .get();
      const tokens = tokensSnapshot.docs.map((doc: any) => doc.data().token);

      if (tokens.length === 0) {
        return res.status(200).send("No tokens found");
      }

      // Generate an OAuth 2.0 access token
      const auth = new GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
      });
      const accessToken = await auth.getAccessToken();

      // Prepare notification payload and send to each token
      const results = [];
      for (const token of tokens) {
        const message = {
          message: {
            token: token,
            data: {
              title: title,
              body: body,
              icon: "/favicon.ico",
            },
          },
        };

        // Send to FCM server
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
            },
          );

          if (response.ok) {
            results.push({ token, success: true });
          } else {
            const errorText = await response.text();
            results.push({ token, success: false, error: errorText });
          }
        } catch (error: any) {
          results.push({ token, success: false, error: error.message });
        }
      }

      // Return results
      return res.status(200).json({
        success: true,
        message: `Notification sent to ${tokens.length} devices`,
        results,
      });
    } catch (error: any) {
      console.error("Error sending notification:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to send notification: " + error.message,
      });
    }
  } catch (error: any) {
    console.error("Error in sendNotification:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
