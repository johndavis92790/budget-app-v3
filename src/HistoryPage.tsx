import { useState } from "react";
import { Expense } from "./types";
import {
  ListGroup,
  Badge,
  Row,
  Col,
  Modal,
  Button,
  Form,
} from "react-bootstrap";
import "./HistoryPage.css";

interface HistoryPageProps {
  categories: string[];
  expenses: Expense[];
  loading: boolean;
  onUpdateExpense: (updatedExpense: Expense) => Promise<void>;
}

function HistoryPage({
  categories,
  expenses,
  loading,
  onUpdateExpense,
}: HistoryPageProps) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleRowClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedExpense(null);
  };

  const handleSave = async () => {
    if (selectedExpense) {
      await onUpdateExpense(selectedExpense);
      handleCloseModal();
    }
  };

  const handleFieldChange = (
    field: keyof Expense,
    value: string | number | string[],
  ) => {
    if (selectedExpense) {
      setSelectedExpense({
        ...selectedExpense,
        [field]: value,
      });
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  console.log(expenses);

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
              key={index}
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
                    {formatDate(exp.date)}
                  </div>
                </Col>
              </Row>
            </ListGroup.Item>
          );
        })}
      </ListGroup>

      {/* Modal for Editing */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Expense</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedExpense && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Date</Form.Label>
                <Form.Control
                  type="date"
                  value={selectedExpense.date}
                  onChange={(e) => handleFieldChange("date", e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Type</Form.Label>
                <Form.Select
                  value={selectedExpense.type}
                  onChange={(e) => handleFieldChange("type", e.target.value)}
                >
                  <option>Expense</option>
                  <option>Refund</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Category</Form.Label>
                <Form.Select
                  value={selectedExpense.categories}
                  onChange={(e) =>
                    handleFieldChange("categories", e.target.value)
                  }
                >
                  <option value="">Select a Category</option>
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Tags</Form.Label>
                <Form.Control
                  type="text"
                  value={selectedExpense.tags.join(", ")}
                  onChange={(e) =>
                    handleFieldChange(
                      "tags",
                      e.target.value.split(",").map((tag) => tag.trim()),
                    )
                  }
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Value</Form.Label>
                <Form.Control
                  type="number"
                  value={selectedExpense.value}
                  onChange={(e) =>
                    handleFieldChange("value", parseFloat(e.target.value))
                  }
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={selectedExpense.notes}
                  onChange={(e) => handleFieldChange("notes", e.target.value)}
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

/**
 * Convert "MM/DD/YYYY" to "Fri, Dec 13th"
 */
function formatDate(dateStr: string) {
  const [m, d, y] = dateStr.split("/");
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  const year = parseInt(y, 10);

  const date = new Date(year, month - 1, day);
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const monthName = date.toLocaleDateString(undefined, { month: "short" });
  const daySuffix = getDaySuffix(day);

  return `${weekday}, ${monthName} ${day}${daySuffix}`;
}

function getDaySuffix(day: number) {
  if (day >= 11 && day <= 13) {
    return "th";
  }
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export default HistoryPage;
