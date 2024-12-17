import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";

function ReceiptListingPage() {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const location = useLocation();
  const storage = getStorage();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const folder = queryParams.get("folder");
    if (!folder) return;

    const folderRef = ref(storage, `receipts/${folder}`);

    listAll(folderRef)
      .then((res) => {
        const promises = res.items.map((itemRef) => getDownloadURL(itemRef));
        return Promise.all(promises);
      })
      .then((urls) => setImageUrls(urls))
      .catch((error) => console.error("Error listing receipts:", error));
  }, [location, storage]);

  return (
    <div>
      <h2>Receipts</h2>
      {imageUrls.length === 0 ? (
        <p>No receipts found for this folder.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {imageUrls.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt={`Receipt ${idx + 1}`}
              style={{ width: "200px", height: "auto" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ReceiptListingPage;
