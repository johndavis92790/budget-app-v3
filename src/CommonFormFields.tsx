import React from "react";
import { Form } from "react-bootstrap";

/**
 * Common props for all fields that handle 'value' + 'onChange'.
 */
interface FieldProps {
  value: string;
  onChange: (newVal: string) => void;
  disabled?: boolean;
  required?: boolean;
}

/** ========== DateField ========== */
export function DateField({ value, onChange, disabled, required }: FieldProps) {
  return (
    <Form.Group controlId="formDate" className="mb-3">
      <Form.Label>Date</Form.Label>
      <Form.Control
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      />
    </Form.Group>
  );
}

/** ========== NameField ========== */
export function NameField({ value, onChange, disabled, required }: FieldProps) {
  return (
    <Form.Group controlId="formName" className="mb-3">
      <Form.Label>Name</Form.Label>
      <Form.Control
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      />
    </Form.Group>
  );
}

/** ========== NotesField ========== */
export function NotesField({ value, onChange, disabled }: FieldProps) {
  return (
    <Form.Group controlId="formNotes" className="mb-3">
      <Form.Label>Notes</Form.Label>
      <Form.Control
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </Form.Group>
  );
}

/** ========== ValueField ========== */
export function ValueField({
  value,
  onChange,
  disabled,
  required,
}: FieldProps) {
  return (
    <Form.Group controlId="formValue" className="mb-3">
      <Form.Label>Value</Form.Label>
      <Form.Control
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      />
    </Form.Group>
  );
}

/** ========== TypeField ========== */
interface TypeFieldProps {
  typeValue: string;
  setTypeValue: (val: string) => void;
  options: string[]; // e.g. nonRecurringTypes or recurringTypes
  disabled?: boolean;
  required?: boolean;
  label?: string; // e.g. "Type"
}

export function TypeField({
  typeValue,
  setTypeValue,
  options,
  disabled,
  required,
  label = "Type",
}: TypeFieldProps) {
  return (
    <Form.Group controlId="formType" className="mb-3">
      <Form.Label>{label}</Form.Label>
      <Form.Select
        value={typeValue}
        onChange={(e) => {
          const selected = e.target.value;
          if (options.includes(selected)) {
            setTypeValue(selected);
          }
        }}
        disabled={disabled}
        required={required}
      >
        {options.map((opt, idx) => (
          <option key={idx} value={opt}>
            {opt}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  );
}

/** ========== CategoryField ========== */
interface CategoryFieldProps {
  categoryValue: string;
  setCategoryValue: (val: string) => void;
  categories: string[];
  disabled?: boolean;
  required?: boolean;
}

export function CategoryField({
  categoryValue,
  setCategoryValue,
  categories,
  disabled,
  required,
}: CategoryFieldProps) {
  return (
    <Form.Group controlId="formCategory" className="mb-3">
      <Form.Label>Category</Form.Label>
      <Form.Select
        value={categoryValue}
        onChange={(e) => {
          const selected = e.target.value;
          if (categories.includes(selected)) {
            setCategoryValue(selected);
          }
        }}
        disabled={disabled}
        required={required}
      >
        <option value="">Select a Category</option>
        {categories.map((cat, idx) => (
          <option key={idx} value={cat}>
            {cat}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  );
}

/** ========== TagField ========== */
interface TagFieldProps {
  tags: string[];
  setTags: (vals: string[]) => void;
  availableTags: string[];
  disabled?: boolean;
  required?: boolean;
  label?: string;
}

export function TagField({
  tags,
  setTags,
  availableTags,
  disabled,
  required,
  label = "Tags",
}: TagFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const opts = e.target.options;
    const selected: string[] = [];
    for (let i = 0; i < opts.length; i++) {
      if (opts[i].selected) {
        selected.push(opts[i].value);
      }
    }
    setTags(selected);
  };

  return (
    <Form.Group controlId="formTags" className="mb-3">
      <Form.Label>{label}</Form.Label>
      <Form.Select
        multiple
        value={tags}
        onChange={handleChange}
        disabled={disabled}
        required={required}
      >
        {availableTags.map((tag, idx) => (
          <option key={idx} value={tag}>
            {tag}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  );
}
