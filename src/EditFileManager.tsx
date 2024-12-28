import React, { useEffect, useState } from "react";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";
import { Spinner, Button, Form } from "react-bootstrap";
import { FaTimes } from "react-icons/fa";

interface FileItem {
  url: string;
  fullPath: string;
}

interface EditFileManagerProps {
  id: string | null; // The unique ID for this item (e.g. history or recurring)
  folderName: string; // e.g. "receipts" or "images"
  disabled?: boolean; // If true, disable removing & adding
  onSetError?: (err: string | null) => void;
  onSelectImage?: (url: string | null) => void; // For preview in a modal
}

/**
 * Manages loading existing files from Firebase, marking them for deletion, and adding new files.
 *
 * Usage example:
 *   <EditFileManager
 *     id={selectedHistory?.id || null}
 *     folderName="receipts"
 *     disabled={submitting}
 *     onSetError={(err) => setExistingError(err)}
 *     onSelectImage={(url) => setSelectedImageUrl(url)}
 *   />
 */
function EditFileManager({
  id,
  folderName,
  disabled,
  onSetError,
  onSelectImage,
}: EditFileManagerProps) {
  const [existingFiles, setExistingFiles] = useState<FileItem[]>([]);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Load existing files from Firebase once we have an ID
  useEffect(() => {
    if (!id) return;
    const fetchExisting = async () => {
      setLoadingExisting(true);
      onSetError?.(null);
      try {
        const storage = getStorage();
        const folderRef = ref(storage, `${folderName}/${id}`);
        const res = await listAll(folderRef);
        const urls = await Promise.all(
          res.items.map(async (item) => {
            const fileUrl = await getDownloadURL(item);
            return { url: fileUrl, fullPath: item.fullPath };
          }),
        );
        setExistingFiles(urls);
      } catch (error: any) {
        console.error("Error loading existing files:", error);
        onSetError?.("Error loading existing files.");
      } finally {
        setLoadingExisting(false);
      }
    };
    fetchExisting();
  }, [id, folderName, onSetError]);

  /**
   * Hook for the parent to get what needs deleting & uploading
   * For example:
   *    const { removedPaths, newFiles } = EditFileManager
   *    Then parent can do the actual deletion / uploading on save
   */
  return (
    <div>
      {loadingExisting && <Spinner animation="border" />}
      {/* Show existing files (minus those removed) */}
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
            .filter((item) => !removedPaths.includes(item.fullPath))
            .map((item, idx) => (
              <div
                key={idx}
                style={{
                  position: "relative",
                  display: "inline-block",
                }}
              >
                <img
                  src={item.url}
                  alt="Existing File"
                  style={{
                    width: "100px",
                    height: "auto",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  onClick={() => onSelectImage?.(item.url)}
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
                  onClick={() =>
                    setRemovedPaths((prev) => [...prev, item.fullPath])
                  }
                  disabled={disabled}
                >
                  <FaTimes />
                </Button>
              </div>
            ))}
        </div>
      )}

      {/* Add more new files */}
      <Form.Group controlId="formNewFiles" className="mb-3">
        <Form.Label>Add More Files</Form.Label>
        <Form.Control
          type="file"
          accept="image/*;capture=camera"
          multiple
          disabled={disabled}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            // 'files' is a FileList, so Array.from(files) is File[]
            setNewFiles((prev) => [...prev, ...Array.from(files)]);
            e.target.value = "";
          }}
        />
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
                style={{
                  position: "relative",
                  display: "inline-block",
                }}
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
                    padding: "0.2rem",
                  }}
                  onClick={() =>
                    setNewFiles((prev) => prev.filter((_, i) => i !== idx))
                  }
                  disabled={disabled}
                >
                  <FaTimes />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* We don't do the actual upload / delete calls here; we let parent do so on "Save" */}
      {/* So we just expose our state so parent can do: 
            for each removedPaths => delete
            for each newFile => upload
      */}
    </div>
  );
}

/**
 * Export relevant data as well so parent can call .removedPaths, .newFiles, etc.
 */
export function useEditFileManager() {
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  return {
    removedPaths,
    setRemovedPaths,
    newFiles,
    setNewFiles,
  };
}

export default EditFileManager;
