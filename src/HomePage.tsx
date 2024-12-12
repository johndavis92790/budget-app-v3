import React, { FormEvent, useState } from "react";
import { Form, Button, Row, Col, Spinner } from "react-bootstrap";

interface HomePageProps {
  categories: string[];
  tags: string[];
  addExpense: (expense: any) => Promise<boolean>;
  loading: boolean;
}

function HomePage({ categories, tags, addExpense, loading }: HomePageProps) {
  const [date, setDate] = useState<string>("");
  const [type, setType] = useState<"Expense" | "Refund">("Expense");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [value, setValue] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const selected: string[] = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    setSelectedCategories(selected);
  };

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !date ||
      !type ||
      selectedCategories.length === 0 ||
      selectedTags.length === 0 ||
      !value
    ) {
      alert(
        "Date, Type, at least one Category, at least one Tag, and Value are required.",
      );
      return;
    }

    const newExpense = {
      date,
      type,
      categories: selectedCategories,
      tags: selectedTags,
      value: parseFloat(value),
      notes,
    };

    const success = await addExpense(newExpense);
    if (success) {
      // Clear form
      setDate("");
      setType("Expense");
      setSelectedCategories([]);
      setSelectedTags([]);
      setValue("");
      setNotes("");
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
            <Form.Group controlId="formCategories">
              <Form.Label>Categories</Form.Label>
              <Form.Select
                multiple
                value={selectedCategories}
                onChange={handleCategoryChange}
                required
              >
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

        <Button type="submit" variant="primary">
          Add
        </Button>
      </Form>
    </>
  );
}

export default HomePage;
