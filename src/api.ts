import { History, Recurring } from "./types";
import { API_URL, mmddyyyyToYyyyMmDd } from "./helpers";

/**
 * API service for all CRUD operations
 */
export class ApiService {
  private userEmail: string;

  constructor(userEmail: string) {
    this.userEmail = userEmail;
  }

  /**
   * Fetch all data from the API
   */
  async fetchData() {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const data = await response.json();

    // Process history data
    const processedHistory = data.history.map(
      (hist: History, index: number) => ({
        ...hist,
        value: Math.round(hist.value * 100) / 100,
        rowIndex: index + 2,
        date: mmddyyyyToYyyyMmDd(hist.date),
        hsaAmount: hist.hsaAmount
          ? Math.round(hist.hsaAmount * 100) / 100
          : null,
        hsaDate: hist.hsaDate ? mmddyyyyToYyyyMmDd(hist.hsaDate) : null,
        hsaNotes: hist.hsaNotes || null,
      }),
    );

    // Process recurring data
    const processedRecurring = data.recurring.map(
      (rec: Recurring, index: number) => ({
        ...rec,
        value: Math.round(rec.value * 100) / 100,
        rowIndex: index + 2,
      }),
    );

    return {
      history: processedHistory,
      recurring: processedRecurring,
      categories: data.categories || [],
      tags: data.tags || [],
      weeklyGoal: data.weeklyGoal,
      monthlyGoal: data.monthlyGoal,
      fiscalWeeks: data.fiscalWeeks || {},
      fiscalMonths: data.fiscalMonths || {},
    };
  }

  /**
   * Add a new item (History or Recurring)
   */
  async addItem(newItem: History | Recurring): Promise<boolean> {
    try {
      const itemWithEmail = {
        ...newItem,
        userEmail: this.userEmail,
      };

      console.log("addItem: ", itemWithEmail);
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemWithEmail),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Item added with ID:", result.id);
      return true;
    } catch (error) {
      console.error("Error adding item:", error);
      return false;
    }
  }

  /**
   * Update an existing item (History or Recurring)
   */
  async updateItem(updatedItem: History | Recurring): Promise<void> {
    const itemWithEmail = {
      ...updatedItem,
      userEmail: this.userEmail,
    };

    console.log("updatedItem: ", itemWithEmail);
    const response = await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemWithEmail),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    console.log("Item updated with ID: ", updatedItem.id);
  }

  /**
   * Delete an item (History or Recurring)
   */
  async deleteItem(item: History | Recurring): Promise<void> {
    const itemWithEmail = {
      ...item,
      userEmail: this.userEmail,
    };

    console.log("deleteItem: ", itemWithEmail);
    const response = await fetch(API_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemWithEmail),
    });

    if (!response.ok) {
      throw new Error(`Error deleting item: ${response.statusText}`);
    }

    console.log("Item deleted with ID: ", item.id);
  }

  /**
   * Update weekly goal
   */
  async updateWeeklyGoal(value: number): Promise<void> {
    const response = await fetch(API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        itemType: "weeklyGoal",
        value: value,
        userEmail: this.userEmail,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update weekly goal");
    }
  }

  /**
   * Update monthly goal
   */
  async updateMonthlyGoal(value: number): Promise<void> {
    const response = await fetch(API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        itemType: "monthlyGoal",
        value: value,
        userEmail: this.userEmail,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update monthly goal");
    }
  }

  /**
   * Update both weekly and monthly goals
   */
  async updateGoals(weeklyGoal: number, monthlyGoal: number): Promise<void> {
    await Promise.all([
      this.updateWeeklyGoal(weeklyGoal),
      this.updateMonthlyGoal(monthlyGoal),
    ]);
  }
}
