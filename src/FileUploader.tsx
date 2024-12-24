import React from "react";
import { Form, Button } from "react-bootstrap";
import { FaTimes } from "react-icons/fa";

interface FileUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  selectedImageUrl: string | null;
  onSelectImage: (url: string | null) => void;
  disabled?: boolean;
  label?: string; // e.g. "Receipts" or "Images"
  helpText?: string; // e.g. "Take a photo for each receipt..."
}

/**
 * A reusable file uploader with previews + remove buttons.
 *
 * Usage:
 *   <FileUploader
 *     files={receiptFiles}
 *     onChange={setReceiptFiles}
 *     selectedImageUrl={selectedImageUrl}
 *     onSelectImage={setSelectedImageUrl}
 *     disabled={submitting}
 *     label="Receipts"
 *     helpText="Take a photo for each receipt. ..."
 *   />
 */
function FileUploader({
  files,
  onChange,
  selectedImageUrl,
  onSelectImage,
  disabled = false,
  label = "Files",
  helpText,
}: FileUploaderProps) {
  // When user picks new files from the file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pickedFiles = e.target.files;
    if (!pickedFiles || pickedFiles.length === 0) return;

    const newFiles = Array.from(pickedFiles);
    onChange([...files, ...newFiles]);
    e.target.value = "";
  };

  // Remove a file from our array
  const handleRemoveFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <>
      <Form.Group controlId="formFiles" className="mb-3">
        <Form.Label>{label}</Form.Label>
        <Form.Control
          type="file"
          accept="image/*;capture=camera"
          onChange={handleFileChange}
          disabled={disabled}
        />
        {helpText && <Form.Text className="text-muted">{helpText}</Form.Text>}
      </Form.Group>

      {files.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          {files.map((file, index) => {
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
                  alt="Preview"
                  style={{
                    width: "100px",
                    height: "auto",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  onClick={() => onSelectImage(url)}
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
                  onClick={() => handleRemoveFile(index)}
                  disabled={disabled}
                >
                  <FaTimes />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default FileUploader;
