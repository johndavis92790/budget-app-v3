import FullPageSpinner from "./FullPageSpinner";
import AddHistoryPage from "./AddHistoryPage";
import {
  FiscalWeek,
  History,
} from "./types";

interface HomePageProps {
  categories: string[];
  existingTags: string[];
  addItem: (history: History) => Promise<boolean>;
  loading: boolean;
  fiscalWeeks: Record<string, FiscalWeek>;
  history: History[];
}

function HomePage({
  categories,
  existingTags,
  addItem,
  loading,
  fiscalWeeks,
  history,
}: HomePageProps) {

  if (loading) {
    return <FullPageSpinner />;
  }

  return (
    <AddHistoryPage
      categories={categories}
      existingTags={existingTags}
      addItem={addItem}
      loading={loading}
      fiscalWeeks={fiscalWeeks}
      history={history}
    />
  );
}

export default HomePage;
