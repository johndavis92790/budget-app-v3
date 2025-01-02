import React, { FormEvent, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Form, Button, Row, Col, Spinner } from "react-bootstrap";
import { storage } from "./firebase";
import { ref, uploadBytes } from "firebase/storage";

import FullSizeImageModal from "./FullSizeImageModal";
import FullPageSpinner from "./FullPageSpinner";
import FileUploader from "./FileUploader";

// We keep the TypeField, TagField, DescriptionField, CategoryField from your common fields
// But remove any old "CurrencyInput" from there
import {
  TypeField,
  TagField,
  DescriptionField,
  CategoryField,
} from "./CommonFormFields";

// Import your newly typed CurrencyInput
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
  // We'll store the typed string in local state, e.g. "$1,234.56"
  const [value, setValue] = useState("");

  // FileUploader state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const editURLFragment = "https://budget-app-v3.web.app/edit-recurring?id=";
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefillType = params.get("type");
    if (prefillType) {
      setType(prefillType);
    }
  }, [location.search]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!type || !category || tags.length === 0 || !value) {
      alert("Type, at least one Tag, and Value are required.");
      return;
    }

    setSubmitting(true);
    try {
      const uniqueId = String(Date.now());

      // If we have image files, upload them
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

      // Convert user-typed currency string (e.g. "$1,234.56") to float
      const numericStr = value.replace(/[^0-9.-]/g, ""); // "1234.56"
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
        tags,
        value: floatVal, // store float in DB
        editURL,
        id: uniqueId,
        itemType: "recurring",
      };

      const success = await addItem(newRecurring);
      if (success) {
        // Reset form
        setType("Expense");
        setCategory("");
        setDescription("");
        setTags([]);
        setValue("");
        setImageFiles([]);
        navigate("/recurring");
      } else {
        alert("Failed to add recurring.");
      }
    } catch (error) {
      console.error("Error adding recurring:", error);
      alert("An error occurred while adding the recurring.");
    } finally {
      setSubmitting(false);
    }
  };

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
              setTags={setTags}
              availableTags={recurringTags}
              disabled={submitting}
              required
            />
          </Col>
          <Col xs={6}>
            <Form.Group controlId="formValue" className="mb-3">
              <Form.Label>Amount</Form.Label>
              <CurrencyInput
                value={value}
                onChange={(e) => {
                  // maskedVal might be "$1,234.56"
                  setValue(e.target.value);
                }}
                disabled={submitting}
                placeholder="$0.00"
                style={{ width: "100%" }}
              />
            </Form.Group>
          </Col>
        </Row>

        {/* Reusable File Uploader */}
        <Row>
          <Col md={4}>
            <FileUploader
              label="Images"
              helpText="Take a photo for each image. To add more, tap again."
              files={imageFiles}
              onChange={setImageFiles}
              selectedImageUrl={selectedImageUrl}
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
