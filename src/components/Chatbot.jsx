import { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import config from '../config';

// Get the local IP address from window.location

const CHAT_API_URL = `${config.apiUrl}/chat`;

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Thanh's AI assistant. How can I help you today?",
      source: 'System'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage,
      source: 'User',
      model: 'Human',
      provider: 'User'
    }]);
    setIsTyping(true);

    try {
      const response = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ message: userMessage })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.message,
          source: data.source,
          model: data.model,
          provider: data.provider
        }]);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble responding right now. Please try again later.",
        source: 'Error',
        model: 'N/A',
        provider: 'System'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = { text: inputMessage, sender: 'user' };
    setInputMessage('');
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await fetch(`${config.apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: inputMessage,
          model: 'Human' 
        })
      });

      const data = await response.json();
      if (data.success) {
        const botMessage = { text: data.response, sender: 'bot' };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = { 
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="chatbot-container">
      <button 
        className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-comments'}`}></i>
      </button>

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3>Chat with AI Assistant</h3>
          </div>
          
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`message ${msg.role === 'user' ? 'user' : 'assistant'}`}
              >
                {msg.content}
                <span className="message-source">
                  {msg.source} 
                  {msg.model !== 'Human' && ` • ${msg.model}`} 
                  {msg.provider !== 'User' && ` • ${msg.provider}`}
                </span>
              </div>
            ))}
            {isTyping && (
              <div className="message assistant typing">
                <span>.</span><span>.</span><span>.</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="chatbot-input">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
            />
            <button type="submit">
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Chatbot; 