import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Container, Navbar } from "react-bootstrap";

import {
  FiscalMonth,
  FiscalWeek,
  History,
  NotificationPayload,
  Recurring,
} from "./types";
import HistoryPage from "./HistoryPage";
import RecurringPage from "./RecurringPage";
import AddHistoryPage from "./AddHistoryPage";
import HomePage from "./HomePage";
import GoalsBanner from "./GoalsBanner";
import CustomNavBar from "./CustomNavBar";
import { API_URL, mmddyyyyToYyyyMmDd } from "./helpers";
import { messaging, db } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";
import { collection, doc, setDoc } from "firebase/firestore";

// Firebase Auth
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "./firebase";
import { AuthContext } from "./authContext";

function App() {
  const [history, setHistory] = useState<History[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(0);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(0);
  const [fiscalWeeks, setFiscalWeeks] = useState<Record<string, FiscalWeek>>(
    {},
  );
  const [fiscalMonths, setFiscalMonths] = useState<Record<string, FiscalMonth>>(
    {},
  );
  const [loading, setLoading] = useState<boolean>(true);

  // Auth states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  const [notification, setNotification] = useState<NotificationPayload | null>(
    null,
  );

  // Emails allowed to access the app
  const ALLOWED_EMAILS = [
    process.env.REACT_APP_GOOGLE_ACCOUNT_1,
    process.env.REACT_APP_GOOGLE_ACCOUNT_2,
  ];

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user?.email) {
        setCurrentUser(null);
        setIsAuthorized(false);
        return;
      }
      if (ALLOWED_EMAILS.includes(user.email)) {
        setCurrentUser(user);
        setIsAuthorized(true);
      } else {
        // Not allowed => sign out
        await signOut(auth);
        setIsAuthorized(false);
      }
    });
    return unsubscribe;
  }, [ALLOWED_EMAILS]);

  // Google Sign-In (popup)
  const handleSignInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged listener will set states
    } catch (err) {
      console.error("Error during sign-in:", err);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    await signOut(auth);
    setIsAuthorized(false);
    setCurrentUser(null);
  };

  useEffect(() => {
    const initializeMessaging = async () => {
      try {
        const permission = await Notification.requestPermission();
        console.log("Notification permission: ", permission);

        if (permission === "granted") {
          const currentToken = await getToken(messaging, {
            vapidKey: process.env.REACT_APP_VAPID_KEY,
          });
          if (currentToken) {
            console.log("FCM Token:", currentToken);
            await storeTokenInFirestore(currentToken);
          }
        }
      } catch (error) {
        console.error("Error initializing messaging: ", error);
      }
    };

    initializeMessaging();

    // Register the onMessage listener
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Foreground notification payload received: ", payload);

      if (payload.data) {
        const { title, body } = payload.data;

        // Show the notification explicitly
        new Notification(title || "Default Title", {
          body: body || "Default Body",
          icon: payload.data.icon || "/favicon.ico",
        });

        // Optional: Update app UI
        setNotification({ title, body });
      } else {
        console.warn("Notification payload missing 'data' field.");
      }
    });

    return () => unsubscribe();
  }, []);

  const storeTokenInFirestore = async (token: string): Promise<void> => {
    try {
      // For simplicity, store with the token as the document ID
      const tokensRef = collection(db, "fcmTokens");
      await setDoc(doc(tokensRef, token), {
        token,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Error storing token:", err);
    }
  };

  // Fetch data only AFTER authorized
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();
      console.log(data);

      setHistory(
        data.history.map((hist: History, index: number) => ({
          ...hist,
          value: Math.round(hist.value * 100) / 100,
          rowIndex: index + 2,
          date: mmddyyyyToYyyyMmDd(hist.date),
        })),
      );

      setRecurring(
        data.recurring.map((rec: Recurring, index: number) => ({
          ...rec,
          value: Math.round(rec.value * 100) / 100,
          rowIndex: index + 2,
        })),
      );

      setCategories(data.categories || []);
      setExistingTags(data.tags || []);
      setWeeklyGoal(data.weeklyGoal);
      setMonthlyGoal(data.monthlyGoal);
      setFiscalWeeks(data.fiscalWeeks || {});
      setFiscalMonths(data.fiscalMonths || {});
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  // Only fetch data once the user is authorized
  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized]);

  // CRUD actions
  const addItem = async (newItem: History | Recurring) => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const result = await response.json();
      console.log("Item added with ID:", result.id);
      fetchData();
      return true;
    } catch (error) {
      console.error("Error adding item:", error);
      return false;
    }
  };

  const onUpdateItem = async (updatedItem: History | Recurring) => {
    try {
      console.log("updatedItem: ", updatedItem);
      const response = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedItem),
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      console.log("Item updated with ID: ", updatedItem.id);
      fetchData();
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const deleteItem = async (item: History | Recurring) => {
    try {
      const response = await fetch(API_URL, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!response.ok) {
        throw new Error(`Error deleting item: ${response.statusText}`);
      }
      await fetchData();
    } catch (error) {
      console.error(`Error deleting ${item.itemType} item:`, error);
      alert(`An error occurred while deleting the ${item.itemType} item.`);
    }
  };

  // Render Sign-in screen if not authorized
  if (!isAuthorized) {
    return (
      <>
        {/* A dark header that resembles your navbar styling */}
        <Navbar bg="dark" variant="dark" className="mb-4">
          <Container>
            <Navbar.Brand>Family Budget Tracker</Navbar.Brand>
          </Container>
        </Navbar>

        <Container className="text-center" style={{ marginTop: "3rem" }}>
          <button
            onClick={handleSignInWithGoogle}
            className="btn btn-light"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 500,
              border: "1px solid #ddd",
              borderRadius: "6px",
              padding: "0.5rem 1rem",
            }}
          >
            <img
              alt="Google logo"
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              style={{ width: "20px", height: "20px" }}
            />
            Sign in with Google
          </button>
        </Container>
      </>
    );
  }

  // If authorized, show the main app
  return (
    <AuthContext.Provider value={{ currentUser, isAuthorized }}>
      <div className="mb-5">
        <Router>
          {/* Pass handleSignOut and isAuthorized to the navbar */}
          <CustomNavBar
            handleSignOut={handleSignOut}
            isAuthorized={isAuthorized}
          />

          {/* GoalsBanner can remain if it displays current goals */}
          <GoalsBanner weeklyGoal={weeklyGoal} monthlyGoal={monthlyGoal} />

          <Container>
            <Routes>
              <Route path="/" element={<HomePage loading={loading} />} />
              <Route
                path="/add-history"
                element={
                  <AddHistoryPage
                    categories={categories}
                    existingTags={existingTags}
                    addItem={addItem}
                    loading={loading}
                    fiscalWeeks={fiscalWeeks}
                    history={history}
                  />
                }
              />
              <Route
                path="/history"
                element={
                  <HistoryPage
                    categories={categories}
                    existingTags={existingTags}
                    history={history}
                    fiscalWeeks={fiscalWeeks}
                    loading={loading}
                    onUpdateItem={onUpdateItem}
                    deleteItem={deleteItem}
                  />
                }
              />
              <Route
                path="/recurring"
                element={
                  <RecurringPage
                    history={history}
                    recurring={recurring}
                    fiscalMonths={fiscalMonths}
                    loading={loading}
                    categories={categories}
                    existingTags={existingTags}
                    addItem={addItem}
                    onUpdateItem={onUpdateItem}
                    deleteItem={deleteItem}
                  />
                }
              />
            </Routes>
          </Container>
        </Router>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
