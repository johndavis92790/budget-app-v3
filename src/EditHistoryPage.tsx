import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { History, Recurring } from "./types";
import { Form, Button, Spinner, Row, Col } from "react-bootstrap";
import {
  getStorage,
  ref,
  listAll,
  getDownloadURL,
  deleteObject,
  uploadBytes,
} from "firebase/storage";
import { FaTimes, FaArrowLeft } from "react-icons/fa";

import FullSizeImageModal from "./FullSizeImageModal";
import FullPageSpinner from "./FullPageSpinner";

// Import your other common form fields
import {
  DateField,
  CategoryField,
  TagField,
  DescriptionField,
} from "./CommonFormFields";

// Import your new CurrencyInput from text-mask code
import CurrencyInput from "./CurrencyInput";

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

  // Existing receipts
  const [existingImageItems, setExistingImageItems] = useState<
    { url: string; fullPath: string }[]
  >([]);
  const [existingLoading, setExistingLoading] = useState(false);
  const [existingError, setExistingError] = useState<string | null>(null);
  const [removedExistingPaths, setRemovedExistingPaths] = useState<string[]>(
    [],
  );

  // New receipts
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Grab ?id= from the URL
  const queryParams = new URLSearchParams(location.search);
  const idParam = queryParams.get("id");

  // 1) Once data loaded, find the matching history item
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
  }, [loading, idParam, history, navigate]);

  // 2) Load existing receipts
  useEffect(() => {
    if (!updatedHistory || initialized) return;

    const loadExistingImages = async () => {
      setExistingImageItems([]);
      setRemovedExistingPaths([]);
      setNewImageFiles([]);

      const id = updatedHistory.id;
      if (!id) {
        setInitialized(true);
        return;
      }

      setExistingLoading(true);
      setExistingError(null);

      const storage = getStorage();
      const folderRef = ref(storage, `receipts/${id}`);
      try {
        const res = await listAll(folderRef);
        const urls = await Promise.all(
          res.items.map(async (item) => {
            const url = await getDownloadURL(item);
            return { url, fullPath: item.fullPath };
          }),
        );
        setExistingImageItems(urls);
      } catch (error: any) {
        console.error("Error loading existing receipts:", error);
        setExistingError("Error loading existing receipts.");
      } finally {
        setExistingLoading(false);
      }

      setInitialized(true);
    };

    loadExistingImages();
  }, [updatedHistory, initialized]);

  // Helper to change one field in updatedHistory
  const handleFieldChange = (
    field: keyof History,
    value: string | number | string[],
  ) => {
    if (!updatedHistory) return;
    setUpdatedHistory({ ...updatedHistory, [field]: value });
  };

  // Handle file input
  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setNewImageFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  // Remove existing
  const handleRemoveExistingImage = (fullPath: string) => {
    setRemovedExistingPaths((prev) => [...prev, fullPath]);
    setExistingImageItems((prev) =>
      prev.filter((item) => item.fullPath !== fullPath),
    );
  };

  // Remove new
  const handleRemoveNewImage = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Save
  const handleSave = async () => {
    if (!updatedHistory) return;
    setSubmitting(true);

    try {
      const id = updatedHistory.id;
      const storage = getStorage();

      // 1) Delete removed receipts
      for (const path of removedExistingPaths) {
        const fileRef = ref(storage, path);
        await deleteObject(fileRef).catch((err) =>
          console.error("Error deleting:", err),
        );
      }

      // 2) Upload new
      if (id && newImageFiles.length > 0) {
        for (const file of newImageFiles) {
          const fileRef = ref(storage, `receipts/${id}/${id}-${file.name}`);
          await uploadBytes(fileRef, file);
        }
      }

      // 3) Update
      console.log("Saving updated history:", updatedHistory);
      await onUpdateItem(updatedHistory);

      // 4) Navigate
      navigate("/history");
    } catch (error) {
      console.error("Error saving history:", error);
      alert("An error occurred while saving the history.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedHistory) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete this history item?`,
    );
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      await deleteItem(selectedHistory);
      navigate("/history");
    } catch (error) {
      console.error("Error deleting history item:", error);
      alert("An error occurred while deleting the history item.");
    } finally {
      setDeleting(false);
    }
  };

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
              tags={updatedHistory.tags}
              setTags={(vals) => handleFieldChange("tags", vals)}
              availableTags={nonRecurringTags}
              disabled={submitting}
            />
          </Col>
          <Col xs={6}>
            <Form.Group controlId="formValue" className="mb-3">
              <Form.Label>Value</Form.Label>
              <CurrencyInput
                // We'll pass the existing value as a string, e.g. "123.45" or "0"
                // If your DB stored it as a number, do String(updatedHistory.value).
                value={String(updatedHistory.value || 0)}
                placeholder="$0.00"
                style={{ width: "100%" }}
                disabled={submitting}
                // We do an onChange that reads the masked string (like "$1,234.56") from e.target.value
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  // text-mask returns the masked string in e.target.value,
                  // e.g. "$1,234.56"
                  const maskedVal = e.target.value;
                  // Remove all non-digit chars except '.' or '-'
                  const numericStr = maskedVal.replace(/[^0-9.-]/g, "");
                  const parsed = parseFloat(numericStr);
                  // Fallback to 0 if invalid
                  const finalNum = isNaN(parsed) ? 0 : parsed;
                  // Store in your state
                  handleFieldChange("value", finalNum);
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
      {existingLoading && <Spinner animation="border" />}
      {existingError && <p className="text-danger">{existingError}</p>}

      {/* Existing images */}
      {existingImageItems.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          {existingImageItems.map((item, idx) => (
            <div
              key={idx}
              style={{ position: "relative", display: "inline-block" }}
            >
              <img
                src={item.url}
                alt="Existing Receipt"
                style={{
                  width: "100px",
                  height: "auto",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedImageUrl(item.url)}
              />
              <Button
                variant="light"
                size="sm"
                style={{
                  position: "absolute",
                  top: "0",
                  right: "0",
                  transform: "translate(50%, -50%)",
                  borderRadius: "50%",
                  padding: "0.2rem",
                }}
                onClick={() => handleRemoveExistingImage(item.fullPath)}
                disabled={submitting}
              >
                <FaTimes />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* New images */}
      <Form.Group controlId="formNewImages" className="mb-3">
        <Form.Label>Add More Images</Form.Label>
        <Form.Control
          type="file"
          accept="image/*;capture=camera"
          multiple
          onChange={handleNewImageChange}
          disabled={submitting}
        />
      </Form.Group>

      {newImageFiles.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          {newImageFiles.map((file, index) => {
            const url = URL.createObjectURL(file);
            return (
              <div
                key={index}
                style={{ position: "relative", display: "inline-block" }}
              >
                <img
                  src={url}
                  alt="New Receipt"
                  style={{
                    width: "100px",
                    height: "auto",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedImageUrl(url)}
                  onLoad={() => URL.revokeObjectURL(url)}
                />
                <Button
                  variant="light"
                  size="sm"
                  style={{
                    position: "absolute",
                    top: "0",
                    right: "0",
                    transform: "translate(50%, -50%)",
                    borderRadius: "50%",
                    padding: "0.2rem",
                  }}
                  onClick={() => handleRemoveNewImage(index)}
                  disabled={submitting}
                >
                  <FaTimes />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="d-flex justify-content-end">
        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={!updatedHistory || deleting}
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

      <FullSizeImageModal
        show={selectedImageUrl !== null}
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </div>
  );
}

export default EditHistoryPage;
