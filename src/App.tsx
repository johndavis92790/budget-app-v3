import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { FiscalWeek, History, Recurring } from "./types";
import HistoryPage from "./HistoryPage";
import { Navbar, Nav, Container } from "react-bootstrap";
import { API_URL, mmddyyyyToYyyyMmDd } from "./helpers";
import EditHistoryPage from "./EditHistoryPage";
import AddRecurringPage from "./AddRecurringPage";
import RecurringPage from "./RecurringPage";
import EditRecurringPage from "./EditRecurringPage";
import AddHistoryPage from "./AddHistoryPage";
import HomePage from "./HomePage";
import GoalsBanner from "./GoalsBanner";
import FiscalCalendar from "./FiscalCalendar";

function App() {
  const [history, setHistory] = useState<History[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [nonRecurringTags, setNonRecurringTags] = useState<string[]>([]);
  const [recurringTags, setRecurringTags] = useState<string[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(0);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(0);
  const [fiscalWeeks, setFiscalWeeks] = useState<Record<string, FiscalWeek>>(
    {}
  );
  const [loading, setLoading] = useState<boolean>(true);

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
        data.history.map((history: History, index: number) => ({
          ...history,
          value: Math.round(history.value * 100) / 100,
          rowIndex: index + 2,
          date: mmddyyyyToYyyyMmDd(history.date),
        }))
      );
      setRecurring(
        data.recurring.map((recurring: Recurring, index: number) => ({
          ...recurring,
          value: Math.round(recurring.value * 100) / 100,
          rowIndex: index + 2,
        }))
      );
      setCategories(data.categories || []);
      setNonRecurringTags(data.nonRecurringTags || []);
      setRecurringTags(data.recurringTags || []);
      setWeeklyGoal(data.weeklyGoal);
      setMonthlyGoal(data.monthlyGoal);
      setFiscalWeeks(data.fiscalWeeks || {});
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addItem = async (newItem: History | Recurring) => {
    console.log("newItem", newItem);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newItem),
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const result = await response.json();
      console.log("Item added with ID:", result.id);
      fetchData(); // Refresh data after adding
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedItem),
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      console.log("Item updated with ID: ", updatedItem.id);
      fetchData(); // Refresh data after updating
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const onUpdateGoal = async (
    itemType: "weeklyGoal" | "monthlyGoal",
    newValue: number
  ) => {
    try {
      await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, value: newValue }),
      });

      // re-fetch data (which will update weeklyGoal and monthlyGoal)
      await fetchData();
    } catch (err) {
      console.error("Error updating goal:", err);
    }
  };

  const deleteItem = async (item: History | Recurring) => {
    console.log("item", item);
    try {
      const response = await fetch(`${API_URL}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
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

  return (
    <div className="mb-5">
      <Router>
        <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
          <Container>
            <Navbar.Brand as={Link} to="/">
              Family Budget Tracker
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="main-nav" />
            <Navbar.Collapse id="main-nav">
              <Nav className="me-auto">
                <Nav.Link as={Link} to="/add-history">
                  Add Expense/Refund
                </Nav.Link>
                <Nav.Link as={Link} to="/history">
                  History
                </Nav.Link>
                <Nav.Link as={Link} to="/recurring">
                  Recurring
                </Nav.Link>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <GoalsBanner
          weeklyGoal={weeklyGoal}
          monthlyGoal={monthlyGoal}
          loading={loading}
        />

        <Container>
          <Routes>
            <Route path="/" element={<HomePage loading={loading} />} />
            <Route
              path="/add-history"
              element={
                <AddHistoryPage
                  categories={categories}
                  nonRecurringTags={nonRecurringTags}
                  addItem={addItem}
                  loading={loading}
                  weeklyGoal={weeklyGoal}
                  monthlyGoal={monthlyGoal}
                  onUpdateGoal={onUpdateGoal}
                />
              }
            />
            <Route
              path="/add-recurring"
              element={
                <AddRecurringPage
                  recurringTags={recurringTags}
                  categories={categories}
                  addItem={addItem}
                  loading={loading}
                />
              }
            />
            <Route
              path="/history"
              element={<HistoryPage history={history} loading={loading} />}
            />
            <Route
              path="/recurring"
              element={
                <RecurringPage recurring={recurring} loading={loading} />
              }
            />
            <Route
              path="/edit-history"
              element={
                <EditHistoryPage
                  categories={categories}
                  nonRecurringTags={nonRecurringTags}
                  onUpdateItem={onUpdateItem}
                  deleteItem={deleteItem}
                  loading={loading}
                  history={history}
                />
              }
            />
            <Route
              path="/edit-recurring"
              element={
                <EditRecurringPage
                  categories={categories}
                  nonRecurringTags={nonRecurringTags}
                  onUpdateItem={onUpdateItem}
                  deleteItem={deleteItem}
                  loading={loading}
                  recurring={recurring}
                />
              }
            />
          </Routes>
        </Container>

        <FiscalCalendar fiscalWeeks={fiscalWeeks} history={history} />
      </Router>
    </div>
  );
}

export default App;
