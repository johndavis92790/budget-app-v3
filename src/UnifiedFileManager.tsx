// src/UnifiedFileManager.tsx
import React, { useEffect, useState, useCallback } from "react";
import { ref, getDownloadURL, listAll, getStorage } from "firebase/storage";
import { Spinner, Button, Form } from "react-bootstrap";
import { FaTimes } from "react-icons/fa";

interface FileItem {
  url: string;
  fullPath: string;
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
   * Callback so parent can show a full preview if user taps an image
   */
  onSelectImage?: (url: string | null) => void;

  /**
   * Label above the file input
   */
  label?: string;

  /**
   * Help text under the file input
   */
  helpText?: string;

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
  label = "Images",
  helpText = "Take a photo for each image. To add more, tap again.",
  onNewFilesChange,
  onRemovedPathsChange,
}: UnifiedFileManagerProps) {
  // Existing files (only relevant if we have an ID)
  const [existingFiles, setExistingFiles] = useState<FileItem[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Which existing file paths have been "removed" (in memory) and won't appear
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);

  // Newly added files (already compressed)
  const [newFiles, setNewFiles] = useState<File[]>([]);

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
      const compressedFiles: File[] = [];
      for (const originalFile of pickedFiles) {
        try {
          const compressed = await compressImageFile(originalFile);
          compressedFiles.push(compressed);
        } catch (err) {
          console.error("Error compressing file:", originalFile.name, err);
          // fallback to original if compression fails
          compressedFiles.push(originalFile);
        }
      }
      setNewFiles((prev) => [...prev, ...compressedFiles]);
    },
    [],
  );

  // --- Remove a newly added file ---
  const removeNewFile = useCallback((index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // --- Remove one existing file from the list (in memory) ---
  const removeExistingFile = useCallback((fullPath: string) => {
    setRemovedPaths((prev) => [...prev, fullPath]);
  }, []);

  // --- useEffect to call callbacks when newFiles or removedPaths change ---
  useEffect(() => {
    onNewFilesChange?.(newFiles);
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
            .map((file, idx) => (
              <div
                key={idx}
                style={{ position: "relative", display: "inline-block" }}
              >
                <img
                  src={file.url}
                  alt="Existing File"
                  style={{
                    width: "100px",
                    height: "auto",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  onClick={() => onSelectImage?.(file.url)}
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
            ))}
        </div>
      )}

      {/* File input for adding new images */}
      <Form.Group controlId="unifiedManagerNewFiles" className="mb-3">
        <Form.Label>{label}</Form.Label>
        <Form.Control
          type="file"
          accept="image/*;capture=camera"
          multiple
          disabled={disabled}
          onChange={handleFileChange}
        />
        {helpText && <Form.Text className="text-muted">{helpText}</Form.Text>}
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
          {newFiles.map((file, idx) => {
            const url = URL.createObjectURL(file);
            return (
              <div
                key={idx}
                style={{ position: "relative", display: "inline-block" }}
              >
                <img
                  src={url}
                  alt="New File"
                  style={{
                    width: "100px",
                    height: "auto",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  onClick={() => onSelectImage?.(url)}
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
            );
          })}
        </div>
      )}
    </div>
  );
}

export default UnifiedFileManager;
