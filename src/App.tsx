import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { History, Recurring } from "./types";
import HomePage from "./HomePage";
import HistoryPage from "./HistoryPage";
import { Navbar, Nav, Container } from "react-bootstrap";
import { API_URL, mmddyyyyToYyyyMmDd } from "./helpers";
import EditHistoryPage from "./EditHistoryPage";
import RecurringPage from "./RecurringPage";

function App() {
  const [history, setHistory] = useState<History[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [nonRecurringTags, setNonRecurringTags] = useState<string[]>([]);
  const [recurringTags, setRecurringTags] = useState<string[]>([]);
  const [nonRecurringTypes, setNonRecurringTypes] = useState<string[]>([]);
  const [recurringTypes, setRecurringTypes] = useState<string[]>([]);
  const [historyTypes, setHistoryTypes] = useState<string[]>([]);
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
          rowIndex: index + 2,
          date: mmddyyyyToYyyyMmDd(history.date), // Ensure consistent YYYY-MM-DD format
        })),
      );
      setRecurring(
        data.recurring.map((recurring: Recurring, index: number) => ({
          ...recurring,
          rowIndex: index + 2,
        })),
      );
      setCategories(data.categories || []);
      setNonRecurringTags(data.nonRecurringTags || []);
      setRecurringTags(data.recurringTags || []);
      setNonRecurringTypes(data.nonRecurringTypes || []);
      setRecurringTypes(data.recurringTypes || []);
      setHistoryTypes(data.historyTypes || []);
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
      console.log("Item updated with ID:", updatedItem.id);
      fetchData(); // Refresh data after updating
    } catch (error) {
      console.error("Error updating item:", error);
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
                <Nav.Link as={Link} to="/">
                  Add Expense/Refund
                </Nav.Link>
                <Nav.Link as={Link} to="/recurring">
                  Add Recurring Expense/Income
                </Nav.Link>
                <Nav.Link as={Link} to="/history">
                  History
                </Nav.Link>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Container>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  categories={categories}
                  nonRecurringTags={nonRecurringTags}
                  nonRecurringTypes={nonRecurringTypes}
                  addItem={addItem}
                  loading={loading}
                />
              }
            />
            <Route
              path="/recurring"
              element={
                <RecurringPage
                  recurringTags={recurringTags}
                  recurringTypes={recurringTypes}
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
              path="/edit"
              element={
                <EditHistoryPage
                  historyTypes={historyTypes}
                  categories={categories}
                  nonRecurringTags={nonRecurringTags}
                  onUpdateItem={onUpdateItem}
                  loading={loading}
                  history={history}
                />
              }
            />
          </Routes>
        </Container>
      </Router>
    </div>
  );
}

export default App;
