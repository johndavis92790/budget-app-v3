import { useEffect, useState } from "react";
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

import {
  DateField,
  CategoryField,
  TagField,
  DescriptionField,
} from "./CommonFormFields";

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

  // We'll keep local states for tags & newTags
  const [tags, setTags] = useState<string[]>([]);
  const [newTags, setNewTags] = useState<string[]>([]);

  const [existingImageItems, setExistingImageItems] = useState<
    { url: string; fullPath: string }[]
  >([]);
  const [existingLoading, setExistingLoading] = useState(false);
  const [existingError, setExistingError] = useState<string | null>(null);
  const [removedExistingPaths, setRemovedExistingPaths] = useState<string[]>(
    [],
  );

  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Grab ?id= from the URL
  const queryParams = new URLSearchParams(location.search);
  const idParam = queryParams.get("id");

  // 1) Once data is loaded, find the matching history item
  //    and initialize tags from it
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

    // Initialize tags from existing item
    setTags(foundHistory.tags || []);
    setNewTags([]);
  }, [loading, idParam, history, navigate]);

  // 2) Load existing receipts if we haven't yet
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

  // Helper to set a field on updatedHistory
  const handleFieldChange = (
    field: keyof History,
    value: string | number | string[],
  ) => {
    if (!updatedHistory) return;
    setUpdatedHistory({ ...updatedHistory, [field]: value });
  };

  // File input
  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setNewImageFiles((prev) => [...prev, ...Array.from(files)]);
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

  // ------------- Tag setters for the new approach -------------
  function handleExistingTagsUpdate(newArray: string[]) {
    setTags(newArray);
  }
  function handleNewTagsUpdate(newArray: string[]) {
    setNewTags(newArray);
  }

  // 3) Save
  const handleSave = async () => {
    if (!updatedHistory) return;

    setSubmitting(true);
    try {
      // Combine existing + new
      const finalTags = [
        ...tags,
        ...newTags.map((t) => t.trim()).filter(Boolean),
      ];
      updatedHistory.tags = finalTags;

      const id = updatedHistory.id;
      const storage = getStorage();

      // Delete removed receipts
      for (const path of removedExistingPaths) {
        const fileRef = ref(storage, path);
        await deleteObject(fileRef).catch((err) =>
          console.error("Error deleting:", err),
        );
      }

      // Upload new receipts
      if (id && newImageFiles.length > 0) {
        for (const file of newImageFiles) {
          const fileRef = ref(storage, `receipts/${id}/${id}-${file.name}`);
          await uploadBytes(fileRef, file);
        }
      }

      // Call parent's onUpdateItem
      await onUpdateItem(updatedHistory);

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
            {/* TagField that can do both existing + new */}
            <TagField
              tags={tags}
              setTags={handleExistingTagsUpdate}
              availableTags={nonRecurringTags}
              disabled={submitting}
              newTags={newTags}
              setNewTags={handleNewTagsUpdate}
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
