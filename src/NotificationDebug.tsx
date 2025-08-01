import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Badge,
  ListGroup,
} from "react-bootstrap";
import { getMessaging, getToken } from "firebase/messaging";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";

interface FCMToken {
  id: string;
  token: string;
  userAgent: string;
  timestamp: any;
}

const NotificationDebug: React.FC = () => {
  const [user] = useAuthState(auth);
  const [fcmTokens, setFcmTokens] = useState<FCMToken[]>([]);
  const [currentToken, setCurrentToken] = useState<string>("");
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [serviceWorkerStatus, setServiceWorkerStatus] =
    useState<string>("Unknown");
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkNotificationPermission();
    checkServiceWorker();
    loadFCMTokens();
    generateCurrentToken();
  }, []);

  const checkNotificationPermission = () => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const checkServiceWorker = async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          setServiceWorkerStatus(
            `Active: ${registration.active?.scriptURL || "Unknown"}`,
          );
        } else {
          setServiceWorkerStatus("Not registered");
        }
      } catch (error) {
        setServiceWorkerStatus(`Error: ${error}`);
      }
    } else {
      setServiceWorkerStatus("Not supported");
    }
  };

  const generateCurrentToken = async () => {
    try {
      const messaging = getMessaging();
      const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_VAPID_KEY,
      });
      setCurrentToken(token);
    } catch (error) {
      console.error("Error generating FCM token:", error);
      setCurrentToken(`Error: ${error}`);
    }
  };

  const loadFCMTokens = async () => {
    try {
      const tokensSnapshot = await getDocs(collection(db, "fcmTokens"));
      const tokens: FCMToken[] = [];
      tokensSnapshot.forEach((doc) => {
        tokens.push({
          id: doc.id,
          ...doc.data(),
        } as FCMToken);
      });
      setFcmTokens(tokens);
    } catch (error) {
      console.error("Error loading FCM tokens:", error);
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        await generateCurrentToken();
      }
    }
  };

  const storeFCMToken = async () => {
    if (!user) {
      setTestResults((prev) => [...prev, "❌ User not authenticated"]);
      return;
    }

    if (!currentToken || currentToken.startsWith("Error:")) {
      setTestResults((prev) => [...prev, "❌ No valid FCM token to store"]);
      return;
    }

    try {
      // Use the user's UID as the document ID to match Firestore security rules
      await setDoc(doc(db, "fcmTokens", user.uid), {
        token: currentToken,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        userId: user.uid,
        userEmail: user.email,
      });
      setTestResults((prev) => [...prev, "✅ FCM token stored successfully"]);
      await loadFCMTokens();
    } catch (error) {
      setTestResults((prev) => [
        ...prev,
        `❌ Error storing FCM token: ${error}`,
      ]);
    }
  };

  const testExpenseNotification = async () => {
    setLoading(true);
    setTestResults((prev) => [
      ...prev,
      "🔍 Testing expense notification (test mode - no database save)...",
    ]);

    // Check if notification secret is configured
    const notificationSecret = process.env.REACT_APP_NOTIFICATION_SECRET;
    if (!notificationSecret) {
      setTestResults((prev) => [
        ...prev,
        "❌ REACT_APP_NOTIFICATION_SECRET environment variable not set",
      ]);
      setLoading(false);
      return;
    }

    try {
      const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/testExpenseNotification`;
      setTestResults((prev) => [
        ...prev,
        `📡 Sending to: ${apiUrl}`,
        "📋 This will only send a notification - no data will be saved to your database",
      ]);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Notification-Secret": notificationSecret,
        },
        body: JSON.stringify({}), // Empty body since the test data is generated server-side
      });

      if (response.ok) {
        const result = await response.json();
        setTestResults((prev) => [
          ...prev,
          "✅ Test expense notification sent - check your device!",
          `📋 ${result.note}`,
          `📋 Response: ${JSON.stringify(result, null, 2)}`,
        ]);
      } else {
        const errorText = await response.text();
        setTestResults((prev) => [
          ...prev,
          `❌ Test expense notification failed: ${response.status}`,
          `📋 Error response: ${errorText}`,
        ]);
      }
    } catch (error) {
      setTestResults((prev) => [
        ...prev,
        `❌ Test expense notification error: ${error}`,
      ]);
    }
    setLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const deleteFCMToken = async (tokenId: string) => {
    try {
      await deleteDoc(doc(db, "fcmTokens", tokenId));
      setTestResults((prev) => [...prev, "✅ FCM token deleted"]);
      await loadFCMTokens();
    } catch (error) {
      setTestResults((prev) => [
        ...prev,
        `❌ Error deleting FCM token: ${error}`,
      ]);
    }
  };

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <h2>🔧 Notification Debug Center</h2>
          <p className="text-muted">Debug and test the notification system</p>

          {/* Authentication Status */}
          <Alert variant={user ? "success" : "warning"} className="mb-3">
            <strong>Authentication Status:</strong>{" "}
            {user ? (
              <>✅ Logged in as {user.email}</>
            ) : (
              <>❌ Not authenticated - please log in to store FCM tokens</>
            )}
          </Alert>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>📱 Device Status</Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Notification Permission:</strong>{" "}
                  <Badge
                    bg={
                      notificationPermission === "granted"
                        ? "success"
                        : "danger"
                    }
                  >
                    {notificationPermission}
                  </Badge>
                  {notificationPermission !== "granted" && (
                    <Button
                      size="sm"
                      className="ms-2"
                      onClick={requestNotificationPermission}
                    >
                      Request Permission
                    </Button>
                  )}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Service Worker:</strong> {serviceWorkerStatus}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Current FCM Token:</strong>
                  <div className="mt-2">
                    <code style={{ fontSize: "0.8em", wordBreak: "break-all" }}>
                      {currentToken || "Not generated"}
                    </code>
                  </div>
                  <Button
                    size="sm"
                    className="mt-2 me-2"
                    onClick={generateCurrentToken}
                  >
                    Regenerate Token
                  </Button>
                  <Button size="sm" className="mt-2" onClick={storeFCMToken}>
                    Store Token
                  </Button>
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>API Base URL:</strong>{" "}
                  <code style={{ fontSize: "0.8em" }}>
                    {process.env.REACT_APP_API_BASE_URL || "Not set"}
                  </code>
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Notification Secret:</strong>{" "}
                  <Badge
                    bg={
                      process.env.REACT_APP_NOTIFICATION_SECRET
                        ? "success"
                        : "danger"
                    }
                  >
                    {process.env.REACT_APP_NOTIFICATION_SECRET
                      ? "Configured"
                      : "Missing"}
                  </Badge>
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>VAPID Key:</strong>{" "}
                  <Badge
                    bg={process.env.REACT_APP_VAPID_KEY ? "success" : "danger"}
                  >
                    {process.env.REACT_APP_VAPID_KEY ? "Configured" : "Missing"}
                  </Badge>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>🗄️ Stored FCM Tokens ({fcmTokens.length})</Card.Header>
            <Card.Body style={{ maxHeight: "300px", overflowY: "auto" }}>
              {fcmTokens.length === 0 ? (
                <Alert variant="warning">No FCM tokens found in database</Alert>
              ) : (
                <ListGroup variant="flush">
                  {fcmTokens.map((token, index) => (
                    <ListGroup.Item key={token.id}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong>Token {index + 1}:</strong>
                          <div
                            style={{
                              fontSize: "0.8em",
                              wordBreak: "break-all",
                            }}
                          >
                            {token.token.substring(0, 50)}...
                          </div>
                          <small className="text-muted">
                            {token.userAgent?.includes("Mobile")
                              ? "📱 Mobile"
                              : "💻 Desktop"}
                          </small>
                        </div>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => deleteFCMToken(token.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
              <Button className="mt-2" size="sm" onClick={loadFCMTokens}>
                Refresh Tokens
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>🧪 Test Notifications</Card.Header>
            <Card.Body>
              <div className="d-grid gap-2 mb-3">
                <Button
                  variant="success"
                  onClick={testExpenseNotification}
                  disabled={loading}
                  size="lg"
                >
                  💰 Test Expense Notification
                </Button>
              </div>
              <div className="d-grid gap-2 d-md-flex">
                <Button variant="secondary" onClick={clearResults}>
                  Clear Results
                </Button>
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => {
                    setTestResults((prev) => [
                      ...prev,
                      "🔍 Check browser console and service worker logs for FCM message reception",
                    ]);
                  }}
                >
                  🔍 Check Console Logs
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {testResults.length > 0 && (
        <Row>
          <Col>
            <Card>
              <Card.Header>📊 Test Results</Card.Header>
              <Card.Body>
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {testResults.map((result, index) => (
                    <div key={index} className="mb-2">
                      <code>
                        {new Date().toLocaleTimeString()}: {result}
                      </code>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default NotificationDebug;
