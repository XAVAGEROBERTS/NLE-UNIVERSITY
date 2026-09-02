// src/components/dashboard/HelpSupport.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { supabase } from '../../services/supabase';

const HelpSupport = () => {
  const { user } = useStudentAuth();
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

  const studentEmail = user?.email || '';
  const studentName = user?.name || user?.full_name || 'Student';

  // Check screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Find the student's HOD based on their department
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
        console.error('Student has no department code:', student);
        setError('Your account is not assigned to any department. Please contact admin.');
        setLoading(false);
        return;
      }

      const deptCode = student.department_code;
      setDepartmentCode(deptCode);
      setDepartmentName(student.department || deptCode);

      console.log(`🔍 Looking for HOD of department: ${deptCode}`);

      // Step 2: Find the department to get HOD name and ID
      const { data: department, error: deptError } = await supabase
        .from('departments')
        .select('id, department_code, department_name, head_of_department')
        .eq('department_code', deptCode)
        .single();

      if (deptError) {
        console.error('Error fetching department:', deptError);
        setError('Could not find your department information. Please contact admin.');
        setLoading(false);
        return;
      }

      if (!department) {
        setError(`Department "${deptCode}" not found in the system.`);
        setLoading(false);
        return;
      }

      console.log(`📋 Found department: ${department.department_name}`);

      // Step 3: Find the HOD for this department
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

      if (hodError) {
        console.error('Error fetching HOD:', hodError);
        setError('Could not find your HOD. Please contact admin.');
        setLoading(false);
        return;
      }

      if (!hodRoles || hodRoles.length === 0) {
        console.warn(`⚠️ No HOD found for department: ${deptCode}`);
        setError(`No HOD assigned to ${department.department_name} yet. Please contact admin.`);
        setLoading(false);
        return;
      }

      const hod = hodRoles[0];
      const hodDisplayName = hod.departments?.head_of_department || hod.email?.split('@')[0] || 'HOD';

      console.log(`✅ Found HOD: ${hodDisplayName} (${hod.email})`);

      setHodEmail(hod.email);
      setHodName(hodDisplayName);
      
      // Also try to get the HOD's name from the departments table
      if (hod.departments?.head_of_department) {
        setHodName(hod.departments.head_of_department);
      }

    } catch (err) {
      console.error('Error in fetchHOD:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [studentEmail]);

  // Fallback: Try to find HOD using department_code directly from lecturer_departments
  const fetchHODFallback = useCallback(async () => {
    try {
      console.log('🔄 Using fallback method to find HOD...');
      
      // Try to get student's department from any source
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('department_code, department')
        .eq('email', studentEmail)
        .single();

      if (studentError || !student?.department_code) {
        setError('Unable to determine your department. Please contact admin.');
        setLoading(false);
        return;
      }

      const deptCode = student.department_code;
      
      // Find department
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

      // Find HOD for this department
      const { data: hodRoles, error: hodError } = await supabase
        .from('user_roles')
        .select('id, email, role, department_id, profile_picture_url')
        .eq('role', 'hod')
        .eq('department_id', department.id)
        .limit(1);

      if (hodError || !hodRoles || hodRoles.length === 0) {
        setError(`No HOD assigned to ${department.department_name}.`);
        setLoading(false);
        return;
      }

      const hod = hodRoles[0];
      setHodEmail(hod.email);
      setHodName(department.head_of_department || hod.email?.split('@')[0] || 'HOD');
      setDepartmentCode(deptCode);
      setDepartmentName(department.department_name);

    } catch (err) {
      console.error('Fallback error:', err);
      setError('Unable to connect to support. Please try again later.');
      setLoading(false);
    }
  }, [studentEmail]);

  // Load chat history with the HOD
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

  // Send message with optimistic update
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

    // Optimistic UI
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
        }])
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real one from database
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data : m))
      );
    } catch (err) {
      console.error('Send error:', err);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ========== REAL-TIME + FALLBACK POLLING ==========
  useEffect(() => {
    if (!studentEmail || !hodEmail) return;

    // Clean previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log('🔵 Setting up realtime chat for:', studentEmail, '↔', hodEmail);

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
      .subscribe((status) => {
        console.log('🟢 Realtime subscription status:', status);
      });

    channelRef.current = channel;

    // Fallback polling every 7 seconds
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

  // Initial load
  useEffect(() => {
    fetchHOD();
  }, [fetchHOD]);

  useEffect(() => {
    if (hodEmail) {
      setLoading(true);
      fetchMessages();
    }
  }, [hodEmail, fetchMessages]);

  // Render error state
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
          <div style={{ marginTop: '16px', fontSize: '14px', color: '#856404' }}>
            <p>You can also contact your department directly:</p>
            <p style={{ fontWeight: 'bold' }}>Department: {departmentName || 'Unknown'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 'clamp(16px, 3vw, 24px)' }}>
        <h1
          style={{
            fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
            fontWeight: 700,
            color: '#1a237e',
            margin: 0,
          }}
        >
          🎧 Help & Support
        </h1>
        <p
          style={{
            color: '#666',
            marginTop: '6px',
            fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
          }}
        >
          Chat directly with your <strong>Head of Department</strong>. Messages appear in real-time.
        </p>
        {departmentName && (
          <p style={{ fontSize: '0.85rem', color: '#1976d2', marginTop: '4px' }}>
            📚 Department: <strong>{departmentName}</strong>
          </p>
        )}
      </div>

      {/* Chat Card */}
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
            <div style={{ textAlign: 'center', margin: 'auto', color: '#888' }}>
              Loading conversation...
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
              {departmentName && (
                <p style={{ marginTop: '8px', fontSize: '0.8rem', color: '#1976d2' }}>
                  📚 Department: {departmentName}
                </p>
              )}
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

      {/* Department Info Footer */}
      {departmentName && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: '#e3f2fd',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: '#1565c0',
            textAlign: 'center',
          }}
        >
          🔒 You are chatting with the <strong>Head of {departmentName}</strong>
          {departmentCode && <span> • Department Code: <strong>{departmentCode}</strong></span>}
        </div>
      )}
    </div>
  );
};

export default HelpSupport;