import React, { FormEvent, useState } from "react";
import { Form, Button, Row, Col, Spinner } from "react-bootstrap";
import { storage } from "./firebase";
import { ref, uploadBytes } from "firebase/storage";
import { FaTimes } from "react-icons/fa";
import FullSizeImageModal from "./FullSizeImageModal";
import FullPageSpinner from "./FullPageSpinner";
import { Recurring } from "./types";

interface AddRecurringProps {
  recurringTags: string[];
  recurringTypes: string[];
  addItem: (recurring: Recurring) => Promise<boolean>;
  loading: boolean;
}

function AddRecurring({
  recurringTags,
  recurringTypes,
  addItem,
  loading,
}: AddRecurringProps) {
  const [type, setType] = useState<string>("Expense");
  const [name, setName] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [value, setValue] = useState<string>("");

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const editURLFragment = "https://budget-app-v3.web.app/edit?id=";

  const [submitting, setSubmitting] = useState(false);

  const handleTagsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const selected: string[] = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    setSelectedTags(selected);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setImageFiles((prevFiles) => [...prevFiles, ...newFiles]);

    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!type || selectedTags.length === 0 || !value) {
      alert("Type, at least one Tag, and Value are required.");
      return;
    }

    setSubmitting(true);
    try {
      // Always create a unique ID for this recurring
      const uniqueId = String(Date.now());

      // If we have files, upload them using the uniqueId as the folder name
      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const fileRef = ref(
            storage,
            `images/${uniqueId}/${uniqueId}-${file.name}`,
          );
          await uploadBytes(fileRef, file);
        }
      }

      const editURL: string = `${editURLFragment}${uniqueId}`;

      // Send one POST call to the backend
      const newRecurring: Recurring = {
        type,
        name,
        tags: selectedTags,
        value: parseFloat(value),
        editURL,
        id: uniqueId,
        itemType: "recurring",
      };

      const success = await addItem(newRecurring);
      if (success) {
        // Clear form
        setType("Expense");
        setName("");
        setSelectedTags([]);
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
      <h2 className="mb-4">Add an Expense or Refund</h2>
      <Form onSubmit={handleSubmit}>
        <Row className="mb-3">
          <Col md={4}>
            <Form.Group controlId="formType">
              <Form.Label>Type</Form.Label>
              <Form.Select
                value={type}
                onChange={(e) => {
                  const selectedType = e.target.value;
                  if (recurringTypes.includes(selectedType)) {
                    setType(selectedType);
                  }
                }}
                required
                disabled={submitting}
              >
                {recurringTypes.map((typeOption, idx) => (
                  <option key={idx} value={typeOption}>
                    {typeOption}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        <Col md={8}>
          <Form.Group controlId="formName">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
          </Form.Group>
        </Col>

        <Row className="mb-3">
          <Col md={6}>
            <Form.Group controlId="formTags">
              <Form.Label>Tags</Form.Label>
              <Form.Select
                multiple
                value={selectedTags}
                onChange={handleTagsChange}
                required
                disabled={submitting}
              >
                {recurringTags.map((recurringTag, idx) => (
                  <option key={idx} value={recurringTag}>
                    {recurringTag}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col md={4}>
            <Form.Group controlId="formValue">
              <Form.Label>Value</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                disabled={submitting}
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col md={4}>
            <Form.Group controlId="formImages" className="mb-3">
              <Form.Label>Images</Form.Label>
              <Form.Control
                type="file"
                accept="image/*;capture=camera"
                onChange={handleImageChange}
                disabled={submitting}
              />
              <Form.Text className="text-muted">
                Take a photo for each image. To add more images, tap this input
                again after taking the first photo.
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>

        {imageFiles.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            {imageFiles.map((file, index) => {
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
                    alt="Recurring Item"
                    style={{
                      width: "100px",
                      height: "auto",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedImageUrl(url)}
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
                    onClick={() => handleRemoveImage(index)}
                    disabled={submitting}
                  >
                    <FaTimes />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

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

export default AddRecurring;
