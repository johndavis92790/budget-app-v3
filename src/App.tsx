import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Container } from "react-bootstrap";

import { FiscalWeek, History, Recurring } from "./types";
import HistoryPage from "./HistoryPage";
import RecurringPage from "./RecurringPage";
import AddHistoryPage from "./AddHistoryPage";
import HomePage from "./HomePage";
import GoalsBanner from "./GoalsBanner";
import FiscalCalendar from "./FiscalCalendar";

import CustomNavBar from "./CustomNavBar"; // <-- Import our new Navbar
import { API_URL, mmddyyyyToYyyyMmDd } from "./helpers";

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
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch the main data from your API
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
      setExistingTags(data.nonRecurringTags || []);
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

  // Called when adding a new history or recurring item
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

  // Called when updating a history or recurring item
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

  // Updating goals
  const onUpdateGoal = async (
    itemType: "weeklyGoal" | "monthlyGoal",
    newValue: number,
  ) => {
    try {
      await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, value: newValue }),
      });
      // Re-fetch data (which updates weeklyGoal and monthlyGoal)
      await fetchData();
    } catch (err) {
      console.error("Error updating goal:", err);
    }
  };

  // Called when deleting a history or recurring item
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
        {/* Our new Navbar component */}
        <CustomNavBar />

        {/* Goals banner */}
        <GoalsBanner weeklyGoal={weeklyGoal} monthlyGoal={monthlyGoal} />

        {/* Main container with routes */}
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
                  weeklyGoal={weeklyGoal}
                  monthlyGoal={monthlyGoal}
                  onUpdateGoal={onUpdateGoal}
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
                  recurring={recurring}
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

        {/* Fiscal calendar */}
        <FiscalCalendar fiscalWeeks={fiscalWeeks} history={history} />
      </Router>
    </div>
  );
}

export default App;
