import { useNavigate } from "react-router-dom";
import { Recurring } from "./types";
import { ListGroup, Badge, Row, Col } from "react-bootstrap";
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

  return (
    <div>
      <h2 className="mb-4">Recurring</h2>
      <ListGroup variant="flush">
        {recurring.map((item, index) => {
          const isExpense =
            item.type === "Expense" || item.type === "Recurring Expense";
          const valueColor = isExpense ? "text-danger" : "text-success";
          const formattedValue =
            (isExpense ? "-" : "+") +
            item.value.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            });
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
                    className={valueColor}
                    style={{ fontSize: "1.1em", fontWeight: "bold" }}
                  >
                    {formattedValue}
                  </div>
                </Col>
              </Row>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </div>
  );
}

export default RecurringPage;
