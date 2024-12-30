import React from "react";
import { Spinner } from "react-bootstrap";

const FullPageSpinner: React.FC = () => {
  return (
    <div
      className="d-flex"
      style={{
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Spinner animation="border" role="status">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
};

export default FullPageSpinner;
