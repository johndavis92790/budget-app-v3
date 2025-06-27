import { useState, useCallback } from "react";
import {
  Form,
  Button,
  Row,
  Col,
  Spinner,
  Alert,
  Dropdown,
  ButtonGroup,
} from "react-bootstrap";
import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import FullSizeImageModal from "./FullSizeImageModal";
import FullPageSpinner from "./FullPageSpinner";

import {
  DateField,
  CategoryField,
  DescriptionField,
  TagField,
} from "./CommonFormFields";

import CurrencyInput from "./CurrencyInput";
import { FiscalWeek, History } from "./types";
import UnifiedFileManager from "./UnifiedFileManager";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "./authContext";
import FiscalCalendar from "./FiscalCalendar";

interface AddHistoryPageProps {
  categories: string[];
  existingTags: string[];
  addItem: (history: History) => Promise<boolean>;
  loading: boolean;
  fiscalWeeks: Record<string, FiscalWeek>;
  history: History[];
}

function AddHistoryPage({
  categories,
  existingTags,
  addItem,
  loading,
  fiscalWeeks,
  history,
}: AddHistoryPageProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  const userEmail = currentUser?.email;

  // ----------------- Basic form states -----------------
  const [date, setDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [category, setCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [hsa, setHsa] = useState<"TRUE" | "FALSE">("FALSE");
  const [description, setDescription] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"Expense" | "Refund">(
    "Expense",
  );

  const editURLFragment =
    "https://console.firebase.google.com/u/0/project/budget-app-v3/storage/budget-app-v3.firebasestorage.app/files/~2Fimages~2F";

  // ----------------- Memoized Callbacks for File Manager -----------------
  const handleFileSelect = useCallback((url: string | null) => {
    setSelectedImageUrl(url);
  }, []);

  const handleNewFilesChange = useCallback((files: File[]) => {
    setNewFiles(files);
  }, []);

  // ------------- Image Management States -------------
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const handleSelectType = (type: "Expense" | "Refund") => {
    setSelectedType(type);
  };

  // ------------- Submit Handler -------------
  const handleSubmit = async (type: "Expense" | "Refund") => {
    if (!date || !category || !value) {
      setError("Date, Category, and Value are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const uniqueId = String(Date.now());
      const storageRef = ref(storage, `images/${uniqueId}`);
      const uploadedUrls: string[] = [];

      for (const file of newFiles) {
        const fileRef = ref(storage, `${storageRef}/${file.name}`);
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        uploadedUrls.push(downloadURL);
      }

      const editURL = `${editURLFragment}${uniqueId}`;
      const numericStr = value.replace(/[^0-9.-]/g, "");
      const numericValue = parseFloat(numericStr);
      if (isNaN(numericValue)) {
        setError("Invalid numeric value for 'Value'.");
        setSubmitting(false);
        return;
      }

      const newHistory: History = {
        date,
        userEmail,
        type,
        category,
        tags: selectedTags,
        value: numericValue,
        hsa,
        description,
        editURL,
        id: uniqueId,
        itemType: "history",
      };
      console.log("newHistory: ", newHistory);

      const success = await addItem(newHistory);
      if (!success) {
        setError("Failed to add history.");
        return;
      }

      const now = new Date();
      const yyyyNew = now.getFullYear();
      const mmNew = String(now.getMonth() + 1).padStart(2, "0");
      const ddNew = String(now.getDate()).padStart(2, "0");
      setDate(`${yyyyNew}-${mmNew}-${ddNew}`);
      setCategory("");
      setSelectedTags([]);
      setValue("");
      setDescription("");
      setNewFiles([]);
      navigate("/history");
    } catch (err) {
      console.error("Error adding history:", err);
      setError("An error occurred while adding the history.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && categories.length === 0 && existingTags.length === 0) {
    return <FullPageSpinner />;
  }

  return (
    <div
      className="p-3 mt-2"
      style={{
        backgroundColor: "#fff",
        border: "1px solid #ddd",
        borderRadius: "5px",
      }}
    >
      <h4 className="mb-4">Add an Expense or Refund</h4>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form>
        <Row>
          <Col xs={7}>
            <CategoryField
              categoryValue={category}
              setCategoryValue={setCategory}
              categories={categories}
              disabled={submitting}
              required
            />
          </Col>
          <Col xs={5}>
            <Form.Group controlId="formValue" className="mb-3">
              <CurrencyInput
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="$0.00"
                disabled={submitting}
                style={{ width: "100%" }}
              />
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col xs={6}>
            <DescriptionField
              value={description}
              onChange={setDescription}
              disabled={submitting}
            />
          </Col>
          <Col xs={6}>
            <DateField
              value={date}
              onChange={setDate}
              disabled={submitting}
              required
            />
          </Col>
        </Row>

        <Row>
          <Col>
            <TagField
              selectedTags={selectedTags}
              setSelectedTags={setSelectedTags}
              existingTags={existingTags}
              disabled={submitting}
            />
          </Col>
        </Row>

        <hr />
        <Row>
          <Col md={4}>
            <UnifiedFileManager
              label="Images / PDFs"
              disabled={submitting}
              onSelectImage={handleFileSelect}
              onNewFilesChange={handleNewFilesChange}
            />
          </Col>
        </Row>

        <Row>
          <Col>
            <Form.Group controlId="formHsa">
              <Form.Check
                type="switch"
                id="formHsa"
                label="HSA"
                checked={hsa === "TRUE"}
                onChange={(e) => setHsa(e.target.checked ? "TRUE" : "FALSE")}
                disabled={submitting}
                style={{
                  transform: "scale(1.8)",
                  transformOrigin: "left center",
                }}
              />
            </Form.Group>
          </Col>
          <Col>
            <div className="d-flex justify-content-end">
              <Dropdown as={ButtonGroup}>
                <Button
                  type="button"
                  variant={selectedType === "Expense" ? "danger" : "success"}
                  onClick={() => handleSubmit(selectedType)}
                  disabled={submitting}
                  className="d-flex align-items-center ps-3 pe-3"
                >
                  {submitting ? (
                    <Spinner as="span" animation="border" size="sm" />
                  ) : (
                    selectedType
                  )}
                </Button>
                <div
                  style={{
                    width: "2px",
                    backgroundColor: "#ccc",
                    margin: "0",
                    alignSelf: "stretch",
                  }}
                ></div>

                <Dropdown.Toggle
                  split
                  variant={selectedType === "Expense" ? "danger" : "success"}
                  id="dropdown-split-basic"
                  disabled={submitting}
                  className="ps-3 pe-3"
                />
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => handleSelectType("Expense")}>
                    Expense
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => handleSelectType("Refund")}>
                    Refund
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </Col>
        </Row>
      </Form>

      <FullSizeImageModal
        show={selectedImageUrl !== null}
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />

      <FiscalCalendar fiscalWeeks={fiscalWeeks} history={history} />
    </div>
  );
}

export default AddHistoryPage;
