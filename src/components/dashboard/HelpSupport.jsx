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
  const [adminEmail, setAdminEmail] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
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

  // Find admin
  const fetchAdmin = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('email')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setAdminEmail(data?.email || 'admin@nleuniversity.ac.ug');
    } catch (err) {
      console.error('Error finding admin:', err);
      setAdminEmail('admin@nleuniversity.ac.ug');
    }
  }, []);

  // Load chat history
  const fetchMessages = useCallback(async () => {
    if (!studentEmail || !adminEmail) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(
          `and(sender_email.eq.${studentEmail},receiver_email.eq.${adminEmail}),` +
          `and(sender_email.eq.${adminEmail},receiver_email.eq.${studentEmail})`
        )
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw error;

      setMessages(data || []);

      // Mark unread messages from admin as read
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
  }, [studentEmail, adminEmail]);

  // Send message with optimistic update
  const sendMessage = async () => {
    if (!newMessage.trim() || !adminEmail || sending) return;

    const tempId = `temp-${Date.now()}`;
    const messageText = newMessage.trim();

    const optimisticMessage = {
      id: tempId,
      sender_email: studentEmail,
      sender_role: 'student',
      sender_name: studentName,
      receiver_email: adminEmail,
      receiver_role: 'admin',
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
          receiver_email: adminEmail,
          receiver_role: 'admin',
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
    if (!studentEmail || !adminEmail) return;

    // Clean previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log('Setting up realtime for:', studentEmail, '↔', adminEmail);

    const channel = supabase
      .channel(`help-support-${studentEmail}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT + UPDATE
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          console.log('Realtime event:', payload.eventType, payload.new);

          const msg = payload.new;
          if (!msg) return;

          const isThisConversation =
            (msg.sender_email === studentEmail && msg.receiver_email === adminEmail) ||
            (msg.sender_email === adminEmail && msg.receiver_email === studentEmail);

          if (!isThisConversation) return;

          if (payload.eventType === 'INSERT') {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === msg.id)) return prev;

              // Remove any temporary optimistic message with same text
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
        console.log('Realtime subscription status:', status);
      });

    channelRef.current = channel;

    // Fallback polling every 7 seconds (guarantees messages appear)
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 7000);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      clearInterval(pollInterval);
    };
  }, [studentEmail, adminEmail, fetchMessages]);

  // Initial load
  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  useEffect(() => {
    if (adminEmail) {
      setLoading(true);
      fetchMessages();
    }
  }, [adminEmail, fetchMessages]);

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
          Chat directly with the System Administrator. Messages appear in real-time.
        </p>
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
            👤
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 'clamp(0.95rem, 2.2vw, 1.05rem)' }}>
              System Administrator
            </div>
            <div style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', opacity: 0.85 }}>
              {adminEmail ? '● Online • Real-time chat' : 'Connecting...'}
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
                Send a message to start chatting with the administrator
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
                        Administrator
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
            placeholder="Type your message..."
            disabled={sending || !adminEmail}
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
            disabled={sending || !newMessage.trim() || !adminEmail}
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
    </div>
  );
};

export default HelpSupport;