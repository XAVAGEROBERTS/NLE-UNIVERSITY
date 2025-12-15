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

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
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
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px' 
      }}>
        {paymentHistory.map((payment, index) => (
          <div 
            key={payment.id || index}
            style={{
              backgroundColor: 'white',
              borderRadius: '10px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderLeft: `4px solid ${payment.semester === 1 ? '#3498db' : '#2ecc71'}`
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '12px'
            }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ 
                  margin: '0 0 6px 0', 
                  fontSize: '15px',
                  color: '#2c3e50',
                  lineHeight: '1.3'
                }}>
                  {payment.description}
                </h4>
                <p style={{ 
                  margin: '0',
                  fontSize: '13px',
                  color: '#7f8c8d'
                }}>
                  {payment.date}
                </p>
              </div>
              <div style={{
                backgroundColor: payment.semester === 1 ? '#e8f4fd' : '#e8f6ef',
                color: payment.semester === 1 ? '#3498db' : '#27ae60',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}>
                Sem {payment.semester}
              </div>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div>
                <p style={{ 
                  margin: '0 0 4px 0',
                  fontSize: '12px',
                  color: '#95a5a6',
                  textTransform: 'uppercase'
                }}>
                  Amount
                </p>
                <p style={{ 
                  margin: '0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#2c3e50'
                }}>
                  {formatCurrency(payment.amount)}
                </p>
              </div>
              <div>
                <p style={{ 
                  margin: '0 0 4px 0',
                  fontSize: '12px',
                  color: '#95a5a6',
                  textTransform: 'uppercase'
                }}>
                  Method
                </p>
                <p style={{ 
                  margin: '0',
                  fontSize: '14px',
                  color: '#34495e'
                }}>
                  {payment.method}
                </p>
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingTop: '12px',
              borderTop: '1px solid #eee'
            }}>
              <button 
                onClick={() => viewReceipt(payment.receipt)}
                style={{
                  backgroundColor: '#f4f4f4',
                  color: '#333',
                  border: '1px solid #ddd',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <i className="fas fa-receipt"></i> Receipt #{payment.receipt}
              </button>
              <div style={{
                padding: '4px 10px',
                backgroundColor: getStatusColor(payment.status),
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
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
        style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '12px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          borderLeft: `4px solid ${getStatusColor(item.status)}`
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '12px'
        }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ 
              margin: '0 0 6px 0', 
              fontSize: '15px',
              color: '#2c3e50',
              lineHeight: '1.3'
            }}>
              {item.description}
            </h4>
            <p style={{ 
              margin: '0',
              fontSize: '12px',
              color: '#7f8c8d'
            }}>
              {item.feeType || 'General'} • Due: {item.dueDate || 'N/A'}
            </p>
          </div>
          <div style={{
            padding: '4px 10px',
            backgroundColor: getStatusColor(item.status),
            color: 'white',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}>
            {item.status.toUpperCase()}
          </div>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '10px',
          marginBottom: '12px'
        }}>
          <div>
            <p style={{ 
              margin: '0 0 4px 0',
              fontSize: '11px',
              color: '#95a5a6',
              textTransform: 'uppercase'
            }}>
              Total
            </p>
            <p style={{ 
              margin: '0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              {formatCurrency(item.amount)}
            </p>
          </div>
          <div>
            <p style={{ 
              margin: '0 0 4px 0',
              fontSize: '11px',
              color: '#95a5a6',
              textTransform: 'uppercase'
            }}>
              Paid
            </p>
            <p style={{ 
              margin: '0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#28a745'
            }}>
              {item.status === 'paid' ? formatCurrency(item.amount) : formatCurrency(0)}
            </p>
          </div>
          <div>
            <p style={{ 
              margin: '0 0 4px 0',
              fontSize: '11px',
              color: '#95a5a6',
              textTransform: 'uppercase'
            }}>
              Balance
            </p>
            <p style={{ 
              margin: '0',
              fontSize: '14px',
              fontWeight: '600',
              color: item.status === 'paid' ? '#7f8c8d' : '#e74c3c'
            }}>
              {item.status === 'paid' ? formatCurrency(0) : formatCurrency(item.balanceDue || item.amount)}
            </p>
          </div>
        </div>
        
        {item.paymentDate && (
          <div style={{ 
            fontSize: '11px',
            color: '#95a5a6',
            paddingTop: '8px',
            borderTop: '1px solid #eee'
          }}>
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
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        borderTop: `4px solid ${color}`
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '18px',
            color: '#2c3e50',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fas fa-money-bill-wave" style={{ color }}></i>
            Semester {semesterNumber}
          </h3>
          <button 
            onClick={() => makePayment(semesterNumber)}
            style={{
              padding: '10px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              whiteSpace: 'nowrap'
            }}
          >
            <i className="fas fa-credit-card"></i>
            Pay Now
          </button>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ 
              margin: '0 0 6px 0',
              fontSize: '12px',
              color: '#7f8c8d',
              textTransform: 'uppercase'
            }}>
              Total
            </p>
            <p style={{ 
              margin: 0,
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#2c3e50'
            }}>
              {formatCurrency(semesterData.total)}
            </p>
          </div>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ 
              margin: '0 0 6px 0',
              fontSize: '12px',
              color: '#7f8c8d',
              textTransform: 'uppercase'
            }}>
              Paid
            </p>
            <p style={{ 
              margin: 0,
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#28a745'
            }}>
              {formatCurrency(semesterData.paid)}
            </p>
          </div>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ 
              margin: '0 0 6px 0',
              fontSize: '12px',
              color: '#7f8c8d',
              textTransform: 'uppercase'
            }}>
              Balance
            </p>
            <p style={{ 
              margin: 0,
              fontSize: '18px',
              fontWeight: 'bold',
              color: semesterData.balance > 0 ? '#e74c3c' : '#28a745'
            }}>
              {formatCurrency(semesterData.balance)}
            </p>
          </div>
        </div>

        {/* Progress circle for mobile */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          margin: '20px 0'
        }}>
          <div style={{ position: 'relative', width: '100px', height: '100px' }}>
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
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {getStatusPercentage(semesterData)}%
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: getStatusColor(semesterData.status),
                fontWeight: '500'
              }}>
                {getStatusText(semesterData.status)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h4 style={{ 
            margin: '0 0 12px 0',
            fontSize: '16px',
            color: '#2c3e50',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
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
            <div style={{
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '2px dashed #dee2e6'
            }}>
              <i className="fas fa-file-invoice" style={{
                fontSize: '32px',
                color: '#bdc3c7',
                marginBottom: '10px'
              }}></i>
              <p style={{ 
                margin: 0,
                color: '#95a5a6',
                fontSize: '14px'
              }}>
                No fee items found for this semester
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        padding: '1rem',
        maxWidth: '100%',
        overflowX: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ 
              margin: '0 0 5px 0', 
              fontSize: 'clamp(1.5rem, 4vw, 1.8rem)',
              fontWeight: '600',
              color: '#2c3e50',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fas fa-file-invoice-dollar" style={{ color: '#28a745' }}></i>
              Financial Statements
            </h2>
            <div style={{ 
              color: '#7f8c8d', 
              fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)'
            }}>
              Loading financial data...
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '300px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
      <div style={{
        padding: '1rem',
        maxWidth: '100%',
        overflowX: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ 
              margin: '0 0 5px 0', 
              fontSize: 'clamp(1.5rem, 4vw, 1.8rem)',
              fontWeight: '600',
              color: '#2c3e50',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fas fa-file-invoice-dollar" style={{ color: '#28a745' }}></i>
              Financial Statements
            </h2>
            <div style={{ 
              color: '#7f8c8d', 
              fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)'
            }}>
              Error
            </div>
          </div>
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
          <p style={{ 
            color: '#d33', 
            marginBottom: '20px', 
            fontSize: '16px',
            lineHeight: '1.5'
          }}>
            {error}
          </p>
          <button 
            onClick={refreshFinancialData}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500'
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
    <div style={{
      padding: '1rem',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        flexWrap: 'wrap',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ 
            margin: '0 0 5px 0', 
            fontSize: 'clamp(1.5rem, 4vw, 1.8rem)',
            fontWeight: '600',
            color: '#2c3e50',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <i className="fas fa-file-invoice-dollar" style={{ color: '#28a745' }}></i>
            Financial Statements
          </h2>
          <div style={{ 
            color: '#7f8c8d', 
            fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <span>Academic Year: {studentInfo?.academic_year || '2024/2025'}</span>
            <span>•</span>
            <span>Student ID: {studentInfo?.student_id || 'N/A'}</span>
          </div>
        </div>
        <div style={{ 
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <button 
            onClick={refreshFinancialData}
            style={{
              padding: '10px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              fontWeight: '500'
            }}
          >
            <i className="fas fa-sync-alt"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Currency Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '25px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        flexWrap: 'wrap'
      }}>
        <label style={{ 
          fontWeight: '500', 
          color: '#495057',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className="fas fa-money-bill-wave" style={{ color: '#28a745' }}></i>
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
        <div style={{ 
          fontSize: '12px', 
          color: '#6c757d',
          marginLeft: isMobile ? '0' : 'auto',
          width: isMobile ? '100%' : 'auto',
          marginTop: isMobile ? '8px' : '0'
        }}>
          Exchange Rate: 1 USD ≈ 3,750 UGX
        </div>
      </div>

      {/* Semester 1 - Mobile or Desktop View */}
      {isMobile ? (
        renderMobileSemesterSummary(financialData.semester1, 1)
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: 'clamp(15px, 3vw, 25px)',
          marginBottom: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)',
              color: '#2c3e50',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fas fa-money-bill-wave" style={{ color: '#007bff' }}></i>
              Semester 1 Fees - Academic Year {studentInfo?.academic_year || '2024/2025'}
            </h3>
            <button 
              onClick={() => makePayment(1)}
              style={{
                padding: '10px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}
            >
              <i className="fas fa-credit-card"></i>
              Make Payment
            </button>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Description</th>
                  <th style={{ 
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Total Amount</th>
                  <th style={{ 
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Paid Amount</th>
                  <th style={{ 
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Balance Due</th>
                  <th style={{ 
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {financialData.semester1.items && financialData.semester1.items.map((item, index) => (
                  <tr key={item.id || index} style={{
                    borderBottom: '1px solid #dee2e6',
                    backgroundColor: item.status === 'paid' ? '#f8fff9' : 'white'
                  }}>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      <div style={{ fontWeight: '500' }}>{item.description}</div>
                      <div style={{ 
                        fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', 
                        color: '#6c757d', 
                        marginTop: '4px' 
                      }}>
                        Fee Type: {item.feeType || 'General'} | Due: {item.dueDate || 'N/A'}
                      </div>
                    </td>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      textAlign: 'right',
                      fontWeight: '500',
                      color: '#333',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      {formatCurrency(item.amount)}
                    </td>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      textAlign: 'right',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      <div style={{
                        color: item.status === 'paid' ? '#28a745' : '#6c757d',
                        fontWeight: item.status === 'paid' ? 'bold' : 'normal'
                      }}>
                        {item.status === 'paid' ? formatCurrency(item.amount) : formatCurrency(0)}
                      </div>
                      {item.paymentDate && (
                        <div style={{ 
                          fontSize: 'clamp(0.7rem, 1.6vw, 0.8rem)', 
                          color: '#6c757d', 
                          marginTop: '4px' 
                        }}>
                          Paid on: {new Date(item.paymentDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      textAlign: 'right',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      <div style={{
                        color: item.status === 'paid' ? '#6c757d' : '#dc3545',
                        fontWeight: item.status !== 'paid' ? 'bold' : 'normal'
                      }}>
                        {item.status === 'paid' ? formatCurrency(0) : formatCurrency(item.balanceDue || item.amount)}
                      </div>
                    </td>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      textAlign: 'center',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        backgroundColor: getStatusColor(item.status),
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
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
                  <td style={{ 
                    padding: 'clamp(12px, 2.5vw, 15px)',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <i className="fas fa-calculator" style={{ color: '#007bff' }}></i>
                      <span>SEMESTER 1 TOTAL</span>
                    </div>
                  </td>
                  <td style={{ 
                    padding: 'clamp(12px, 2.5vw, 15px)',
                    textAlign: 'right',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                    color: '#0056b3'
                  }}>
                    {formatCurrency(financialData.semester1.total)}
                  </td>
                  <td style={{ 
                    padding: 'clamp(12px, 2.5vw, 15px)',
                    textAlign: 'right',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                    color: '#28a745'
                  }}>
                    {formatCurrency(financialData.semester1.paid)}
                  </td>
                  <td style={{ 
                    padding: 'clamp(12px, 2.5vw, 15px)',
                    textAlign: 'right',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                    color: financialData.semester1.balance > 0 ? '#dc3545' : '#28a745'
                  }}>
                    {formatCurrency(financialData.semester1.balance)}
                  </td>
                  <td style={{ 
                    padding: 'clamp(12px, 2.5vw, 15px)',
                    textAlign: 'center',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                  }}>
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
                        <div style={{ 
                          fontSize: 'clamp(0.9rem, 2vw, 1rem)', 
                          fontWeight: 'bold' 
                        }}>
                          {getStatusPercentage(financialData.semester1)}%
                        </div>
                        <div style={{ 
                          fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', 
                          color: getStatusColor(financialData.semester1.status) 
                        }}>
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
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: 'clamp(15px, 3vw, 25px)',
          marginBottom: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)',
              color: '#2c3e50',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fas fa-money-bill-wave" style={{ color: '#28a745' }}></i>
              Semester 2 Fees - Academic Year {studentInfo?.academic_year || '2024/2025'}
            </h3>
            <button 
              onClick={() => makePayment(2)}
              style={{
                padding: '10px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}
            >
              <i className="fas fa-credit-card"></i>
              Make Payment
            </button>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Description</th>
                  <th style={{ 
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Total Amount</th>
                  <th style={{ 
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Paid Amount</th>
                  <th style={{ 
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Balance Due</th>
                  <th style={{ 
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {financialData.semester2.items && financialData.semester2.items.map((item, index) => (
                  <tr key={item.id || index} style={{
                    borderBottom: '1px solid #dee2e6',
                    backgroundColor: item.status === 'paid' ? '#f8fff9' : 'white'
                  }}>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      <div style={{ fontWeight: '500' }}>{item.description}</div>
                      <div style={{ 
                        fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', 
                        color: '#6c757d', 
                        marginTop: '4px' 
                      }}>
                        Fee Type: {item.feeType || 'General'} | Due: {item.dueDate || 'N/A'}
                      </div>
                    </td>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      textAlign: 'right',
                      fontWeight: '500',
                      color: '#333',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      {formatCurrency(item.amount)}
                    </td>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      textAlign: 'right',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      <div style={{
                        color: item.status === 'paid' ? '#28a745' : '#6c757d',
                        fontWeight: item.status === 'paid' ? 'bold' : 'normal'
                      }}>
                        {item.status === 'paid' ? formatCurrency(item.amount) : formatCurrency(0)}
                      </div>
                      {item.paymentDate && (
                        <div style={{ 
                          fontSize: 'clamp(0.7rem, 1.6vw, 0.8rem)', 
                          color: '#6c757d', 
                          marginTop: '4px' 
                        }}>
                          Paid on: {new Date(item.paymentDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      textAlign: 'right',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      <div style={{
                        color: item.status === 'paid' ? '#6c757d' : '#dc3545',
                        fontWeight: item.status !== 'paid' ? 'bold' : 'normal'
                      }}>
                        {item.status === 'paid' ? formatCurrency(0) : formatCurrency(item.balanceDue || item.amount)}
                      </div>
                    </td>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      textAlign: 'center',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        backgroundColor: getStatusColor(item.status),
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
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
                  <td style={{ 
                    padding: 'clamp(12px, 2.5vw, 15px)',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <i className="fas fa-calculator" style={{ color: '#28a745' }}></i>
                      <span>SEMESTER 2 TOTAL</span>
                    </div>
                  </td>
                  <td style={{ 
                    padding: 'clamp(12px, 2.5vw, 15px)',
                    textAlign: 'right',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                    color: '#0056b3'
                  }}>
                    {formatCurrency(financialData.semester2.total)}
                  </td>
                  <td style={{ 
                    padding: 'clamp(12px, 2.5vw, 15px)',
                    textAlign: 'right',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                    color: '#28a745'
                  }}>
                    {formatCurrency(financialData.semester2.paid)}
                  </td>
                  <td style={{ 
                    padding: 'clamp(12px, 2.5vw, 15px)',
                    textAlign: 'right',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                    color: financialData.semester2.balance > 0 ? '#dc3545' : '#28a745'
                  }}>
                    {formatCurrency(financialData.semester2.balance)}
                  </td>
                  <td style={{ 
                    padding: 'clamp(12px, 2.5vw, 15px)',
                    textAlign: 'center',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                  }}>
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
                        <div style={{ 
                          fontSize: 'clamp(0.9rem, 2vw, 1rem)', 
                          fontWeight: 'bold' 
                        }}>
                          {getStatusPercentage(financialData.semester2)}%
                        </div>
                        <div style={{ 
                          fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', 
                          color: getStatusColor(financialData.semester2.status) 
                        }}>
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
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: 'clamp(15px, 3vw, 25px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)',
            color: '#2c3e50',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <i className="fas fa-history" style={{ color: '#6c757d' }}></i>
            Payment History
          </h3>
          {paymentHistory.length > 0 && (
            <div style={{ 
              fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', 
              color: '#6c757d',
              whiteSpace: 'nowrap'
            }}>
              {paymentHistory.length} payment{paymentHistory.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        
        {paymentHistory.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '2px dashed #dee2e6'
          }}>
            <i className="fas fa-receipt" style={{
              fontSize: 'clamp(2.5rem, 6vw, 3rem)',
              color: '#bdc3c7',
              marginBottom: '20px'
            }}></i>
            <p style={{ 
              color: '#7f8c8d', 
              fontSize: 'clamp(0.9rem, 2.5vw, 1rem)', 
              margin: '0 0 10px 0',
              fontWeight: '500'
            }}>
              No payment history found
            </p>
            <p style={{ 
              color: '#95a5a6', 
              fontSize: 'clamp(0.85rem, 2vw, 0.9rem)', 
              margin: 0 
            }}>
              Your payment history will appear here once you make payments
            </p>
          </div>
        ) : isMobile ? (
          // Mobile view: Cards
          renderMobilePaymentHistory()
        ) : (
          // Desktop view: Table
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Date</th>
                  <th style={{ 
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Description</th>
                  <th style={{ 
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Amount</th>
                  <th style={{ 
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Payment Method</th>
                  <th style={{ 
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Receipt</th>
                  <th style={{ 
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}>Semester</th>
                  <th style={{ 
                    padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
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
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      whiteSpace: 'nowrap',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      {payment.date}
                    </td>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      {payment.description}
                    </td>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      textAlign: 'right',
                      fontWeight: '500',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      {formatCurrency(payment.amount)}
                    </td>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-credit-card" style={{ color: '#6c757d' }}></i>
                        {payment.method}
                      </div>
                    </td>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
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
                          fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
                          padding: '0'
                        }}
                      >
                        #{payment.receipt}
                        <i className="fas fa-external-link-alt" style={{ fontSize: '12px' }}></i>
                      </button>
                    </td>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        backgroundColor: payment.semester === 1 ? '#cfe2ff' : '#d1e7dd',
                        color: payment.semester === 1 ? '#084298' : '#0f5132',
                        fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
                        fontWeight: '500'
                      }}>
                        Semester {payment.semester}
                      </div>
                    </td>
                    <td style={{ 
                      padding: 'clamp(10px, 2vw, 12px) clamp(8px, 1.5vw, 15px)',
                      textAlign: 'center',
                      fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                    }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        backgroundColor: getStatusColor(payment.status),
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
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

      {/* Responsive CSS */}
      <style>{`
        /* Animation for loading spinner */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Hover effects for desktop */
        @media (hover: hover) and (pointer: fine) {
          tr:hover {
            background-color: #f8f9fa !important;
            transition: background-color 0.2s;
          }
          
          button:hover {
            opacity: 0.9;
            transform: translateY(-1px);
            transition: all 0.2s ease;
          }
          
          div[style*="cursor: pointer"]:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
            transition: all 0.2s ease;
          }
        }
        
        /* Focus styles for accessibility */
        select:focus {
          outline: none;
          border-color: #007bff !important;
          box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
        }
        
        button:focus {
          outline: 2px solid #3498db;
          outline-offset: 2px;
        }
        
        /* Mobile-specific optimizations */
        @media (max-width: 480px) {
          div[style*="padding: '1rem'"] {
            padding: 0.75rem !important;
          }
          
          h2 {
            font-size: 1.3rem !important;
          }
          
          h3 {
            font-size: 1rem !important;
          }
          
          /* Improve touch targets */
          button, 
          select,
          div[style*="cursor: pointer"] {
            min-height: 44px;
          }
          
          /* Optimize table scrolling */
          div[style*="overflow-x: auto"] table {
            min-width: 650px;
          }
        }
        
        /* Tablet-specific optimizations */
        @media (max-width: 768px) and (min-width: 481px) {
          div[style*="overflow-x: auto"] table {
            min-width: 700px;
          }
        }
        
        /* Improve mobile tables */
        @media (max-width: 768px) {
          div[style*="overflow-x: auto"] {
            margin-left: -0.5rem;
            margin-right: -0.5rem;
            width: calc(100% + 1rem);
          }
          
          div[style*="overflow-x: auto"] table {
            border-radius: 0;
          }
        }
        
        /* Print styles */
        @media print {
          button {
            display: none !important;
          }
          
          div[style*="box-shadow"] {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }
          
          div[style*="padding: '1rem'"] {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Finance;