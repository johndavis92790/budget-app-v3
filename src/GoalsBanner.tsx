import { Row, Col, Modal, Button, Form, Alert } from "react-bootstrap";
import { useState } from "react";
import FlipNumbers from "react-flip-numbers";
import CurrencyInput from "./CurrencyInput";
import { useAuthContext } from "./authContext";
import { ApiService } from "./api";

interface GoalsBannerProps {
  weeklyGoal: number;
  monthlyGoal: number;
  onUpdateGoal: (weeklyGoal: number, monthlyGoal: number) => void;
}

function GoalsBanner({
  weeklyGoal,
  monthlyGoal,
  onUpdateGoal,
}: GoalsBannerProps) {
  const { currentUser } = useAuthContext();
  const [showModal, setShowModal] = useState(false);
  const [editWeeklyGoal, setEditWeeklyGoal] = useState("");
  const [editMonthlyGoal, setEditMonthlyGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = () => {
    setEditWeeklyGoal(weeklyGoal.toString());
    setEditMonthlyGoal(monthlyGoal.toString());
    setError(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError(null);
  };

  const handleSaveGoals = async () => {
    if (!currentUser?.email) {
      setError("User not authenticated");
      return;
    }

    const weeklyValue = parseFloat(editWeeklyGoal.replace(/[^0-9.-]/g, ""));
    const monthlyValue = parseFloat(editMonthlyGoal.replace(/[^0-9.-]/g, ""));

    if (isNaN(weeklyValue) || isNaN(monthlyValue)) {
      setError("Please enter valid numbers for both goals");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const apiService = new ApiService(currentUser.email);
      await apiService.updateGoals(weeklyValue, monthlyValue);

      // Update the parent component's state
      onUpdateGoal(weeklyValue, monthlyValue);
      handleCloseModal();
    } catch (err) {
      console.error("Error updating goals:", err);
      setError("Failed to update goals. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  const borderRadius = "10px"; // Adjust based on your desired roundness

  function getFlipValue(amount: number) {
    return Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function getStyles(amount: number) {
    const isNegative = amount < 0;
    return {
      backgroundColor: isNegative ? "#f8d7da" : "#d4edda",
      color: isNegative ? "#721c24" : "#155724",
      borderColor: isNegative ? "#f5c2c7" : "#badbcc",
    };
  }

  const weeklyStyles = getStyles(weeklyGoal);
  const monthlyStyles = getStyles(monthlyGoal);

  function renderGoalValue(amount: number, color: string) {
    const isZero = amount === 0;
    return (
      <FlipNumbers
        height={32}
        width={17}
        color={color}
        background="transparent"
        /** This triggers the flipping animation only if amount != 0 */
        play={!isZero}
        perspective={1000}
        /** Increase duration to slow down the flipping animation: **/
        duration={1.5} // e.g. 1.2 second flip duration
        // delay={0.5}   // optional: 0.5s delay before the whole animation starts
        numbers={getFlipValue(amount)}
      />
    );
  }

  return (
    <>
      <div
        className="m-3 mb-4"
        style={{
          overflow: "hidden",
          borderRadius,
          border: "none",
          cursor: "pointer",
          transition: "transform 0.1s ease",
        }}
        onClick={handleOpenModal}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.02)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        title="Click to edit goals"
      >
        <Row className="m-0 align-items-stretch" style={{ height: "100%" }}>
          {/* Weekly Goal */}
          <Col
            className="text-center d-flex flex-column justify-content-center"
            style={{
              backgroundColor: weeklyStyles.backgroundColor,
              color: weeklyStyles.color,
              padding: "16px",
              borderLeft: `1px solid ${weeklyStyles.borderColor}`,
              borderTop: `1px solid ${weeklyStyles.borderColor}`,
              borderBottom: `1px solid ${weeklyStyles.borderColor}`,
              borderRight: "none",
              borderRadius: `${borderRadius} 0 0 ${borderRadius}`,
            }}
          >
            <h5>Weekly Spending Goal</h5>
            <h1
              style={{
                fontSize: "calc(1.375rem + 1.5vw)",
                fontWeight: 700,
              }}
              className="d-flex justify-content-center align-items-center"
            >
              {weeklyGoal < 0 && <span style={{ marginRight: 0 }}>-</span>}
              <span style={{ marginRight: 1 }}>$</span>
              {renderGoalValue(weeklyGoal, weeklyStyles.color)}
            </h1>
          </Col>

          {/* Monthly Goal */}
          <Col
            className="text-center d-flex flex-column justify-content-center"
            style={{
              backgroundColor: monthlyStyles.backgroundColor,
              color: monthlyStyles.color,
              padding: "16px",
              borderRight: `1px solid ${monthlyStyles.borderColor}`,
              borderTop: `1px solid ${monthlyStyles.borderColor}`,
              borderBottom: `1px solid ${monthlyStyles.borderColor}`,
              borderLeft: "none",
              borderRadius: `0 ${borderRadius} ${borderRadius} 0`,
            }}
          >
            <h5>Available Fiscal Monthly Funds</h5>
            <h1
              style={{
                fontSize: "calc(1.375rem + 1.5vw)",
                fontWeight: 700,
              }}
              className="d-flex justify-content-center align-items-center"
            >
              {monthlyGoal < 0 && <span style={{ marginRight: 0 }}>-</span>}
              <span style={{ marginRight: 1 }}>$</span>
              {renderGoalValue(monthlyGoal, monthlyStyles.color)}
            </h1>
          </Col>
        </Row>
      </div>

      {/* Goals Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Goals</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Weekly Spending Goal</Form.Label>
              <CurrencyInput
                value={editWeeklyGoal}
                onChange={(e) => setEditWeeklyGoal(e.target.value)}
                placeholder="$0.00"
                disabled={submitting}
                style={{ width: "100%" }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Monthly Spending Goal</Form.Label>
              <CurrencyInput
                value={editMonthlyGoal}
                onChange={(e) => setEditMonthlyGoal(e.target.value)}
                placeholder="$0.00"
                disabled={submitting}
                style={{ width: "100%" }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={handleCloseModal}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveGoals}
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save Goals"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default GoalsBanner;
