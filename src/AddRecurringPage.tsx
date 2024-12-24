import React, { FormEvent, useState } from "react";
import { Form, Button, Row, Col, Spinner } from "react-bootstrap";
import { storage } from "./firebase";
import { ref, uploadBytes } from "firebase/storage";

import FullSizeImageModal from "./FullSizeImageModal";
import FullPageSpinner from "./FullPageSpinner";
import FileUploader from "./FileUploader"; // from previous refactor

import { TypeField, TagField, ValueField, NameField } from "./CommonFormFields"; // new

import { Recurring } from "./types";

interface AddRecurringPageProps {
  recurringTags: string[];
  recurringTypes: string[];
  addItem: (recurring: Recurring) => Promise<boolean>;
  loading: boolean;
}

function AddRecurringPage({
  recurringTags,
  recurringTypes,
  addItem,
  loading,
}: AddRecurringPageProps) {
  const [type, setType] = useState("Expense");
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [value, setValue] = useState("");

  // FileUploader state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const editURLFragment = "https://budget-app-v3.web.app/edit?id=";
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!type || tags.length === 0 || !value) {
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
            `images/${uniqueId}/${uniqueId}-${file.name}`
          );
          await uploadBytes(fileRef, file);
        }
      }

      const editURL = `${editURLFragment}${uniqueId}`;

      const newRecurring: Recurring = {
        type,
        name,
        tags,
        value: parseFloat(value),
        editURL,
        id: uniqueId,
        itemType: "recurring",
      };

      const success = await addItem(newRecurring);
      if (success) {
        // Reset form
        setType("Expense");
        setName("");
        setTags([]);
        setValue("");
        setImageFiles([]);
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
      <h2 className="mb-4">Add a Recurring Expense or Income</h2>
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={4}>
            <TypeField
              label="Type"
              typeValue={type}
              setTypeValue={setType}
              options={recurringTypes}
              disabled={submitting}
              required
            />
          </Col>
        </Row>

        <Col md={8}>
          <NameField value={name} onChange={setName} disabled={submitting} />
        </Col>

        <Row>
          <Col md={6}>
            <TagField
              label="Tags"
              tags={tags}
              setTags={setTags}
              availableTags={recurringTags}
              disabled={submitting}
              required
            />
          </Col>
        </Row>

        <Row>
          <Col md={4}>
            <ValueField
              value={value}
              onChange={setValue}
              disabled={submitting}
              required
            />
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

export default AddRecurringPage;
