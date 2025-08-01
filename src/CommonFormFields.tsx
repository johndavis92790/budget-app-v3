import React, { useState } from "react";
import { Dropdown, Form, InputGroup } from "react-bootstrap";
import { FaCalendar } from "react-icons/fa";
import { MultiValue } from "react-select";
import CreatableSelect from "react-select/creatable";
import { getCategoryIcon } from "./helpers";
import "./CommonFormFields.css";
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Form.Group controlId="formCategory" className="mb-3">
      <Dropdown
        className="w-100"
        onSelect={(selected) => selected && setCategoryValue(selected)}
        onToggle={(open) => setIsOpen(open)}
      >
        <Dropdown.Toggle
          disabled={disabled}
          className="w-100 d-flex align-items-center justify-content-between category-dropdown-toggle"
        >
          {categoryValue ? (
            <span className="d-flex align-items-center">
              {getCategoryIcon(categoryValue)}
              <span className="ms-2">{categoryValue}</span>
            </span>
          ) : (
            <span>Select a Category</span>
          )}

          <span className={`ms-auto dropdown-chevron ${isOpen ? "open" : ""}`}>
            ▼
          </span>
        </Dropdown.Toggle>

        <Dropdown.Menu className="w-100 category-dropdown-menu">
          {categories.map((cat) => (
            <Dropdown.Item
              eventKey={cat}
              key={cat}
              active={cat === categoryValue}
              className="d-flex align-items-center category-dropdown-item"
            >
              {getCategoryIcon(cat)}
              <span className="ms-2">{cat}</span>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>

        {required && (
          <Form.Control
            type="hidden"
            required={required}
            value={categoryValue}
          />
        )}
      </Dropdown>
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
  // Map existing tags to the format required by react-select and sort alphabetically
  const [options, setOptions] = useState(
    existingTags
      .map((tag) => ({ label: tag, value: tag }))
      .sort((a, b) => a.label.localeCompare(b.label)),
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
    setOptions((prevOptions) =>
      [...prevOptions, newOption].sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    ); // Add to available options and maintain alphabetical order
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
          {[...availableOptions]
            .sort((a, b) => a.localeCompare(b))
            .map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
        </Form.Select>
      </Form.Group>
    </div>
  );
}
