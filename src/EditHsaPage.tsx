import { useState, useCallback, useEffect } from "react";
import { History, Hsa } from "./types";
import { Form, Button, Spinner, Row, Col, Alert } from "react-bootstrap";
import { DateField } from "./CommonFormFields";
import CurrencyInput from "./CurrencyInput";
import { yyyymmddToMmddyyyy } from "./helpers";

interface EditHsaPageProps {
  selectedHsa: Hsa;
  associatedHistory: History;
  onUpdateItem: (updatedHistory: History) => Promise<void>;
  deleteItem: (item: History) => Promise<void>;
  onUpdateHsaItem: (updatedHsa: Hsa) => Promise<void>;
  deleteHsaItem: (hsaItem: Hsa) => Promise<void>;
  onClose: () => void;
}

function EditHsaPage({
  selectedHsa,
  associatedHistory,
  onUpdateItem,
  deleteItem,
  onUpdateHsaItem,
  deleteHsaItem,
  onClose,
}: EditHsaPageProps) {
  const [updatedHsa, setUpdatedHsa] = useState<Hsa>(selectedHsa);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUpdatedHsa(selectedHsa);
  }, [selectedHsa]);

  const handleFieldChange = useCallback(
    (field: keyof Hsa, value: any) => {
      setUpdatedHsa({ ...updatedHsa, [field]: value });
    },
    [updatedHsa],
  );

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    try {
      // Format the date before sending to backend
      const hsaToUpdate = {
        ...updatedHsa,
        reimbursementDate: updatedHsa.reimbursementDate
          ? yyyymmddToMmddyyyy(updatedHsa.reimbursementDate)
          : "",
      };

      // Update HSA item using the provided callback
      await onUpdateHsaItem(hsaToUpdate);

      // Close the editor
      onClose();
    } catch (error: any) {
      console.error("Error saving HSA item:", error);
      setError("An error occurred while saving the HSA item.");
    } finally {
      setSubmitting(false);
    }
  }, [updatedHsa, onClose, onUpdateHsaItem]);

  const handleDelete = useCallback(async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this HSA item? The associated expense will no longer be marked as an HSA expense.",
    );

    if (!confirmDelete) return;

    setDeleting(true);
    setError(null);

    try {
      // Delete HSA item using the provided callback
      await deleteHsaItem(selectedHsa);

      // Now update the associated history item to set HSA flag to false
      const updatedHistory = {
        ...associatedHistory,
        hsa: false,
      };

      await onUpdateItem(updatedHistory);

      onClose();
    } catch (error: any) {
      console.error("Error deleting HSA item:", error);
      setError("An error occurred while deleting the HSA item.");
    } finally {
      setDeleting(false);
    }
  }, [selectedHsa, associatedHistory, onUpdateItem, onClose, deleteHsaItem]);

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}
      <h5 className="mb-3">Edit HSA Item</h5>

      <Form>
        <Row className="mb-3">
          <Col xs={6}>
            <Form.Group controlId="formReimbursementDate">
              <Form.Label>Reimbursement Date</Form.Label>
              <DateField
                value={updatedHsa.reimbursementDate || ""}
                onChange={(val) => handleFieldChange("reimbursementDate", val)}
                disabled={submitting}
              />
            </Form.Group>
          </Col>
          <Col xs={6}>
            <Form.Group controlId="formReimbursementAmount">
              <Form.Label>Reimbursement Amount</Form.Label>
              <CurrencyInput
                value={String(updatedHsa.reimbursementAmount || 0)}
                placeholder="$0.00"
                style={{ width: "100%" }}
                disabled={submitting}
                onChange={(e) => {
                  const maskedVal = e.target.value;
                  const numericStr = maskedVal.replace(/[^0-9.-]/g, "");
                  const parsed = parseFloat(numericStr);
                  handleFieldChange(
                    "reimbursementAmount",
                    isNaN(parsed) ? 0 : parsed,
                  );
                }}
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col xs={12}>
            <Form.Group controlId="formNotes">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={updatedHsa.notes || ""}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                disabled={submitting}
              />
            </Form.Group>
          </Col>
        </Row>
      </Form>

      <Row className="mt-4">
        <Col>
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
    </div>
  );
}

export default EditHsaPage;
