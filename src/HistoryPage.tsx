import React from "react";
import { Expense } from "./types";
import { Table, Spinner } from "react-bootstrap";

interface HistoryPageProps {
  expenses: Expense[];
  loading: boolean;
}

function HistoryPage({ expenses, loading }: HistoryPageProps) {
  if (loading) {
    return (
      <div className="text-center">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <>
      <h2 className="mb-4">Expense/Refund History</h2>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Categories</th>
            <th>Tags</th>
            <th>Value</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp, index) => (
            <tr key={index}>
              <td>{exp.date}</td>
              <td>{exp.type}</td>
              <td>{exp.categories.join(", ")}</td>
              <td>{exp.tags.join(", ")}</td>
              <td>{exp.value}</td>
              <td>{exp.notes}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

export default HistoryPage;
