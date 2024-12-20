import { useNavigate } from "react-router-dom";
import { Expense } from "./types";
import { ListGroup, Badge, Row, Col } from "react-bootstrap";
import { formatDateFromYYYYMMDD } from "./helpers";
import FullPageSpinner from "./FullPageSpinner";
import "./HistoryPage.css";

interface HistoryPageProps {
  expenses: Expense[];
  loading: boolean;
}

function HistoryPage({ expenses, loading }: HistoryPageProps) {
  const navigate = useNavigate();

  if (loading) {
    return <FullPageSpinner />;
  }

  const handleRowClick = (expense: Expense) => {
    console.log("Row clicked", expense);
    if (!expense.id) {
      console.error("Expense has no id, cannot navigate.");
      return;
    }
    navigate(`/edit?id=${encodeURIComponent(expense.id)}`);
  };

  return (
    <div>
      <h2 className="mb-4">History</h2>
      <ListGroup variant="flush">
        {expenses.map((exp, index) => {
          const isRefund = exp.type === "Refund";
          const valueColor = isRefund ? "text-success" : "text-danger";
          const formattedValue =
            (isRefund ? "+" : "-") +
            exp.value.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            });
          const backgroundColorClass =
            index % 2 === 0 ? "row-light" : "row-white";

          return (
            <ListGroup.Item
              key={exp.id} // Use exp.id here
              className={`py-3 ${backgroundColorClass}`}
              onClick={() => handleRowClick(exp)}
              style={{ cursor: "pointer" }}
            >
              <Row>
                <Col xs={8}>
                  <div style={{ fontSize: "1.1em" }}>{exp.categories}</div>
                  <div className="text-muted" style={{ fontSize: "0.9em" }}>
                    {exp.type}
                  </div>
                  {exp.tags.length > 0 && (
                    <div className="mt-1">
                      {exp.tags.map((tag, i) => (
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
                  <div className="text-muted" style={{ fontSize: "0.9em" }}>
                    {formatDateFromYYYYMMDD(exp.date)}
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

export default HistoryPage;
