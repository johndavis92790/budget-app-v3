// src/EditRecurringPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Recurring } from "./types";
import { Form, Button, Spinner, Row, Col, Alert } from "react-bootstrap";
import { FaArrowLeft } from "react-icons/fa";

import FullPageSpinner from "./FullPageSpinner";

import {
  DescriptionField,
  TypeField,
  TagField,
  CategoryField,
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

interface EditRecurringPageProps {
  categories: string[];
  nonRecurringTags: string[];
  onUpdateItem: (updatedRecurring: Recurring) => Promise<void>;
  deleteItem: (item: Recurring) => Promise<void>;
  loading: boolean;
  recurring: Recurring[];
}

function EditRecurringPage({
  categories,
  nonRecurringTags,
  onUpdateItem,
  deleteItem,
  loading,
  recurring,
}: EditRecurringPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const recurringTypes = ["Expense", "Income"];

  const [selectedRecurring, setSelectedRecurring] = useState<Recurring | null>(
    null,
  );
  const [updatedRecurring, setUpdatedRecurring] = useState<Recurring | null>(
    null,
  );

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

  // Load the recurring item and initialize state
  useEffect(() => {
    if (loading) return;
    if (!idParam) {
      navigate("/recurring");
      return;
    }

    const foundRecurring = recurring.find((r) => r.id === idParam);
    if (!foundRecurring) {
      navigate("/recurring");
      return;
    }
    setSelectedRecurring(foundRecurring);
    setUpdatedRecurring(foundRecurring);

    setTags(foundRecurring.tags || []);
    setNewTags([]);
  }, [loading, idParam, recurring, navigate]);

  const handleFieldChange = useCallback(
    (field: keyof Recurring, value: string | number | string[]) => {
      if (!updatedRecurring) return;
      setUpdatedRecurring({ ...updatedRecurring, [field]: value });
    },
    [updatedRecurring],
  );

  const handleSave = useCallback(async () => {
    if (!updatedRecurring) return;

    setSubmitting(true);
    setError(null);
    try {
      // Combine existing + new tags
      const finalTags = [
        ...tags,
        ...newTags.map((t) => t.trim()).filter(Boolean),
      ];
      updatedRecurring.tags = finalTags;

      // Upload new images
      const uploadedUrls: string[] = [];
      for (const file of newFiles) {
        const fileRef = ref(
          storage,
          `images/${updatedRecurring.id}/${file.name}`,
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

      // Optionally, you can store uploadedUrls in the recurring object if needed
      // e.g., updatedRecurring.imageUrls = uploadedUrls;

      await onUpdateItem(updatedRecurring);
      navigate("/recurring");
    } catch (error: any) {
      console.error("Error saving recurring:", error);
      setError("An error occurred while saving the recurring item.");
    } finally {
      setSubmitting(false);
    }
  }, [
    updatedRecurring,
    tags,
    newTags,
    newFiles,
    removedPaths,
    onUpdateItem,
    navigate,
  ]);

  const handleDelete = useCallback(async () => {
    if (!selectedRecurring) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this recurring item?",
    );
    if (!confirmDelete) return;

    setDeleting(true);
    setError(null);
    try {
      // Optionally, delete all images associated with this recurring
      if (selectedRecurring.id) {
        const folderRef = ref(storage, `images/${selectedRecurring.id}`);
        const res = await listAll(folderRef);
        for (const itemRef of res.items) {
          await deleteObject(itemRef);
        }
      }

      await deleteItem(selectedRecurring);
      navigate("/recurring");
    } catch (error: any) {
      console.error("Error deleting recurring item:", error);
      setError("An error occurred while deleting the recurring item.");
    } finally {
      setDeleting(false);
    }
  }, [selectedRecurring, deleteItem, navigate]);

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
  if (!updatedRecurring) {
    return <p>Loading recurring data or no recurring found...</p>;
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <Button variant="secondary" onClick={() => navigate("/recurring")}>
          <FaArrowLeft /> Back
        </Button>
      </div>

      <h2 className="mb-4">Edit Recurring</h2>
      {error && <Alert variant="danger">{error}</Alert>}

      <Form>
        <Row>
          <Col md={8}>
            <DescriptionField
              value={updatedRecurring.description}
              onChange={(val) => handleFieldChange("description", val)}
              disabled={submitting}
            />
          </Col>
        </Row>

        <Row>
          <Col xs={6}>
            <TypeField
              typeValue={updatedRecurring.type}
              setTypeValue={(val) => handleFieldChange("type", val)}
              options={recurringTypes}
              disabled={submitting}
              required
            />
          </Col>
          <Col xs={6}>
            <CategoryField
              categoryValue={updatedRecurring.category}
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
              <Form.Label>Amount</Form.Label>
              <CurrencyInput
                value={String(updatedRecurring.value || 0)}
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
      </Form>

      <hr />
      <h5>Images</h5>
      <UnifiedFileManager
        id={updatedRecurring.id}
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
          disabled={!updatedRecurring || deleting || submitting}
        >
          {deleting ? (
            <Spinner as="span" animation="border" size="sm" />
          ) : (
            "Delete"
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate("/recurring")}
          disabled={submitting}
          style={{ marginLeft: "10px" }}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!updatedRecurring || submitting}
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

export default EditRecurringPage;
