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
  const { user } = useStudentAuth();

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

  if (loading) {
    return (
      <div className="content">
        <div className="dashboard-header">
          <h2><i className="fas fa-file-invoice-dollar"></i> Financial Statements</h2>
          <div className="date-display">Loading financial data...</div>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '300px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content">
        <div className="dashboard-header">
          <h2><i className="fas fa-file-invoice-dollar"></i> Financial Statements</h2>
          <div className="date-display">Error</div>
        </div>
        <div style={{
          padding: '30px',
          backgroundColor: '#fee',
          border: '1px solid #f99',
          borderRadius: '8px',
          margin: '20px 0',
          textAlign: 'center'
        }}>
          <i className="fas fa-exclamation-triangle" style={{
            fontSize: '48px',
            color: '#dc3545',
            marginBottom: '20px'
          }}></i>
          <p style={{ color: '#d33', marginBottom: '20px', fontSize: '16px' }}>
            {error}
          </p>
          <button 
            onClick={refreshFinancialData}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-sync-alt"></i>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="dashboard-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0' }}>
            <i className="fas fa-file-invoice-dollar" style={{ marginRight: '10px', color: '#28a745' }}></i>
            Financial Statements
          </h2>
          <div className="date-display" style={{ color: '#666', fontSize: '14px' }}>
            Academic Year: {studentInfo?.academic_year || '2024/2025'} | 
            Student ID: {studentInfo?.student_id || 'N/A'}
          </div>
        </div>
        <button 
          onClick={refreshFinancialData}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}
        >
          <i className="fas fa-sync-alt"></i>
          Refresh
        </button>
      </div>

      {/* Currency Selector */}
      <div className="currency-selector" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '25px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <label style={{ fontWeight: '500', color: '#495057' }}>
          <i className="fas fa-money-bill-wave" style={{ marginRight: '8px', color: '#28a745' }}></i>
          Display Currency:
        </label>
        <select 
          value={currency} 
          onChange={(e) => setCurrency(e.target.value)}
          style={{
            padding: '8px 15px',
            border: '2px solid #dee2e6',
            borderRadius: '6px',
            backgroundColor: 'white',
            fontSize: '14px',
            cursor: 'pointer',
            minWidth: '120px'
          }}
        >
          <option value="USD">USD ($) - US Dollar</option>
          <option value="UGX">UGX (Shs) - Ugandan Shilling</option>
        </select>
        <div style={{ fontSize: '12px', color: '#6c757d', marginLeft: 'auto' }}>
          Exchange Rate: 1 USD ≈ 3,750 UGX
        </div>
      </div>

      {/* Semester 1 Fees */}
      <div className="fee-table-container" style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '30px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: 0, color: '#333' }}>
            <i className="fas fa-money-bill-wave" style={{ marginRight: '10px', color: '#007bff' }}></i>
            Semester 1 Fees - Academic Year {studentInfo?.academic_year || '2024/2025'}
          </h3>
          <button 
            onClick={() => makePayment(1)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <i className="fas fa-credit-card"></i>
            Make Payment
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '700px'
          }}>
            <thead>
              <tr style={{ 
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #dee2e6'
              }}>
                <th style={{ 
                  padding: '12px 15px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#495057'
                }}>Description</th>
                <th style={{ 
                  padding: '12px 15px',
                  textAlign: 'right',
                  fontWeight: '600',
                  color: '#495057'
                }}>Total Amount</th>
                <th style={{ 
                  padding: '12px 15px',
                  textAlign: 'right',
                  fontWeight: '600',
                  color: '#495057'
                }}>Paid Amount</th>
                <th style={{ 
                  padding: '12px 15px',
                  textAlign: 'right',
                  fontWeight: '600',
                  color: '#495057'
                }}>Balance Due</th>
                <th style={{ 
                  padding: '12px 15px',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#495057'
                }}>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Individual fee items */}
              {financialData.semester1.items && financialData.semester1.items.map((item, index) => (
                <tr key={item.id || index} style={{
                  borderBottom: '1px solid #dee2e6',
                  backgroundColor: item.status === 'paid' ? '#f8fff9' : 'white'
                }}>
                  <td style={{ padding: '12px 15px' }}>
                    <div style={{ fontWeight: '500' }}>{item.description}</div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                      Fee Type: {item.feeType || 'General'} | 
                      Due: {item.dueDate || 'N/A'}
                    </div>
                  </td>
                  <td style={{ 
                    padding: '12px 15px',
                    textAlign: 'right',
                    fontWeight: '500',
                    color: '#333'
                  }}>
                    {formatCurrency(item.amount)}
                  </td>
                  <td style={{ 
                    padding: '12px 15px',
                    textAlign: 'right'
                  }}>
                    <div style={{
                      color: item.status === 'paid' ? '#28a745' : '#6c757d',
                      fontWeight: item.status === 'paid' ? 'bold' : 'normal'
                    }}>
                      {item.status === 'paid' ? formatCurrency(item.amount) : formatCurrency(0)}
                    </div>
                    {item.paymentDate && (
                      <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>
                        Paid on: {new Date(item.paymentDate).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td style={{ 
                    padding: '12px 15px',
                    textAlign: 'right'
                  }}>
                    <div style={{
                      color: item.status === 'paid' ? '#6c757d' : '#dc3545',
                      fontWeight: item.status !== 'paid' ? 'bold' : 'normal'
                    }}>
                      {item.status === 'paid' ? formatCurrency(0) : formatCurrency(item.balanceDue || item.amount)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      backgroundColor: getStatusColor(item.status),
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      minWidth: '70px'
                    }}>
                      {item.status.toUpperCase()}
                    </div>
                  </td>
                </tr>
              ))}
              
              {/* Summary Row */}
              <tr style={{ 
                backgroundColor: '#e8f4fc',
                fontWeight: 'bold',
                borderTop: '2px solid #007bff'
              }}>
                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-calculator" style={{ color: '#007bff' }}></i>
                    <span>SEMESTER 1 TOTAL</span>
                  </div>
                </td>
                <td style={{ 
                  padding: '15px',
                  textAlign: 'right',
                  fontSize: '16px',
                  color: '#0056b3'
                }}>
                  {formatCurrency(financialData.semester1.total)}
                </td>
                <td style={{ 
                  padding: '15px',
                  textAlign: 'right',
                  fontSize: '16px',
                  color: '#28a745'
                }}>
                  {formatCurrency(financialData.semester1.paid)}
                </td>
                <td style={{ 
                  padding: '15px',
                  textAlign: 'right',
                  fontSize: '16px',
                  color: financialData.semester1.balance > 0 ? '#dc3545' : '#28a745'
                }}>
                  {formatCurrency(financialData.semester1.balance)}
                </td>
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
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
                        style={{ transition: 'stroke-dasharray 0.5s ease' }}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {getStatusPercentage(financialData.semester1)}%
                      </div>
                      <div style={{ fontSize: '10px', color: getStatusColor(financialData.semester1.status) }}>
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

      {/* Semester 2 Fees */}
      <div className="fee-table-container" style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '30px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: 0, color: '#333' }}>
            <i className="fas fa-money-bill-wave" style={{ marginRight: '10px', color: '#28a745' }}></i>
            Semester 2 Fees - Academic Year {studentInfo?.academic_year || '2024/2025'}
          </h3>
          <button 
            onClick={() => makePayment(2)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <i className="fas fa-credit-card"></i>
            Make Payment
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '700px'
          }}>
            <thead>
              <tr style={{ 
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #dee2e6'
              }}>
                <th style={{ 
                  padding: '12px 15px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#495057'
                }}>Description</th>
                <th style={{ 
                  padding: '12px 15px',
                  textAlign: 'right',
                  fontWeight: '600',
                  color: '#495057'
                }}>Total Amount</th>
                <th style={{ 
                  padding: '12px 15px',
                  textAlign: 'right',
                  fontWeight: '600',
                  color: '#495057'
                }}>Paid Amount</th>
                <th style={{ 
                  padding: '12px 15px',
                  textAlign: 'right',
                  fontWeight: '600',
                  color: '#495057'
                }}>Balance Due</th>
                <th style={{ 
                  padding: '12px 15px',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#495057'
                }}>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Individual fee items */}
              {financialData.semester2.items && financialData.semester2.items.map((item, index) => (
                <tr key={item.id || index} style={{
                  borderBottom: '1px solid #dee2e6',
                  backgroundColor: item.status === 'paid' ? '#f8fff9' : 'white'
                }}>
                  <td style={{ padding: '12px 15px' }}>
                    <div style={{ fontWeight: '500' }}>{item.description}</div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                      Fee Type: {item.feeType || 'General'} | 
                      Due: {item.dueDate || 'N/A'}
                    </div>
                  </td>
                  <td style={{ 
                    padding: '12px 15px',
                    textAlign: 'right',
                    fontWeight: '500',
                    color: '#333'
                  }}>
                    {formatCurrency(item.amount)}
                  </td>
                  <td style={{ 
                    padding: '12px 15px',
                    textAlign: 'right'
                  }}>
                    <div style={{
                      color: item.status === 'paid' ? '#28a745' : '#6c757d',
                      fontWeight: item.status === 'paid' ? 'bold' : 'normal'
                    }}>
                      {item.status === 'paid' ? formatCurrency(item.amount) : formatCurrency(0)}
                    </div>
                    {item.paymentDate && (
                      <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>
                        Paid on: {new Date(item.paymentDate).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td style={{ 
                    padding: '12px 15px',
                    textAlign: 'right'
                  }}>
                    <div style={{
                      color: item.status === 'paid' ? '#6c757d' : '#dc3545',
                      fontWeight: item.status !== 'paid' ? 'bold' : 'normal'
                    }}>
                      {item.status === 'paid' ? formatCurrency(0) : formatCurrency(item.balanceDue || item.amount)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      backgroundColor: getStatusColor(item.status),
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      minWidth: '70px'
                    }}>
                      {item.status.toUpperCase()}
                    </div>
                  </td>
                </tr>
              ))}
              
              {/* Summary Row */}
              <tr style={{ 
                backgroundColor: '#e8f4fc',
                fontWeight: 'bold',
                borderTop: '2px solid #28a745'
              }}>
                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-calculator" style={{ color: '#28a745' }}></i>
                    <span>SEMESTER 2 TOTAL</span>
                  </div>
                </td>
                <td style={{ 
                  padding: '15px',
                  textAlign: 'right',
                  fontSize: '16px',
                  color: '#0056b3'
                }}>
                  {formatCurrency(financialData.semester2.total)}
                </td>
                <td style={{ 
                  padding: '15px',
                  textAlign: 'right',
                  fontSize: '16px',
                  color: '#28a745'
                }}>
                  {formatCurrency(financialData.semester2.paid)}
                </td>
                <td style={{ 
                  padding: '15px',
                  textAlign: 'right',
                  fontSize: '16px',
                  color: financialData.semester2.balance > 0 ? '#dc3545' : '#28a745'
                }}>
                  {formatCurrency(financialData.semester2.balance)}
                </td>
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
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
                        style={{ transition: 'stroke-dasharray 0.5s ease' }}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {getStatusPercentage(financialData.semester2)}%
                      </div>
                      <div style={{ fontSize: '10px', color: getStatusColor(financialData.semester2.status) }}>
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

      {/* Payment History */}
      <div className="fee-table-container" style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '25px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>
          <i className="fas fa-history" style={{ marginRight: '10px', color: '#6c757d' }}></i>
          Payment History
        </h3>
        
        {paymentHistory.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '2px dashed #dee2e6'
          }}>
            <i className="fas fa-receipt" style={{
              fontSize: '48px',
              color: '#6c757d',
              marginBottom: '20px'
            }}></i>
            <p style={{ color: '#6c757d', fontSize: '16px', margin: '0 0 10px 0' }}>
              No payment history found
            </p>
            <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
              Your payment history will appear here once you make payments
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '800px'
            }}>
              <thead>
                <tr style={{ 
                  backgroundColor: '#f8f9fa',
                  borderBottom: '2px solid #dee2e6'
                }}>
                  <th style={{ 
                    padding: '12px 15px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057'
                  }}>Date</th>
                  <th style={{ 
                    padding: '12px 15px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057'
                  }}>Description</th>
                  <th style={{ 
                    padding: '12px 15px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#495057'
                  }}>Amount</th>
                  <th style={{ 
                    padding: '12px 15px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057'
                  }}>Payment Method</th>
                  <th style={{ 
                    padding: '12px 15px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057'
                  }}>Receipt</th>
                  <th style={{ 
                    padding: '12px 15px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057'
                  }}>Semester</th>
                  <th style={{ 
                    padding: '12px 15px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#495057'
                  }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment, index) => (
                  <tr 
                    key={payment.id || index} 
                    style={{
                      borderBottom: '1px solid #dee2e6',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <td style={{ padding: '12px 15px', whiteSpace: 'nowrap' }}>
                      {payment.date}
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      {payment.description}
                    </td>
                    <td style={{ 
                      padding: '12px 15px',
                      textAlign: 'right',
                      fontWeight: '500'
                    }}>
                      {formatCurrency(payment.amount)}
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-credit-card" style={{ color: '#6c757d' }}></i>
                        {payment.method}
                      </div>
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      <button 
                        onClick={() => viewReceipt(payment.receipt)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007bff',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '14px'
                        }}
                      >
                        #{payment.receipt}
                        <i className="fas fa-external-link-alt" style={{ fontSize: '12px' }}></i>
                      </button>
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        backgroundColor: payment.semester === 1 ? '#cfe2ff' : '#d1e7dd',
                        color: payment.semester === 1 ? '#084298' : '#0f5132',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Semester {payment.semester}
                      </div>
                    </td>
                    <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        backgroundColor: getStatusColor(payment.status),
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        minWidth: '70px'
                      }}>
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

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        tr:hover {
          background-color: #f8f9fa !important;
          transition: background-color 0.2s;
        }
        
        select:focus {
          outline: none;
          border-color: #007bff !important;
          box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
        }
        
        button:hover {
          opacity: 0.9;
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        
        button:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};

export default Finance;