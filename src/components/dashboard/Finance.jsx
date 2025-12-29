import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import './Finance.css';

const Finance = () => {
  const [currency, setCurrency] = useState('USD');
  const [financialData, setFinancialData] = useState({
    semester1: { 
      total: 0, 
      paid: 0, 
      balance: 0, 
      status: 'pending',
      items: [],
      tuition: 0,
      functional: 0,
      guild: 0,
      nche: 0
    },
    semester2: { 
      total: 0, 
      paid: 0, 
      balance: 0, 
      status: 'pending',
      items: [],
      tuition: 0,
      functional: 0,
      guild: 0,
      nche: 0
    }
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [feeSummary, setFeeSummary] = useState({
    tuition: 0,
    functional: 0,
    guild: 0,
    nche: 0,
    total: 0
  });
  const { user } = useStudentAuth();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

      // First, get student information
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id, 
          full_name, 
          student_id, 
          academic_year, 
          program,
          program_code,
          year_of_study, 
          semester,
          intake
        `)
        .eq('email', user.email)
        .single();

      if (studentError) throw new Error(`Student data error: ${studentError.message}`);
      if (!student) throw new Error('Student not found');

      setStudentInfo(student);
      const currentYear = student.academic_year || '2024/2025';

      // Initialize data structures
      const semesterData = {
        semester1: { 
          total: 0, 
          paid: 0, 
          balance: 0, 
          status: 'pending',
          items: [],
          tuition: 0,
          functional: 0,
          guild: 0,
          nche: 0
        },
        semester2: { 
          total: 0, 
          paid: 0, 
          balance: 0, 
          status: 'pending',
          items: [],
          tuition: 0,
          functional: 0,
          guild: 0,
          nche: 0
        }
      };

      const feeSummaryInit = {
        tuition: 0,
        functional: 0,
        guild: 0,
        nche: 0,
        total: 0
      };

      // Fetch ALL financial records for this student in the current academic year
      const { data: financialRecords, error: financeError } = await supabase
        .from('financial_records')
        .select('*')
        .eq('student_id', student.id)
        .eq('academic_year', currentYear)
        .order('semester', { ascending: true });

      if (financeError) {
        console.error('Error fetching financial records:', financeError);
      }

      if (financialRecords && financialRecords.length > 0) {
        // Process each financial record
        financialRecords.forEach(record => {
          const semester = record.semester || 1;
          const semesterKey = `semester${semester}`;
          const amount = parseFloat(record.amount) || 0;
          const feeType = record.fee_type || 'tuition';
          const description = record.description || `${feeType.toUpperCase()} Fee`;
          
          // Create fee item
          const feeItem = {
            id: record.id,
            description: description,
            feeType: feeType,
            categoryCode: feeType,
            amount: amount,
            status: record.status || 'pending',
            balanceDue: parseFloat(record.balance_due) || amount,
            semester: semester,
            academicYear: currentYear,
            paymentDate: record.payment_date,
            paymentMethod: record.payment_method,
            receiptNumber: record.receipt_number,
            dueDate: record.due_date
          };

          // Add to semester items
          semesterData[semesterKey].items.push(feeItem);
          
          // Update semester totals
          if (record.status === 'paid') {
            semesterData[semesterKey].paid += amount;
          } else {
            semesterData[semesterKey].balance += feeItem.balanceDue;
          }
          
          semesterData[semesterKey].total += amount;
          
          // Update fee type summaries
          if (feeType === 'tuition') {
            semesterData[semesterKey].tuition += amount;
            feeSummaryInit.tuition += amount;
          } else if (feeType === 'functional') {
            semesterData[semesterKey].functional += amount;
            feeSummaryInit.functional += amount;
          } else if (feeType === 'guild') {
            semesterData[semesterKey].guild += amount;
            feeSummaryInit.guild += amount;
          } else if (feeType === 'nche') {
            semesterData[semesterKey].nche += amount;
            feeSummaryInit.nche += amount;
          }
          
          feeSummaryInit.total += amount;
        });
      } else {
        // If no financial records exist, check if we should generate them
        console.log('No financial records found for student. Fees may not be assigned yet.');
        
        // Show message to user
        setError('No fees have been assigned to your account yet. Please contact the finance department.');
      }

      // Calculate status for each semester
      Object.keys(semesterData).forEach(key => {
        const semData = semesterData[key];
        semData.status = 
          semData.balance === 0 && semData.total > 0 ? 'paid' :
          semData.paid > 0 && semData.balance > 0 ? 'partial' :
          semData.total > 0 ? 'pending' : 'no_fees';
      });

      setFinancialData(semesterData);
      setFeeSummary(feeSummaryInit);
      
      // Fetch payment history
      await fetchPaymentHistory(student.id, currentYear);

    } catch (error) {
      console.error('Error fetching financial data:', error);
      setError(`Failed to load financial data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async (studentId, academicYear) => {
    try {
      const { data: payments, error } = await supabase
        .from('financial_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('academic_year', academicYear)
        .eq('status', 'paid')
        .order('payment_date', { ascending: false });

      if (error) throw error;

      const history = (payments || []).map(payment => ({
        id: payment.id,
        date: payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : 'N/A',
        description: payment.description || 'Payment',
        amount: parseFloat(payment.amount) || 0,
        method: payment.payment_method || 'Not specified',
        receipt: payment.receipt_number || 'N/A',
        status: payment.status,
        semester: payment.semester || 1,
        feeType: payment.fee_type || 'tuition'
      }));

      setPaymentHistory(history);
    } catch (error) {
      console.error('Error fetching payment history:', error);
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
      case 'paid': return 'Paid';
      case 'partial': return 'Partial';
      case 'pending': return 'Pending';
      case 'no_fees': return 'No Fees';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'paid': return '#28a745';
      case 'partial': return '#ffc107';
      case 'pending': return '#dc3545';
      case 'no_fees': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getFeeTypeColor = (feeType) => {
    switch(feeType) {
      case 'tuition': return '#3498db';
      case 'functional': return '#9b59b6';
      case 'guild': return '#2ecc71';
      case 'nche': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const refreshFinancialData = () => {
    setError(null);
    fetchFinancialData();
  };

  const makePayment = (semester) => {
    const semesterData = financialData[`semester${semester}`];
    alert(`Payment for Semester ${semester}\nAmount Due: ${formatCurrency(semesterData.balance)}\n\nPayment integration would be implemented here.`);
  };

  const viewReceipt = (receiptNumber) => {
    alert(`Receipt #${receiptNumber}\n\nReceipt viewer would be implemented here.`);
  };

  const downloadStatement = () => {
    const studentName = studentInfo?.full_name || 'Student';
    const studentId = studentInfo?.student_id || 'N/A';
    const program = studentInfo?.program || 'N/A';
    const academicYear = studentInfo?.academic_year || '2024/2025';
    
    const statementContent = `
      FINANCIAL STATEMENT
      ===================
      Date: ${new Date().toLocaleDateString()}
      
      Student Information:
      --------------------
      Name: ${studentName}
      Student ID: ${studentId}
      Program: ${program}
      Academic Year: ${academicYear}
      
      Fee Summary (${academicYear}):
      ------------------------------
      Tuition: ${formatCurrency(feeSummary.tuition * 2)}
      Functional: ${formatCurrency(feeSummary.functional * 2)}
      Guild: ${formatCurrency(feeSummary.guild * 2)}
      NCHE: ${formatCurrency(feeSummary.nche)}
      
      Total Annual Fees: ${formatCurrency((feeSummary.tuition + feeSummary.functional + feeSummary.guild) * 2 + feeSummary.nche)}
      
      Semester Breakdown:
      ------------------
      ${[1, 2].map(sem => {
        const semData = financialData[`semester${sem}`];
        return `
        Semester ${sem}:
        Total: ${formatCurrency(semData.total)}
        Paid: ${formatCurrency(semData.paid)}
        Balance: ${formatCurrency(semData.balance)}
        Status: ${getStatusText(semData.status)}
        `;
      }).join('\n')}
      
      Total Balance Due: ${formatCurrency(financialData.semester1.balance + financialData.semester2.balance)}
    `;
    
    // Create a downloadable file
    const blob = new Blob([statementContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Financial_Statement_${studentId}_${academicYear.replace('/', '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderMobileSemesterSummary = (semesterData, semesterNumber) => {
    const color = semesterNumber === 1 ? '#3498db' : '#2ecc71';
    
    return (
      <div className="mobile-semester-summary" style={{ borderTopColor: color }}>
        <div className="mobile-semester-header">
          <h3>
            <i className="fas fa-money-bill-wave" style={{ color }}></i>
            Semester {semesterNumber}
            {semesterData.status === 'no_fees' && (
              <span className="no-fees-badge">No Fees</span>
            )}
          </h3>
          {semesterData.balance > 0 && (
            <button 
              onClick={() => makePayment(semesterNumber)}
              className="mobile-pay-button"
            >
              <i className="fas fa-credit-card"></i>
              Pay {formatCurrency(semesterData.balance)}
            </button>
          )}
        </div>

        {semesterData.status !== 'no_fees' ? (
          <>
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
                Fee Details
              </h4>
              
              {semesterData.items.length > 0 ? (
                <div>
                  {semesterData.items.map((item, index) => (
                    <div 
                      key={item.id || index}
                      className="mobile-fee-item"
                      style={{ 
                        borderLeftColor: getFeeTypeColor(item.categoryCode),
                        opacity: item.status === 'paid' ? 0.8 : 1
                      }}
                    >
                      <div className="mobile-fee-header">
                        <div className="mobile-fee-title">
                          <h4>{item.description}</h4>
                          <p>
                            <span className="fee-category" style={{ color: getFeeTypeColor(item.categoryCode) }}>
                              {item.categoryCode.toUpperCase()}
                            </span>
                            {item.paymentDate && ` • Paid on: ${new Date(item.paymentDate).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div 
                          className="mobile-fee-status"
                          style={{ backgroundColor: getStatusColor(item.status) }}
                        >
                          {item.status.toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="mobile-fee-amounts">
                        <div className="mobile-amount-item">
                          <p>Amount</p>
                          <p>{formatCurrency(item.amount)}</p>
                        </div>
                        <div className="mobile-amount-item">
                          <p>Paid</p>
                          <p style={{ color: '#28a745' }}>
                            {formatCurrency(item.amount - item.balanceDue)}
                          </p>
                        </div>
                        <div className="mobile-amount-item">
                          <p>Balance</p>
                          <p style={{ color: item.balanceDue > 0 ? '#e74c3c' : '#28a745' }}>
                            {formatCurrency(item.balanceDue)}
                          </p>
                        </div>
                      </div>
                      
                      {item.dueDate && (
                        <div className="mobile-due-date">
                          <i className="fas fa-calendar-alt"></i>
                          Due: {new Date(item.dueDate).toLocaleDateString()}
                        </div>
                      )}
                      
                      {item.receiptNumber && (
                        <div className="mobile-receipt-info">
                          <button 
                            onClick={() => viewReceipt(item.receiptNumber)}
                            className="mobile-receipt-button"
                          >
                            <i className="fas fa-receipt"></i> Receipt #{item.receiptNumber}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mobile-no-items">
                  <i className="fas fa-file-invoice"></i>
                  <p>No fee items found for this semester</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mobile-no-fees">
            <i className="fas fa-file-invoice-dollar"></i>
            <p>No fees assigned for this semester</p>
            <p className="mobile-no-fees-note">Fees will be assigned at the beginning of the semester</p>
          </div>
        )}
      </div>
    );
  };

  const renderDesktopSemesterTable = (semesterData, semesterNumber) => {
    const color = semesterNumber === 1 ? '#3498db' : '#2ecc71';
    
    return (
      <div className="semester-container">
        <div className="semester-header">
          <h3>
            <i className="fas fa-money-bill-wave" style={{ color }}></i>
            Semester {semesterNumber} Fees
            {semesterData.status === 'no_fees' && (
              <span className="no-fees-badge">No Fees</span>
            )}
          </h3>
          {semesterData.balance > 0 && (
            <button 
              onClick={() => makePayment(semesterNumber)}
              className="pay-button"
            >
              <i className="fas fa-credit-card"></i>
              Pay {formatCurrency(semesterData.balance)}
            </button>
          )}
        </div>

        {semesterData.status !== 'no_fees' && semesterData.items.length > 0 ? (
          <div className="table-responsive">
            <table className="semester-table">
              <thead>
                <tr>
                  <th>Fee Type</th>
                  <th>Description</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {semesterData.items.map((item, index) => (
                  <tr key={item.id || index} className={item.status === 'paid' ? 'paid-row' : ''}>
                    <td>
                      <div 
                        className="fee-type-badge"
                        style={{ 
                          backgroundColor: getFeeTypeColor(item.categoryCode) + '20',
                          color: getFeeTypeColor(item.categoryCode)
                        }}
                      >
                        {item.categoryCode.toUpperCase()}
                      </div>
                    </td>
                    <td>
                      <div className="fee-description">{item.description}</div>
                      {item.paymentDate && (
                        <div className="payment-date">
                          <i className="fas fa-calendar-check"></i> 
                          Paid: {new Date(item.paymentDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td>
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="fee-amount">{formatCurrency(item.amount)}</td>
                    <td className="paid-amount">
                      {formatCurrency(item.amount - item.balanceDue)}
                    </td>
                    <td>
                      <div className={item.balanceDue > 0 ? 'has-balance' : 'no-balance'}>
                        {formatCurrency(item.balanceDue)}
                      </div>
                    </td>
                    <td>
                      <div 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(item.status) }}
                      >
                        {item.status.toUpperCase()}
                      </div>
                      {item.receiptNumber && (
                        <button 
                          onClick={() => viewReceipt(item.receiptNumber)}
                          className="receipt-link"
                        >
                          <i className="fas fa-receipt"></i> #{item.receiptNumber}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                
                <tr className="summary-row">
                  <td colSpan="3">
                    <div className="semester-total">
                      <i className="fas fa-calculator" style={{ color }}></i>
                      <span>SEMESTER {semesterNumber} TOTAL</span>
                    </div>
                  </td>
                  <td className="total-amount">{formatCurrency(semesterData.total)}</td>
                  <td className="total-paid">{formatCurrency(semesterData.paid)}</td>
                  <td className="total-balance" style={{ color: semesterData.balance > 0 ? '#dc3545' : '#28a745' }}>
                    {formatCurrency(semesterData.balance)}
                  </td>
                  <td>
                    <div className="semester-status">
                      <div className="status-indicator" style={{ backgroundColor: getStatusColor(semesterData.status) }}></div>
                      <span>{getStatusText(semesterData.status)}</span>
                      <div className="percentage">{getStatusPercentage(semesterData)}%</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : semesterData.status === 'no_fees' ? (
          <div className="no-fees-message">
            <i className="fas fa-file-invoice-dollar"></i>
            <h4>No Fees Assigned</h4>
            <p>No fees have been assigned for Semester {semesterNumber} yet.</p>
            <p className="no-fees-note">Fees will be assigned at the beginning of the semester. Please check back later.</p>
          </div>
        ) : (
          <div className="no-items-message">
            <i className="fas fa-search"></i>
            <h4>No Fee Items Found</h4>
            <p>No fee items were found for Semester {semesterNumber}.</p>
          </div>
        )}
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
      <div className="finance-loading-spinner">
        <div className="finance-spinner"></div>
        <p>Fetching your financial information...</p>
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
            <div>Error Loading Data</div>
          </div>
        </div>
        <div className="error-container">
          <i className="fas fa-exclamation-triangle" style={{ color: '#dc3545', fontSize: '48px' }}></i>
          <h3>Unable to Load Financial Data</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button 
              onClick={refreshFinancialData}
              className="retry-button"
            >
              <i className="fas fa-sync-alt"></i>
              Try Again
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="refresh-button"
            >
              <i className="fas fa-redo"></i>
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="finance-container">
      <div className="finance-header">
        <div>
          <h2>
            <i className="fas fa-file-invoice-dollar" style={{ color: '#28a745' }}></i>
            Financial Statements
          </h2>
          <div className="student-info">
            <span><i className="fas fa-user-graduate"></i> {studentInfo?.full_name || 'Student'}</span>
            <span>•</span>
            <span><i className="fas fa-id-card"></i> {studentInfo?.student_id || 'N/A'}</span>
            <span>•</span>
            <span><i className="fas fa-graduation-cap"></i> {studentInfo?.program || 'N/A'}</span>
            <span>•</span>
            <span><i className="fas fa-calendar-alt"></i> {studentInfo?.academic_year || '2024/2025'}</span>
          </div>
        </div>
        <div className="header-actions">
          <button 
            onClick={downloadStatement}
            className="statement-button"
          >
            <i className="fas fa-download"></i>
            Download Statement
          </button>
          <button 
            onClick={refreshFinancialData}
            className="refresh-button"
          >
            <i className="fas fa-sync-alt"></i>
            Refresh Data
          </button>
        </div>
      </div>

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
          <option value="USD">USD ($)</option>
          <option value="UGX">UGX (Shs)</option>
        </select>
        <div className="exchange-rate">
          <i className="fas fa-exchange-alt"></i>
          Exchange Rate: 1 USD = 3,750 UGX
        </div>
      </div>

     

      {isMobile ? (
        <>
          {renderMobileSemesterSummary(financialData.semester1, 1)}
          {renderMobileSemesterSummary(financialData.semester2, 2)}
        </>
      ) : (
        <>
          {renderDesktopSemesterTable(financialData.semester1, 1)}
          {renderDesktopSemesterTable(financialData.semester2, 2)}
        </>
      )}

      <div className="payment-history-container">
        <div className="payment-history-header">
          <h3>
            <i className="fas fa-history" style={{ color: '#6c757d' }}></i>
            Payment History
          </h3>
          {paymentHistory.length > 0 && (
            <div className="payment-count">
              <i className="fas fa-receipt"></i>
              {paymentHistory.length} payment{paymentHistory.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        
        {paymentHistory.length === 0 ? (
          <div className="empty-history">
            <i className="fas fa-receipt" style={{ fontSize: '48px', color: '#6c757d' }}></i>
            <h4>No Payment History</h4>
            <p>Your payment history will appear here once you make payments</p>
            <p className="empty-history-note">You can make payments using the "Pay" buttons above</p>
          </div>
        ) : isMobile ? (
          <div className="mobile-payment-history">
            {paymentHistory.map((payment, index) => (
              <div 
                key={payment.id || index}
                className="mobile-payment-card"
                style={{ borderLeftColor: getFeeTypeColor(payment.feeType) }}
              >
                <div className="mobile-payment-header">
                  <div className="mobile-payment-title">
                    <h4>{payment.description}</h4>
                    <p><i className="fas fa-calendar"></i> {payment.date}</p>
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
                    <p><i className="fas fa-credit-card"></i> {payment.method}</p>
                  </div>
                </div>
                
                <div className="mobile-payment-footer">
                  <button 
                    onClick={() => viewReceipt(payment.receipt)}
                    className="mobile-receipt-button"
                  >
                    <i className="fas fa-receipt"></i> Receipt #{payment.receipt}
                  </button>
                  <div 
                    className="mobile-payment-status" 
                    style={{ 
                      backgroundColor: getFeeTypeColor(payment.feeType) 
                    }}
                  >
                    {payment.feeType.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="payment-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Fee Type</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Receipt</th>
                  <th>Semester</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment, index) => (
                  <tr key={payment.id || index}>
                    <td>
                      <i className="fas fa-calendar"></i>
                      {payment.date}
                    </td>
                    <td>{payment.description}</td>
                    <td>
                      <div 
                        className="fee-type-badge"
                        style={{ 
                          backgroundColor: getFeeTypeColor(payment.feeType) + '20',
                          color: getFeeTypeColor(payment.feeType)
                        }}
                      >
                        {payment.feeType.toUpperCase()}
                      </div>
                    </td>
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
                        <i className="fas fa-receipt"></i> #{payment.receipt}
                      </button>
                    </td>
                    <td>
                      <div className={`semester-badge sem-${payment.semester}`}>
                        <i className="fas fa-calendar-alt"></i> Semester {payment.semester}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="finance-footer">
        <div className="footer-info">
          <p><i className="fas fa-info-circle"></i> For any financial inquiries, please contact:</p>
          <p><strong>Finance Department</strong> | Email: finance@university.edu | Phone: +256-XXX-XXXXXX</p>
        </div>
        <div className="footer-notes">
          <p><i className="fas fa-exclamation-triangle"></i> Note: All payments should be made before the due dates to avoid late fees.</p>
          <p>Payment methods accepted: Bank Transfer, Mobile Money, Credit Card, Cash</p>
        </div>
      </div>
    </div>
  );
};

export default Finance;