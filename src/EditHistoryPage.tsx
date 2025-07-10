import { useState, useCallback, useEffect } from "react";
import { History } from "./types";
import { Form, Button, Spinner, Row, Col, Alert } from "react-bootstrap";
import {
  DateField,
  CategoryField,
  TagField,
  DescriptionField,
} from "./CommonFormFields";
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

interface EditHistoryPageProps {
  selectedHistory: History;
  categories: string[];
  existingTags: string[];
  onUpdateItem: (updatedHistory: History) => Promise<void>;
  deleteItem: (item: History) => Promise<void>;
  onClose: () => void; // Callback to collapse the row
}

function EditHistoryPage({
  selectedHistory,
  categories,
  existingTags,
  onUpdateItem,
  deleteItem,
  onClose,
}: EditHistoryPageProps) {
  const [updatedHistory, setUpdatedHistory] =
    useState<History>(selectedHistory);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    selectedHistory.tags || [],
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
    setUpdatedHistory(selectedHistory);
    setSelectedTags(selectedHistory.tags || []);
  }, [selectedHistory]);

  const handleFieldChange = useCallback(
    (field: keyof History, value: string | number | string[] | boolean) => {
      setUpdatedHistory({ ...updatedHistory, [field]: value });
    },
    [updatedHistory],
  );

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      updatedHistory.tags = selectedTags; // Assign updated tags

      const uploadedUrls: string[] = [];
      for (const file of newFiles) {
        const fileRef = ref(
          storage,
          `images/${updatedHistory.id}/${file.name}`,
        );
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        uploadedUrls.push(downloadURL);
      }

      for (const path of removedPaths) {
        const fileRef = ref(storage, path);
        await deleteObject(fileRef);
      }

      await onUpdateItem(updatedHistory);
      onClose(); // Collapse the row after saving
    } catch (error: any) {
      console.error("Error saving history:", error);
      setError("An error occurred while saving the history.");
    } finally {
      setSubmitting(false);
    }
  }, [
    updatedHistory,
    selectedTags,
    newFiles,
    removedPaths,
    onUpdateItem,
    onClose,
  ]);

  const handleDelete = useCallback(async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this history item?",
    );
    if (!confirmDelete) return;

    setDeleting(true);
    setError(null);
    try {
      if (selectedHistory.id) {
        const folderRef = ref(storage, `images/${selectedHistory.id}`);
        const res = await listAll(folderRef);
        for (const itemRef of res.items) {
          await deleteObject(itemRef);
        }
      }

      await deleteItem(selectedHistory);
      onClose(); // Collapse the row after deleting
    } catch (error: any) {
      console.error("Error deleting history item:", error);
      setError("An error occurred while deleting the history item.");
    } finally {
      setDeleting(false);
    }
  }, [selectedHistory, deleteItem, onClose]);

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}
      <h5 className="mb-3">Edit {selectedHistory.type}</h5>
      <Form>
        <Row>
          <Col xs={7}>
            <CategoryField
              categoryValue={updatedHistory.category}
              setCategoryValue={(val) => handleFieldChange("category", val)}
              categories={categories}
              disabled={submitting}
              required
            />
          </Col>
          <Col xs={5}>
            <Form.Group controlId="formValue" className="mb-3">
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
          <Col xs={6}>
            <DescriptionField
              value={updatedHistory.description}
              onChange={(val) => handleFieldChange("description", val)}
              disabled={submitting}
            />
          </Col>
          <Col xs={6}>
            <DateField
              value={updatedHistory.date}
              onChange={(val) => handleFieldChange("date", val)}
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
        id={updatedHistory.id}
        label="Images / PDFs"
        folderName="images"
        disabled={submitting}
        onSetError={handleError}
        onSelectImage={handleFileSelect}
        onNewFilesChange={handleNewFilesChange}
        onRemovedPathsChange={handleRemovedPathsChange}
      />
      <Row>
        <Col xs={2}>
          <Form.Group controlId="formHsa">
            <Form.Check
              type="switch"
              id="formHsa"
              label="HSA"
              checked={updatedHistory.hsa}
              onChange={(e) => handleFieldChange("hsa", e.target.checked)}
              disabled={submitting}
              style={{
                transform: "scale(1.8)",
                transformOrigin: "left center",
              }}
            />
          </Form.Group>
        </Col>
        <Col xs={10}>
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
        </Col>
      </Row>

      <FullSizeImageModal
        show={selectedImageUrl !== null}
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </div>
  );
}

export default EditHistoryPage;
