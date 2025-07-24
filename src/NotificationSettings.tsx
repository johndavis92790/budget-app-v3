import React, { useState, useEffect } from "react";
import { Card, Button, Alert } from "react-bootstrap";
import { useAuthContext } from "./authContext";
import { messaging } from "./firebase";
import { getToken } from "firebase/messaging";

interface NotificationSettingsProps {
  className?: string;
}

function NotificationSettings({ className }: NotificationSettingsProps) {
  const { currentUser } = useAuthContext();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "danger";
    text: string;
  } | null>(null);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    if (!("Notification" in window)) {
      setMessage({
        type: "danger",
        text: "This browser doesn't support notifications",
      });
      return;
    }

    const permission = Notification.permission;
    setNotificationsEnabled(permission === "granted");
  };

  const enableNotifications = async () => {
    if (!currentUser?.email) {
      setMessage({
        type: "danger",
        text: "Please sign in to enable notifications",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      console.log("Starting notification enablement process...");
      console.log("Current user:", currentUser.email);
      console.log("VAPID Key exists:", !!process.env.REACT_APP_VAPID_KEY);
      console.log(
        "VAPID Key (first 10 chars):",
        process.env.REACT_APP_VAPID_KEY?.substring(0, 10),
      );

      // Check if notifications are supported
      if (!("Notification" in window)) {
        throw new Error("This browser does not support notifications");
      }

      if (!("serviceWorker" in navigator)) {
        throw new Error("This browser does not support service workers");
      }

      // Request permission
      console.log("Requesting notification permission...");
      const permission = await Notification.requestPermission();
      console.log("Permission result:", permission);

      if (permission === "granted") {
        console.log("Permission granted, getting FCM token...");

        // Get FCM token
        const token = await getToken(messaging, {
          vapidKey: process.env.REACT_APP_VAPID_KEY,
        });

        console.log("FCM Token received:", !!token);
        if (token) {
          console.log("FCM Token (first 20 chars):", token.substring(0, 20));
          setNotificationsEnabled(true);
          setMessage({
            type: "success",
            text: "Notifications enabled! You'll now receive alerts when expenses are added.",
          });
        } else {
          throw new Error(
            "Failed to get FCM token - token is null or undefined",
          );
        }
      } else {
        setMessage({
          type: "danger",
          text: `Notification permission ${permission}. Please enable in browser settings.`,
        });
      }
    } catch (error: any) {
      console.error("Error enabling notifications:", error);
      console.error("Error stack:", error.stack);
      setMessage({
        type: "danger",
        text: `Failed to enable notifications: ${error.message || error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Note: We can't revoke the permission programmatically,
      // but we can clear the token from our storage
      setNotificationsEnabled(false);
      setMessage({
        type: "success",
        text: "Notifications disabled. To fully disable, please also turn off notifications in your browser settings.",
      });
    } catch (error) {
      console.error("Error disabling notifications:", error);
      setMessage({
        type: "danger",
        text: "Failed to disable notifications. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    console.log("Test notification clicked");
    console.log("Notifications enabled:", notificationsEnabled);
    console.log("Notification permission:", Notification.permission);

    if (!notificationsEnabled) {
      setMessage({
        type: "danger",
        text: "Notifications are not enabled. Please enable them first.",
      });
      return;
    }

    if (Notification.permission !== "granted") {
      console.log("Permission not granted, requesting...");
      const permission = await Notification.requestPermission();
      console.log("New permission:", permission);

      if (permission !== "granted") {
        setMessage({
          type: "danger",
          text: "Notification permission denied. Please enable in browser settings.",
        });
        return;
      }
    }

    try {
      console.log("📤 Testing cross-device FCM notification...");

      // Use the same backend FCM flow that works in the debug page
      const response = await fetch(
        "https://us-central1-budget-app-v3.cloudfunctions.net/sendNotification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-secret-token": process.env.REACT_APP_NOTIFICATION_SECRET || "",
          },
          body: JSON.stringify({
            title: "🧪 Test Notification",
            body: `Cross-device test from ${currentUser?.email} at ${new Date().toLocaleTimeString()}`,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ FCM test result:", result);

      setMessage({
        type: "success",
        text: `Test notification sent to all devices! Check notification panels on all your devices.`,
      });
    } catch (error: any) {
      console.error("❌ FCM test failed:", error);
      setMessage({
        type: "danger",
        text: `Test failed: ${error.message}`,
      });
    }
  };

  return (
    <Card className={className}>
      <Card.Header>
        <h5 className="mb-0">📱 Notification Settings</h5>
      </Card.Header>
      <Card.Body>
        <p className="text-muted mb-3">
          Get notified when expenses are added, updated, or deleted by other
          users.
        </p>

        {message && (
          <Alert variant={message.type} className="mb-3">
            {message.text}
          </Alert>
        )}

        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <strong>Status:</strong>{" "}
            <span
              className={`badge ${
                notificationsEnabled ? "bg-success" : "bg-secondary"
              }`}
            >
              {notificationsEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          {notificationsEnabled && (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={testNotification}
            >
              Test Notification
            </Button>
          )}
        </div>

        <div className="d-grid gap-2">
          {!notificationsEnabled ? (
            <Button
              variant="primary"
              onClick={enableNotifications}
              disabled={loading}
            >
              {loading ? "Enabling..." : "Enable Notifications"}
            </Button>
          ) : (
            <Button
              variant="outline-danger"
              onClick={disableNotifications}
              disabled={loading}
            >
              {loading ? "Disabling..." : "Disable Notifications"}
            </Button>
          )}
        </div>

        <div className="mt-3">
          <small className="text-muted">
            <strong>What you'll be notified about:</strong>
            <ul className="mt-1 mb-0">
              <li>New expenses added by other users</li>
              <li>Expense updates and deletions</li>
              <li>HSA reimbursements</li>
            </ul>
          </small>
        </div>
      </Card.Body>
    </Card>
  );
}

export default NotificationSettings;
