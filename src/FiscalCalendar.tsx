import { useState, useMemo } from "react";
import Calendar, { CalendarProps } from "react-calendar";
import "react-calendar/dist/Calendar.css"; // Default styles
import "./FiscalCalendar.css"; // Custom styles
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

  // Transform fiscalWeeks into events
  const events = useMemo(() => {
    return Object.entries(fiscalWeeks).map(([key, weekData]) => {
      const matchingHistory = history.filter(
        (item) => item.fiscalWeekId === key,
      );

      const total = matchingHistory.reduce((sum, item) => sum + item.value, 0);

      let backgroundColor = "rgb(209, 209, 209)";
      let textColor = "rgb(82, 82, 82)";
      let borderColor = "rgb(132, 132, 132)";

      switch (weekData.number) {
        case "1":
          backgroundColor = "rgb(212, 237, 218)";
          textColor = "rgb(85, 110, 91)";
          borderColor = "rgb(135, 160, 141)";
          break;
        case "2":
          backgroundColor = "rgb(236, 237, 212)";
          textColor = "rgb(109, 110, 85)";
          borderColor = "rgb(159, 160, 135)";
          break;
        case "3":
          backgroundColor = "rgb(212, 222, 237)";
          textColor = "rgb(85, 95, 110)";
          borderColor = "rgb(135, 145, 160)";
          break;
        case "4":
          backgroundColor = "rgb(228, 191, 191)";
          textColor = "rgb(112, 72, 72)";
          borderColor = "rgb(168, 111, 111)";
          break;
      }

      return {
        id: key,
        start: new Date(`${weekData.start_date}T07:00:00Z`), // Use UTC explicitly
        end: new Date(`${weekData.end_date}T07:00:00Z`), // Ensure end date includes the whole day
        backgroundColor,
        textColor,
        borderColor,
        label: `Week ${weekData.number}`,
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

        if (isMiddleDay && !isFirstMiddleDateLogged) {
          map[key].push({
            ...event,
            label: `${event.total.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}`, // Display total on the first middle date
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

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const getEventRole = (event: CalendarEvent, date: Date) => {
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
  };

  return (
    <div className="my-calendar-container">
      <Calendar
        onChange={handleDateChange}
        value={selectedDate}
        showNeighboringMonth={true}
        next2Label={null}
        prev2Label={null}
        prevLabel={<FaChevronLeft />}
        nextLabel={<FaChevronRight />}
        formatShortWeekday={(locale, date) =>
          date.toLocaleString(locale, { weekday: "short" })
        }
        locale="en-US" // Set locale to start week on Sunday
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
                    key={`${event.id}-${role}`} // Ensure unique key
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
