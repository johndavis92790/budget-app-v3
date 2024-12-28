import React, { FormEvent, useState } from "react";
import { Form, Button, Row, Col, Spinner } from "react-bootstrap";
import { storage } from "./firebase";
import { ref, uploadBytes } from "firebase/storage";

import FullSizeImageModal from "./FullSizeImageModal";
import FullPageSpinner from "./FullPageSpinner";
import FileUploader from "./FileUploader"; // <-- from previous refactor

// We'll import only DateField, TypeField, CategoryField, TagField, NotesField from CommonFormFields
import {
  DateField,
  TypeField,
  CategoryField,
  TagField,
  NotesField,
} from "./CommonFormFields";

// Import your new typed CurrencyInput
import CurrencyInput from "./CurrencyInput";

import { History } from "./types";

interface AddHistoryPageProps {
  categories: string[];
  nonRecurringTags: string[];
  nonRecurringTypes: string[];
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
  nonRecurringTypes,
  addItem,
  loading,
  weeklyGoal,
  monthlyGoal,
  onUpdateGoal,
}: AddHistoryPageProps) {
  // Form fields
  const [date, setDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [type, setType] = useState("Expense");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  // We'll store the input as a string, e.g. "$1,234.56"
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  // FileUploader state
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const editURLFragment = "https://budget-app-v3.web.app/edit-history?id=";
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!date || !type || !category || tags.length === 0 || !value) {
      alert("Date, Type, Category, at least one Tag, and Value are required.");
      return;
    }

    setSubmitting(true);
    try {
      const uniqueId = String(Date.now());

      // Upload receipts if present
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

      // Convert the masked currency string (e.g. "$1,234.56") to float
      const numericStr = value.replace(/[^0-9.-]/g, ""); // "1234.56"
      const numericValue = parseFloat(numericStr);
      if (isNaN(numericValue)) {
        alert("Invalid numeric value for 'Value'. Please check your input.");
        setSubmitting(false);
        return;
      }

      // Construct the new History object
      const newHistory: History = {
        date,
        type,
        category,
        tags,
        value: numericValue,
        notes,
        editURL,
        id: uniqueId,
        itemType: "history",
      };

      const success = await addItem(newHistory);
      if (!success) {
        alert("Failed to add history.");
        return;
      }

      // Deduct from or add to weekly/monthly goals if needed
      if (type.toLowerCase().includes("expense")) {
        await onUpdateGoal("weeklyGoal", weeklyGoal - numericValue);
        await onUpdateGoal("monthlyGoal", monthlyGoal - numericValue);
      } else if (type.toLowerCase().includes("refund")) {
        await onUpdateGoal("weeklyGoal", weeklyGoal + numericValue);
        await onUpdateGoal("monthlyGoal", monthlyGoal + numericValue);
      }

      // Reset form
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      setDate(`${yyyy}-${mm}-${dd}`);
      setType("Expense");
      setCategory("");
      setTags([]);
      setValue("");
      setNotes("");
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
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={4}>
            <DateField
              value={date}
              onChange={setDate}
              disabled={submitting}
              required
            />
          </Col>
          <Col md={4}>
            <TypeField
              typeValue={type}
              setTypeValue={setType}
              options={nonRecurringTypes}
              disabled={submitting}
              required
            />
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <CategoryField
              categoryValue={category}
              setCategoryValue={setCategory}
              categories={categories}
              disabled={submitting}
              required
            />
          </Col>
          <Col md={6}>
            <TagField
              tags={tags}
              setTags={setTags}
              availableTags={nonRecurringTags}
              disabled={submitting}
              required
            />
          </Col>
        </Row>

        <Row>
          <Col md={4}>
            {/* Replace the old ValueField with typed CurrencyInput */}
            <Form.Group controlId="formValue" className="mb-3">
              <Form.Label>Value</Form.Label>
              <CurrencyInput
                value={value} // e.g. "$123.45" or partial typed
                onChange={(e) => {
                  // e.target.value might be "$1,234.56"
                  setValue(e.target.value);
                }}
                placeholder="$0.00"
                disabled={submitting}
                style={{ width: "100%" }}
              />
            </Form.Group>
          </Col>
          <Col md={8}>
            <NotesField
              value={notes}
              onChange={setNotes}
              disabled={submitting}
            />
          </Col>
        </Row>

        {/* Reusable File Uploader */}
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

        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? (
            <Spinner as="span" animation="border" size="sm" />
          ) : (
            "Add"
          )}
        </Button>
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
