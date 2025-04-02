// src/UnifiedFileManager.tsx
import React, { useEffect, useState, useCallback } from "react";
import { ref, getDownloadURL, listAll, getStorage } from "firebase/storage";
import { Spinner, Button, Form } from "react-bootstrap";
import { FaTimes } from "react-icons/fa";

interface FileItem {
  url: string;
  fullPath: string;
}

interface NewFileItem {
  file: File;
  // For images, previewUrl is generated via URL.createObjectURL;
  // for PDFs, we'll use a static PDF icon located in public/pdf-icon.png.
  previewUrl: string;
  isPdf: boolean;
}

interface UnifiedFileManagerProps {
  /**
   * If provided, we'll load existing files from
   * "folderName/id" in Firebase Storage.
   */
  id?: string | null;

  /**
   * Folder in Firebase Storage (default "images")
   */
  folderName?: string;

  /**
   * Disable picking & removing files
   */
  disabled?: boolean;

  /**
   * If something fails (e.g. listing files), we invoke onSetError
   */
  onSetError?: (err: string | null) => void;

  /**
   * Callback so parent can show a full preview if user taps an image or PDF icon
   */
  onSelectImage?: (url: string | null) => void;

  /**
   * Label above the file input
   */
  label?: string;

  /**
   * Callback to pass up new files added
   */
  onNewFilesChange?: (newFiles: File[]) => void;

  /**
   * Callback to pass up removed existing file paths
   */
  onRemovedPathsChange?: (removedPaths: string[]) => void;
}

/**
 * Compress a single image File by drawing it on a canvas.
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
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Scale down if needed
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
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas toBlob() gave null blob."));
              return;
            }
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
        img.src = loadEvent.target.result;
      } else {
        reject(new Error("FileReader result was not a string."));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Unified File Manager Component
 */
