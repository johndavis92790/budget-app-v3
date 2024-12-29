import { Button } from "react-bootstrap";

function HomePage() {
  return (
    <div className="d-grid gap-2">
      <Button size="lg" href="/add-history">
        Add Expense/Refund
      </Button>
      <Button size="lg" href="/history">
        History
      </Button>
      <Button size="lg" href="/recurring">
        Recurring
      </Button>
    </div>
  );
}

export default HomePage;
