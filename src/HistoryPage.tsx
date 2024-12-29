import { useNavigate } from "react-router-dom";
import { History } from "./types";
import { ListGroup, Badge, Row, Col } from "react-bootstrap";
import { formatDateFromYYYYMMDD } from "./helpers";
import FullPageSpinner from "./FullPageSpinner";
import "./HistoryPage.css";

interface HistoryPageProps {
  history: History[];
  loading: boolean;
}

function HistoryPage({ history, loading }: HistoryPageProps) {
  const navigate = useNavigate();

  if (loading) {
    return <FullPageSpinner />;
  }

  // Sort history by date (latest to oldest)
  const sortedHistory = [...history].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime(); // Latest dates first
  });

  const handleRowClick = (history: History) => {
    console.log("Row clicked", history);
    if (!history.id) {
      console.error("History has no id, cannot navigate.");
      return;
    }
    navigate(`/edit-history?id=${encodeURIComponent(history.id)}`);
  };

  return (
    <div>
      <h2 className="mb-4">History</h2>
      <ListGroup variant="flush">
        {sortedHistory.map((hist, index) => {
          const isExpense =
            hist.type === "Expense" || hist.type === "Recurring Expense";
          const valueColor = isExpense ? "text-danger" : "text-success";
          const formattedValue =
            (isExpense ? "-" : "+") +
            hist.value.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            });
          const backgroundColorClass =
            index % 2 === 0 ? "row-light" : "row-white";

          return (
            <ListGroup.Item
              key={hist.id}
              className={`py-3 ${backgroundColorClass}`}
              onClick={() => handleRowClick(hist)}
              style={{ cursor: "pointer" }}
            >
              <Row>
                <Col xs={8}>
                  <div style={{ fontSize: "1.1em" }}>{hist.category}</div>
                  <div className="text-muted" style={{ fontSize: "0.9em" }}>
                    {hist.type}
                  </div>
                  {hist.tags.length > 0 && (
                    <div className="mt-1">
                      {hist.tags.map((tag, i) => (
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
                    {formatDateFromYYYYMMDD(hist.date)}
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
