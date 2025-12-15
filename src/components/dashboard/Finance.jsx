import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';

const Finance = () => {
  const [currency, setCurrency] = useState('USD');
  const [financialData, setFinancialData] = useState({
    semester1: { total: 0, paid: 0, balance: 0, status: 'pending' },
    semester2: { total: 0, paid: 0, balance: 0, status: 'pending' }
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useStudentAuth();

  // Check screen size with debounce
  useEffect(() => {
    let timeoutId;
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 150);
    };
    
    checkMobile();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (user?.email) {
      fetchFinancialData();
    }
  }, [user]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching financial data for user:', user.email);

      // Get student data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, full_name, student_id, academic_year, program, year_of_study, semester')
        .eq('email', user.email)
        .single();

      if (studentError) {
        console.error('Student error:', studentError);
        throw new Error(`Student data error: ${studentError.message}`);
      }

      if (!student) {
        throw new Error('Student not found');
      }

      console.log('Student found:', student.full_name);
      setStudentInfo(student);

      // Fetch financial records for current academic year
      const currentYear = student.academic_year || '2024/2025';
      console.log('Fetching records for academic year:', currentYear);

      const { data: financialRecords, error: financeError } = await supabase
        .from('financial_records')
        .select('*')
        .eq('student_id', student.id)
        .eq('academic_year', currentYear)
        .order('semester', { ascending: true })
        .order('payment_date', { ascending: false });

      if (financeError) {
        console.error('Financial records error:', financeError);
        throw new Error(`Financial records error: ${financeError.message}`);
      }

      console.log('Financial records found:', financialRecords?.length || 0);

      // If no records, set default data
      if (!financialRecords || financialRecords.length === 0) {
        console.log('No financial records found, setting default data');
        setFinancialData({
          semester1: { total: 5000, paid: 0, balance: 5000, status: 'pending' },
          semester2: { total: 5000, paid: 0, balance: 5000, status: 'pending' }
        });
        setPaymentHistory([]);
        setLoading(false);
        return;
      }

      // Calculate totals by semester
      const semesterData = {
        semester1: { total: 0, paid: 0, balance: 0, items: [] },
        semester2: { total: 0, paid: 0, balance: 0, items: [] }
      };

      // Separate semester items and calculate totals
      financialRecords.forEach(record => {
        const recordAmount = parseFloat(record.amount) || 0;
        const recordBalance = parseFloat(record.balance_due) || 0;
        
        const recordData = {
          id: record.id,
          description: record.description,
          feeType: record.fee_type,
          amount: recordAmount,
          status: record.status,
          paymentDate: record.payment_date,
          paymentMethod: record.payment_method,
          receiptNumber: record.receipt_number,
          dueDate: record.due_date,
          balanceDue: recordBalance
        };

        if (record.semester === 1) {
          semesterData.semester1.items.push(recordData);
          semesterData.semester1.total += recordAmount;
          if (record.status === 'paid') {
            semesterData.semester1.paid += recordAmount;
          } else {
            semesterData.semester1.balance += recordBalance || recordAmount;
          }
        } else if (record.semester === 2) {
          semesterData.semester2.items.push(recordData);
          semesterData.semester2.total += recordAmount;
          if (record.status === 'paid') {
            semesterData.semester2.paid += recordAmount;
          } else {
            semesterData.semester2.balance += recordBalance || recordAmount;
          }
        } else {
          // Handle other semesters if needed
          console.log('Record with semester not 1 or 2:', record);
        }
      });

      // Determine status
      const processedData = {
        semester1: {
          ...semesterData.semester1,
          status: semesterData.semester1.balance === 0 ? 'paid' : 
                 semesterData.semester1.paid > 0 ? 'partial' : 'pending',
          items: semesterData.semester1.items
        },
        semester2: {
          ...semesterData.semester2,
          status: semesterData.semester2.balance === 0 ? 'paid' : 
                 semesterData.semester2.paid > 0 ? 'partial' : 'pending',
          items: semesterData.semester2.items
        }
      };

      console.log('Processed financial data:', processedData);
      setFinancialData(processedData);

      // Prepare payment history (only paid records with payment date)
      const history = financialRecords
        .filter(record => record.payment_date && record.status === 'paid')
        .map(record => ({
          id: record.id,
          date: new Date(record.payment_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          description: record.description,
          amount: parseFloat(record.amount) || 0,
          method: record.payment_method || 'Not specified',
          receipt: record.receipt_number || 'N/A',
          status: record.status,
          semester: record.semester
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending

      console.log('Payment history:', history.length, 'records');
      setPaymentHistory(history);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      setError(`Failed to load financial data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    if (currency === 'UGX') {
      return `UGX ${(numAmount * 3750).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
    }
    return `$${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusPercentage = (semesterData) => {
    if (semesterData.total === 0) return 0;
    const percentage = Math.round((semesterData.paid / semesterData.total) * 100);
    return Math.min(100, Math.max(0, percentage));
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'paid': return 'Complete';
      case 'partial': return 'Partial';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'paid': return '#28a745';
      case 'partial': return '#ffc107';
      case 'pending': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const refreshFinancialData = () => {
    fetchFinancialData();
  };

  const makePayment = (semester) => {
    alert(`Payment functionality for Semester ${semester} would be implemented here.\n\nThis would typically redirect to a payment gateway or show payment options.`);
  };

  const viewReceipt = (receiptNumber) => {
    alert(`Receipt #${receiptNumber}\n\nA receipt viewer or PDF download would be implemented here.`);
  };

  // Mobile-friendly payment history card view
  const renderMobilePaymentHistory = () => {
    return (
      <div className="mobile-payment-history"> 
        {paymentHistory.map((payment, index) => (
          <div 
            key={payment.id || index}
            className="mobile-payment-card"
          >
            <div className="mobile-payment-header">
              <div className="mobile-payment-title">
                <h4>{payment.description}</h4>
                <p>{payment.date}</p>
              </div>
              <div className={`mobile-semester-badge sem-${payment.semester}`}>
                Sem {payment.semester}
              </div>
            </div>
            
            <div className="mobile-payment-details">
              <div className="mobile-payment-amount">
                <p>Amount</p>
                <p>{formatCurrency(payment.amount)}</p>
              </div>
              <div className="mobile-payment-method">
                <p>Method</p>
                <p>{payment.method}</p>
              </div>
            </div>
            
            <div className="mobile-payment-footer">
              <button 
                onClick={() => viewReceipt(payment.receipt)}
                className="mobile-receipt-button"
              >
                <i className="fas fa-receipt"></i> Receipt #{payment.receipt}
              </button>
              <div className="mobile-payment-status" style={{ backgroundColor: getStatusColor(payment.status) }}>
                {payment.status.toUpperCase()}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Mobile-friendly fee item card
  const renderMobileFeeItem = (item, semester) => {
    return (
      <div 
        key={item.id}
        className="mobile-fee-item"
        style={{ borderLeftColor: getStatusColor(item.status) }}
      >
        <div className="mobile-fee-header">
          <div className="mobile-fee-title">
            <h4>{item.description}</h4>
            <p>{item.feeType || 'General'} • Due: {item.dueDate || 'N/A'}</p>
          </div>
          <div className="mobile-fee-status" style={{ backgroundColor: getStatusColor(item.status) }}>
            {item.status.toUpperCase()}
          </div>
        </div>
        
        <div className="mobile-fee-amounts">
          <div className="mobile-amount-item">
            <p>Total</p>
            <p>{formatCurrency(item.amount)}</p>
          </div>
          <div className="mobile-amount-item">
            <p>Paid</p>
            <p style={{ color: '#28a745' }}>
              {item.status === 'paid' ? formatCurrency(item.amount) : formatCurrency(0)}
            </p>
          </div>
          <div className="mobile-amount-item">
            <p>Balance</p>
            <p style={{ color: item.status === 'paid' ? '#7f8c8d' : '#e74c3c' }}>
              {item.status === 'paid' ? formatCurrency(0) : formatCurrency(item.balanceDue || item.amount)}
            </p>
          </div>
        </div>
        
        {item.paymentDate && (
          <div className="mobile-payment-date">
            Paid on: {new Date(item.paymentDate).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  };

  // Mobile-friendly semester summary
  const renderMobileSemesterSummary = (semesterData, semesterNumber) => {
    const color = semesterNumber === 1 ? '#3498db' : '#2ecc71';
    
    return (
      <div className="mobile-semester-summary" style={{ borderTopColor: color }}>
        <div className="mobile-semester-header">
          <h3>
            <i className="fas fa-money-bill-wave" style={{ color }}></i>
            Semester {semesterNumber}
          </h3>
          <button 
            onClick={() => makePayment(semesterNumber)}
            className="mobile-pay-button"
          >
            <i className="fas fa-credit-card"></i>
            Pay Now
          </button>
        </div>

        <div className="mobile-semester-totals">
          <div className="mobile-total-item">
            <p>Total</p>
            <p>{formatCurrency(semesterData.total)}</p>
          </div>
          <div className="mobile-total-item">
            <p>Paid</p>
            <p style={{ color: '#28a745' }}>{formatCurrency(semesterData.paid)}</p>
          </div>
          <div className="mobile-total-item">
            <p>Balance</p>
            <p style={{ color: semesterData.balance > 0 ? '#e74c3c' : '#28a745' }}>
              {formatCurrency(semesterData.balance)}
            </p>
          </div>
        </div>

        {/* Progress circle for mobile */}
        <div className="mobile-progress-circle">
          <div className="progress-circle-container">
            <svg width="100" height="100" viewBox="0 0 36 36">
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e9ecef"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={getStatusColor(semesterData.status)}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${getStatusPercentage(semesterData)}, 100`}
              />
            </svg>
            <div className="progress-circle-text">
              <div>{getStatusPercentage(semesterData)}%</div>
              <div style={{ color: getStatusColor(semesterData.status) }}>
                {getStatusText(semesterData.status)}
              </div>
            </div>
          </div>
        </div>

        <div className="mobile-fee-items-section">
          <h4>
            <i className="fas fa-list" style={{ color: '#95a5a6' }}></i>
            Fee Items
          </h4>
          {semesterData.items && semesterData.items.length > 0 ? (
            <div>
              {semesterData.items.map((item, index) => 
                renderMobileFeeItem(item, semesterNumber)
              )}
            </div>
          ) : (
            <div className="mobile-no-items">
              <i className="fas fa-file-invoice"></i>
              <p>No fee items found for this semester</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="finance-container">
        <div className="finance-header">
          <div>
            <h2>
              <i className="fas fa-file-invoice-dollar" style={{ color: '#28a745' }}></i>
              Financial Statements
            </h2>
            <div>Loading financial data...</div>
          </div>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="finance-container">
        <div className="finance-header">
          <div>
            <h2>
              <i className="fas fa-file-invoice-dollar" style={{ color: '#28a745' }}></i>
              Financial Statements
            </h2>
            <div>Error</div>
          </div>
        </div>
        <div className="error-container">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button 
            onClick={refreshFinancialData}
            className="retry-button"
          >
            <i className="fas fa-sync-alt"></i>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="finance-container">
      {/* Header */}
      <div className="finance-header">
        <div>
          <h2>
            <i className="fas fa-file-invoice-dollar" style={{ color: '#28a745' }}></i>
            Financial Statements
          </h2>
          <div className="student-info">
            <span>Academic Year: {studentInfo?.academic_year || '2024/2025'}</span>
            <span>•</span>
            <span>Student ID: {studentInfo?.student_id || 'N/A'}</span>
          </div>
        </div>
        <div className="header-actions">
          <button 
            onClick={refreshFinancialData}
            className="refresh-button"
          >
            <i className="fas fa-sync-alt"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Currency Selector */}
      <div className="currency-selector">
        <label>
          <i className="fas fa-money-bill-wave" style={{ color: '#28a745' }}></i>
          Display Currency:
        </label>
        <select 
          value={currency} 
          onChange={(e) => setCurrency(e.target.value)}
          className="currency-dropdown"
        >
          <option value="USD">USD ($) - US Dollar</option>
          <option value="UGX">UGX (Shs) - Ugandan Shilling</option>
        </select>
        <div className="exchange-rate">
          Exchange Rate: 1 USD ≈ 3,750 UGX
        </div>
      </div>

      {/* Semester 1 - Mobile or Desktop View */}
      {isMobile ? (
        renderMobileSemesterSummary(financialData.semester1, 1)
      ) : (
        <div className="semester-container">
          <div className="semester-header">
            <h3>
              <i className="fas fa-money-bill-wave" style={{ color: '#007bff' }}></i>
              Semester 1 Fees - Academic Year {studentInfo?.academic_year || '2024/2025'}
            </h3>
            <button 
              onClick={() => makePayment(1)}
              className="pay-button"
            >
              <i className="fas fa-credit-card"></i>
              Make Payment
            </button>
          </div>

          <div className="table-responsive">
            <table className="semester-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Total Amount</th>
                  <th>Paid Amount</th>
                  <th>Balance Due</th>
                  <th>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {financialData.semester1.items && financialData.semester1.items.map((item, index) => (
                  <tr key={item.id || index} className={item.status === 'paid' ? 'paid-row' : ''}>
                    <td>
                      <div className="fee-description">{item.description}</div>
                      <div className="fee-meta">
                        Fee Type: {item.feeType || 'General'} | Due: {item.dueDate || 'N/A'}
                      </div>
                    </td>
                    <td className="fee-amount">{formatCurrency(item.amount)}</td>
                    <td>
                      <div className={item.status === 'paid' ? 'paid-amount' : 'unpaid-amount'}>
                        {item.status === 'paid' ? formatCurrency(item.amount) : formatCurrency(0)}
                      </div>
                      {item.paymentDate && (
                        <div className="payment-date">
                          Paid on: {new Date(item.paymentDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className={item.status === 'paid' ? 'no-balance' : 'has-balance'}>
                        {item.status === 'paid' ? formatCurrency(0) : formatCurrency(item.balanceDue || item.amount)}
                      </div>
                    </td>
                    <td>
                      <div 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(item.status) }}
                      >
                        {item.status.toUpperCase()}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {/* Summary Row */}
                <tr className="summary-row">
                  <td>
                    <div className="semester-total">
                      <i className="fas fa-calculator" style={{ color: '#007bff' }}></i>
                      <span>SEMESTER 1 TOTAL</span>
                    </div>
                  </td>
                  <td className="total-amount">{formatCurrency(financialData.semester1.total)}</td>
                  <td className="total-paid">{formatCurrency(financialData.semester1.paid)}</td>
                  <td className="total-balance" style={{ color: financialData.semester1.balance > 0 ? '#dc3545' : '#28a745' }}>
                    {formatCurrency(financialData.semester1.balance)}
                  </td>
                  <td>
                    <div className="semester-progress">
                      <svg width="80" height="80" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e9ecef"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke={getStatusColor(financialData.semester1.status)}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${getStatusPercentage(financialData.semester1)}, 100`}
                        />
                      </svg>
                      <div className="progress-text">
                        <div>{getStatusPercentage(financialData.semester1)}%</div>
                        <div style={{ color: getStatusColor(financialData.semester1.status) }}>
                          {getStatusText(financialData.semester1.status)}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Semester 2 - Mobile or Desktop View */}
      {isMobile ? (
        renderMobileSemesterSummary(financialData.semester2, 2)
      ) : (
        <div className="semester-container">
          <div className="semester-header">
            <h3>
              <i className="fas fa-money-bill-wave" style={{ color: '#28a745' }}></i>
              Semester 2 Fees - Academic Year {studentInfo?.academic_year || '2024/2025'}
            </h3>
            <button 
              onClick={() => makePayment(2)}
              className="pay-button"
            >
              <i className="fas fa-credit-card"></i>
              Make Payment
            </button>
          </div>

          <div className="table-responsive">
            <table className="semester-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Total Amount</th>
                  <th>Paid Amount</th>
                  <th>Balance Due</th>
                  <th>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {financialData.semester2.items && financialData.semester2.items.map((item, index) => (
                  <tr key={item.id || index} className={item.status === 'paid' ? 'paid-row' : ''}>
                    <td>
                      <div className="fee-description">{item.description}</div>
                      <div className="fee-meta">
                        Fee Type: {item.feeType || 'General'} | Due: {item.dueDate || 'N/A'}
                      </div>
                    </td>
                    <td className="fee-amount">{formatCurrency(item.amount)}</td>
                    <td>
                      <div className={item.status === 'paid' ? 'paid-amount' : 'unpaid-amount'}>
                        {item.status === 'paid' ? formatCurrency(item.amount) : formatCurrency(0)}
                      </div>
                      {item.paymentDate && (
                        <div className="payment-date">
                          Paid on: {new Date(item.paymentDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className={item.status === 'paid' ? 'no-balance' : 'has-balance'}>
                        {item.status === 'paid' ? formatCurrency(0) : formatCurrency(item.balanceDue || item.amount)}
                      </div>
                    </td>
                    <td>
                      <div 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(item.status) }}
                      >
                        {item.status.toUpperCase()}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {/* Summary Row */}
                <tr className="summary-row">
                  <td>
                    <div className="semester-total">
                      <i className="fas fa-calculator" style={{ color: '#28a745' }}></i>
                      <span>SEMESTER 2 TOTAL</span>
                    </div>
                  </td>
                  <td className="total-amount">{formatCurrency(financialData.semester2.total)}</td>
                  <td className="total-paid">{formatCurrency(financialData.semester2.paid)}</td>
                  <td className="total-balance" style={{ color: financialData.semester2.balance > 0 ? '#dc3545' : '#28a745' }}>
                    {formatCurrency(financialData.semester2.balance)}
                  </td>
                  <td>
                    <div className="semester-progress">
                      <svg width="80" height="80" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e9ecef"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke={getStatusColor(financialData.semester2.status)}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${getStatusPercentage(financialData.semester2)}, 100`}
                        />
                      </svg>
                      <div className="progress-text">
                        <div>{getStatusPercentage(financialData.semester2)}%</div>
                        <div style={{ color: getStatusColor(financialData.semester2.status) }}>
                          {getStatusText(financialData.semester2.status)}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="payment-history-container">
        <div className="payment-history-header">
          <h3>
            <i className="fas fa-history" style={{ color: '#6c757d' }}></i>
            Payment History
          </h3>
          {paymentHistory.length > 0 && (
            <div className="payment-count">
              {paymentHistory.length} payment{paymentHistory.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        
        {paymentHistory.length === 0 ? (
          <div className="empty-history">
            <i className="fas fa-receipt"></i>
            <p>No payment history found</p>
            <p>Your payment history will appear here once you make payments</p>
          </div>
        ) : isMobile ? (
          // Mobile view: Cards
          renderMobilePaymentHistory()
        ) : (
          // Desktop view: Table
          <div className="table-responsive">
            <table className="payment-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Receipt</th>
                  <th>Semester</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment, index) => (
                  <tr key={payment.id || index}>
                    <td>{payment.date}</td>
                    <td>{payment.description}</td>
                    <td className="payment-amount">{formatCurrency(payment.amount)}</td>
                    <td>
                      <div className="payment-method">
                        <i className="fas fa-credit-card"></i>
                        {payment.method}
                      </div>
                    </td>
                    <td>
                      <button 
                        onClick={() => viewReceipt(payment.receipt)}
                        className="receipt-link"
                      >
                        #{payment.receipt}
                        <i className="fas fa-external-link-alt"></i>
                      </button>
                    </td>
                    <td>
                      <div className={`semester-badge sem-${payment.semester}`}>
                        Semester {payment.semester}
                      </div>
                    </td>
                    <td>
                      <div 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(payment.status) }}
                      >
                        {payment.status.toUpperCase()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add this CSS */}
      <style jsx>{`
        /* Base container */
        .finance-container {
          padding: 1rem;
          max-width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
        }
        
        /* Header */
        .finance-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .finance-header h2 {
          margin: 0 0 5px 0;
          font-size: clamp(1.5rem, 4vw, 1.8rem);
          font-weight: 600;
          color: #2c3e50;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .student-info {
          color: #7f8c8d;
          font-size: clamp(0.85rem, 2.5vw, 0.95rem);
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        
        .header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .refresh-button, .pay-button {
          padding: 10px 16px;
          background-color: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        
        /* Currency Selector */
        .currency-selector {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 25px;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #dee2e6;
          flex-wrap: wrap;
        }
        
        .currency-selector label {
          font-weight: 500;
          color: #495057;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .currency-dropdown {
          padding: 8px 15px;
          border: 2px solid #dee2e6;
          border-radius: 6px;
          background-color: white;
          font-size: 14px;
          cursor: pointer;
          min-width: 120px;
          max-width: 100%;
        }
        
        .exchange-rate {
          font-size: 12px;
          color: #6c757d;
          margin-left: auto;
        }
        
        /* Loading Spinner */
        .loading-spinner {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 300px;
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid #f3f3f3;
          border-top: 5px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        /* Error Container */
        .error-container {
          padding: 30px;
          background-color: #fee;
          border: 1px solid #f99;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
        }
        
        .error-container i {
          font-size: 48px;
          color: #dc3545;
          margin-bottom: 20px;
        }
        
        .error-container p {
          color: #d33;
          margin-bottom: 20px;
          font-size: 16px;
          line-height: 1.5;
        }
        
        .retry-button {
          padding: 12px 24px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }
        
        /* Semester Containers */
        .semester-container {
          background-color: white;
          border-radius: 12px;
          padding: clamp(15px, 3vw, 25px);
          margin-bottom: 30px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .semester-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .semester-header h3 {
          margin: 0;
          font-size: clamp(1.1rem, 2.5vw, 1.3rem);
          color: #2c3e50;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        /* Responsive Tables */
        .table-responsive {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 0 -16px;
          padding: 0 16px;
          width: calc(100% + 32px);
        }
        
        .semester-table, .payment-history-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
        }
        
        .semester-table th, .payment-history-table th {
          padding: 12px 15px;
          text-align: left;
          font-weight: 600;
          color: #495057;
          font-size: 0.95rem;
          background-color: #f8f9fa;
          border-bottom: 2px solid #dee2e6;
        }
        
        .semester-table td, .payment-history-table td {
          padding: 12px 15px;
          font-size: 0.95rem;
          border-bottom: 1px solid #dee2e6;
        }
        
        .paid-row {
          background-color: #f8fff9;
        }
        
        .fee-description {
          font-weight: 500;
        }
        
        .fee-meta {
          font-size: 0.85rem;
          color: #6c757d;
          margin-top: 4px;
        }
        
        .fee-amount {
          text-align: right;
          font-weight: 500;
          color: #333;
        }
        
        .paid-amount {
          color: #28a745;
          font-weight: bold;
          text-align: right;
        }
        
        .unpaid-amount {
          color: #6c757d;
          text-align: right;
        }
        
        .payment-date {
          font-size: 0.8rem;
          color: #6c757d;
          margin-top: 4px;
        }
        
        .has-balance {
          color: #dc3545;
          font-weight: bold;
          text-align: right;
        }
        
        .no-balance {
          color: #6c757d;
          text-align: right;
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          color: white;
          font-weight: bold;
          font-size: 0.85rem;
          min-width: 70px;
          text-align: center;
        }
        
        .summary-row {
          background-color: #e8f4fc;
          font-weight: bold;
          border-top: 2px solid #007bff;
        }
        
        .semester-total {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1rem;
        }
        
        .total-amount, .total-paid, .total-balance {
          text-align: right;
          font-size: 1rem;
        }
        
        .semester-progress {
          position: relative;
          display: inline-block;
        }
        
        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
        
        /* Payment History */
        .payment-history-container {
          background-color: white;
          border-radius: 12px;
          padding: clamp(15px, 3vw, 25px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .payment-history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .payment-history-header h3 {
          margin: 0;
          font-size: clamp(1.1rem, 2.5vw, 1.3rem);
          color: #2c3e50;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .payment-count {
          font-size: 0.95rem;
          color: #6c757d;
          white-space: nowrap;
        }
        
        .payment-amount {
          text-align: right;
          font-weight: 500;
        }
        
        .payment-method {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .receipt-link {
          background: none;
          border: none;
          color: #007bff;
          cursor: pointer;
          text-decoration: underline;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.95rem;
          padding: 0;
        }
        
        .semester-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 500;
        }
        
        .sem-1 {
          background-color: #cfe2ff;
          color: #084298;
        }
        
        .sem-2 {
          background-color: #d1e7dd;
          color: #0f5132;
        }
        
        .empty-history {
          padding: 40px 20px;
          text-align: center;
          background-color: #f8f9fa;
          border-radius: 8px;
          border: 2px dashed #dee2e6;
        }
        
        .empty-history i {
          font-size: 3rem;
          color: #bdc3c7;
          margin-bottom: 20px;
        }
        
        .empty-history p {
          color: #7f8c8d;
          margin: 0 0 10px 0;
          font-size: 1rem;
        }
        
        .empty-history p:last-child {
          color: #95a5a6;
          font-size: 0.9rem;
        }
        
        /* Mobile Styles */
        .mobile-semester-summary {
          background-color: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-top: 4px solid;
        }
        
        .mobile-semester-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .mobile-semester-header h3 {
          margin: 0;
          font-size: 18px;
          color: #2c3e50;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .mobile-pay-button {
          padding: 10px 16px;
          background-color: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
        }
        
        .mobile-semester-totals {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .mobile-total-item {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        
        .mobile-total-item p:first-child {
          margin: 0 0 6px 0;
          font-size: 12px;
          color: #7f8c8d;
          text-transform: uppercase;
        }
        
        .mobile-total-item p:last-child {
          margin: 0;
          font-size: 18px;
          font-weight: bold;
        }
        
        .mobile-progress-circle {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 20px 0;
        }
        
        .progress-circle-container {
          position: relative;
          width: 100px;
          height: 100px;
        }
        
        .progress-circle-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
        
        .mobile-fee-items-section {
          margin-top: 20px;
        }
        
        .mobile-fee-items-section h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #2c3e50;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .mobile-fee-item {
          background-color: white;
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
          border-left: 4px solid;
        }
        
        .mobile-fee-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        
        .mobile-fee-title h4 {
          margin: 0 0 6px 0;
          font-size: 15px;
          color: #2c3e50;
          line-height: 1.3;
        }
        
        .mobile-fee-title p {
          margin: 0;
          font-size: 12px;
          color: #7f8c8d;
        }
        
        .mobile-fee-status {
          padding: 4px 10px;
          color: white;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }
        
        .mobile-fee-amounts {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 12px;
        }
        
        .mobile-amount-item p:first-child {
          margin: 0 0 4px 0;
          font-size: 11px;
          color: #95a5a6;
          text-transform: uppercase;
        }
        
        .mobile-amount-item p:last-child {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .mobile-payment-date {
          font-size: 11px;
          color: #95a5a6;
          padding-top: 8px;
          border-top: 1px solid #eee;
        }
        
        .mobile-no-items {
          padding: 20px;
          text-align: center;
          background-color: #f8f9fa;
          border-radius: 8px;
          border: 2px dashed #dee2e6;
        }
        
        .mobile-no-items i {
          font-size: 32px;
          color: #bdc3c7;
          margin-bottom: 10px;
        }
        
        .mobile-no-items p {
          margin: 0;
          color: #95a5a6;
          font-size: 14px;
        }
        
        .mobile-payment-history {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .mobile-payment-card {
          background-color: white;
          border-radius: 10px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border-left: 4px solid;
        }
        
        .mobile-payment-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        
        .mobile-payment-title h4 {
          margin: 0 0 6px 0;
          font-size: 15px;
          color: #2c3e50;
          line-height: 1.3;
        }
        
        .mobile-payment-title p {
          margin: 0;
          font-size: 13px;
          color: #7f8c8d;
        }
        
        .mobile-semester-badge {
          background-color: #e8f4fd;
          color: #3498db;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }
        
        .sem-2 {
          background-color: #e8f6ef;
          color: #27ae60;
        }
        
        .mobile-payment-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 12px;
        }
        
        .mobile-payment-details p:first-child {
          margin: 0 0 4px 0;
          font-size: 12px;
          color: #95a5a6;
          text-transform: uppercase;
        }
        
        .mobile-payment-details p:last-child {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .mobile-payment-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #eee;
        }
        
        .mobile-receipt-button {
          background-color: #f4f4f4;
          color: #333;
          border: 1px solid #ddd;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        
        .mobile-payment-status {
          padding: 4px 10px;
          color: white;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        
        /* Animations */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .finance-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .header-actions {
            width: 100%;
            justify-content: flex-start;
          }
          
          .currency-selector {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .exchange-rate {
            margin-left: 0;
            width: 100%;
          }
          
          .table-responsive {
            margin: 0 -16px;
            padding: 0 16px;
          }
          
          .semester-header, .payment-history-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .semester-header h3, .payment-history-header h3 {
            font-size: 1.2rem;
          }
        }
        
        @media (max-width: 480px) {
          .finance-container {
            padding: 0.75rem;
          }
          
          .finance-header h2 {
            font-size: 1.3rem;
          }
          
          .semester-container, .payment-history-container, .mobile-semester-summary {
            padding: 16px;
            margin-bottom: 16px;
          }
          
          .mobile-semester-totals {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          
          .mobile-fee-amounts, .mobile-payment-details {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          
          .mobile-pay-button, .refresh-button, .retry-button {
            width: 100%;
            justify-content: center;
          }
          
          button, select, .mobile-receipt-button {
            min-height: 44px;
          }
        }
        
        /* Print styles */
        @media print {
          button {
            display: none !important;
          }
          
          .semester-container, .payment-history-container, .mobile-semester-summary {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }
          
          .finance-container {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Finance;