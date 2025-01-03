import { Button } from "react-bootstrap";
import FullPageSpinner from "./FullPageSpinner";
import { useNavigate } from "react-router-dom";

interface HomePageProps {
  loading: boolean;
}

function HomePage({ loading }: HomePageProps) {
  const navigate = useNavigate();

  if (loading) {
    return <FullPageSpinner />;
  }

  return (
    <div className="d-grid gap-2">
      <Button size="lg" onClick={() => navigate(`/add-history`)}>
        Add Expense/Refund
      </Button>
      <Button size="lg" onClick={() => navigate(`/history`)}>
        History
      </Button>
      <Button size="lg" onClick={() => navigate(`/recurring`)}>
        Recurring
      </Button>
    </div>
  );
}

export default HomePage;
