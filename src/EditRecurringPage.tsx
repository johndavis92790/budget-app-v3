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

import {
  DescriptionField,
  TypeField,
  TagField,
  CategoryField,
} from "./CommonFormFields";
import CurrencyInput from "./CurrencyInput";

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

  // We track which item we’re editing
  const [selectedRecurring, setSelectedRecurring] = useState<Recurring | null>(
    null,
  );
  const [updatedRecurring, setUpdatedRecurring] = useState<Recurring | null>(
    null,
  );

  // We'll keep two states for tags
  const [tags, setTags] = useState<string[]>([]);
  const [newTags, setNewTags] = useState<string[]>([]);

  // Existing images
  const [existingImageItems, setExistingImageItems] = useState<
    { url: string; fullPath: string }[]
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
  const [deleting, setDeleting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Grab ?id= from the URL
  const queryParams = new URLSearchParams(location.search);
  const idParam = queryParams.get("id");

  // 1) Once loaded, find the matching recurring + init tags
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

    // Initialize tags from existing item
    setTags(foundRecurring.tags || []);
    setNewTags([]);
  }, [loading, idParam, recurring, navigate]);

  // 2) Load existing images
  useEffect(() => {
    if (!updatedRecurring || initialized) return;

    const loadExistingImages = async () => {
      setExistingImageItems([]);
      setRemovedExistingPaths([]);
      setNewImageFiles([]);

      const id = updatedRecurring.id;
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
  }, [updatedRecurring, initialized]);

  // Helper for changing a single field
  const handleFieldChange = (
    field: keyof Recurring,
    value: string | number | string[],
  ) => {
    if (!updatedRecurring) return;
    setUpdatedRecurring({ ...updatedRecurring, [field]: value });
  };

  // ------------- Tag setters for new approach -------------
  function handleExistingTagsUpdate(newArray: string[]) {
    setTags(newArray);
  }
  function handleNewTagsUpdate(newArray: string[]) {
    setNewTags(newArray);
  }

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

  // 3) Save
  const handleSave = async () => {
    if (!updatedRecurring) return;

    setSubmitting(true);
    try {
      // Combine existing + new
      const finalTags = [
        ...tags,
        ...newTags.map((t) => t.trim()).filter(Boolean),
      ];
      updatedRecurring.tags = finalTags;

      const id = updatedRecurring.id;
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
      await onUpdateItem(updatedRecurring);

      // 4) Go back
      navigate("/recurring");
    } catch (error) {
      console.error("Error saving recurring:", error);
      alert("An error occurred while saving the recurring.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecurring) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete this recurring item?`,
    );
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      await deleteItem(selectedRecurring);
      navigate("/recurring");
    } catch (error) {
      console.error("Error deleting recurring item:", error);
      alert("An error occurred while deleting the recurring item.");
    } finally {
      setDeleting(false);
    }
  };

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
              setTags={handleExistingTagsUpdate}
              availableTags={nonRecurringTags}
              disabled={submitting}
              newTags={newTags}
              setNewTags={handleNewTagsUpdate}
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
                  const finalNum = parseFloat(numericStr);
                  handleFieldChange("value", isNaN(finalNum) ? 0 : finalNum);
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
          disabled={!updatedRecurring || deleting}
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

      <FullSizeImageModal
        show={selectedImageUrl !== null}
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </div>
  );
}

export default EditRecurringPage;
