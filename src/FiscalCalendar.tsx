import { useState, useMemo } from "react";
import Calendar, { CalendarProps } from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./FiscalCalendar.css";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { FiscalWeek, History } from "./types";

interface CalendarEvent {
  id: string;
  start: Date;
  end: Date;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  label: string;
  total: number;
}

interface FiscalCalendarProps {
  fiscalWeeks: Record<string, FiscalWeek>;
  history: History[];
}

function FiscalCalendar({ fiscalWeeks, history }: FiscalCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const events = useMemo(() => {
    const today = new Date();

    return Object.entries(fiscalWeeks).map(([key, weekData]) => {
      // Convert the week's start/end to Date
      const start = new Date(`${weekData.start_date}T07:00:00Z`);
      const end = new Date(`${weekData.end_date}T07:00:00Z`);

      // Check if this week includes today
      const isCurrentWeek = today >= start && today <= end;
      const matchingHistory = history.filter(
        (item) => item.fiscalWeekId === key,
      );
      if (isCurrentWeek) {
        console.log(matchingHistory);
      }
      const total = matchingHistory.reduce((sum, item) => {
        if (item.itemType === "history") {
          return item.type === "Expense"
            ? sum + item.value
            : item.type === "Refund"
              ? sum - item.value
              : sum;
        }
        return sum;
      }, 0);

      let backgroundColor;
      let textColor;
      let borderColor;

      if (isCurrentWeek) {
        // Colors for the current week
        backgroundColor = "rgb(212, 237, 218)";
        textColor = "rgb(85, 110, 91)";
        borderColor = "rgb(135, 160, 141)";
      } else {
        // Grey for all other weeks
        backgroundColor = "rgb(209, 209, 209)";
        textColor = "rgb(82, 82, 82)";
        borderColor = "rgb(132, 132, 132)";
      }

      return {
        id: key,
        start,
        end,
        backgroundColor,
        textColor,
        borderColor,
        label: `Week ${weekData.number}`, // Still label as “Week X”
        total,
      };
    });
  }, [fiscalWeeks, history]);

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

        // On the first "middle" day, show the currency label
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

        current.setDate(current.getDate() + 1);
      }
    });
    return map;
  }, [events]);

  const handleDateChange: CalendarProps["onChange"] = (value) => {
    if (Array.isArray(value)) {
      setSelectedDate(value[0] || new Date());
    } else if (value instanceof Date) {
      setSelectedDate(value);
    } else {
      setSelectedDate(new Date());
    }
  };

  function isSameDay(date1: Date, date2: Date) {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

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
                      (role === "middle" && event.label.startsWith("$"))) && (
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

export default FiscalCalendar;
