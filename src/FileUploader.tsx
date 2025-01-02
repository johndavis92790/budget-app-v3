import React, { useCallback } from "react";
import { Form, Button } from "react-bootstrap";
import { FaTimes } from "react-icons/fa";

interface FileUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  onSelectImage: (url: string | null) => void;
  disabled?: boolean;
  label?: string; // e.g. "Receipts" or "Images"
  helpText?: string; // e.g. "Take a photo for each receipt..."
}

/**
 * Compresses a single image File by drawing it to an offscreen <canvas>.
 *
 * @param file The original File.
 * @param maxWidth The max width (in px) to downscale to. Height is scaled proportionally.
 * @param quality A number between 0 and 1, controlling JPEG/WebP quality (not used by PNG).
 * @returns A new File representing the compressed image.
 */
async function compressImageFile(
  file: File,
  maxWidth = 1200,
  quality = 0.8,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const img = new Image();
      img.onload = () => {
        // Create an offscreen canvas
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Scale down if width is larger than maxWidth
        if (width > maxWidth) {
          height = Math.round((height / width) * maxWidth);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get 2D context from canvas."));
          return;
        }

        // Draw the image into the canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas back to Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas toBlob() gave null blob."));
              return;
            }

            // Create a new File from the Blob
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          file.type,
          quality,
        );
      };

      if (typeof loadEvent.target?.result === "string") {
        img.src = loadEvent.target.result; // dataURL from FileReader
      } else {
        reject(new Error("FileReader result was not a string."));
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * A reusable file uploader that compresses images before adding them to `files`.
 *
 * Usage:
 *   <FileUploader
 *     files={receiptFiles}
 *     onChange={setReceiptFiles}
 *     selectedImageUrl={selectedImageUrl}
 *     onSelectImage={setSelectedImageUrl}
 *     disabled={submitting}
 *     label="Receipts"
 *     helpText="Take a photo for each receipt..."
 *   />
 */
function FileUploader({
  files,
  onChange,
  onSelectImage,
  disabled = false,
  label = "Files",
  helpText,
}: FileUploaderProps) {
  // When user picks new files from the file input
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const pickedFiles = e.target.files;
      if (!pickedFiles || pickedFiles.length === 0) return;

      // Convert each newly picked File into a compressed File
      const newCompressedFiles: File[] = [];
      for (const originalFile of Array.from(pickedFiles)) {
        try {
          const compressedFile = await compressImageFile(
            originalFile,
            1200, // maxWidth
            0.8, // quality
          );
          newCompressedFiles.push(compressedFile);
        } catch (error) {
          console.error("Error compressing file:", originalFile.name, error);
          // If compression failed, fallback to original file
          newCompressedFiles.push(originalFile);
        }
      }

      onChange([...files, ...newCompressedFiles]);

      // Reset file input's value so user can pick the same file again if needed
      e.target.value = "";
    },
    [files, onChange],
  );

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
