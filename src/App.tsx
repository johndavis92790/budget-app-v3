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
import BudgetForecastPage from "./BudgetForecastPage";
import HSAExpensesPage from "./HSAExpensesPage";
import CustomNavBar from "./CustomNavBar";

import { ApiService } from "./api";
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

  // Listen for Firebase Auth state changes
  useEffect(() => {
    // Emails allowed to access the app
    const ALLOWED_EMAILS = [
      process.env.REACT_APP_GOOGLE_ACCOUNT_1,
      process.env.REACT_APP_GOOGLE_ACCOUNT_2,
    ];

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
  }, []);

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

  // Only fetch data once the user is authorized
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.email) return;

      setLoading(true);
      try {
        const apiService = new ApiService(currentUser.email);
        const data = await apiService.fetchData();
        console.log(data);

        setHistory(data.history);
        setRecurring(data.recurring);
        setCategories(data.categories);
        setExistingTags(data.tags);
        setWeeklyGoal(data.weeklyGoal);
        setMonthlyGoal(data.monthlyGoal);
        setFiscalWeeks(data.fiscalWeeks);
        setFiscalMonths(data.fiscalMonths);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };

    if (isAuthorized && currentUser?.email) {
      loadData();
    }
  }, [isAuthorized, currentUser?.email]);

  // CRUD actions
  const addItem = async (newItem: History | Recurring) => {
    if (!currentUser?.email) return false;

    try {
      const apiService = new ApiService(currentUser.email);
      const success = await apiService.addItem(newItem);
      if (success) {
        await refreshData();
      }
      return success;
    } catch (error) {
      console.error("Error adding item:", error);
      return false;
    }
  };

  const onUpdateItem = async (updatedItem: History | Recurring) => {
    if (!currentUser?.email) return;

    try {
      const apiService = new ApiService(currentUser.email);
      await apiService.updateItem(updatedItem);
      await refreshData();
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const deleteItem = async (item: History | Recurring) => {
    if (!currentUser?.email) return;

    try {
      const apiService = new ApiService(currentUser.email);
      await apiService.deleteItem(item);
      await refreshData();
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

  // Helper function to refresh all data
  const refreshData = async () => {
    if (!currentUser?.email) return;

    const apiService = new ApiService(currentUser.email);
    const data = await apiService.fetchData();

    setHistory(data.history);
    setRecurring(data.recurring);
    setCategories(data.categories);
    setExistingTags(data.tags);
    setWeeklyGoal(data.weeklyGoal);
    setMonthlyGoal(data.monthlyGoal);
    setFiscalWeeks(data.fiscalWeeks);
    setFiscalMonths(data.fiscalMonths);
  };

  // Update goals callback
  const handleUpdateGoal = (newWeeklyGoal: number, newMonthlyGoal: number) => {
    setWeeklyGoal(newWeeklyGoal);
    setMonthlyGoal(newMonthlyGoal);
  };

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
          <GoalsBanner
            weeklyGoal={weeklyGoal}
            monthlyGoal={monthlyGoal}
            onUpdateGoal={handleUpdateGoal}
          />

          <Container>
            <Routes>
              <Route
                path="/"
                element={
                  <HomePage
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
              <Route
                path="/budget-forecast"
                element={
                  <BudgetForecastPage
                    history={history}
                    recurring={recurring}
                    fiscalMonths={fiscalMonths}
                    loading={loading}
                  />
                }
              />
              <Route
                path="/hsa-expenses"
                element={
                  <HSAExpensesPage
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
            </Routes>
          </Container>
        </Router>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
