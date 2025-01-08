import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar, Nav, Container } from "react-bootstrap";
import { Spin as Hamburger } from "hamburger-react";

function CustomNavBar() {
  const [navExpanded, setNavExpanded] = useState(false);
  const navbarRef = useRef<HTMLDivElement | null>(null);

  // Close navbar if clicking outside of it
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

        {/* Remove <Navbar.Toggle /> and replace with hamburger-react toggler */}
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
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default CustomNavBar;
