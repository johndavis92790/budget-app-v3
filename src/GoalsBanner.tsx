interface GoalsBannerProps {
  weeklyGoal: number;
  monthlyGoal: number;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function GoalsBanner({ weeklyGoal, monthlyGoal }: GoalsBannerProps) {
  function renderGoalCard(label: string, value: number) {
    const alertClass = value < 0 ? "alert-danger" : "alert-success";
    const formattedValue = formatCurrency(value);

    return (
      <div className={`alert ${alertClass} text-center m-3`}>
        <h1>{label}</h1>
        <h1 className="fw-bold">{formattedValue}</h1>
      </div>
    );
  }

  return (
    <div>
      {renderGoalCard("Weekly Spending Goal", weeklyGoal)}
      {renderGoalCard("Available Fiscal Monthly Funds", monthlyGoal)}
    </div>
  );
}

export default GoalsBanner;
