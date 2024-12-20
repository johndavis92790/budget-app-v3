import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Expense } from "./types";
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

interface EditExpensePageProps {
  categories: string[];
  tags: string[];
  onUpdateExpense: (updatedExpense: any) => Promise<void>;
  loading: boolean;
  expenses: Expense[];
}

function EditExpensePage({
  categories,
  tags,
  onUpdateExpense,
  loading,
  expenses,
}: EditExpensePageProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [existingReceiptItems, setExistingReceiptItems] = useState<
    { url: string; fullPath: string }[]
  >([]);
  const [existingLoading, setExistingLoading] = useState(false);
  const [existingError, setExistingError] = useState<string | null>(null);
  const [removedExistingPaths, setRemovedExistingPaths] = useState<string[]>(
    [],
  );
  const [newReceiptFiles, setNewReceiptFiles] = useState<File[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // We now rely on the ID in the expense directly, not parsing from URL queries
  const queryParams = new URLSearchParams(location.search);
  const idParam = queryParams.get("id");

  useEffect(() => {
    if (loading) return;
    if (!idParam) {
      navigate("/history");
      return;
    }

    const foundExpense = expenses.find((exp) => exp.id === idParam);
    if (!foundExpense) {
      // If no matching expense found, go back to history
      navigate("/history");
      return;
    }
    setSelectedExpense(foundExpense);
  }, [loading, idParam, expenses, navigate]);

  useEffect(() => {
    if (selectedExpense && !initialized) {
      const loadExistingReceipts = async () => {
        setExistingReceiptItems([]);
        setRemovedExistingPaths([]);
        setNewReceiptFiles([]);

        const id = selectedExpense.id;

        if (!id) {
          // No ID means no folder name, just mark as initialized
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
          setExistingReceiptItems(urls);
        } catch (error: any) {
          console.error("Error loading existing receipts:", error);
          setExistingError("Error loading existing receipts.");
        } finally {
          setExistingLoading(false);
        }

        setInitialized(true);
      };

      loadExistingReceipts();
    }
  }, [selectedExpense, initialized]);

  const handleFieldChange = (
    field: keyof Expense,
    value: string | number | string[],
  ) => {
    if (selectedExpense) {
      setSelectedExpense({
        ...selectedExpense,
        [field]: value,
      });
    }
  };

  const handleNewReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setNewReceiptFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const handleRemoveExistingReceipt = (fullPath: string) => {
    // Mark for deletion
    setRemovedExistingPaths((prev) => [...prev, fullPath]);
    setExistingReceiptItems((prev) =>
      prev.filter((item) => item.fullPath !== fullPath),
    );
  };

  const handleRemoveNewReceipt = (index: number) => {
    setNewReceiptFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedExpense) return;

    setSubmitting(true);
    try {
      const id = selectedExpense.id; // Use the original ID from creation

      const storage = getStorage();

      // Delete removed receipts
      for (const path of removedExistingPaths) {
        const fileRef = ref(storage, path);
        await deleteObject(fileRef).catch((err) =>
          console.error("Error deleting:", err),
        );
      }

      // Upload any new receipts if we have a id (we always should, since it was created originally)
      if (id && newReceiptFiles.length > 0) {
        for (const file of newReceiptFiles) {
          const fileRef = ref(storage, `receipts/${id}/${id}-${file.name}`);
          await uploadBytes(fileRef, file);
        }
      }

      // Just update the expense on the backend, no new IDs or folder names
      // The backend will reuse the existing ID from the original creation
      const updatedExpense = {
        ...selectedExpense,
      };

      await onUpdateExpense(updatedExpense);

      navigate("/history");
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("An error occurred while saving the expense.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <FullPageSpinner />;
  }

  if (!selectedExpense) {
    return <p>Loading expense data or no expense found...</p>;
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <Button variant="link" onClick={() => navigate("/history")}>
          <FaArrowLeft /> Back
        </Button>
      </div>

      <h2 className="mb-4">Edit Expense</h2>

      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Date</Form.Label>
          <Form.Control
            type="date"
            value={selectedExpense.date}
            onChange={(e) => handleFieldChange("date", e.target.value)}
            disabled={submitting}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Type</Form.Label>
          <Form.Select
            value={selectedExpense.type}
            onChange={(e) => handleFieldChange("type", e.target.value)}
            disabled={submitting}
          >
            <option>Expense</option>
            <option>Refund</option>
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Category</Form.Label>
          <Form.Select
            value={selectedExpense.categories}
            onChange={(e) => handleFieldChange("categories", e.target.value)}
            disabled={submitting}
          >
            <option value="">Select a Category</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Tags</Form.Label>
          <Form.Select
            multiple
            value={selectedExpense.tags}
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
            {tags.map((tag: string, idx: number) => (
              <option key={idx} value={tag}>
                {tag}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Value</Form.Label>
          <Form.Control
            type="number"
            value={selectedExpense.value}
            onChange={(e) =>
              handleFieldChange("value", parseFloat(e.target.value))
            }
            disabled={submitting}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Notes</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={selectedExpense.notes}
            onChange={(e) => handleFieldChange("notes", e.target.value)}
            disabled={submitting}
          />
        </Form.Group>
      </Form>

      <hr />
      <h5>Receipts</h5>
      {existingLoading && <Spinner animation="border" />}
      {existingError && <p className="text-danger">{existingError}</p>}

      {existingReceiptItems.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          {existingReceiptItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                position: "relative",
                display: "inline-block",
              }}
            >
              <img
                src={item.url}
                alt="Receipt"
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
                onClick={() => handleRemoveExistingReceipt(item.fullPath)}
                disabled={submitting}
              >
                <FaTimes />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Form.Group controlId="formNewReceipts" className="mb-3">
        <Form.Label>Add More Receipts</Form.Label>
        <Form.Control
          type="file"
          accept="image/*;capture=camera"
          multiple
          onChange={handleNewReceiptChange}
          disabled={submitting}
        />
      </Form.Group>

      {newReceiptFiles.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          {newReceiptFiles.map((file, index) => {
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
                  onClick={() => handleRemoveNewReceipt(index)}
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
          onClick={() => navigate("/history")}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!selectedExpense || submitting}
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

export default EditExpensePage;
