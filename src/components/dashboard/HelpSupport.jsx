// src/components/dashboard/HelpSupport.jsx - UNIFIED CHAT + COMPLAINTS
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { supabase } from '../../services/supabase';

const HelpSupport = () => {
  const { user } = useStudentAuth();
  
  // ========== STATE ==========
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'complaints'
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hodEmail, setHodEmail] = useState(null);
  const [hodName, setHodName] = useState('Head of Department');
  const [departmentCode, setDepartmentCode] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);
  const channelRef = useRef(null);

  // ========== COMPLAINT STATE ==========
  const [complaints, setComplaints] = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintFilter, setComplaintFilter] = useState('all');
  const [newComplaint, setNewComplaint] = useState({
    title: '',
    category: 'academic',
    description: '',
  });
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  const studentEmail = user?.email || '';
  const studentName = user?.name || user?.full_name || 'Student';
  const studentId = user?.id || '';

  // Check screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ========== FIND HOD ==========
  const fetchHOD = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Get the student's department code
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('department_code, department, program, student_id')
        .eq('email', studentEmail)
        .single();

      if (studentError) {
        console.error('Error fetching student:', studentError);
        setError('Could not find your student profile. Please contact admin.');
        setLoading(false);
        return;
      }

      if (!student?.department_code) {
        setError('Your account is not assigned to any department. Please contact admin.');
        setLoading(false);
        return;
      }

      const deptCode = student.department_code;
      setDepartmentCode(deptCode);
      setDepartmentName(student.department || deptCode);

      // Step 2: Find the department
      const { data: department, error: deptError } = await supabase
        .from('departments')
        .select('id, department_code, department_name, head_of_department')
        .eq('department_code', deptCode)
        .single();

      if (deptError || !department) {
        setError(`Department "${deptCode}" not found.`);
        setLoading(false);
        return;
      }

      // Step 3: Find the HOD
      const { data: hodRoles, error: hodError } = await supabase
        .from('user_roles')
        .select(`
          id,
          email,
          role,
          department_id,
          profile_picture_url,
          departments:department_id (
            department_code,
            department_name,
            head_of_department
          )
        `)
        .eq('role', 'hod')
        .eq('department_id', department.id)
        .limit(1);

      if (hodError || !hodRoles || hodRoles.length === 0) {
        setError(`No HOD assigned to ${department.department_name} yet.`);
        setLoading(false);
        return;
      }

      const hod = hodRoles[0];
      setHodEmail(hod.email);
      setHodName(hod.departments?.head_of_department || hod.email?.split('@')[0] || 'HOD');

    } catch (err) {
      console.error('Error in fetchHOD:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [studentEmail]);

  // ========== FETCH CHAT MESSAGES ==========
  const fetchMessages = useCallback(async () => {
    if (!studentEmail || !hodEmail) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(
          `and(sender_email.eq.${studentEmail},receiver_email.eq.${hodEmail}),` +
          `and(sender_email.eq.${hodEmail},receiver_email.eq.${studentEmail})`
        )
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw error;

      setMessages(data || []);

      // Mark unread messages from HOD as read
      const unread = (data || []).filter(
        (m) => m.receiver_email === studentEmail && !m.is_read
      );
      for (const msg of unread) {
        await supabase.from('chat_messages').update({ is_read: true }).eq('id', msg.id);
      }

      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [studentEmail, hodEmail]);

  // ========== FETCH COMPLAINTS ==========
  const fetchComplaints = useCallback(async () => {
    if (!studentId) return;

    setComplaintsLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_complaints')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setComplaintsLoading(false);
    }
  }, [studentId]);

  // ========== SEND CHAT MESSAGE ==========
  const sendMessage = async () => {
    if (!newMessage.trim() || !hodEmail || sending) return;

    const tempId = `temp-${Date.now()}`;
    const messageText = newMessage.trim();

    const optimisticMessage = {
      id: tempId,
      sender_email: studentEmail,
      sender_role: 'student',
      sender_name: studentName,
      receiver_email: hodEmail,
      receiver_role: 'hod',
      message: messageText,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');
    setSending(true);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          sender_id: user?.id || null,
          sender_email: studentEmail,
          sender_role: 'student',
          sender_name: studentName,
          receiver_email: hodEmail,
          receiver_role: 'hod',
          message: messageText,
          is_read: false,
          department_id: null,
        }])
        .select()
        .single();

      if (error) throw error;
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data : m))
      );
    } catch (err) {
      console.error('Send error:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ========== SUBMIT COMPLAINT ==========
  const submitComplaint = async () => {
    if (!newComplaint.title.trim() || !newComplaint.description.trim()) {
      alert('Please fill in both title and description');
      return;
    }

    setSubmittingComplaint(true);
    try {
      const { data, error } = await supabase
        .from('student_complaints')
        .insert([{
          student_id: studentId,
          department_code: departmentCode,
          title: newComplaint.title.trim(),
          description: newComplaint.description.trim(),
          category: newComplaint.category,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      // Notify HOD
      if (hodEmail) {
        await supabase
          .from('notifications')
          .insert([{
            user_email: hodEmail,
            title: '📋 New Student Complaint',
            message: `${studentName} has submitted a complaint: "${newComplaint.title}"`,
            type: 'complaint',
            is_read: false,
            created_at: new Date().toISOString(),
            sender_email: studentEmail,
            sender_name: studentName,
            sender_role: 'student',
          }]);
      }

      alert('✅ Complaint submitted successfully! Your HOD will review it.');
      setShowComplaintModal(false);
      setNewComplaint({ title: '', category: 'academic', description: '' });
      fetchComplaints();
    } catch (err) {
      console.error('Error submitting complaint:', err);
      alert('Error submitting complaint: ' + err.message);
    } finally {
      setSubmittingComplaint(false);
    }
  };

  // ========== REAL-TIME CHAT ==========
  useEffect(() => {
    if (!studentEmail || !hodEmail) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`help-support-${studentEmail}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const msg = payload.new;
          if (!msg) return;

          const isThisConversation =
            (msg.sender_email === studentEmail && msg.receiver_email === hodEmail) ||
            (msg.sender_email === hodEmail && msg.receiver_email === studentEmail);

          if (!isThisConversation) return;

          if (payload.eventType === 'INSERT') {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              const cleaned = prev.filter(
                (m) =>
                  !(
                    typeof m.id === 'string' &&
                    m.id.startsWith('temp-') &&
                    m.message === msg.message
                  )
              );
              return [...cleaned, msg];
            });

            setTimeout(() => {
              chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 7000);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      clearInterval(pollInterval);
    };
  }, [studentEmail, hodEmail, fetchMessages]);

  // ========== INITIAL LOADS ==========
  useEffect(() => {
    fetchHOD();
  }, [fetchHOD]);

  useEffect(() => {
    if (hodEmail) {
      setLoading(true);
      fetchMessages();
    }
  }, [hodEmail, fetchMessages]);

  useEffect(() => {
    if (studentId) {
      fetchComplaints();
    }
  }, [studentId, fetchComplaints]);

  // ========== COMPLAINT STATUS HELPERS ==========
  const getComplaintStatusBadge = (status) => {
    const map = {
      pending: { label: '⏳ Pending', color: '#f59f00', bg: '#fff3bf' },
      'in-progress': { label: '🔄 In Progress', color: '#1976d2', bg: '#e3f2fd' },
      resolved: { label: '✅ Resolved', color: '#2e7d32', bg: '#d3f9d8' },
      resolved_by_dean: { label: '✅ Resolved by Dean', color: '#2e7d32', bg: '#d3f9d8' },
      rejected: { label: '❌ Rejected', color: '#e03131', bg: '#ffe3e3' },
      escalated: { label: '⬆️ Escalated to Dean', color: '#e65100', bg: '#fff3e0' },
      escalated_to_dean: { label: '⬆️ Escalated to Dean', color: '#e65100', bg: '#fff3e0' },
    };
    return map[status] || { label: status, color: '#666', bg: '#f5f5f5' };
  };

  const getComplaintCategoryLabel = (category) => {
    const map = {
      academic: '📚 Academic',
      administrative: '📋 Administrative',
      lecturer: '👨‍🏫 Lecturer',
      facility: '🏢 Facility',
      other: '📝 Other',
    };
    return map[category] || category;
  };

  // ========== RENDER ERROR ==========
  if (error) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '12px',
          padding: '30px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ color: '#856404', marginBottom: '12px' }}>Unable to Connect to Support</h3>
          <p style={{ color: '#856404', marginBottom: '16px' }}>{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchHOD();
            }}
            style={{
              padding: '10px 24px',
              backgroundColor: '#ffc107',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // ========== RENDER ==========
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 'clamp(16px, 3vw, 24px)' }}>
        <h1 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)', fontWeight: 700, color: '#1a237e', margin: 0 }}>
          🎧 Help & Support
        </h1>
        <p style={{ color: '#666', marginTop: '6px', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>
          Chat with your HOD or submit a formal complaint
        </p>
        {departmentName && (
          <p style={{ fontSize: '0.85rem', color: '#1976d2', marginTop: '4px' }}>
            📚 Department: <strong>{departmentName}</strong> • HOD: <strong>{hodName}</strong>
          </p>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '16px', borderBottom: '2px solid #e0e0e0' }}>
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            padding: '10px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'chat' ? '3px solid #1a237e' : '3px solid transparent',
            fontWeight: activeTab === 'chat' ? 700 : 500,
            color: activeTab === 'chat' ? '#1a237e' : '#666',
            cursor: 'pointer',
            fontSize: 'clamp(0.9rem, 2vw, 1rem)',
          }}
        >
          💬 Chat with HOD
        </button>
        <button
          onClick={() => setActiveTab('complaints')}
          style={{
            padding: '10px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'complaints' ? '3px solid #1a237e' : '3px solid transparent',
            fontWeight: activeTab === 'complaints' ? 700 : 500,
            color: activeTab === 'complaints' ? '#1a237e' : '#666',
            cursor: 'pointer',
            fontSize: 'clamp(0.9rem, 2vw, 1rem)',
          }}
        >
          📋 My Complaints ({complaints.filter(c => c.status === 'pending' || c.status === 'in-progress').length})
        </button>
      </div>

      {/* ========== CHAT TAB ========== */}
      {activeTab === 'chat' && (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            height: isMobile ? '70vh' : '65vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              padding: 'clamp(12px, 2.5vw, 16px) clamp(14px, 3vw, 20px)',
              background: 'linear-gradient(135deg, #1a237e, #283593)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: 'clamp(38px, 8vw, 44px)',
                height: 'clamp(38px, 8vw, 44px)',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(18px, 4vw, 22px)',
              }}
            >
              👨‍🏫
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'clamp(0.95rem, 2.2vw, 1.05rem)' }}>
                {hodName}
              </div>
              <div style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', opacity: 0.85 }}>
                {hodEmail ? `● Online • ${departmentName || 'Your Department'}` : 'Connecting...'}
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 'clamp(14px, 3vw, 20px)',
              background: '#f5f7fb',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: 'auto', gap: '16px', padding: '40px' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                  {/* Outer glow */}
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '-6px',
                    width: '92px',
                    height: '92px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(26,35,126,0.15) 0%, rgba(40,53,147,0.05) 50%, transparent 70%)',
                    animation: 'helpPulse 2s ease-in-out infinite'
                  }}></div>
                  
                  {/* Outer ring */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    border: '3px solid transparent',
                    borderTop: '3px solid #1a237e',
                    borderRight: '3px solid #283593',
                    animation: 'helpSpin 1.5s linear infinite'
                  }}></div>
                  
                  {/* Inner ring */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: '3px solid transparent',
                    borderBottom: '3px solid #3949ab',
                    borderLeft: '3px solid #5c6bc0',
                    animation: 'helpSpinReverse 2s linear infinite'
                  }}></div>
                  
                  {/* Center icon */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1a237e, #283593)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 16px rgba(26,35,126,0.5), 0 0 32px rgba(40,53,147,0.3)',
                    animation: 'helpBounce 1.5s ease-in-out infinite'
                  }}>
                    <span style={{ fontSize: '16px' }}>💬</span>
                  </div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '16px', color: '#1e293b', margin: 0, fontWeight: 600 }}>
                    Loading Conversation
                  </p>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                    Fetching your messages...
                  </p>
                </div>
                
                {/* Dots */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1a237e', animation: 'helpDots 1.2s ease-in-out infinite' }}></div>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#283593', animation: 'helpDots 1.2s ease-in-out 0.2s infinite' }}></div>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3949ab', animation: 'helpDots 1.2s ease-in-out 0.4s infinite' }}></div>
                </div>
                
                <style>{`
                  @keyframes helpSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                  @keyframes helpSpinReverse {
                    0% { transform: rotate(360deg); }
                    100% { transform: rotate(0deg); }
                  }
                  @keyframes helpPulse {
                    0%, 100% { opacity: 0.6; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.05); }
                  }
                  @keyframes helpBounce {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); }
                    50% { transform: translate(-50%, -50%) scale(1.08); }
                  }
                  @keyframes helpDots {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.5); }
                  }
                `}</style>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', margin: 'auto', color: '#888' }}>
                <div style={{ fontSize: 'clamp(2.5rem, 6vw, 3rem)', marginBottom: '12px' }}>
                  💬
                </div>
                <p style={{ margin: '0 0 6px 0' }}>No messages yet</p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#999' }}>
                  Send a message to start chatting with your Head of Department
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_role === 'student';
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: isMobile ? '85%' : '75%',
                        padding: '10px 14px',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMe ? '#1a237e' : 'white',
                        color: isMe ? 'white' : '#222',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}
                    >
                      {!isMe && (
                        <div style={{ fontSize: '0.72rem', opacity: 0.7, marginBottom: 4 }}>
                          {hodName}
                        </div>
                      )}
                      <div
                        style={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: 1.45,
                        }}
                      >
                        {msg.message}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          opacity: 0.7,
                          marginTop: 6,
                          textAlign: 'right',
                        }}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid #e0e0e0',
              background: 'white',
              display: 'flex',
              gap: '10px',
            }}
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your message to the HOD..."
              disabled={sending || !hodEmail}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: '24px',
                border: '1px solid #ddd',
                fontSize: '15px',
                outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim() || !hodEmail}
              style={{
                padding: '0 22px',
                borderRadius: '24px',
                border: 'none',
                background: sending || !newMessage.trim() ? '#bbb' : '#1a237e',
                color: 'white',
                fontWeight: 600,
                cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer',
                minHeight: '44px',
              }}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* ========== COMPLAINTS TAB ========== */}
      {activeTab === 'complaints' && (
        <div>
          {/* New Complaint Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
              {complaints.filter(c => c.status === 'pending' || c.status === 'in-progress').length} pending complaints
            </p>
            <button
              onClick={() => setShowComplaintModal(true)}
              style={{
                padding: '10px 20px',
                background: '#1a237e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ➕ New Complaint
            </button>
          </div>

          {/* Complaint Filters */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select
              value={complaintFilter}
              onChange={(e) => setComplaintFilter(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }}
            >
              <option value="all">All ({complaints.length})</option>
              <option value="pending">Pending ({complaints.filter(c => c.status === 'pending' || c.status === 'in-progress').length})</option>
              <option value="resolved">Resolved ({complaints.filter(c => c.status === 'resolved' || c.status === 'resolved_by_dean').length})</option>
              <option value="rejected">Rejected ({complaints.filter(c => c.status === 'rejected').length})</option>
              <option value="escalated">Escalated ({complaints.filter(c => c.status === 'escalated' || c.status === 'escalated_to_dean').length})</option>
            </select>
          </div>

          {/* Complaints List */}
          {complaintsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading complaints...</div>
          ) : complaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '12px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
              <p style={{ color: '#666' }}>No complaints submitted yet</p>
              <button
                onClick={() => setShowComplaintModal(true)}
                style={{
                  marginTop: '12px',
                  padding: '8px 20px',
                  background: '#1a237e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Submit Your First Complaint
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {complaints
                .filter(c => {
                  if (complaintFilter === 'all') return true;
                  if (complaintFilter === 'pending') return c.status === 'pending' || c.status === 'in-progress';
                  if (complaintFilter === 'resolved') return c.status === 'resolved' || c.status === 'resolved_by_dean';
                  if (complaintFilter === 'rejected') return c.status === 'rejected';
                  if (complaintFilter === 'escalated') return c.status === 'escalated' || c.status === 'escalated_to_dean';
                  return true;
                })
                .map((complaint) => {
                  const statusInfo = getComplaintStatusBadge(complaint.status);
                  return (
                    <div
                      key={complaint.id}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '10px',
                        padding: '16px 20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        borderLeft: `4px solid ${statusInfo.color}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#1a237e' }}>
                            {complaint.title}
                          </h4>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.85rem', color: '#666' }}>
                            <span>{getComplaintCategoryLabel(complaint.category)}</span>
                            <span>•</span>
                            <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            backgroundColor: statusInfo.bg,
                            color: statusInfo.color,
                          }}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#444', lineHeight: 1.5 }}>
                        {complaint.description}
                      </p>
                      {complaint.response && (
                        <div style={{
                          marginTop: '10px',
                          padding: '10px 14px',
                          backgroundColor: '#f5f7fb',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                        }}>
                          <strong style={{ color: '#1a237e' }}>📩 Response:</strong>
                          <p style={{ margin: '4px 0 0 0', color: '#555' }}>{complaint.response}</p>
                          {complaint.responded_at && (
                            <small style={{ color: '#999' }}>
                              {new Date(complaint.responded_at).toLocaleString()}
                            </small>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ========== NEW COMPLAINT MODAL ========== */}
      {showComplaintModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => !submittingComplaint && setShowComplaintModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '550px',
              width: '100%',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#1a237e' }}>📋 Submit Complaint</h3>
              <button
                onClick={() => setShowComplaintModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.9rem' }}>
                Department
              </label>
              <input
                type="text"
                value={`${departmentName} (${departmentCode})`}
                disabled
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  background: '#f5f5f5',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.9rem' }}>
                Category *
              </label>
              <select
                value={newComplaint.category}
                onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                }}
              >
                <option value="academic">📚 Academic</option>
                <option value="administrative">📋 Administrative</option>
                <option value="lecturer">👨‍🏫 Lecturer</option>
                <option value="facility">🏢 Facility</option>
                <option value="other">📝 Other</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.9rem' }}>
                Title *
              </label>
              <input
                type="text"
                value={newComplaint.title}
                onChange={(e) => setNewComplaint({ ...newComplaint, title: e.target.value })}
                placeholder="Brief title of your complaint"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.9rem' }}>
                Description *
              </label>
              <textarea
                value={newComplaint.description}
                onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
                placeholder="Provide detailed description of your complaint..."
                rows="4"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowComplaintModal(false)}
                style={{
                  padding: '10px 20px',
                  background: '#e0e0e0',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitComplaint}
                disabled={submittingComplaint || !newComplaint.title.trim() || !newComplaint.description.trim()}
                style={{
                  padding: '10px 20px',
                  background: submittingComplaint || !newComplaint.title.trim() || !newComplaint.description.trim() ? '#bbb' : '#1a237e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: submittingComplaint || !newComplaint.title.trim() || !newComplaint.description.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {submittingComplaint ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpSupport;