import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar, Nav, Container } from "react-bootstrap";
import { Spin as Hamburger } from "hamburger-react";

interface CustomNavBarProps {
  handleSignOut: () => void;
  isAuthorized: boolean;
}

function CustomNavBar({ handleSignOut, isAuthorized }: CustomNavBarProps) {
  const [navExpanded, setNavExpanded] = useState(false);
  const navbarRef = useRef<HTMLDivElement | null>(null);

  // Close navbar if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        navbarRef.current &&
        !navbarRef.current.contains(event.target as Node)
      ) {
        setNavExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <Navbar
      bg="dark"
      variant="dark"
      expand="lg"
      className="mb-4"
      expanded={navExpanded}
      onToggle={() => setNavExpanded(!navExpanded)}
      ref={navbarRef}
    >
      <Container>
        <Navbar.Brand as={Link} to="/" onClick={() => setNavExpanded(false)}>
          Family Budget Tracker
        </Navbar.Brand>

        {/* Hamburger toggler */}
        <div
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
          onClick={() => setNavExpanded(!navExpanded)}
        >
          <Hamburger
            toggled={navExpanded}
            toggle={setNavExpanded}
            duration={0.4}
            color="#ffffff"
            rounded
            size={24}
          />
        </div>

        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto">
            <Nav.Link
              as={Link}
              to="/add-history"
              onClick={() => setNavExpanded(false)}
            >
              Add Expense/Refund
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/history"
              onClick={() => setNavExpanded(false)}
            >
              History
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/recurring"
              onClick={() => setNavExpanded(false)}
            >
              Recurring Budget
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/budget-forecast"
              onClick={() => setNavExpanded(false)}
            >
              Budget Forecast
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/hsa-expenses"
              onClick={() => setNavExpanded(false)}
            >
              HSA Expenses
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/notifications"
              onClick={() => setNavExpanded(false)}
            >
              Notifications
            </Nav.Link>
          </Nav>

          {/* Right side: Log Out if authorized */}
          {isAuthorized && (
            <Nav className="ms-auto">
              <Nav.Link
                onClick={() => {
                  setNavExpanded(false);
                  handleSignOut();
                }}
              >
                Log Out
              </Nav.Link>
            </Nav>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default CustomNavBar;
