import React from "react";
import { Container } from "react-bootstrap";
import { History, Recurring, FiscalMonth } from "./types";
import BudgetForecastCard from "./BudgetForecastCard";
import FullPageSpinner from "./FullPageSpinner";

interface BudgetForecastPageProps {
  history: History[];
  recurring: Recurring[];
  fiscalMonths: Record<string, FiscalMonth>;
  loading: boolean;
}

const BudgetForecastPage: React.FC<BudgetForecastPageProps> = ({
  history,
  recurring,
  fiscalMonths,
  loading,
}) => {
  if (loading) {
    return <FullPageSpinner />;
  }

  // Split recurring items into Income and Expenses, sorted by highest value first
  const incomeItems = recurring
    .filter((item) => item.type === "Income")
    .sort((a, b) => b.value - a.value);

  const expenseItems = recurring
    .filter((item) => item.type === "Expense")
    .sort((a, b) => b.value - a.value);

  return (
    <Container>
      <h2 className="mb-4">Budget Forecast</h2>

      <BudgetForecastCard
        incomeItems={incomeItems}
        expenseItems={expenseItems}
        history={history}
        fiscalMonths={fiscalMonths}
      />

      <div className="mt-4">
        <h5>About This Forecast</h5>
        <p>
          This budget forecast combines your recurring income and expenses with
          your historical non-recurring spending patterns to predict your budget
          for the upcoming month.
        </p>
        <p>
          <strong>How it works:</strong>
        </p>
        <ul>
          <li>
            <strong>Recurring items</strong> are calculated using the formula:{" "}
            <code>(annual × 12) ÷ 13</code> to determine the monthly amount
          </li>
          <li>
            <strong>Historical analysis</strong> examines your non-recurring
            expenses and income from the past three months to calculate monthly
            averages
          </li>
          <li>
            <strong>Final prediction</strong> combines both recurring and
            non-recurring patterns to estimate if you'll stay within your budget
          </li>
        </ul>
        <p className="text-muted">
          <small>
            Note: This forecast is an estimate based on historical data and may
            not perfectly predict future spending.
          </small>
        </p>
      </div>
    </Container>
  );
};

export default BudgetForecastPage;
