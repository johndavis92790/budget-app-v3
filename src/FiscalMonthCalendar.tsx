import { useState, useMemo } from "react";
import Calendar, { CalendarProps } from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./FiscalCalendar.css"; // You can reuse the same CSS
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { FiscalMonth, History } from "./types";

// For displaying each date cell on the calendar
interface CalendarEvent {
  id: string; // e.g., the key from your object
  start: Date;
  end: Date;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  label: string; // We'll display the .id as the label
  total: number; // Summation of values for that month
}

interface FiscalMonthCalendarProps {
  // The new object you posted: key => { start_date, end_date, ... }
  fiscalMonths: Record<string, FiscalMonth>;

  // The same History array as in your week version
  history: History[];
}

function FiscalMonthCalendar({
  fiscalMonths,
  history,
}: FiscalMonthCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Build an array of "events" representing each fiscal month
  const events = useMemo(() => {
    const today = new Date();

    return Object.entries(fiscalMonths).map(([monthId, monthData]) => {
      // Convert the month’s start/end to Date
      const start = new Date(`${monthData.start_date}T07:00:00Z`);
      const end = new Date(`${monthData.end_date}T07:00:00Z`);

      // Check if this month includes "today"
      const isCurrentMonth = today >= start && today <= end;

      // Filter history items that match this fiscalMonth
      // (since you'll have item.fiscalMonthId === monthId)
      const matchingHistory = history.filter(
        (item) => item.fiscalMonthId === monthId,
      );

      const total = matchingHistory.reduce((sum, item) => {
        if (item.itemType === "history" && item.type === "Recurring Expense") {
          return sum + item.value;
        }
        return sum;
      }, 0);
      if (isCurrentMonth) {
        console.log(matchingHistory);
        console.log(total);
      }
      // Color scheme: green if current month, else grey
      let backgroundColor: string;
      let textColor: string;
      let borderColor: string;

      if (isCurrentMonth) {
        backgroundColor = "rgb(212, 237, 218)";
        textColor = "rgb(85, 110, 91)";
        borderColor = "rgb(135, 160, 141)";
      } else {
        backgroundColor = "rgb(209, 209, 209)";
        textColor = "rgb(82, 82, 82)";
        borderColor = "rgb(132, 132, 132)";
      }

      return {
        id: monthId,
        start,
        end,
        backgroundColor,
        textColor,
        borderColor,
        // We’ll display the monthId as the “label”
        label: "Fiscal",
        total,
      };
    });
  }, [fiscalMonths, history]);

  // Build a map from each date => array of events
  const dateToEventsMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      let current = new Date(event.start);
      let isFirstMiddleDateLogged = false;

      while (current <= event.end) {
        const key = current.toISOString().split("T")[0];
        if (!map[key]) {
          map[key] = [];
        }

        const isMiddleDay = current > event.start && current < event.end;

        // Show the $ total on the first “middle” day
        if (isMiddleDay && !isFirstMiddleDateLogged) {
          map[key].push({
            ...event,
            label: `${event.total.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}`,
          });
          isFirstMiddleDateLogged = true;
        } else {
          map[key].push(event);
        }

        // Move to next day
        current.setDate(current.getDate() + 1);
      }
    });
    return map;
  }, [events]);

  // Handle date selection in the calendar
  const handleDateChange: CalendarProps["onChange"] = (value) => {
    if (Array.isArray(value)) {
      setSelectedDate(value[0] || new Date());
    } else if (value instanceof Date) {
      setSelectedDate(value);
    } else {
      setSelectedDate(new Date());
    }
  };

  // Utility for checking same-day
  function isSameDay(date1: Date, date2: Date) {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  // Decide if a tile is the “start”, “middle”, or “end” of an event
  function getEventRole(event: CalendarEvent, date: Date) {
    if (isSameDay(date, event.start) && isSameDay(date, event.end)) {
      return "single";
    }
    if (isSameDay(date, event.start)) {
      return "start";
    }
    if (isSameDay(date, event.end)) {
      return "end";
    }
    return "middle";
  }

  // Render
  return (
    <div className="my-calendar-container">
      <Calendar
        onChange={handleDateChange}
        value={selectedDate}
        showNeighboringMonth
        next2Label={null}
        prev2Label={null}
        prevLabel={<FaChevronLeft />}
        nextLabel={<FaChevronRight />}
        locale="en-US"
        formatShortWeekday={(locale, date) =>
          date.toLocaleString(locale, { weekday: "short" })
        }
        tileContent={({ date, view }) => {
          if (view !== "month") return null;

          const key = date.toISOString().split("T")[0];
          const dayEvents = dateToEventsMap[key];
          if (!dayEvents) return null;

          return (
            <div className="event-container">
              {dayEvents.map((event) => {
                const role = getEventRole(event, date);
                return (
                  <div
                    key={`${event.id}-${role}`}
                    className={`event-band ${role}`}
                    style={{
                      backgroundColor: event.backgroundColor,
                      color: event.textColor,
                      borderColor: event.borderColor,
                    }}
                  >
                    {(role === "start" ||
                      (role === "middle" && event.label.startsWith("$")) ||
                      event.label.startsWith("-")) && (
                      <span
                        className="event-label"
                        style={{ color: event.textColor }}
                      >
                        {event.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }}
      />
    </div>
  );
}

export default FiscalMonthCalendar;