function UnifiedFileManager({
  id,
  folderName = "images",
  disabled = false,
  onSetError,
  onSelectImage,
  label = "Images / PDFs",
  onNewFilesChange,
  onRemovedPathsChange,
}: UnifiedFileManagerProps) {
  // Existing files (only relevant if we have an ID)
  const [existingFiles, setExistingFiles] = useState<FileItem[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  // Newly added files (processed with type NewFileItem)
  const [newFiles, setNewFiles] = useState<NewFileItem[]>([]);
  // Which existing file paths have been "removed" (in memory) and won't appear
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);

  // --- Load existing files if we have an ID ---
  useEffect(() => {
    if (!id) return; // no ID => "Add" scenario
    const fetchExisting = async () => {
      setLoadingExisting(true);
      onSetError?.(null);
      try {
        const storage = getStorage();
        const folderRef = ref(storage, `${folderName}/${id}`);
        const res = await listAll(folderRef);
        const items = await Promise.all(
          res.items.map(async (itemRef) => {
            const fileUrl = await getDownloadURL(itemRef);
            return { url: fileUrl, fullPath: itemRef.fullPath };
          }),
        );
        setExistingFiles(items);
      } catch (error: any) {
        console.error("Error loading existing files:", error);
        onSetError?.("Error loading existing files.");
      } finally {
        setLoadingExisting(false);
      }
    };
    fetchExisting();
  }, [id, folderName, onSetError]);

  // --- Handle picking new files ---
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const pickedFiles = Array.from(e.target.files);
      const processedFiles: NewFileItem[] = [];
      for (const originalFile of pickedFiles) {
        const isPdf =
          originalFile.type === "application/pdf" ||
          originalFile.name.toLowerCase().endsWith(".pdf");
        try {
          if (!isPdf) {
            // For images, compress and generate an object URL preview
            const compressed = await compressImageFile(originalFile);
            const previewUrl = URL.createObjectURL(compressed);
            processedFiles.push({ file: compressed, previewUrl, isPdf: false });
          } else {
            // For PDFs, use a default PDF icon image for preview
            const previewUrl = "/pdf-icon.png"; // ensure this file exists in your public folder
            processedFiles.push({
              file: originalFile,
              previewUrl,
              isPdf: true,
            });
          }
        } catch (err) {
          console.error("Error processing file:", originalFile.name, err);
          // Fallback: use a default preview (for PDFs, the PDF icon; for images, a fallback object URL)
          const fallbackUrl = isPdf
            ? "/pdf-icon.png"
            : URL.createObjectURL(originalFile);
          processedFiles.push({
            file: originalFile,
            previewUrl: fallbackUrl,
            isPdf,
          });
        }
      }
      setNewFiles((prev) => [...prev, ...processedFiles]);
      onNewFilesChange?.(processedFiles.map((item) => item.file));
    },
    [onNewFilesChange],
  );

  // --- Remove a newly added file ---
  const removeNewFile = useCallback((index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // --- Remove one existing file from the list (in memory) ---
  const removeExistingFile = useCallback((fullPath: string) => {
    setRemovedPaths((prev) => [...prev, fullPath]);
  }, []);

  // --- Trigger callbacks when newFiles or removedPaths change ---
  useEffect(() => {
    onNewFilesChange?.(newFiles.map((item) => item.file));
  }, [newFiles, onNewFilesChange]);

  useEffect(() => {
    onRemovedPathsChange?.(removedPaths);
  }, [removedPaths, onRemovedPathsChange]);

  // --- Render ---
  return (
    <div>
      {loadingExisting && <Spinner animation="border" />}

      {/* Existing files (minus those "removed") */}
      {existingFiles.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          {existingFiles
            .filter((f) => !removedPaths.includes(f.fullPath))
            .map((file, idx) => {
              const isPdf = file.url.toLowerCase().includes(".pdf");
              // If it's a PDF, show the PDF icon; otherwise, show the image.
              const displayUrl = isPdf ? "/pdf-icon.png" : file.url;
              return (
                <div
                  key={idx}
                  style={{ position: "relative", display: "inline-block" }}
                >
                  <img
                    src={displayUrl}
                    alt={isPdf ? "PDF File" : "Existing File"}
                    style={{
                      width: "100px",
                      height: "auto",
                      borderRadius: "4px",
                      objectFit: "cover",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      onSelectImage?.(
                        // For PDFs, pass the actual file URL; for images, pass the URL as is.
                        isPdf ? file.url : file.url,
                      )
                    }
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
                      width: "24px",
                      height: "24px",
                      padding: "0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onClick={() => removeExistingFile(file.fullPath)}
                    disabled={disabled}
                  >
                    <FaTimes />
                  </Button>
                </div>
              );
            })}
        </div>
      )}

      {/* File input for adding new images/PDFs */}
      <Form.Group controlId="unifiedManagerNewFiles" className="mb-3">
        <Form.Label>{label}</Form.Label>
        <Form.Control
          type="file"
          accept="image/*,application/pdf"
          multiple
          disabled={disabled}
          onChange={handleFileChange}
        />
        <Form.Text className="text-muted">
          Add one image or PDF at a time. Tap again to add another.
        </Form.Text>
      </Form.Group>

      {/* Preview newly added files */}
      {newFiles.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          {newFiles.map((item, idx) => (
            <div
              key={idx}
              style={{ position: "relative", display: "inline-block" }}
            >
              <img
                src={item.previewUrl}
                alt={item.isPdf ? "PDF Preview" : "Image Preview"}
                style={{
                  width: "100px",
                  height: "auto",
                  borderRadius: "4px",
                  objectFit: "cover",
                  cursor: "pointer",
                }}
                onClick={() =>
                  onSelectImage?.(
                    // For PDFs, you might choose to create an object URL if needed,
                    // or simply open the file via a preview component.
                    item.isPdf
                      ? URL.createObjectURL(item.file)
                      : item.previewUrl,
                  )
                }
                onLoad={() => {
                  // Revoke object URL only for image previews created via URL.createObjectURL
                  if (!item.isPdf) URL.revokeObjectURL(item.previewUrl);
                }}
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
                  width: "24px",
                  height: "24px",
                  padding: "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => removeNewFile(idx)}
                disabled={disabled}
              >
                <FaTimes />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UnifiedFileManager;
