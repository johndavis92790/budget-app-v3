import React, { FormEvent, useState } from "react";
import { Form, Button, Row, Col, Spinner } from "react-bootstrap";
import { storage } from "./firebase";
import { ref, uploadBytes } from "firebase/storage";

import FullSizeImageModal from "./FullSizeImageModal";
import FullPageSpinner from "./FullPageSpinner";
import FileUploader from "./FileUploader"; // <-- from previous refactor

import {
  DateField,
  CategoryField,
  TagField,
  DescriptionField,
} from "./CommonFormFields";

import CurrencyInput from "./CurrencyInput";

import { History } from "./types";

interface AddHistoryPageProps {
  categories: string[];
  nonRecurringTags: string[];
  addItem: (history: History) => Promise<boolean>;
  loading: boolean;
  weeklyGoal: number;
  monthlyGoal: number;
  onUpdateGoal: (
    itemType: "weeklyGoal" | "monthlyGoal",
    newValue: number,
  ) => Promise<void>;
}

function AddHistoryPage({
  categories,
  nonRecurringTags,
  addItem,
  loading,
  weeklyGoal,
  monthlyGoal,
  onUpdateGoal,
}: AddHistoryPageProps) {
  const [date, setDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const editURLFragment = "https://budget-app-v3.web.app/edit-history?id=";

  const handleSubmit = async (type: "Expense" | "Refund") => {
    if (!date || !category || tags.length === 0 || !value) {
      alert("Date, Category, at least one Tag, and Value are required.");
      return;
    }

    setSubmitting(true);
    try {
      const uniqueId = String(Date.now());

      if (receiptFiles.length > 0) {
        for (const file of receiptFiles) {
          const fileRef = ref(
            storage,
            `receipts/${uniqueId}/${uniqueId}-${file.name}`,
          );
          await uploadBytes(fileRef, file);
        }
      }

      const editURL = `${editURLFragment}${uniqueId}`;

      const numericStr = value.replace(/[^0-9.-]/g, "");
      const numericValue = parseFloat(numericStr);
      if (isNaN(numericValue)) {
        alert("Invalid numeric value for 'Value'. Please check your input.");
        setSubmitting(false);
        return;
      }

      const newHistory: History = {
        date,
        type,
        category,
        tags,
        value: numericValue,
        description,
        editURL,
        id: uniqueId,
        itemType: "history",
      };

      const success = await addItem(newHistory);
      if (!success) {
        alert("Failed to add history.");
        return;
      }

      if (type === "Expense") {
        await onUpdateGoal("weeklyGoal", weeklyGoal - numericValue);
        await onUpdateGoal("monthlyGoal", monthlyGoal - numericValue);
      } else if (type === "Refund") {
        await onUpdateGoal("weeklyGoal", weeklyGoal + numericValue);
        await onUpdateGoal("monthlyGoal", monthlyGoal + numericValue);
      }

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      setDate(`${yyyy}-${mm}-${dd}`);
      setCategory("");
      setTags([]);
      setValue("");
      setDescription("");
      setReceiptFiles([]);
    } catch (err) {
      console.error("Error adding history:", err);
      alert("An error occurred while adding the history.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && categories.length === 0 && nonRecurringTags.length === 0) {
    return <FullPageSpinner />;
  }

  return (
    <>
      <h2 className="mb-4">Add an Expense or Refund</h2>
      <Form>
        <Row>
          <Col xs={6}>
            <DateField
              value={date}
              onChange={setDate}
              disabled={submitting}
              required
            />
          </Col>
          <Col xs={6}>
            <CategoryField
              categoryValue={category}
              setCategoryValue={setCategory}
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
              required
            />
          </Col>
          <Col xs={6}>
            <Form.Group controlId="formValue" className="mb-3">
              <Form.Label>Amount</Form.Label>
              <CurrencyInput
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="$0.00"
                disabled={submitting}
                style={{ width: "100%" }}
              />
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col>
            <DescriptionField
              value={description}
              onChange={setDescription}
              disabled={submitting}
            />
          </Col>
        </Row>

        <Row>
          <Col md={4}>
            <FileUploader
              label="Receipts"
              helpText="Take a photo for each receipt. To add more, tap again."
              files={receiptFiles}
              onChange={setReceiptFiles}
              selectedImageUrl={selectedImageUrl}
              onSelectImage={setSelectedImageUrl}
              disabled={submitting}
            />
          </Col>
        </Row>

        <div className="d-flex justify-content-around mt-3">
          <Button
            type="button"
            variant="success"
            onClick={() => handleSubmit("Refund")}
            disabled={submitting}
          >
            {submitting ? (
              <Spinner as="span" animation="border" size="sm" />
            ) : (
              "Refund"
            )}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => handleSubmit("Expense")}
            disabled={submitting}
            className="me-3"
          >
            {submitting ? (
              <Spinner as="span" animation="border" size="sm" />
            ) : (
              "Expense"
            )}
          </Button>
        </div>
      </Form>

      <FullSizeImageModal
        show={selectedImageUrl !== null}
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </>
  );
}

export default AddHistoryPage;
