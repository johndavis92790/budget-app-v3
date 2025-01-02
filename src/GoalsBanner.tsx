import React from "react";
import { Row, Col, Spinner } from "react-bootstrap";

interface GoalsBannerProps {
  weeklyGoal: number;
  monthlyGoal: number;
  loading: boolean;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function GoalsBanner({ weeklyGoal, monthlyGoal, loading }: GoalsBannerProps) {
  const borderRadius = "10px"; // Adjust based on your desired roundness

  return (
    <div
      className="m-3"
      style={{ overflow: "hidden", borderRadius, border: "none" }}
    >
      <Row className="m-0 align-items-stretch" style={{ height: "100%" }}>
        {/* Weekly Goal */}
        <Col
          className="text-center d-flex flex-column justify-content-center"
          style={{
            backgroundColor: weeklyGoal < 0 ? "#f8d7da" : "#d4edda", // Red or green background
            color: weeklyGoal < 0 ? "#721c24" : "#155724", // Red or green text
            padding: "20px",
            borderLeft: `1px solid ${weeklyGoal < 0 ? "#f5c2c7" : "#badbcc"}`, // Matching border
            borderTop: `1px solid ${weeklyGoal < 0 ? "#f5c2c7" : "#badbcc"}`, // Matching border
            borderBottom: `1px solid ${weeklyGoal < 0 ? "#f5c2c7" : "#badbcc"}`, // Matching border
            borderRight: "none", // Remove overlap with the adjacent border
            borderRadius: `${borderRadius} 0 0 ${borderRadius}`, // Round left corners
          }}
        >
          <h5>Weekly Spending Goal</h5>

          {loading ? (
            <p>
              <Spinner as="span" animation="border" />
            </p>
          ) : (
            <h1 className="fw-bold">{formatCurrency(weeklyGoal)}</h1>
          )}
        </Col>

        {/* Monthly Goal */}
        <Col
          className="text-center d-flex flex-column justify-content-center"
          style={{
            backgroundColor: monthlyGoal < 0 ? "#f8d7da" : "#d4edda", // Red or green background
            color: monthlyGoal < 0 ? "#721c24" : "#155724", // Red or green text
            padding: "20px",
            borderRight: `1px solid ${monthlyGoal < 0 ? "#f5c2c7" : "#badbcc"}`, // Matching border
            borderTop: `1px solid ${monthlyGoal < 0 ? "#f5c2c7" : "#badbcc"}`, // Matching border
            borderBottom: `1px solid ${monthlyGoal < 0 ? "#f5c2c7" : "#badbcc"}`, // Matching border
            borderLeft: "none", // Remove overlap with the adjacent border
            borderRadius: `0 ${borderRadius} ${borderRadius} 0`, // Round right corners
          }}
        >
          <h5>Available Fiscal Monthly Funds</h5>
          {loading ? (
            <p>
              <Spinner as="span" animation="border" />
            </p>
          ) : (
            <h1 className="fw-bold">{formatCurrency(monthlyGoal)}</h1>
          )}
        </Col>
      </Row>
    </div>
  );
}

export default GoalsBanner;
