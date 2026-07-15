import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { Send, X, CheckCheck, MessageSquare } from 'lucide-react';
import { notifyError } from '../utils/notifications';

const TaskChatModal = ({ isOpen, onClose, taskId, taskTitle, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  const authConfig = useCallback(() => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  }), []);

  const fetchMessages = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get(`/api/tasks/${taskId}/messages`, authConfig());
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [taskId, authConfig]);

  // Setup polling when open
  useEffect(() => {
    if (isOpen && taskId) {
      fetchMessages(true);
      
      // Poll every 3 seconds for new messages
      pollingRef.current = setInterval(() => {
        fetchMessages(false);
      }, 3000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isOpen, taskId, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await api.post(`/api/tasks/${taskId}/messages`, {
        message: newMessage.trim()
      }, authConfig());
      setNewMessage('');
      fetchMessages(false);
    } catch (error) {
      console.error('Error sending message:', error);
      notifyError('Failed to send message');
    }
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm transition-all duration-300"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col h-[550px] border border-gray-100 overflow-hidden transform scale-100 transition-all duration-300">
        
        {/* Header */}
        <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-100" />
            <div>
              <h3 className="font-semibold text-lg leading-tight line-clamp-1">{taskTitle}</h3>
              <p className="text-xs text-blue-100 mt-0.5">Task Chat & Discussion</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-blue-700 transition-colors text-white hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Body / Messages */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-full text-gray-500 text-sm">
              Loading chat history...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-gray-400 text-center p-6">
              <MessageSquare className="w-12 h-12 mb-2 text-gray-300" />
              <p className="text-sm">No messages yet on this task.</p>
              <p className="text-xs mt-1">Start the conversation by sending a message below.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === currentUser.employee_id && msg.sender_role === currentUser.role;
              return (
                <div 
                  key={msg.message_id} 
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-gray-500 mb-1 px-1">
                    {msg.sender_name} ({msg.sender_role})
                  </span>
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-sm relative transition-all ${
                      isMine 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    <div className="flex justify-end items-center gap-1 mt-1 text-[9px] opacity-75">
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMine && (
                        <span className="inline-flex items-center ml-1">
                          {msg.is_seen === 1 ? (
                            <CheckCheck className="w-4 h-4 text-green-400 font-bold" strokeWidth={3} />
                          ) : (
                            <CheckCheck className="w-4 h-4 text-red-500 font-bold" strokeWidth={3} />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSendMessage} className="p-3 border-t bg-white flex gap-2 items-center">
          <input
            type="text"
            placeholder="Type your reply..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default TaskChatModal;
