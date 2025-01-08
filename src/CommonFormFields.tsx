import React, { useState } from "react";
import { Form, InputGroup } from "react-bootstrap";
import { FaCalendar } from "react-icons/fa";
import { MultiValue } from "react-select";
import CreatableSelect from "react-select/creatable";

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
  options: string[]; // e.g. types
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
  setSelectedTags: (tags: string[]) => void;
  existingTags: string[];
  disabled?: boolean;
}

export function TagField({
  selectedTags,
  setSelectedTags,
  existingTags,
  disabled,
}: TagFieldProps) {
  // Map existing tags to the format required by react-select
  const [options, setOptions] = useState(
    existingTags.map((tag) => ({ label: tag, value: tag })),
  );

  // Handle selection changes
  const handleChange = (
    newValue: MultiValue<{ label: string; value: string }>,
  ) => {
    setSelectedTags(
      newValue.map((item: { label: string; value: string }) => item.value),
    );
  };

  // Handle creating a new tag
  const handleCreate = (inputValue: string) => {
    const newOption = { label: inputValue, value: inputValue };
    setOptions((prevOptions) => [...prevOptions, newOption]); // Add to available options
    setSelectedTags([...selectedTags, inputValue]); // Add to selected tags
  };

  return (
    <CreatableSelect
      isMulti
      isDisabled={disabled}
      value={selectedTags.map((tag) => ({ label: tag, value: tag }))}
      onChange={handleChange}
      onCreateOption={handleCreate}
      options={options}
      placeholder="Select or create tags..."
      noOptionsMessage={() => "No matching tags"}
      className="mb-3"
    />
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
