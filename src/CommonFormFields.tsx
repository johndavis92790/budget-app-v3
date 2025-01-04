import React from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import { FaCalendar, FaTrash } from "react-icons/fa";

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
      <InputGroup>
        <Form.Control
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
        />
        <InputGroup.Text>
          <FaCalendar />
        </InputGroup.Text>
      </InputGroup>
    </Form.Group>
  );
}

/** ========== DescriptionField ========== */
export function DescriptionField({ value, onChange, disabled }: FieldProps) {
  return (
    <Form.Group controlId="formDescription" className="mb-3">
      <Form.Control
        type="text"
        value={value}
        placeholder="Description"
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </Form.Group>
  );
}

/** ========== TypeField ========== */
interface TypeFieldProps {
  typeValue: string;
  setTypeValue?: (val: string) => void;
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
}: TypeFieldProps) {
  return (
    <Form.Group controlId="formType" className="mb-3">
      <Form.Select
        value={typeValue}
        onChange={(e) => {
          const selected = e.target.value;
          if (options.includes(selected) && setTypeValue) {
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
  selectedTags: string[];
  setSelectedTags: (newTags: string[]) => void;
  newTags: string[]; // always required
  setNewTags: (vals: string[]) => void;
  existingTags: string[];
  disabled?: boolean;
  required?: boolean;
  label?: string;
}

export function TagField({
  selectedTags,
  setSelectedTags,
  existingTags,
  disabled,
  required,
  label = "Tags",
  newTags,
  setNewTags,
}: TagFieldProps) {
  // Existing tags (multi-select) change handler
  const handleExistingTagsChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const opts = e.target.options;
    const selected: string[] = [];
    for (let i = 0; i < opts.length; i++) {
      if (opts[i].selected) {
        selected.push(opts[i].value);
      }
    }
    // We pass the final string[] to setTags
    setSelectedTags(selected);
  };

  // Add a blank new tag
  const handleAddNewTagField = () => {
    setNewTags([...newTags, ""]);
  };

  // Update the text of one new tag
  const handleNewTagChange = (idx: number, value: string) => {
    const copy = [...newTags];
    copy[idx] = value;
    setNewTags(copy);
  };

  // Remove one new tag
  const handleRemoveNewTag = (idx: number) => {
    setNewTags(newTags.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <Form.Group controlId="formTags" className="mb-3">
        <Form.Label>{label}</Form.Label>
        <Form.Select
          multiple
          value={selectedTags}
          onChange={handleExistingTagsChange}
          disabled={disabled}
          required={required}
        >
          {existingTags.map((tag, i) => (
            <option key={i} value={tag}>
              {tag}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      {/* newly created custom tags */}
      {newTags.map((tagValue, idx) => (
        <InputGroup className="mb-2" key={idx}>
          <Form.Control
            type="text"
            placeholder="Enter a new tag"
            value={tagValue}
            disabled={disabled}
            onChange={(e) => handleNewTagChange(idx, e.target.value)}
          />
          <Button
            variant="outline-secondary"
            onClick={() => handleRemoveNewTag(idx)}
            disabled={disabled}
            className="d-flex align-items-center justify-content-center"
            style={{ lineHeight: 1 }}
          >
            <FaTrash />
          </Button>
        </InputGroup>
      ))}

      <Button
        className="mb-3"
        variant="outline-primary"
        onClick={handleAddNewTagField}
        disabled={disabled}
      >
        + Add New Tag
      </Button>
    </div>
  );
}

interface MultiSelectFieldProps {
  selectedOptions: string[];
  setSelectedOptions: (newOptions: string[]) => void;
  availableOptions: string[];
  disabled?: boolean;
  required?: boolean;
}

export function MultiSelectField({
  selectedOptions,
  setSelectedOptions,
  availableOptions,
  disabled,
  required,
}: MultiSelectFieldProps) {
  // Handle changes in the multi-select dropdown
  const handleMultiSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const opts = e.target.options;
    const selected: string[] = [];
    for (let i = 0; i < opts.length; i++) {
      if (opts[i].selected) {
        selected.push(opts[i].value);
      }
    }
    setSelectedOptions(selected);
  };

  return (
    <div>
      <Form.Group controlId="multiSelectField" className="mb-3">
        <Form.Select
          multiple
          value={selectedOptions}
          onChange={handleMultiSelectChange}
          disabled={disabled}
          required={required}
        >
          {availableOptions.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
    </div>
  );
}
