// src/EditHistoryPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { History, Recurring } from "./types";
import { Form, Button, Spinner, Row, Col, Alert } from "react-bootstrap";
import { FaArrowLeft } from "react-icons/fa";

import FullPageSpinner from "./FullPageSpinner";

import {
  DateField,
  CategoryField,
  TagField,
  DescriptionField,
} from "./CommonFormFields";

import CurrencyInput from "./CurrencyInput";
import UnifiedFileManager from "./UnifiedFileManager";

// Import Firebase Storage functions and the initialized storage instance
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { storage } from "./firebase";
import FullSizeImageModal from "./FullSizeImageModal";

interface EditHistoryPageProps {
  categories: string[];
  nonRecurringTags: string[];
  onUpdateItem: (updatedHistory: History) => Promise<void>;
  deleteItem: (item: History | Recurring) => Promise<void>;
  loading: boolean;
  history: History[];
}

function EditHistoryPage({
  categories,
  nonRecurringTags,
  onUpdateItem,
  deleteItem,
  loading,
  history,
}: EditHistoryPageProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedHistory, setSelectedHistory] = useState<History | null>(null);
  const [updatedHistory, setUpdatedHistory] = useState<History | null>(null);

  const [tags, setTags] = useState<string[]>([]);
  const [newTags, setNewTags] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image management states
  const [newFiles, setNewFiles] = useState<File[]>([]); // New images to upload
  const [removedPaths, setRemovedPaths] = useState<string[]>([]); // Existing images to remove

  // State for displaying selected image in modal
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const queryParams = new URLSearchParams(location.search);
  const idParam = queryParams.get("id");

  // Load the history item and initialize state
  useEffect(() => {
    if (loading) return;
    if (!idParam) {
      navigate("/history");
      return;
    }
    const foundHistory = history.find((h) => h.id === idParam);
    if (!foundHistory) {
      navigate("/history");
      return;
    }
    setSelectedHistory(foundHistory);
    setUpdatedHistory(foundHistory);

    setTags(foundHistory.tags || []);
    setNewTags([]);
  }, [loading, idParam, history, navigate]);

  const handleFieldChange = useCallback(
    (field: keyof History, value: string | number | string[]) => {
      if (!updatedHistory) return;
      setUpdatedHistory({ ...updatedHistory, [field]: value });
    },
    [updatedHistory]
  );

  const handleSave = useCallback(async () => {
    if (!updatedHistory) return;

    setSubmitting(true);
    setError(null);
    try {
      // Combine existing + new tags
      const finalTags = [
        ...tags,
        ...newTags.map((t) => t.trim()).filter(Boolean),
      ];
      updatedHistory.tags = finalTags;

      // Upload new images
      const uploadedUrls: string[] = [];
      for (const file of newFiles) {
        const fileRef = ref(
          storage,
          `images/${updatedHistory.id}/${file.name}`
        );
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        uploadedUrls.push(downloadURL);
      }

      // Delete removed images
      for (const path of removedPaths) {
        const fileRef = ref(storage, path);
        await deleteObject(fileRef);
      }

      // Optionally, you can store uploadedUrls in the history object if needed
      // e.g., updatedHistory.imageUrls = uploadedUrls;

      await onUpdateItem(updatedHistory);
      navigate("/history");
    } catch (error: any) {
      console.error("Error saving history:", error);
      setError("An error occurred while saving the history.");
    } finally {
      setSubmitting(false);
    }
  }, [updatedHistory, tags, newTags, newFiles, removedPaths, onUpdateItem, navigate]);

  const handleDelete = useCallback(async () => {
    if (!selectedHistory) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this history item?"
    );
    if (!confirmDelete) return;

    setDeleting(true);
    setError(null);
    try {
      // Optionally, delete all images associated with this history
      if (selectedHistory.id) {
        const folderRef = ref(storage, `images/${selectedHistory.id}`);
        const res = await listAll(folderRef);
        for (const itemRef of res.items) {
          await deleteObject(itemRef);
        }
      }

      await deleteItem(selectedHistory);
      navigate("/history");
    } catch (error: any) {
      console.error("Error deleting history item:", error);
      setError("An error occurred while deleting the history item.");
    } finally {
      setDeleting(false);
    }
  }, [selectedHistory, deleteItem, navigate]);

  // --- Callback Handlers ---
  const handleSetError = useCallback((err: string | null) => {
    setError(err);
  }, []);

  const handleSelectImage = useCallback((url: string | null) => {
    setSelectedImageUrl(url);
  }, []);

  const handleNewFilesChange = useCallback((files: File[]) => {
    setNewFiles(files);
  }, []);

  const handleRemovedPathsChange = useCallback((paths: string[]) => {
    setRemovedPaths(paths);
  }, []);

  if (loading) {
    return <FullPageSpinner />;
  }
  if (!updatedHistory) {
    return <p>Loading history data or no history found...</p>;
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <Button variant="secondary" onClick={() => navigate("/history")}>
          <FaArrowLeft /> Back
        </Button>
      </div>

      <h2 className="mb-4">Edit {updatedHistory.type} History</h2>
      {error && <Alert variant="danger">{error}</Alert>}

      <Form>
        <Row>
          <Col xs={6}>
            <DateField
              value={updatedHistory.date}
              onChange={(val) => handleFieldChange("date", val)}
              disabled={submitting}
            />
          </Col>
          <Col xs={6}>
            <CategoryField
              categoryValue={updatedHistory.category}
              setCategoryValue={(val) => handleFieldChange("category", val)}
              categories={categories}
              disabled={submitting}
              required
            />
          </Col>
        </Row>

        <Row>
          <Col xs={6}>
            <TagField
              tags={tags}
              setTags={setTags}
              availableTags={nonRecurringTags}
              disabled={submitting}
              newTags={newTags}
              setNewTags={setNewTags}
            />
          </Col>
          <Col xs={6}>
            <Form.Group controlId="formValue" className="mb-3">
              <Form.Label>Value</Form.Label>
              <CurrencyInput
                value={String(updatedHistory.value || 0)}
                placeholder="$0.00"
                style={{ width: "100%" }}
                disabled={submitting}
                onChange={(e) => {
                  const maskedVal = e.target.value;
                  const numericStr = maskedVal.replace(/[^0-9.-]/g, "");
                  const parsed = parseFloat(numericStr);
                  handleFieldChange("value", isNaN(parsed) ? 0 : parsed);
                }}
              />
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col>
            <DescriptionField
              value={updatedHistory.description}
              onChange={(val) => handleFieldChange("description", val)}
              disabled={submitting}
            />
          </Col>
        </Row>
      </Form>

      <hr />
      <h5>Images</h5>
      <UnifiedFileManager
        id={updatedHistory.id}
        folderName="images"
        disabled={submitting}
        onSetError={handleSetError}
        onSelectImage={handleSelectImage}
        onNewFilesChange={handleNewFilesChange}
        onRemovedPathsChange={handleRemovedPathsChange}
      />

      <div className="d-flex justify-content-end">
        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={!updatedHistory || deleting || submitting}
        >
          {deleting ? (
            <Spinner as="span" animation="border" size="sm" />
          ) : (
            "Delete"
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate("/history")}
          disabled={submitting}
          style={{ marginLeft: "10px" }}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!updatedHistory || submitting}
          style={{ marginLeft: "10px" }}
        >
          {submitting ? (
            <Spinner as="span" animation="border" size="sm" />
          ) : (
            "Save"
          )}
        </Button>
      </div>

      {/* Modal to display full-size images */}
      <FullSizeImageModal
        show={selectedImageUrl !== null}
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </div>
  );
}

export default EditHistoryPage;
