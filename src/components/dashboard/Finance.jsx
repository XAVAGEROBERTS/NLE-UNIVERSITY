import React, { useState } from 'react';

const Finance = () => {
  const [currency, setCurrency] = useState('USD');

  const feeData = {
    semester1: {
      description: "Tuition Fee",
      total: 5000,
      paid: 5000,
      status: "paid"
    },
    semester2: {
      description: "Tuition Fee",
      total: 5000,
      paid: 2500,
      status: "partial"
    }
  };

  const paymentHistory = [
    {
      date: "2024-09-15",
      description: "Tuition Fee - Semester 1",
      amount: 2500,
      method: "Credit Card",
      receipt: "#345678"
    },
    {
      date: "2025-01-20",
      description: "Tuition Fee - Semester 2 (Partial)",
      amount: 1250,
      method: "Bank Transfer",
      receipt: "#456789"
    }
  ];

  const formatCurrency = (amount) => {
    if (currency === 'UGX') {
      return `UGX ${(amount * 3750).toLocaleString()}`;
    }
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="content">
      <div className="dashboard-header">
        <h2><i className="fas fa-file-invoice-dollar"></i> Financial Statements</h2>
        <div className="date-display">Academic Year: 2024-2025</div>
      </div>

      <div className="currency-selector">
        <label>Currency: </label>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="USD">USD ($)</option>
          <option value="UGX">UGX (Shs)</option>
        </select>
      </div>

      <div className="fee-table-container">
        <h3><i className="fas fa-money-bill-wave"></i> Semester 1 Fees</h3>
        <table className="fee-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Total Fees Payable</th>
              <th>Paid So Far</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{feeData.semester1.description}</td>
              <td>{formatCurrency(feeData.semester1.total)}</td>
              <td className="paid-amount">{formatCurrency(feeData.semester1.paid)}</td>
              <td className="balance">{formatCurrency(feeData.semester1.total - feeData.semester1.paid)}</td>
              <td>
                <div className="payment-tracker" data-percent="100">
                  <svg className="progress-circle" viewBox="0 0 36 36">
                    <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                    <path className="circle-fill" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  </svg>
                  <div className="tracker-percent">100%</div>
                  <div className="tracker-text">Complete</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="fee-table-container" style={{ marginTop: '2rem' }}>
        <h3><i className="fas fa-money-bill-wave"></i> Semester 2 Fees</h3>
        <table className="fee-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Total Fees Payable</th>
              <th>Paid So Far</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{feeData.semester2.description}</td>
              <td>{formatCurrency(feeData.semester2.total)}</td>
              <td className="paid-amount">{formatCurrency(feeData.semester2.paid)}</td>
              <td className="balance">{formatCurrency(feeData.semester2.total - feeData.semester2.paid)}</td>
              <td>
                <div className="payment-tracker" data-percent="50">
                  <svg className="progress-circle" viewBox="0 0 36 36">
                    <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                    <path className="circle-fill" strokeDasharray="50, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  </svg>
                  <div className="tracker-percent">50%</div>
                  <div className="tracker-text">In Progress</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="fee-table-container" style={{ marginTop: '2rem' }}>
        <h3><i className="fas fa-history"></i> Payment History</h3>
        <table className="fee-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {paymentHistory.map((payment, index) => (
              <tr key={index}>
                <td>{payment.date}</td>
                <td>{payment.description}</td>
                <td>{formatCurrency(payment.amount)}</td>
                <td>{payment.method}</td>
                <td>
                  <a href="#" className="receipt-link">
                    #{payment.receipt} <i className="fas fa-receipt"></i>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Finance;