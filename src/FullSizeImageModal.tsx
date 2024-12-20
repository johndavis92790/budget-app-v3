import { Modal, Button } from "react-bootstrap";

interface FullSizeImageModalProps {
  show: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

function FullSizeImageModal({
  show,
  imageUrl,
  onClose,
}: FullSizeImageModalProps) {
  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Body style={{ textAlign: "center", padding: 0 }}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Full Size"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default FullSizeImageModal;
