import {
  FaChild,
  FaTshirt,
  FaStore,
  FaUtensils,
  FaSmile,
  FaGasPump,
  FaGift,
  FaShoppingCart,
  FaHeartbeat,
  FaHome,
  FaBriefcase,
  FaQuestionCircle,
  FaMobileAlt,
  FaPiggyBank,
  FaPray,
  FaPlane,
  FaCar,
} from "react-icons/fa";

export const API_URL = process.env.REACT_APP_API_URL!;

export function getDaySuffix(day: number) {
  if (day >= 11 && day <= 13) {
    return "th";
  }
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/** Convert MM/DD/YYYY -> YYYY-MM-DD */
export function mmddyyyyToYyyyMmDd(dateStr: string): string {
  // dateStr is "MM/DD/YYYY"
  const [m, d, y] = dateStr.split("/");
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`; // returns "YYYY-MM-DD"
}

/** Convert YYYY-MM-DD -> MM/DD/YYYY */
export function yyyymmddToMmddyyyy(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
}

/**
 * Convert YYYY-MM-DD to a nice readable format like "Fri, Dec 13th '24"
 */
export function formatDateFromYYYYMMDD(isoDateStr: string) {
  // isoDateStr is "YYYY-MM-DD"
  const [y, m, d] = isoDateStr.split("-");
  const year = y.slice(2);
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);

  const date = new Date(parseInt(y, 10), month - 1, day);
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const monthName = date.toLocaleDateString(undefined, { month: "short" });
  const daySuffix = getDaySuffix(day);

  return `${weekday}, ${monthName} ${day}${daySuffix} '${year}`;
}

export function generateRandom10DigitNumber() {
  const random10DigitNumber = Math.floor(
    1000000000 + Math.random() * 9000000000,
  );
  return random10DigitNumber;
}

export const getFormattedTodaysDate = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export function getCategoryIcon(category: string) {
  const icons: { [key: string]: JSX.Element } = {
    Children: <FaChild />,
    Clothes: <FaTshirt />,
    Costco: <FaStore />,
    Dining: <FaUtensils />,
    Fun: <FaSmile />,
    Gas: <FaGasPump />,
    Gifts: <FaGift />,
    Groceries: <FaShoppingCart />,
    Health: <FaHeartbeat />,
    House: <FaHome />,
    Job: <FaBriefcase />,
    Other: <FaQuestionCircle />,
    Phones: <FaMobileAlt />,
    Savings: <FaPiggyBank />,
    Tithing: <FaPray />,
    Travel: <FaPlane />,
    Vehicles: <FaCar />,
  };

  return icons[category] || <FaQuestionCircle />; // Fallback icon for unknown categories
}
