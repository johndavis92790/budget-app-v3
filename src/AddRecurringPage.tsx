import React, { FormEvent, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Form, Button, Row, Col, Spinner } from "react-bootstrap";
import { storage } from "./firebase";
import { ref, uploadBytes } from "firebase/storage";

import FullSizeImageModal from "./FullSizeImageModal";
import FullPageSpinner from "./FullPageSpinner";
import FileUploader from "./FileUploader";

import {
  TypeField,
  TagField,
  DescriptionField,
  CategoryField,
} from "./CommonFormFields";

import CurrencyInput from "./CurrencyInput";

import { Recurring } from "./types";
import { FaArrowLeft } from "react-icons/fa";

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

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefillType = params.get("type");
    if (prefillType) {
      setType(prefillType);
    }
  }, [location.search]);

  const editURLFragment = "https://budget-app-v3.web.app/edit-recurring?id=";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Combine existing + new
    const finalTags = [
      ...tags,
      ...newTags.map((t) => t.trim()).filter(Boolean),
    ];

    if (!type || !category || finalTags.length === 0 || !value) {
      alert("Type, at least one Tag, and Value are required.");
      return;
    }

    setSubmitting(true);
    try {
      const uniqueId = String(Date.now());

      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const fileRef = ref(
            storage,
            `images/${uniqueId}/${uniqueId}-${file.name}`,
          );
          await uploadBytes(fileRef, file);
        }
      }

      const editURL = `${editURLFragment}${uniqueId}`;

      const numericStr = value.replace(/[^0-9.-]/g, "");
      const floatVal = parseFloat(numericStr);
      if (isNaN(floatVal)) {
        alert("Invalid numeric value in the 'Value' field.");
        setSubmitting(false);
        return;
      }

      const newRecurring: Recurring = {
        type,
        category,
        description,
        tags: finalTags,
        value: floatVal,
        editURL,
        id: uniqueId,
        itemType: "recurring",
      };

      const success = await addItem(newRecurring);
      if (!success) {
        alert("Failed to add recurring.");
        return;
      }

      // Reset
      setType("Expense");
      setCategory("");
      setDescription("");
      setTags([]);
      setNewTags([]);
      setValue("");
      setImageFiles([]);

      navigate("/recurring");
    } catch (error) {
      console.error("Error adding recurring:", error);
      alert("An error occurred while adding the recurring.");
    } finally {
      setSubmitting(false);
    }
  };

  // Tag setter helpers
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

        <Row>
          <Col md={4}>
            <FileUploader
              label="Images"
              helpText="Take a photo for each image. To add more, tap again."
              files={imageFiles}
              onChange={setImageFiles}
              onSelectImage={setSelectedImageUrl}
              disabled={submitting}
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
