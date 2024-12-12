import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Expense } from "./types";
import axios from "axios";
import HomePage from "./HomePage";
import HistoryPage from "./HistoryPage";
import { Navbar, Nav, Container } from "react-bootstrap";
import { API_URL } from "./config";

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL);
      setExpenses(response.data.expenses || []);
      setCategories(response.data.categories || []);
      setTags(response.data.tags || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addExpense = async (
    newExpense: Omit<Expense, "notes"> & { notes?: string },
  ) => {
    try {
      await axios.post(API_URL, newExpense, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      // Reload after adding
      fetchData();
      return true;
    } catch (error) {
      console.error("Error adding expense:", error);
      return false;
    }
  };

  return (
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
        </Routes>
      </Container>
    </Router>
  );
}

export default App;
