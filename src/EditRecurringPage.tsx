import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Recurring } from "./types";
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

// Reuse form fields from CommonFormFields
import {
  DescriptionField,
  TypeField,
  TagField,
  CategoryField,
} from "./CommonFormFields";
import CurrencyInput from "./CurrencyInput";

interface EditRecurringPageProps {
  recurringTypes: string[];
  categories: string[];
  nonRecurringTags: string[];
  onUpdateItem: (updatedRecurring: Recurring) => Promise<void>;
  loading: boolean;
  recurring: Recurring[];
}

function EditRecurringPage({
  recurringTypes,
  categories,
  nonRecurringTags,
  onUpdateItem,
  loading,
  recurring,
}: EditRecurringPageProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedRecurring, setSelectedRecurring] = useState<Recurring | null>(
    null,
  );

  // Existing images
  const [existingImageItems, setExistingImageItems] = useState<
    {
      url: string;
      fullPath: string;
    }[]
  >([]);
  const [existingLoading, setExistingLoading] = useState(false);
  const [existingError, setExistingError] = useState<string | null>(null);
  const [removedExistingPaths, setRemovedExistingPaths] = useState<string[]>(
    [],
  );

  // New images
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Query param for ?id=
  const queryParams = new URLSearchParams(location.search);
  const idParam = queryParams.get("id");

  // Find the matching recurring item
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
  }, [loading, idParam, recurring, navigate]);

  // Load existing images once
  useEffect(() => {
    if (!selectedRecurring || initialized) return;

    const loadExistingImages = async () => {
      setExistingImageItems([]);
      setRemovedExistingPaths([]);
      setNewImageFiles([]);

      const id = selectedRecurring.id;
      if (!id) {
        setInitialized(true);
        return;
      }

      setExistingLoading(true);
      setExistingError(null);

      const storage = getStorage();
      const folderRef = ref(storage, `images/${id}`);
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
        console.error("Error loading existing images:", error);
        setExistingError("Error loading existing images.");
      } finally {
        setExistingLoading(false);
      }

      setInitialized(true);
    };

    loadExistingImages();
  }, [selectedRecurring, initialized]);

  // Helper for changing a single field
  const handleFieldChange = (
    field: keyof Recurring,
    value: string | number | string[],
  ) => {
    if (!selectedRecurring) return;
    setSelectedRecurring({ ...selectedRecurring, [field]: value });
  };

  // For new images
  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setNewImageFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  // Remove existing image
  const handleRemoveExistingImage = (fullPath: string) => {
    setRemovedExistingPaths((prev) => [...prev, fullPath]);
    setExistingImageItems((prev) =>
      prev.filter((item) => item.fullPath !== fullPath),
    );
  };

  // Remove newly added image
  const handleRemoveNewImage = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedRecurring) return;

    setSubmitting(true);
    try {
      const id = selectedRecurring.id;
      const storage = getStorage();

      // 1) Delete removed images
      for (const path of removedExistingPaths) {
        const fileRef = ref(storage, path);
        await deleteObject(fileRef).catch((err) =>
          console.error("Error deleting:", err),
        );
      }

      // 2) Upload new images
      if (id && newImageFiles.length > 0) {
        for (const file of newImageFiles) {
          const fileRef = ref(storage, `images/${id}/${id}-${file.name}`);
          await uploadBytes(fileRef, file);
        }
      }

      // 3) Update the item
      console.log(selectedRecurring);
      await onUpdateItem(selectedRecurring);

      // 4) Go back
      navigate("/recurring");
    } catch (error) {
      console.error("Error saving recurring:", error);
      alert("An error occurred while saving the recurring.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <FullPageSpinner />;
  }
  if (!selectedRecurring) {
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

      <Form>
        <Row>
          <Col md={8}>
            <DescriptionField
              value={selectedRecurring.description}
              onChange={(val) => handleFieldChange("description", val)}
              disabled={submitting}
            />
          </Col>
        </Row>

        <Row>
          <Col xs={6}>
            <TypeField
              typeValue={selectedRecurring.type}
              setTypeValue={(val) => handleFieldChange("type", val)}
              options={recurringTypes}
              disabled={submitting}
            />
          </Col>
          <Col xs={6}>
            <CategoryField
              categoryValue={selectedRecurring.category}
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
              tags={selectedRecurring.tags}
              setTags={(vals) => handleFieldChange("tags", vals)}
              availableTags={nonRecurringTags}
              disabled={submitting}
            />
          </Col>
          <Col xs={6}>
            <Form.Group controlId="formValue" className="mb-3">
              <Form.Label>Amount</Form.Label>
              <CurrencyInput
                // We'll pass the existing value as a string, e.g. "123.45" or "0"
                // If your DB stored it as a number, do String(selectedHistory.value).
                value={String(selectedRecurring.value || 0)}
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
                alt="Exisiting Receipt"
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
          variant="secondary"
          onClick={() => navigate("/recurring")}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!selectedRecurring || submitting}
          style={{ marginLeft: "10px" }}
        >
          {submitting ? (
            <Spinner as="span" animation="border" size="sm" />
          ) : (
            "Save"
          )}
        </Button>
      </div>

      {/* Full-size preview modal */}
      <FullSizeImageModal
        show={selectedImageUrl !== null}
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </div>
  );
}

export default EditRecurringPage;
