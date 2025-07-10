import { useState, useEffect, useCallback } from "react";
import { FiscalWeek, History, Hsa } from "./types";
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
import EditHsaPage from "./EditHsaPage";
import "./HistoryPage.css"; // Reusing the same CSS
import { DateField, MultiSelectField } from "./CommonFormFields";

interface HSAExpensesPageProps {
  history: History[];
  hsaItems: Hsa[];
  loading: boolean;
  categories: string[];
  existingTags: string[];
  onUpdateItem: (updatedHistory: History) => Promise<void>;
  deleteItem: (item: History) => Promise<void>;
  onUpdateHsaItem: (updatedHsa: Hsa) => Promise<void>;
  deleteHsaItem: (hsaItem: Hsa) => Promise<void>;
}

interface HistoryWithHsa extends History {
  hsaObject: Hsa | undefined;
}

function HSAExpensesPage({
  history,
  hsaItems,
  loading,
  categories,
  existingTags,
  onUpdateItem,
  deleteItem,
  onUpdateHsaItem,
  deleteHsaItem,
}: HSAExpensesPageProps) {
  const initialitemsToShow = 100;
  const itemsToRevealOnClick = 30;
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [itemsToShow, setItemsToShow] = useState(initialitemsToShow);
  const [showFilters, setShowFilters] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [purchaseStartDate, setPurchaseStartDate] = useState("");
  const [purchaseEndDate, setPurchaseEndDate] = useState("");
  const [reimbursementStartDate, setReimbursementStartDate] = useState("");
  const [reimbursementEndDate, setReimbursementEndDate] = useState("");

  // Show HSA summary at the top
  const [totalHSAExpenses, setTotalHSAExpenses] = useState(0);
  const [hsaItemCount, setHsaItemCount] = useState(0);

  // Reset pagination when filters change
  useEffect(() => {
    setItemsToShow(initialitemsToShow);
  }, [
    searchTerm,
    selectedCategories,
    selectedTypes,
    purchaseStartDate,
    purchaseEndDate,
    reimbursementStartDate,
    reimbursementEndDate,
    initialitemsToShow,
  ]);

  const getHsaItem = useCallback(
    (historyId: string) => {
      return hsaItems.find((hsa) => hsa.historyId === historyId);
    },
    [hsaItems],
  );

  // Calculate HSA totals when history changes
  useEffect(() => {
    // Filter history to only HSA-tagged items
    const historyItems = history.filter((item) => item.hsa === true);
    const hsaHistoryItems: HistoryWithHsa[] = historyItems.map((item) => ({
      ...item,
      hsaObject: getHsaItem(item.id),
    }));
    console.log("hsaHistoryItems", hsaHistoryItems);

    // Calculate the total expenses
    const total = hsaHistoryItems.reduce((sum, item) => {
      // Only include expenses
      if (item.type === "Expense" || item.type === "Recurring Expense") {
        return sum + (item.hsaObject?.reimbursementAmount || item.value);
      }
      return sum;
    }, 0);

    setTotalHSAExpenses(total);
    setHsaItemCount(hsaHistoryItems.length);
  }, [history, getHsaItem, hsaItems]);

  if (loading) {
    return <FullPageSpinner />;
  }

  // First filter to only show HSA tagged items
  const historyItems = history.filter((item) => item.hsa === true);
  const hsaHistoryItems: HistoryWithHsa[] = historyItems.map((item) => ({
    ...item,
    hsaObject: getHsaItem(item.id),
  }));

  // Then apply additional filters if needed
  const filteredHistory = showFilters
    ? hsaHistoryItems.filter((item) => {
        // History date range filter - always apply as AND condition
        const historyDate = new Date(item.date).toISOString().split("T")[0];
        const matchesDate =
          (!purchaseStartDate || historyDate >= purchaseStartDate) &&
          (!purchaseEndDate || historyDate <= purchaseEndDate);

        // HSA reimbursement date range filter - always apply as AND condition
        const hsaDate = new Date(item.hsaObject?.reimbursementDate || item.date)
          .toISOString()
          .split("T")[0];
        const matchesHsaDate =
          (!reimbursementStartDate || hsaDate >= reimbursementStartDate) &&
          (!reimbursementEndDate || hsaDate <= reimbursementEndDate);

        // Search filter
        const matchesSearch =
          searchTerm === "" || // If no search term, this condition is true
          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase());

        // Category filter - OR operation when multiple categories are selected
        const matchesCategory =
          selectedCategories.length === 0 || // If no categories selected, this condition is true
          selectedCategories.includes(item.category);

        // Type filter - OR operation when multiple types are selected
        const matchesType =
          selectedTypes.length === 0 || // If no types selected, this condition is true
          selectedTypes.includes(item.type);

        // AND operation between different filter types
        return (
          matchesDate &&
          matchesHsaDate &&
          matchesSearch &&
          matchesCategory &&
          matchesType
        );
      })
    : hsaHistoryItems; // If filters are hidden, display all HSA history items

  // Sort by date, most recent first
  const sortedHistory = [...filteredHistory].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const toggleRow = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleClose = () => {
    setExpandedRowId(null);
  };

  const handleLoadMore = () => {
    setItemsToShow((prev) => prev + itemsToRevealOnClick);
  };

  const handleRemoveFilters = () => {
    setSearchTerm("");
    setSelectedCategories([]);
    setSelectedTypes([]);
    setPurchaseStartDate("");
    setPurchaseEndDate("");
    setReimbursementStartDate("");
    setReimbursementEndDate("");
  };

  return (
    <div className="pt-3">
      <h2>HSA Expenses</h2>

      {/* HSA Summary */}
      <div
        className="mb-4 p-3"
        style={{ backgroundColor: "#f8f9fa", borderRadius: "8px" }}
      >
        <h4>HSA Summary</h4>
        <Row>
          <Col xs={6}>
            <div className="mb-2">
              <strong>Total HSA Expenses:</strong>
            </div>
            <div
              style={{
                fontSize: "1.5em",
                fontWeight: "bold",
                color: "#dc3545",
              }}
            >
              $
              {totalHSAExpenses.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </Col>
          <Col xs={6}>
            <div className="mb-2">
              <strong>Number of HSA Items:</strong>
            </div>
            <div style={{ fontSize: "1.5em", fontWeight: "bold" }}>
              {hsaItemCount}
            </div>
          </Col>
        </Row>
      </div>

      <div className="mb-3 d-flex justify-content-between align-items-center">
        <Button
          variant="outline-secondary"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
      </div>

      {showFilters && (
        <div
          className="mb-4 p-3"
          style={{ backgroundColor: "#f8f9fa", borderRadius: "8px" }}
        >
          <Form.Group className="mb-3">
            <Form.Label>Search</Form.Label>
            <InputGroup>
              <Form.Control
                type="text"
                placeholder="Search description or category"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button
                variant="outline-secondary"
                onClick={() => setSearchTerm("")}
              >
                Clear
              </Button>
            </InputGroup>
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Purchase Date Range</Form.Label>
                <Row>
                  <Col>
                    <DateField
                      value={purchaseStartDate}
                      onChange={(date) => setPurchaseStartDate(date)}
                    />
                  </Col>
                  <Col>
                    <DateField
                      value={purchaseEndDate}
                      onChange={(date) => setPurchaseEndDate(date)}
                    />
                  </Col>
                </Row>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Reimbursement Date Range</Form.Label>
                <Row>
                  <Col>
                    <DateField
                      value={reimbursementStartDate}
                      onChange={(date) => setReimbursementStartDate(date)}
                    />
                  </Col>
                  <Col>
                    <DateField
                      value={reimbursementEndDate}
                      onChange={(date) => setReimbursementEndDate(date)}
                    />
                  </Col>
                </Row>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Categories</Form.Label>
                <MultiSelectField
                  selectedOptions={selectedCategories}
                  setSelectedOptions={setSelectedCategories}
                  availableOptions={categories}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Types</Form.Label>
                <MultiSelectField
                  selectedOptions={selectedTypes}
                  setSelectedOptions={setSelectedTypes}
                  availableOptions={[
                    "Expense",
                    "Income",
                    "Recurring Expense",
                    "Recurring Income",
                  ]}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group>
            <div className="d-flex justify-content-end">
              <Button
                variant="secondary"
                onClick={handleRemoveFilters}
                className="me-2"
              >
                Clear All Filters
              </Button>
            </div>
          </Form.Group>
        </div>
      )}

      {sortedHistory.length === 0 ? (
        <div className="text-center mt-5">
          <p>
            No HSA expenses found. Add transactions with the "HSA" tag to see
            them here.
          </p>
        </div>
      ) : (
        <>
          <ListGroup variant="flush">
            {sortedHistory.slice(0, itemsToShow).map((hist, index) => {
              const isExpense =
                hist.type === "Expense" || hist.type === "Recurring Expense";
              const valueColor = isExpense ? "text-danger" : "text-success";
              const value = hist.hsaObject?.reimbursementAmount || hist.value;
              const formattedValue =
                (isExpense ? "-" : "+") +
                value.toLocaleString("en-US", {
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
                        <div className="mb-1 ms-2">
                          {hist.tags.map((tag, i) => (
                            <Badge
                              key={`hsa-tag-${hist.id}-${i}-${generateRandom10DigitNumber()}`}
                              bg="secondary"
                              className="me-1"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </Col>
                      <Col xs={5} className="text-end">
                        <div
                          className="text-muted"
                          style={{ fontSize: "0.9em" }}
                        >
                          {hist.type}
                        </div>
                        <div
                          className={valueColor}
                          style={{ fontSize: "1.1em", fontWeight: "bold" }}
                        >
                          {formattedValue}
                        </div>
                        <div
                          className="text-muted"
                          style={{ fontSize: "0.9em" }}
                        >
                          Purchased: {formatDateFromYYYYMMDD(hist.date)}
                          <br />
                          {hist.hsaObject?.reimbursementDate && (
                            <span>
                              Reimbursed:{" "}
                              {formatDateFromYYYYMMDD(
                                hist.hsaObject?.reimbursementDate,
                              )}
                            </span>
                          )}
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
                      {hist.hsaObject ? (
                        <EditHsaPage
                          selectedHsa={hist.hsaObject}
                          associatedHistory={hist}
                          onUpdateItem={onUpdateItem}
                          deleteItem={deleteItem}
                          onUpdateHsaItem={onUpdateHsaItem}
                          deleteHsaItem={deleteHsaItem}
                          onClose={handleClose}
                        />
                      ) : (
                        <div className="p-3">
                          <p>
                            This expense is marked as an HSA expense but has no
                            HSA details.
                          </p>
                          <p>You can add details by updating the HSA record.</p>
                        </div>
                      )}
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
        </>
      )}
    </div>
  );
}

export default HSAExpensesPage;
