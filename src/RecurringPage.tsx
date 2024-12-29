import { useNavigate } from "react-router-dom";
import { Recurring } from "./types";
import { ListGroup, Badge, Row, Col, Button } from "react-bootstrap";
import FullPageSpinner from "./FullPageSpinner";
import "./RecurringPage.css";

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
                  <div style={{ fontSize: "1.1em" }}>{item.name}</div>
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
      <Button
        variant="success"
        className="mb-4"
        onClick={() => handleAddRecurring("Income")}
      >
        Add Income
      </Button>

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
                  <div style={{ fontSize: "1.1em" }}>{item.name}</div>
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
      <Button
        variant="danger"
        className="mt-3"
        onClick={() => handleAddRecurring("Expense")}
      >
        Add Expense
      </Button>
    </div>
  );
}

export default RecurringPage;
