import React from "react";
import { Card, Row, Col, Badge, ProgressBar, Alert } from "react-bootstrap";
import { Recurring, History, FiscalMonth } from "./types";

interface BudgetForecastCardProps {
  incomeItems: Recurring[];
  expenseItems: Recurring[];
  history: History[];
  fiscalMonths: Record<string, FiscalMonth>;
}

const BudgetForecastCard: React.FC<BudgetForecastCardProps> = ({
  incomeItems,
  expenseItems,
  history,
  fiscalMonths,
}) => {
  // Uses the same calculation as the AppScript: (annual_value * 12) / 13
  const roundToTwoDecimals = (value: number): number => {
    return Math.round(value * 100) / 100;
  };

  const calculateAdjustedValue = (value: number): number => {
    return roundToTwoDecimals((value * 12) / 13);
  };

  // Calculate total adjusted incomes
  const totalAdjustedIncomes = incomeItems.reduce((sum, item) => {
    return sum + calculateAdjustedValue(item.value);
  }, 0);

  // Calculate total adjusted expenses
  const totalAdjustedExpenses = expenseItems.reduce((sum, item) => {
    return sum + calculateAdjustedValue(item.value);
  }, 0);

  // Calculate net budget from recurring items
  const projectedBudget = totalAdjustedIncomes - totalAdjustedExpenses;

  // Format currency
  const formatCurrency = (value: number): string => {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  // Historical Analysis for the last 3 months
  const analyzeHistoricalData = () => {
    // Convert all dates to Date objects for comparison
    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    // Filter history to last 3 months and only regular (non-recurring) items
    const recentHistory = history.filter((item) => {
      const itemDate = new Date(item.date);
      return (
        itemDate >= threeMonthsAgo &&
        itemDate <= today &&
        !item.type.toLowerCase().includes("recurring")
      );
    });

    // Group by month
    const monthlyData: Record<
      string,
      { expenses: number; incomes: number; net: number }
    > = {};

    recentHistory.forEach((item) => {
      const itemDate = new Date(item.date);
      const monthKey = `${itemDate.getFullYear()}-${itemDate.getMonth() + 1}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { expenses: 0, incomes: 0, net: 0 };
      }

      if (item.type.toLowerCase() === "expense") {
        monthlyData[monthKey].expenses += item.value;
      } else if (item.type.toLowerCase() === "income") {
        monthlyData[monthKey].incomes += item.value;
      }

      monthlyData[monthKey].net =
        monthlyData[monthKey].incomes - monthlyData[monthKey].expenses;
    });

    // Calculate averages
    const months = Object.keys(monthlyData);
    const totalMonths = Math.max(months.length, 1); // Avoid division by zero

    const avgMonthlyExpenses =
      months.reduce((sum, month) => sum + monthlyData[month].expenses, 0) /
      totalMonths;
    const avgMonthlyIncomes =
      months.reduce((sum, month) => sum + monthlyData[month].incomes, 0) /
      totalMonths;
    const avgMonthlyNet =
      months.reduce((sum, month) => sum + monthlyData[month].net, 0) /
      totalMonths;

    // Predict budget outcome
    const totalPredictedExpenses = totalAdjustedExpenses + avgMonthlyExpenses;
    const totalPredictedIncomes = totalAdjustedIncomes + avgMonthlyIncomes;
    const predictedNet = totalPredictedIncomes - totalPredictedExpenses;
    const willStayUnderBudget = predictedNet >= 0;
    const budgetRisk = willStayUnderBudget
      ? 0
      : Math.min(Math.abs(predictedNet / totalPredictedIncomes) * 100, 100);

    return {
      avgMonthlyExpenses,
      avgMonthlyIncomes,
      avgMonthlyNet,
      totalPredictedExpenses,
      totalPredictedIncomes,
      predictedNet,
      willStayUnderBudget,
      budgetRisk,
      monthsAnalyzed: totalMonths,
    };
  };

  const analysisResults = analyzeHistoricalData();

  return (
    <Card className="mb-4">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">Next Month's Budget Forecast</h5>
      </Card.Header>
      <Card.Body>
        <p className="text-muted mb-3">
          <small>
            *Based on recurring items using monthly calculation: (annual × 12) ÷
            13
          </small>
        </p>

        {/* Recurring Budget Section */}
        <h6 className="border-bottom pb-2 mb-3">Recurring Items</h6>
        <Row className="mb-3">
          <Col xs={6}>
            <div className="d-flex justify-content-between">
              <span>Recurring Income:</span>
              <span className="text-success fw-bold">
                {formatCurrency(totalAdjustedIncomes)}
              </span>
            </div>
          </Col>
          <Col xs={6}>
            <div className="d-flex justify-content-between">
              <span>Recurring Expenses:</span>
              <span className="text-danger fw-bold">
                {formatCurrency(totalAdjustedExpenses)}
              </span>
            </div>
          </Col>
        </Row>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h6>Net Recurring:</h6>
          <h5>
            <Badge bg={projectedBudget >= 0 ? "success" : "danger"} pill>
              {formatCurrency(projectedBudget)}
            </Badge>
          </h5>
        </div>

        {/* Historical Analysis Section */}
        <h6 className="border-bottom pb-2 mb-3">
          Historical Analysis (Past {analysisResults.monthsAnalyzed} Months)
        </h6>
        <Row className="mb-3">
          <Col xs={6}>
            <div className="d-flex justify-content-between">
              <span>Avg. Non-recurring Income:</span>
              <span className="text-success fw-bold">
                {formatCurrency(analysisResults.avgMonthlyIncomes)}
              </span>
            </div>
          </Col>
          <Col xs={6}>
            <div className="d-flex justify-content-between">
              <span>Avg. Non-recurring Expenses:</span>
              <span className="text-danger fw-bold">
                {formatCurrency(analysisResults.avgMonthlyExpenses)}
              </span>
            </div>
          </Col>
        </Row>

        {/* Prediction Section */}
        <h6 className="border-bottom pb-2 mb-3">Final Prediction</h6>
        <Row className="mb-3">
          <Col xs={6}>
            <div className="d-flex justify-content-between">
              <span>Predicted Total Income:</span>
              <span className="text-success fw-bold">
                {formatCurrency(analysisResults.totalPredictedIncomes)}
              </span>
            </div>
          </Col>
          <Col xs={6}>
            <div className="d-flex justify-content-between">
              <span>Predicted Total Expenses:</span>
              <span className="text-danger fw-bold">
                {formatCurrency(analysisResults.totalPredictedExpenses)}
              </span>
            </div>
          </Col>
        </Row>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>Predicted Budget Balance:</h5>
          <h4>
            <Badge
              bg={analysisResults.predictedNet >= 0 ? "success" : "danger"}
              pill
            >
              {formatCurrency(analysisResults.predictedNet)}
            </Badge>
          </h4>
        </div>

        {analysisResults.monthsAnalyzed > 0 && (
          <Alert
            variant={
              analysisResults.willStayUnderBudget ? "success" : "warning"
            }
            className="mb-0 mt-3"
          >
            <strong>
              {analysisResults.willStayUnderBudget
                ? "You're on track to stay within budget! 🎉"
                : "Warning: You may exceed your budget based on spending patterns! ⚠️"}
            </strong>
            {!analysisResults.willStayUnderBudget && (
              <>
                <p className="mt-2 mb-1">Budget Risk:</p>
                <ProgressBar
                  variant="danger"
                  now={analysisResults.budgetRisk}
                  label={`${Math.round(analysisResults.budgetRisk)}%`}
                  className="mt-1"
                />
              </>
            )}
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default BudgetForecastCard;
