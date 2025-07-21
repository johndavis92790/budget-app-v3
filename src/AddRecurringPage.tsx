import { FormEvent, useState, useCallback } from "react";
import { Form, Button, Row, Col, Spinner, Alert } from "react-bootstrap";
import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import FullSizeImageModal from "./FullSizeImageModal";
import { TagField, DescriptionField, CategoryField } from "./CommonFormFields";

import CurrencyInput from "./CurrencyInput";
import { Recurring } from "./types";
import UnifiedFileManager from "./UnifiedFileManager";
import { useAuthContext } from "./authContext";

interface AddRecurringPageProps {
  type: string;
  existingTags: string[];
  categories: string[];
  addItem: (recurring: Recurring) => Promise<boolean>;
  onClose?: () => void; // Optional, for inline usage to collapse the UI
}

function AddRecurringPage({
  type,
  existingTags,
  categories,
  addItem,
  onClose,
}: AddRecurringPageProps) {
  const { currentUser } = useAuthContext();
  const userEmail = currentUser?.email;

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // Memoized callbacks to pass to UnifiedFileManager
  const handleFileSelect = useCallback((url: string | null) => {
    setSelectedImageUrl(url);
  }, []);

  const handleNewFilesChange = useCallback((files: File[]) => {
    setNewFiles(files);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!type || !category || !value) {
      setError("Type, Category, and Value are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const uniqueId = String(Date.now());
      const initialDigit = type === "Income" ? "2" : "3";
      const updatedId = initialDigit + uniqueId.slice(1);

      const storageRef = ref(storage, `images/${updatedId}`);
      const uploadedUrls: string[] = [];

      for (const file of newFiles) {
        const fileRef = ref(storage, `${storageRef}/${file.name}`);
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        uploadedUrls.push(downloadURL);
      }

      const numericStr = value.replace(/[^0-9.-]/g, "");
      const numericValue = parseFloat(numericStr);
      if (isNaN(numericValue)) {
        setError("Invalid numeric value for 'Amount'.");
        setSubmitting(false);
        return;
      }

      const newRecurring: Recurring = {
        userEmail,
        type,
        category,
        description,
        tags: selectedTags,
        value: numericValue,
        id: updatedId,
        itemType: "recurring",
      };

      const success = await addItem(newRecurring);
      if (!success) {
        setError("Failed to add recurring item.");
        return;
      }

      // Reset form fields
      setCategory("");
      setDescription("");
      setSelectedTags([]);
      setValue("");
      setNewFiles([]);

      if (onClose) {
        onClose(); // Collapse inline UI
      }
    } catch (err) {
      console.error("Error adding recurring:", err);
      setError("An error occurred while adding the recurring item.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}
      <h5 className="mb-3">Add New {type}</h5>
      <Form onSubmit={handleSubmit}>
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
                disabled={submitting}
                placeholder="$0.00"
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

        <div className="d-flex justify-content-end mt-3">
          {onClose && (
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
              style={{ marginRight: "10px" }}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? (
              <Spinner as="span" animation="border" size="sm" />
            ) : (
              "Add"
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

export default AddRecurringPage;
