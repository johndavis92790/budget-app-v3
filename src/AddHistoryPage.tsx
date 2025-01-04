// src/AddHistoryPage.tsx
import { useState } from "react";
import { Form, Button, Row, Col, Spinner, Alert } from "react-bootstrap";
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
import { History } from "./types";
import UnifiedFileManager from "./UnifiedFileManager";
import { useNavigate } from "react-router-dom";

interface AddHistoryPageProps {
  categories: string[];
  existingTags: string[];
  addItem: (history: History) => Promise<boolean>;
  loading: boolean;
  weeklyGoal: number;
  monthlyGoal: number;
  onUpdateGoal: (
    itemType: "weeklyGoal" | "monthlyGoal",
    newValue: number,
  ) => Promise<void>;
}

function AddHistoryPage({
  categories,
  existingTags,
  addItem,
  loading,
  weeklyGoal,
  monthlyGoal,
  onUpdateGoal,
}: AddHistoryPageProps) {
  const navigate = useNavigate();
  // ----------------- Basic form states -----------------
  const [date, setDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [category, setCategory] = useState("");

  // ------------- Two states for tags -------------
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTags, setNewTags] = useState<string[]>([]);

  // ------------- Other fields -------------
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unique ID for "Edit" link once we create it
  const editURLFragment =
    "https://console.firebase.google.com/u/0/project/budget-app-v3/storage/budget-app-v3.firebasestorage.app/files/~2Fimages~2F";

  // ------------- Image Management States -------------
  const [newFiles, setNewFiles] = useState<File[]>([]); // Files to upload

  // ------------- Helper: handle existing + new tags on submit -------------
  const handleSubmit = async (type: "Expense" | "Refund") => {
    // Combine existing + new tags
    const finalTags = [
      ...selectedTags,
      ...newTags.map((t) => t.trim()).filter(Boolean),
    ];

    if (!date || !category || finalTags.length === 0 || !value) {
      setError("Date, Category, at least one Tag, and Value are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // Generate unique ID for the new history item
      const uniqueId = String(Date.now());

      // Upload images to Firebase Storage under 'images/{id}/'
      const storageRef = ref(storage, `images/${uniqueId}`);
      const uploadedUrls: string[] = [];

      for (const file of newFiles) {
        const fileRef = ref(storage, `${storageRef}/${file.name}`);
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        uploadedUrls.push(downloadURL);
      }

      const editURL = `${editURLFragment}${uniqueId}`;

      // Validate numeric
      const numericStr = value.replace(/[^0-9.-]/g, "");
      const numericValue = parseFloat(numericStr);
      if (isNaN(numericValue)) {
        setError("Invalid numeric value for 'Value'.");
        setSubmitting(false);
        return;
      }

      const newHistory: History = {
        date,
        type,
        category,
        tags: finalTags,
        value: numericValue,
        description,
        editURL,
        id: uniqueId,
        itemType: "history",
      };

      // Send to your backend
      const success = await addItem(newHistory);
      if (!success) {
        setError("Failed to add history.");
        return;
      }

      // Adjust weekly/monthly goals
      if (type === "Expense") {
        await onUpdateGoal("weeklyGoal", weeklyGoal - numericValue);
        await onUpdateGoal("monthlyGoal", monthlyGoal - numericValue);
      } else if (type === "Refund") {
        await onUpdateGoal("weeklyGoal", weeklyGoal + numericValue);
        await onUpdateGoal("monthlyGoal", monthlyGoal + numericValue);
      }

      // Reset form fields
      const now = new Date();
      const yyyyNew = now.getFullYear();
      const mmNew = String(now.getMonth() + 1).padStart(2, "0");
      const ddNew = String(now.getDate()).padStart(2, "0");
      setDate(`${yyyyNew}-${mmNew}-${ddNew}`);

      setCategory("");
      setSelectedTags([]);
      setNewTags([]);
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

  function handleExistingTagsUpdate(newArray: string[]) {
    setSelectedTags(newArray);
  }
  function handleNewTagsUpdate(newArray: string[]) {
    setNewTags(newArray);
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
          <Col xs={6}>
            <DateField
              value={date}
              onChange={setDate}
              disabled={submitting}
              required
            />
          </Col>
          <Col xs={6}>
            <CategoryField
              categoryValue={category}
              setCategoryValue={setCategory}
              categories={categories}
              disabled={submitting}
              required
            />
          </Col>
        </Row>

        <Row>
          <Col xs={6}>
            <TagField
              selectedTags={selectedTags}
              setSelectedTags={handleExistingTagsUpdate}
              existingTags={existingTags}
              disabled={submitting}
              required
              newTags={newTags}
              setNewTags={handleNewTagsUpdate}
            />
          </Col>
          <Col xs={6}>
            <Form.Group controlId="formValue" className="mb-3">
              <Form.Label>Amount</Form.Label>
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
          <Col>
            <DescriptionField
              value={description}
              onChange={setDescription}
              disabled={submitting}
            />
          </Col>
        </Row>

        {/* UnifiedFileManager to let user pick/compress images */}
        <Row>
          <Col md={4}>
            <UnifiedFileManager
              label="Images"
              disabled={submitting}
              onSelectImage={(url) => setSelectedImageUrl(url)}
              onNewFilesChange={(files) => setNewFiles(files)}
              // In Add mode, no existing files to remove
            />
          </Col>
        </Row>

        <div className="d-flex justify-content-around mt-3">
          <Button
            type="button"
            variant="success"
            onClick={() => handleSubmit("Refund")}
            disabled={submitting}
          >
            {submitting ? (
              <Spinner as="span" animation="border" size="sm" />
            ) : (
              "Refund"
            )}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => handleSubmit("Expense")}
            disabled={submitting}
          >
            {submitting ? (
              <Spinner as="span" animation="border" size="sm" />
            ) : (
              "Expense"
            )}
          </Button>
        </div>
      </Form>

      <FullSizeImageModal
        show={selectedImageUrl !== null}
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </div>
  );
}

export default AddHistoryPage;
