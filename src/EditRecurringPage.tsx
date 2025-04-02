import { useEffect, useState, useCallback } from "react";
import { Recurring } from "./types";
import { Form, Button, Spinner, Row, Col, Alert } from "react-bootstrap";
import { DescriptionField, TagField, CategoryField } from "./CommonFormFields";
import CurrencyInput from "./CurrencyInput";
import UnifiedFileManager from "./UnifiedFileManager";
import FullSizeImageModal from "./FullSizeImageModal";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { storage } from "./firebase";

interface EditRecurringPageProps {
  selectedRecurring: Recurring;
  categories: string[];
  existingTags: string[];
  onUpdateItem: (updatedRecurring: Recurring) => Promise<void>;
  deleteItem: (item: Recurring) => Promise<void>;
  onClose: () => void; // Callback to collapse the row
}

function EditRecurringPage({
  selectedRecurring,
  categories,
  existingTags,
  onUpdateItem,
  deleteItem,
  onClose,
}: EditRecurringPageProps) {
  const [updatedRecurring, setUpdatedRecurring] =
    useState<Recurring>(selectedRecurring);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    selectedRecurring.tags || [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // ----------------- Memoized Callbacks for File Manager -----------------
  const handleFileSelect = useCallback((url: string | null) => {
    setSelectedImageUrl(url);
  }, []);

  const handleNewFilesChange = useCallback((files: File[]) => {
    setNewFiles(files);
  }, []);

  const handleRemovedPathsChange = useCallback((paths: string[]) => {
    setRemovedPaths(paths);
  }, []);

  const handleError = useCallback((error: string | null) => {
    setError(error);
  }, []);

  useEffect(() => {
    setUpdatedRecurring(selectedRecurring);
    setSelectedTags(selectedRecurring.tags || []);
  }, [selectedRecurring]);

  const handleFieldChange = useCallback(
    (field: keyof Recurring, value: string | number | string[]) => {
      setUpdatedRecurring({ ...updatedRecurring, [field]: value });
    },
    [updatedRecurring],
  );

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      updatedRecurring.tags = selectedTags; // Assign updated tags

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

      for (const path of removedPaths) {
        const fileRef = ref(storage, path);
        await deleteObject(fileRef);
      }

      await onUpdateItem(updatedRecurring);
      onClose(); // Collapse the row after saving
    } catch (error: any) {
      console.error("Error saving recurring:", error);
      setError("An error occurred while saving the recurring item.");
    } finally {
      setSubmitting(false);
    }
  }, [
    updatedRecurring,
    selectedTags,
    newFiles,
    removedPaths,
    onUpdateItem,
    onClose,
  ]);

  const handleDelete = useCallback(async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this recurring item?",
    );
    if (!confirmDelete) return;

    setDeleting(true);
    setError(null);
    try {
      if (selectedRecurring.id) {
        const folderRef = ref(storage, `images/${selectedRecurring.id}`);
        const res = await listAll(folderRef);
        for (const itemRef of res.items) {
          await deleteObject(itemRef);
        }
      }

      await deleteItem(selectedRecurring);
      onClose(); // Collapse the row after deleting
    } catch (error: any) {
      console.error("Error deleting recurring item:", error);
      setError("An error occurred while deleting the recurring item.");
    } finally {
      setDeleting(false);
    }
  }, [selectedRecurring, deleteItem, onClose]);

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}
      <h5 className="mb-3">Edit {updatedRecurring.type}</h5>
      <Form>
        <Row>
          <Col xs={7}>
            <CategoryField
              categoryValue={updatedRecurring.category}
              setCategoryValue={(val) => handleFieldChange("category", val)}
              categories={categories}
              disabled={submitting}
              required
            />
          </Col>
          <Col xs={5}>
            <Form.Group controlId="formValue" className="mb-3">
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

        <Row>
          <Col>
            <DescriptionField
              value={updatedRecurring.description}
              onChange={(val) => handleFieldChange("description", val)}
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
      </Form>

      <hr />
      <UnifiedFileManager
        id={updatedRecurring.id}
        label="Images / PDFs"
        folderName="images"
        disabled={submitting}
        onSetError={handleError}
        onSelectImage={handleFileSelect}
        onNewFilesChange={handleNewFilesChange}
        onRemovedPathsChange={handleRemovedPathsChange}
      />

      <div className="d-flex justify-content-end">
        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={deleting || submitting}
        >
          {deleting ? (
            <Spinner as="span" animation="border" size="sm" />
          ) : (
            "Delete"
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={submitting}
          style={{ marginLeft: "10px" }}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={submitting}
          style={{ marginLeft: "10px" }}
        >
          {submitting ? (
            <Spinner as="span" animation="border" size="sm" />
          ) : (
            "Save"
          )}
        </Button>
      </div>

      <FullSizeImageModal
        show={selectedImageUrl !== null}
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </div>
  );
}

export default EditRecurringPage;
