import { useNavigate } from "react-router-dom";
import { Recurring } from "./types";
import { ListGroup, Badge, Row, Col, Button } from "react-bootstrap";
import FullPageSpinner from "./FullPageSpinner";
import "./RecurringPage.css";
import { FaPlus } from "react-icons/fa";

interface RecurringPageProps {
  recurring: Recurring[];
  loading: boolean;
}

function RecurringPage({ recurring, loading }: RecurringPageProps) {
  const navigate = useNavigate();

  if (loading) {
    return <FullPageSpinner />;
  }

  const handleRowClick = (recurring: Recurring) => {
    console.log("Row clicked", recurring);
    if (!recurring.id) {
      console.error("Recurring has no id, cannot navigate.");
      return;
    }
    navigate(`/edit-recurring?id=${encodeURIComponent(recurring.id)}`);
  };

  const handleAddRecurring = (type: "Income" | "Expense") => {
    navigate(`/add-recurring?type=${encodeURIComponent(type)}`);
  };

  // Split recurring items into Income and Expenses
  const incomeItems = recurring
    .filter((item) => item.type === "Income")
    .sort((a, b) => b.value - a.value); // Sort by value in descending order

  const expenseItems = recurring
    .filter((item) => item.type === "Expense")
    .sort((a, b) => b.value - a.value); // Sort by value in descending order

  return (
    <div>
      <h2 className="mb-4">Recurring</h2>

      {/* Income Section */}
      <h4 className="mb-3">Income</h4>
      <ListGroup variant="flush" className="mb-4">
        {incomeItems.map((item, index) => {
          const backgroundColorClass =
            index % 2 === 0 ? "row-light" : "row-white";

          return (
            <ListGroup.Item
              key={item.id}
              className={`py-3 ${backgroundColorClass}`}
              onClick={() => handleRowClick(item)}
              style={{ cursor: "pointer" }}
            >
              <Row>
                <Col xs={8}>
                  <div style={{ fontSize: "1em" }}>
                    <Badge
                      pill
                      bg="info"
                      className="me-1"
                      style={{ fontSize: "1em" }}
                    >
                      {item.category}
                    </Badge>{" "}
                    {item.description}
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.9em" }}>
                    {item.type}
                  </div>
                  {item.tags.length > 0 && (
                    <div className="mt-1">
                      {item.tags.map((tag, i) => (
                        <Badge key={i} bg="secondary" className="me-1">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Col>
                <Col xs={4} className="text-end">
                  <div
                    className="text-success"
                    style={{ fontSize: "1.1em", fontWeight: "bold" }}
                  >
                    {`+${item.value.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}`}
                  </div>
                </Col>
              </Row>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
      <div className="d-flex justify-content-end mb-4">
        <Button variant="success" onClick={() => handleAddRecurring("Income")}>
          <FaPlus className="me-2" />
          Add Income
        </Button>
      </div>

      {/* Expenses Section */}
      <h4 className="mb-3">Expenses</h4>
      <ListGroup variant="flush">
        {expenseItems.map((item, index) => {
          const backgroundColorClass =
            index % 2 === 0 ? "row-light" : "row-white";

          return (
            <ListGroup.Item
              key={item.id}
              className={`py-3 ${backgroundColorClass}`}
              onClick={() => handleRowClick(item)}
              style={{ cursor: "pointer" }}
            >
              <Row>
                <Col xs={8}>
                  <div style={{ fontSize: "1em" }}>
                    <Badge
                      pill
                      bg="info"
                      className="me-1"
                      style={{ fontSize: "1em" }}
                    >
                      {item.category}
                    </Badge>{" "}
                    {item.description}
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.9em" }}>
                    {item.type}
                  </div>
                  {item.tags.length > 0 && (
                    <div className="mt-1">
                      {item.tags.map((tag, i) => (
                        <Badge key={i} bg="secondary" className="me-1">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Col>
                <Col xs={4} className="text-end">
                  <div
                    className="text-danger"
                    style={{ fontSize: "1.1em", fontWeight: "bold" }}
                  >
                    {`-${item.value.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}`}
                  </div>
                </Col>
              </Row>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
      <div className="d-flex justify-content-end mt-3">
        <Button variant="danger" onClick={() => handleAddRecurring("Expense")}>
          <FaPlus className="me-2" />
          Add Expense
        </Button>
      </div>
    </div>
  );
}

export default RecurringPage;
