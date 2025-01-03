// src/AddRecurringPage.tsx
import React, { FormEvent, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Form, Button, Row, Col, Spinner, Alert } from "react-bootstrap";
import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import FullSizeImageModal from "./FullSizeImageModal";
import FullPageSpinner from "./FullPageSpinner";

import {
  TypeField,
  TagField,
  DescriptionField,
  CategoryField,
} from "./CommonFormFields";

import CurrencyInput from "./CurrencyInput";
import { Recurring } from "./types";
import { FaArrowLeft } from "react-icons/fa";
import UnifiedFileManager from "./UnifiedFileManager";

interface AddRecurringPageProps {
  recurringTags: string[];
  categories: string[];
  addItem: (recurring: Recurring) => Promise<boolean>;
  loading: boolean;
}

function AddRecurringPage({
  recurringTags,
  categories,
  addItem,
  loading,
}: AddRecurringPageProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const recurringTypes = ["Expense", "Income"];

  const [type, setType] = useState("Expense");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [tags, setTags] = useState<string[]>([]);
  const [newTags, setNewTags] = useState<string[]>([]);

  const [value, setValue] = useState("");

  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefillType = params.get("type");
    if (prefillType) {
      setType(prefillType);
    }
  }, [location.search]);

  const editURLFragment = "https://budget-app-v3.web.app/edit-recurring?id=";

  // ------------- Image Management States -------------
  const [newFiles, setNewFiles] = useState<File[]>([]); // Files to upload

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Combine existing + new tags
    const finalTags = [
      ...tags,
      ...newTags.map((t) => t.trim()).filter(Boolean),
    ];

    if (!type || !category || finalTags.length === 0 || !value) {
      setError("Type, at least one Tag, and Value are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // Generate unique ID for the new recurring item
      const uniqueId = String(Date.now());

      // Upload images to Firebase Storage under 'images/{id}/'
      const storageRef = ref(storage, `images/${uniqueId}`);
      const uploadedUrls: string[] = [];

      for (const file of newFiles) {
        const fileRef = ref(storage, `${storageRef}/${file.name}`);
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        uploadedUrls.push(downloadURL);
      }

      const editURL = `${editURLFragment}${uniqueId}`;

      // Validate numeric
      const numericStr = value.replace(/[^0-9.-]/g, "");
      const numericValue = parseFloat(numericStr);
      if (isNaN(numericValue)) {
        setError("Invalid numeric value for 'Amount'.");
        setSubmitting(false);
        return;
      }

      const newRecurring: Recurring = {
        type,
        category,
        description,
        tags: finalTags,
        value: numericValue,
        editURL,
        id: uniqueId,
        itemType: "recurring",
      };

      // Send to your backend
      const success = await addItem(newRecurring);
      if (!success) {
        setError("Failed to add recurring.");
        return;
      }

      // Reset form fields
      setType("Expense");
      setCategory("");
      setDescription("");
      setTags([]);
      setNewTags([]);
      setValue("");
      setNewFiles([]);

      navigate("/recurring");
    } catch (err) {
      console.error("Error adding recurring:", err);
      setError("An error occurred while adding the recurring.");
    } finally {
      setSubmitting(false);
    }
  };

  function handleExistingTagsUpdate(newArray: string[]) {
    setTags(newArray);
  }
  function handleNewTagsUpdate(newArray: string[]) {
    setNewTags(newArray);
  }

  if (loading && recurringTags.length === 0) {
    return <FullPageSpinner />;
  }

  return (
    <>
      <div style={{ marginBottom: "20px" }}>
        <Button variant="secondary" onClick={() => navigate("/recurring")}>
          <FaArrowLeft /> Back
        </Button>
      </div>

      <h2 className="mb-4">Add a Recurring Expense or Income</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={8}>
            <DescriptionField
              value={description}
              onChange={setDescription}
              disabled={submitting}
            />
          </Col>
        </Row>

        <Row>
          <Col xs={6}>
            <TypeField
              label="Type"
              typeValue={type}
              setTypeValue={setType}
              options={recurringTypes}
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
              label="Tags"
              tags={tags}
              setTags={handleExistingTagsUpdate}
              availableTags={recurringTags}
              newTags={newTags}
              setNewTags={handleNewTagsUpdate}
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
                disabled={submitting}
                placeholder="$0.00"
                style={{ width: "100%" }}
              />
            </Form.Group>
          </Col>
        </Row>

        {/* UnifiedFileManager for picking images */}
        <Row>
          <Col md={4}>
            <UnifiedFileManager
              label="Images"
              helpText="Take a photo for each image. To add more, tap again."
              disabled={submitting}
              onSelectImage={(url) => setSelectedImageUrl(url)}
              onNewFilesChange={(files) => setNewFiles(files)}
              // In Add mode, no existing files to remove
            />
          </Col>
        </Row>

        <div className="d-flex justify-content-end mt-3">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? (
              <Spinner as="span" animation="border" size="sm" />
            ) : (
              "Add"
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

export default AddRecurringPage;
