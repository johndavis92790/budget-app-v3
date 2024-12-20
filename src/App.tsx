import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Expense } from "./types";
import HomePage from "./HomePage";
import HistoryPage from "./HistoryPage";
import { Navbar, Nav, Container } from "react-bootstrap";
import { API_URL, mmddyyyyToYyyyMmDd } from "./helpers";
import EditExpensePage from "./EditExpensePage";

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();
      setExpenses(
        data.expenses.map((expense: Expense, index: number) => ({
          ...expense,
          rowIndex: index + 2,
          date: mmddyyyyToYyyyMmDd(expense.date), // Ensure consistent YYYY-MM-DD format
        })),
      );
      setCategories(data.categories || []);
      setTags(data.tags || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addExpense = async (newExpense: any) => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newExpense),
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const result = await response.json();
      console.log("Expense added with ID:", result.id);
      fetchData(); // Refresh data after adding
      return true;
    } catch (error) {
      console.error("Error adding expense:", error);
      return false;
    }
  };

  const onUpdateExpense = async (updatedExpense: Expense) => {
    try {
      const response = await fetch(API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedExpense),
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      fetchData(); // Refresh data after updating
    } catch (error) {
      console.error("Error updating expense:", error);
    }
  };

  return (
    <div className="mb-5">
      <Router>
        <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
          <Container>
            <Navbar.Brand as={Link} to="/">
              Family Expense Tracker
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="main-nav" />
            <Navbar.Collapse id="main-nav">
              <Nav className="me-auto">
                <Nav.Link as={Link} to="/">
                  Add Expense/Refund
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
                  tags={tags}
                  addExpense={addExpense}
                  loading={loading}
                />
              }
            />
            <Route
              path="/history"
              element={<HistoryPage expenses={expenses} loading={loading} />}
            />
            <Route
              path="/edit"
              element={
                <EditExpensePage
                  categories={categories}
                  tags={tags}
                  onUpdateExpense={onUpdateExpense}
                  loading={loading}
                  expenses={expenses}
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
