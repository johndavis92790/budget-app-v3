import { useState } from "react";
import { History } from "./types";
import { ListGroup, Badge, Row, Col } from "react-bootstrap";
import { formatDateFromYYYYMMDD } from "./helpers";
import FullPageSpinner from "./FullPageSpinner";
import EditHistoryPage from "./EditHistoryPage";
import "./HistoryPage.css";

interface HistoryPageProps {
  history: History[];
  loading: boolean;
  categories: string[];
  nonRecurringTags: string[];
  onUpdateItem: (updatedHistory: History) => Promise<void>;
  deleteItem: (item: History) => Promise<void>;
}

function HistoryPage({
  history,
  loading,
  categories,
  nonRecurringTags,
  onUpdateItem,
  deleteItem,
}: HistoryPageProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  if (loading) {
    return <FullPageSpinner />;
  }

  // Sort history by date (latest to oldest)
  const sortedHistory = [...history].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime(); // Latest dates first
  });

  const toggleRow = (id: string) => {
    console.log(id);
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleClose = () => {
    setExpandedRowId(null); // Collapse the expanded row
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
            <div key={hist.id}>
              <ListGroup.Item
                className={`py-3 ${backgroundColorClass}`}
                onClick={() => toggleRow(hist.id)}
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
                        {hist.category}
                      </Badge>{" "}
                      {hist.description}
                    </div>
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
              {expandedRowId === hist.id && (
                <div
                  className="p-3 mt-2 mb-2"
                  style={{
                    backgroundColor: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                  }}
                >
                  <EditHistoryPage
                    categories={categories}
                    nonRecurringTags={nonRecurringTags}
                    onUpdateItem={onUpdateItem}
                    deleteItem={deleteItem}
                    selectedHistory={hist}
                    onClose={handleClose}
                  />
                </div>
              )}
            </div>
          );
        })}
      </ListGroup>
    </div>
  );
}

export default HistoryPage;
