import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Recurring } from "./types";
import { Form, Button, Spinner } from "react-bootstrap";
import {
  getStorage,
  ref,
  listAll,
  getDownloadURL,
  deleteObject,
  uploadBytes,
} from "firebase/storage";
import { FaTimes } from "react-icons/fa";
import { FaArrowLeft } from "react-icons/fa";
import FullSizeImageModal from "./FullSizeImageModal";
import FullPageSpinner from "./FullPageSpinner";

interface EditRecurringPageProps {
  recurringTypes: string[];
  nonRecurringTags: string[];
  onUpdateItem: (updatedRecurring: Recurring) => Promise<void>;
  loading: boolean;
  recurring: Recurring[];
}

function EditRecurringPage({
  recurringTypes,
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
  const [initialized, setInitialized] = useState(false);

  // We now rely on the ID in the recurring directly, not parsing from URL queries
  const queryParams = new URLSearchParams(location.search);
  const idParam = queryParams.get("id");

  useEffect(() => {
    if (loading) return;
    if (!idParam) {
      navigate("/recurring");
      return;
    }

    const foundRecurring = recurring.find((hist) => hist.id === idParam);
    if (!foundRecurring) {
      // If no matching recurring found, go back to recurring
      navigate("/recurring");
      return;
    }
    setSelectedRecurring(foundRecurring);
  }, [loading, idParam, recurring, navigate]);

  useEffect(() => {
    if (selectedRecurring && !initialized) {
      const loadExistingImages = async () => {
        setExistingImageItems([]);
        setRemovedExistingPaths([]);
        setNewImageFiles([]);

        const id = selectedRecurring.id;

        if (!id) {
          // No ID means no folder name, just mark as initialized
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
    }
  }, [selectedRecurring, initialized]);

  const handleFieldChange = (
    field: keyof Recurring,
    value: string | number | string[],
  ) => {
    if (selectedRecurring) {
      setSelectedRecurring({
        ...selectedRecurring,
        [field]: value,
      });
    }
  };

  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setNewImageFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const handleRemoveExistingImage = (fullPath: string) => {
    // Mark for deletion
    setRemovedExistingPaths((prev) => [...prev, fullPath]);
    setExistingImageItems((prev) =>
      prev.filter((item) => item.fullPath !== fullPath),
    );
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedRecurring) return;

    setSubmitting(true);
    try {
      const id = selectedRecurring.id; // Use the original ID from creation

      const storage = getStorage();

      // Delete removed images
      for (const path of removedExistingPaths) {
        const fileRef = ref(storage, path);
        await deleteObject(fileRef).catch((err) =>
          console.error("Error deleting:", err),
        );
      }

      // Upload any new images if we have a id (we always should, since it was created originally)
      if (id && newImageFiles.length > 0) {
        for (const file of newImageFiles) {
          const fileRef = ref(storage, `images/${id}/${id}-${file.name}`);
          await uploadBytes(fileRef, file);
        }
      }

      // Just update the recurring on the backend, no new IDs or folder names
      // The backend will reuse the existing ID from the original creation
      const updatedRecurring = {
        ...selectedRecurring,
      };

      await onUpdateItem(updatedRecurring);

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
        <Form.Group className="mb-3">
          <Form.Label>Name</Form.Label>
          <Form.Control
            as="input"
            value={selectedRecurring.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            disabled={submitting}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Type</Form.Label>
          <Form.Select
            value={selectedRecurring?.type || ""}
            onChange={(e) => {
              const selectedType = e.target.value;
              if (recurringTypes.includes(selectedType) && selectedRecurring) {
                setSelectedRecurring({
                  ...selectedRecurring,
                  type: selectedType,
                });
              }
            }}
            required
            disabled={submitting}
          >
            {recurringTypes.map((type, idx) => (
              <option key={idx} value={type}>
                {type}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Tags</Form.Label>
          <Form.Select
            multiple
            value={selectedRecurring.tags}
            onChange={(e) => {
              const options = e.target.options;
              const selected: string[] = [];
              for (let i = 0; i < options.length; i++) {
                if (options[i].selected) {
                  selected.push(options[i].value);
                }
              }
              handleFieldChange("tags", selected);
            }}
            required
            disabled={submitting}
          >
            {nonRecurringTags.map((nonRecurringTag: string, idx: number) => (
              <option key={idx} value={nonRecurringTag}>
                {nonRecurringTag}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Value</Form.Label>
          <Form.Control
            type="number"
            value={selectedRecurring.value}
            onChange={(e) =>
              handleFieldChange("value", parseFloat(e.target.value))
            }
            disabled={submitting}
          />
        </Form.Group>
      </Form>

      <hr />
      <h5>Images</h5>
      {existingLoading && <Spinner animation="border" />}
      {existingError && <p className="text-danger">{existingError}</p>}

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
              style={{
                position: "relative",
                display: "inline-block",
              }}
            >
              <img
                src={item.url}
                alt="Recurring"
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
                style={{
                  position: "relative",
                  display: "inline-block",
                }}
              >
                <img
                  src={url}
                  alt="New Recurring"
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

      <FullSizeImageModal
        show={selectedImageUrl !== null}
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </div>
  );
}

export default EditRecurringPage;
