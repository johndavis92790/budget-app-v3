import { useState, useEffect } from "react";
import { FiscalWeek, History } from "./types";
import {
  ListGroup,
  Badge,
  Row,
  Col,
  Button,
  Form,
  InputGroup,
} from "react-bootstrap";
import {
  formatDateFromYYYYMMDD,
  generateRandom10DigitNumber,
  getCategoryIcon,
} from "./helpers";
import FullPageSpinner from "./FullPageSpinner";
import EditHistoryPage from "./EditHistoryPage";
import "./HistoryPage.css";
import { DateField, MultiSelectField } from "./CommonFormFields";
import FiscalCalendar from "./FiscalCalendar";
import { useNavigate } from "react-router-dom";

interface HistoryPageProps {
  history: History[];
  fiscalWeeks: Record<string, FiscalWeek>;
  loading: boolean;
  categories: string[];
  existingTags: string[];
  onUpdateItem: (updatedHistory: History) => Promise<void>;
  deleteItem: (item: History) => Promise<void>;
}

function HistoryPage({
  history,
  fiscalWeeks,
  loading,
  categories,
  existingTags,
  onUpdateItem,
  deleteItem,
}: HistoryPageProps) {
  const initialitemsToShow = 100;
  const itemsToRevealOnClick = 30;
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [itemsToShow, setItemsToShow] = useState(initialitemsToShow);
  const [showFilters, setShowFilters] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const navigate = useNavigate();

  // Reset pagination when filters change
  useEffect(() => {
    setItemsToShow(initialitemsToShow);
  }, [
    searchTerm,
    selectedCategories,
    selectedTypes,
    selectedTags,
    startDate,
    endDate,
    initialitemsToShow,
  ]);

  if (loading) {
    return <FullPageSpinner />;
  }

  // Sort and filter history
  const filteredHistory = showFilters
    ? [...history].filter((item) => {
        // Date range filter - always apply as AND condition
        const itemDate = new Date(item.date).toISOString().split("T")[0];
        const matchesDate =
          (!startDate || itemDate >= startDate) &&
          (!endDate || itemDate <= endDate);

        // Search filter
        const matchesSearch =
          searchTerm === "" || // If no search term, this condition is true
          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tags.some((tag) =>
            tag.toLowerCase().includes(searchTerm.toLowerCase()),
          );

        // Category filter - OR operation when multiple categories are selected
        // (If any selected category matches the item's category, include it)
        const matchesCategory =
          selectedCategories.length === 0 || // If no categories selected, this condition is true
          selectedCategories.includes(item.category);

        // Type filter - OR operation when multiple types are selected
        // (If any selected type matches the item's type, include it)
        const matchesType =
          selectedTypes.length === 0 || // If no types selected, this condition is true
          selectedTypes.includes(item.type);

        // Tags filter - OR operation when multiple tags are selected
        // (If any selected tag is in the item's tags array, include it)
        const matchesTags =
          selectedTags.length === 0 || // If no tags selected, this condition is true
          selectedTags.some((tag) => item.tags.includes(tag));

        // AND operation between different filter types
        // (Item must match all active filter types)
        return (
          matchesDate &&
          matchesSearch &&
          matchesCategory &&
          matchesType &&
          matchesTags
        );
      })
    : history; // If filters are hidden, display all history items

  const sortedHistory = filteredHistory.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);

    // First: Compare by date (latest dates first)
    const dateComparison = dateB.getTime() - dateA.getTime();
    if (dateComparison !== 0) {
      return dateComparison;
    }

    // Second: Compare by type (alphabetically, ascending order)
    const typeComparison = a.type.localeCompare(b.type);
    if (typeComparison !== 0) {
      return typeComparison;
    }

    // Third: Compare by value (lowest value first)
    return a.value - b.value;
  });

  const toggleRow = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleClose = () => {
    setExpandedRowId(null); // Collapse the expanded row
  };

  const handleLoadMore = () => {
    setItemsToShow(itemsToShow + itemsToRevealOnClick); // Load more items
  };

  const handleRemoveFilters = () => {
    setSearchTerm("");
    setSelectedCategories([]);
    setSelectedTypes([]);
    setSelectedTags([]);
    setStartDate("");
    setEndDate("");
  };

  return (
    <div>
      <div className="d-flex justify-content-center mb-2">
        <Button onClick={() => navigate(`/add-history`)}>
          Add Expense/Refund
        </Button>
      </div>

      <div className="d-flex justify-content-between mb-2">
        <h2>History</h2>
        <Button
          variant="secondary"
          className="mb-3"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
      </div>

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
                    availableOptions={existingTags}
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
                  <label>Search</label>
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
            <div className="d-flex justify-content-end">
              <Button variant="outline-danger" onClick={handleRemoveFilters}>
                Clear Filters
              </Button>
            </div>
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
                  <Col xs={7}>
                    <div style={{ fontSize: "1em" }}>
                      <Badge
                        pill
                        bg="info"
                        className="mb-1"
                        style={{
                          fontSize: "1em",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        {getCategoryIcon(hist.category)}
                        {hist.category}
                      </Badge>
                    </div>
                    <div className="mb-1 ms-2" style={{ fontSize: "1em" }}>
                      {hist.description}
                    </div>
                    {hist.tags.length > 0 && (
                      <div className="mb-1 ms-2">
                        {hist.tags.map((tag, i) => (
                          <Badge
                            key={`history-tag-${hist.id}-${i}-${generateRandom10DigitNumber()}`}
                            bg="secondary"
                            className="me-1"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Col>
                  <Col xs={5} className="text-end">
                    <div className="text-muted" style={{ fontSize: "0.9em" }}>
                      {hist.type}
                    </div>
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
                    existingTags={existingTags}
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

      <FiscalCalendar fiscalWeeks={fiscalWeeks} history={history} />
    </div>
  );
}

export default HistoryPage;
