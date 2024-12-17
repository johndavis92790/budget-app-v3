import React, { FormEvent, useState } from "react";
import { Form, Button, Row, Col, Spinner } from "react-bootstrap";
import { storage } from "./firebase";
import { ref, uploadBytes } from "firebase/storage";
import { FaTimes } from "react-icons/fa";

interface HomePageProps {
  categories: string[];
  tags: string[];
  addExpense: (expense: any) => Promise<boolean>;
  loading: boolean;
}

function HomePage({ categories, tags, addExpense, loading }: HomePageProps) {
  const [date, setDate] = useState<string>("");
  const [type, setType] = useState<"Expense" | "Refund">("Expense");
  const [selectedCategory, setSelectedCategory] = useState<string>(""); // Single category
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [value, setValue] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);

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

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setReceiptFiles((prevFiles) => [...prevFiles, ...newFiles]);

    // Reset the input so the user can trigger camera again
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setReceiptFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !date ||
      !type ||
      !selectedCategory ||
      selectedTags.length === 0 ||
      !value
    ) {
      alert("Date, Type, Category, at least one Tag, and Value are required.");
      return;
    }

    // Create a unique folder name for this expense
    const folderName = `expense-${Date.now()}`;

    // Upload all images into this folder
    for (const file of receiptFiles) {
      const fileRef = ref(
        storage,
        `receipts/${folderName}/${Date.now()}-${file.name}`,
      );
      await uploadBytes(fileRef, file);
    }

    // We no longer gather URLs here. We just send folderName to backend.
    const newExpense = {
      date,
      type,
      categories: selectedCategory,
      tags: selectedTags,
      value: parseFloat(value),
      notes,
      folderName, // let the backend construct the link
    };

    const success = await addExpense(newExpense);
    if (success) {
      // Clear form
      setDate("");
      setType("Expense");
      setSelectedCategory("");
      setSelectedTags([]);
      setValue("");
      setNotes("");
      setReceiptFiles([]);
    } else {
      alert("Failed to add expense.");
    }
  };

  if (loading && categories.length === 0 && tags.length === 0) {
    return (
      <div className="text-center">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <>
      <h2 className="mb-4">Add an Expense or Refund</h2>
      <Form onSubmit={handleSubmit}>
        <Row className="mb-3">
          <Col md={4}>
            <Form.Group controlId="formDate">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="formType">
              <Form.Label>Type</Form.Label>
              <Form.Select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "Expense" | "Refund")
                }
                required
              >
                <option value="Expense">Expense</option>
                <option value="Refund">Refund</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col md={6}>
            <Form.Group controlId="formCategory">
              <Form.Label>Category</Form.Label>
              <Form.Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                required
              >
                <option value="">Select a Category</option>
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="formTags">
              <Form.Label>Tags</Form.Label>
              <Form.Select
                multiple
                value={selectedTags}
                onChange={handleTagsChange}
                required
              >
                {tags.map((tag, idx) => (
                  <option key={idx} value={tag}>
                    {tag}
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
              />
            </Form.Group>
          </Col>
          <Col md={8}>
            <Form.Group controlId="formNotes">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col md={4}>
            <Form.Group controlId="formReceipts" className="mb-3">
              <Form.Label>Receipts</Form.Label>
              <Form.Control
                type="file"
                accept="image/*;capture=camera"
                onChange={handleReceiptChange}
              />
              <Form.Text className="text-muted">
                Take a photo for each receipt. To add more receipts, tap this
                input again after taking the first photo.
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>

        {receiptFiles.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            {receiptFiles.map((file, index) => {
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
                    alt="Receipt"
                    style={{
                      width: "100px",
                      height: "auto",
                      borderRadius: "4px",
                    }}
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
                    onClick={() => handleRemoveImage(index)}
                  >
                    <FaTimes />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <Button type="submit" variant="primary">
          Add
        </Button>
      </Form>
    </>
  );
}

export default HomePage;
