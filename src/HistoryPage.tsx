import { useState } from "react";
import { History } from "./types";
import {
  ListGroup,
  Badge,
  Row,
  Col,
  Button,
  Form,
  InputGroup,
} from "react-bootstrap";
import { formatDateFromYYYYMMDD } from "./helpers";
import FullPageSpinner from "./FullPageSpinner";
import EditHistoryPage from "./EditHistoryPage";
import "./HistoryPage.css";
import { DateField, MultiSelectField } from "./CommonFormFields";

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
  const [itemsToShow, setItemsToShow] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const getFormattedDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [startDate, setStartDate] = useState(getFormattedDate);
  const [endDate, setEndDate] = useState(getFormattedDate);

  if (loading) {
    return <FullPageSpinner />;
  }

  // Sort and filter history
  const filteredHistory = showFilters
    ? [...history].filter((item) => {
        // Search filter
        const matchesSearch =
          searchTerm === "" ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase());

        // Category filter
        const matchesCategory =
          selectedCategories.length === 0 ||
          selectedCategories.includes(item.category);

        // Type filter
        const matchesType =
          selectedTypes.length === 0 || selectedTypes.includes(item.type);

        // Tags filter
        const matchesTags =
          selectedTags.length === 0 ||
          selectedTags.every((tag) => item.tags.includes(tag));

        // Date range filter
        const itemDate = new Date(item.date).toISOString().split("T")[0];
        const matchesDate =
          (!startDate || itemDate >= startDate) &&
          (!endDate || itemDate <= endDate);

        return (
          matchesSearch &&
          matchesCategory &&
          matchesType &&
          matchesTags &&
          matchesDate
        );
      })
    : history; // If filters are hidden, display all history items

  const sortedHistory = filteredHistory.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime(); // Latest dates first
  });

  const toggleRow = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleClose = () => {
    setExpandedRowId(null); // Collapse the expanded row
  };

  const handleLoadMore = () => {
    setItemsToShow(itemsToShow + 10); // Load more items
  };

  function generateRandom10DigitNumber() {
    const random10DigitNumber = Math.floor(
      1000000000 + Math.random() * 9000000000
    );
    return random10DigitNumber;
  }

  return (
    <div>
      <h2 className="mb-4">History</h2>
      <Button
        variant="secondary"
        className="mb-3"
        onClick={() => setShowFilters(!showFilters)}
      >
        {showFilters ? "Hide Filters" : "Show Filters"}
      </Button>
      {showFilters && (
        <div
          className="filters mb-4 p-3"
          style={{ border: "1px solid #ddd", borderRadius: "5px" }}
        >
          <Form.Group>
            <Row>
              <Col>
                <label>Start Date</label>
                <DateField
                  value={startDate}
                  onChange={(date) => setStartDate(date)}
                />
                <Form.Group className="mb-3">
                  <label>Types</label>
                  <MultiSelectField
                    selectedOptions={selectedTypes}
                    setSelectedOptions={setSelectedTypes}
                    availableOptions={[
                      "Expense",
                      "Recurring Expense",
                      "Income",
                      "Recurring Income",
                    ]}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <label>Tags</label>
                  <MultiSelectField
                    selectedOptions={selectedTags}
                    setSelectedOptions={setSelectedTags}
                    availableOptions={nonRecurringTags}
                  />
                </Form.Group>
              </Col>
              <Col>
                <label>End Date</label>
                <DateField
                  value={endDate}
                  onChange={(date) => setEndDate(date)}
                />
                <Form.Group className="mb-3">
                  <label>Categories</label>
                  <MultiSelectField
                    selectedOptions={selectedCategories}
                    setSelectedOptions={setSelectedCategories}
                    availableOptions={categories}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <label>Description</label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>
          </Form.Group>
        </div>
      )}
      <ListGroup variant="flush">
        {sortedHistory.slice(0, itemsToShow).map((hist, index) => {
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
            <div key={`${hist.id}${generateRandom10DigitNumber()}`}>
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
      {itemsToShow < sortedHistory.length && (
        <div className="text-center mt-3">
          <Button variant="primary" onClick={handleLoadMore}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
