import { Row, Col } from "react-bootstrap";
import FlipNumbers from "react-flip-numbers";

interface GoalsBannerProps {
  weeklyGoal: number;
  monthlyGoal: number;
}

function GoalsBanner({ weeklyGoal, monthlyGoal }: GoalsBannerProps) {
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
    <div
      className="m-3"
      style={{ overflow: "hidden", borderRadius, border: "none" }}
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
  );
}

export default GoalsBanner;
