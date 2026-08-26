// src/services/chatHistoryService.js
import { supabase } from './supabase';

export const chatHistoryService = {
  _messageCache: new Map(),
  _loadingPromises: new Map(),

  /**
   * Get the correct student ID (use the student record ID, not auth user ID)
   */
  _getStudentId: async (studentId) => {
    try {
      // First, check if the provided ID is a valid student record
      const { data: student, error } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId)
        .single();

      if (!error && student) {
        return studentId; // It's a valid student ID
      }

      // If not, try to find the student by auth user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: studentByAuth, error: authError } = await supabase
          .from('students')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (!authError && studentByAuth) {
          console.log('🔄 Found student by auth_user_id:', studentByAuth.id);
          return studentByAuth.id;
        }

        // Try by email
        if (user.email) {
          const { data: studentByEmail, error: emailError } = await supabase
            .from('students')
            .select('id')
            .eq('email', user.email)
            .single();

          if (!emailError && studentByEmail) {
            console.log('🔄 Found student by email:', studentByEmail.id);
            return studentByEmail.id;
          }
        }
      }

      // Return the original ID as fallback
      return studentId;
    } catch (error) {
      console.error('❌ Error getting student ID:', error);
      return studentId;
    }
  },

  /**
   * Save a single message to the database
   */
  saveMessage: async (studentId, message, sender, sessionId = null) => {
    try {
      console.log('🔍 SAVE MESSAGE CALLED:', { studentId, sender, sessionId });

      if (!studentId) {
        console.error('❌ No studentId provided for saving message');
        return null;
      }

      // Get the correct student ID
      const actualStudentId = await chatHistoryService._getStudentId(studentId);
      console.log('📌 Using student ID for save:', actualStudentId);

      const messageText = typeof message === 'string' ? message : message.text;
      const messageTimestamp = message?.timestamp || new Date().toISOString();
      
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }

      console.log('💾 Saving message with studentId:', actualStudentId);

      const { data, error } = await supabase
        .from('chat_history')
        .insert([
          {
            student_id: actualStudentId,
            message: messageText,
            sender: sender,
            timestamp: messageTimestamp,
            session_id: sessionId
          }
        ])
        .select();

      if (error) {
        console.error('❌ Error saving message:', error);
        return null;
      }

      console.log('✅ Message saved successfully');
      
      // Clear cache to force reload
      const cacheKey = `history_${actualStudentId}`;
      chatHistoryService._messageCache.delete(cacheKey);
      
      return data;
    } catch (error) {
      console.error('❌ Error in saveMessage:', error);
      return null;
    }
  },

  /**
   * Load chat history from database
   */
  loadChatHistory: async (studentId, limit = 100) => {
    try {
      if (!studentId) {
        console.error('❌ No studentId provided for loading chat history');
        return [];
      }

      console.log('📥 Loading chat history for student:', studentId);
      
      // Get the correct student ID
      const actualStudentId = await chatHistoryService._getStudentId(studentId);
      console.log('📌 Using student ID for load:', actualStudentId);
      
      // Check cache
      const cacheKey = `history_${actualStudentId}`;
      if (chatHistoryService._messageCache.has(cacheKey)) {
        console.log('✅ Using cached chat history');
        return chatHistoryService._messageCache.get(cacheKey);
      }

      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('student_id', actualStudentId)
        .order('timestamp', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('❌ Error loading chat history:', error);
        return [];
      }

      console.log(`✅ Loaded ${data?.length || 0} messages from database`);
      
      const formatted = (data || []).map(item => ({
        id: item.id,
        text: item.message,
        sender: item.sender,
        timestamp: new Date(item.timestamp)
      }));
      
      // Cache the result
      chatHistoryService._messageCache.set(cacheKey, formatted);
      
      return formatted;
    } catch (error) {
      console.error('❌ Error in loadChatHistory:', error);
      return [];
    }
  },

  /**
   * Save multiple messages in batch
   */
  saveMessagesBatch: async (studentId, messages, sessionId = null) => {
    try {
      if (!studentId || !messages || messages.length === 0) {
        return null;
      }

      const actualStudentId = await chatHistoryService._getStudentId(studentId);

      const formattedMessages = messages.map(msg => ({
        student_id: actualStudentId,
        message: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp || new Date().toISOString(),
        session_id: sessionId
      }));

      const { data, error } = await supabase
        .from('chat_history')
        .insert(formattedMessages)
        .select();

      if (error) {
        console.error('❌ Error saving chat messages batch:', error);
        return null;
      }

      console.log(`✅ Saved ${data?.length || 0} messages in batch`);
      return data;
    } catch (error) {
      console.error('❌ Error in saveMessagesBatch:', error);
      return null;
    }
  },

  /**
   * Clear chat history for a student
   */
  clearChatHistory: async (studentId) => {
    try {
      if (!studentId) {
        console.error('❌ No studentId provided for clearing chat history');
        return false;
      }

      const actualStudentId = await chatHistoryService._getStudentId(studentId);

      console.log('🗑️ Clearing chat history for student:', actualStudentId);
      
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('student_id', actualStudentId);

      if (error) {
        console.error('❌ Error clearing chat history:', error);
        return false;
      }

      const cacheKey = `history_${actualStudentId}`;
      chatHistoryService._messageCache.delete(cacheKey);
      
      console.log('✅ Chat history cleared');
      return true;
    } catch (error) {
      console.error('❌ Error in clearChatHistory:', error);
      return false;
    }
  },

  /**
   * Get the latest chat session ID or create a new one
   */
  getOrCreateSession: async (studentId) => {
    try {
      if (!studentId) {
        console.error('❌ No studentId provided for session');
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }

      const actualStudentId = await chatHistoryService._getStudentId(studentId);

      console.log('🔑 Getting session for student:', actualStudentId);
      
      const { data, error } = await supabase
        .from('chat_history')
        .select('session_id')
        .eq('student_id', actualStudentId)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ Error getting session:', error);
        const newSession = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        console.log('✅ Created new session:', newSession);
        return newSession;
      }

      if (data && data.length > 0 && data[0].session_id) {
        console.log('✅ Using existing session:', data[0].session_id);
        return data[0].session_id;
      }

      const newSession = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      console.log('✅ Created new session:', newSession);
      return newSession;
    } catch (error) {
      console.error('❌ Error in getOrCreateSession:', error);
      return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
  }
};