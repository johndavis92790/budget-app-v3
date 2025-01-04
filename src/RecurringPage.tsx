import { useState } from "react";
import { Recurring } from "./types";
import { ListGroup, Badge, Row, Col, Button } from "react-bootstrap";
import FullPageSpinner from "./FullPageSpinner";
import EditRecurringPage from "./EditRecurringPage";
import AddRecurringPage from "./AddRecurringPage";
import { FaPlus } from "react-icons/fa";
import "./RecurringPage.css";

interface RecurringPageProps {
  recurring: Recurring[];
  loading: boolean;
  categories: string[];
  existingTags: string[];
  onUpdateItem: (updatedRecurring: Recurring) => Promise<void>;
  deleteItem: (item: Recurring) => Promise<void>;
  addItem: (recurring: Recurring) => Promise<boolean>; // Add new recurring
}

function RecurringPage({
  recurring,
  loading,
  categories,
  existingTags,
  onUpdateItem,
  deleteItem,
  addItem,
}: RecurringPageProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  if (loading) {
    return <FullPageSpinner />;
  }

  const toggleRow = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleClose = () => {
    setExpandedRowId(null); // Collapse the expanded row
  };

  // Split recurring items into Income and Expenses
  const incomeItems = recurring.filter((item) => item.type === "Income");
  const expenseItems = recurring.filter((item) => item.type === "Expense");

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
            <div key={item.id}>
              <ListGroup.Item
                className={`py-3 ${backgroundColorClass}`}
                onClick={() => toggleRow(item.id)}
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
              {expandedRowId === item.id && (
                <div
                  className="p-3 mt-2 mb-2"
                  style={{
                    backgroundColor: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                  }}
                >
                  <EditRecurringPage
                    categories={categories}
                    existingTags={existingTags}
                    onUpdateItem={onUpdateItem}
                    deleteItem={deleteItem}
                    selectedRecurring={item}
                    onClose={handleClose}
                  />
                </div>
              )}
            </div>
          );
        })}
        {expandedRowId === "new-income" && (
          <div
            className="p-3 mt-2 mb-2"
            style={{
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: "5px",
            }}
          >
            <AddRecurringPage
              existingTags={existingTags}
              categories={categories}
              addItem={addItem}
              onClose={handleClose}
              type={"Income"}
            />
          </div>
        )}
      </ListGroup>
      {expandedRowId !== "new-income" && (
        <div className="d-flex justify-content-end mb-4">
          <Button variant="success" onClick={() => toggleRow("new-income")}>
            <FaPlus className="me-2" />
            Add Income
          </Button>
        </div>
      )}

      {/* Expenses Section */}
      <h4 className="mb-3">Expenses</h4>
      <ListGroup variant="flush">
        {expenseItems.map((item, index) => {
          const backgroundColorClass =
            index % 2 === 0 ? "row-light" : "row-white";

          return (
            <div key={item.id}>
              <ListGroup.Item
                className={`py-3 ${backgroundColorClass}`}
                onClick={() => toggleRow(item.id)}
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
              {expandedRowId === item.id && (
                <div
                  className="p-3 mt-2 mb-2"
                  style={{
                    backgroundColor: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                  }}
                >
                  <EditRecurringPage
                    categories={categories}
                    existingTags={existingTags}
                    onUpdateItem={onUpdateItem}
                    deleteItem={deleteItem}
                    selectedRecurring={item}
                    onClose={handleClose}
                  />
                </div>
              )}
            </div>
          );
        })}
        {expandedRowId === "new-expense" && (
          <div
            className="p-3 mt-2 mb-2"
            style={{
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: "5px",
            }}
          >
            <AddRecurringPage
              existingTags={existingTags}
              categories={categories}
              addItem={addItem}
              onClose={handleClose}
              type={"Expense"}
            />
          </div>
        )}
      </ListGroup>
      {expandedRowId !== "new-expense" && (
        <div className="d-flex justify-content-end mt-3">
          <Button variant="danger" onClick={() => toggleRow("new-expense")}>
            <FaPlus className="me-2" />
            Add Expense
          </Button>
        </div>
      )}
    </div>
  );
}

export default RecurringPage;
