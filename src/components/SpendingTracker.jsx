import { useState, useEffect, useRef } from 'react';
import './SpendingTracker.css';
import config from '../config';

function SpendingTracker() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [spendings, setSpendings] = useState([]);
  const [status, setStatus] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const [language, setLanguage] = useState('en-US');

  const API_URL = `${config.apiUrl}/api/spending`;
  const API_LIST_URL = `${config.apiUrl}/api/spending/list`;

  useEffect(() => {
    // Load existing spendings when component mounts
    fetchSpendings();

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setInput(text);
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  const fetchSpendings = async () => {
    try {
      const response = await fetch(API_LIST_URL);
      const data = await response.json();
      if (data.success) {
        setSpendings(data.spendings);
      }
    } catch (error) {
      console.error('Error fetching spendings:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setStatus('Saving...');
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: input })
      });

      const data = await response.json();
      if (data.success) {
        setStatus('Saved successfully!');
        setInput('');
        // Refresh spendings list
        fetchSpendings();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
    setTimeout(() => setStatus(''), 3000);
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en-US' ? 'vi-VN' : 'en-US');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <div className="spending-tracker">
      <button 
        className={`spending-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className="fas fa-wallet"></i>
      </button>

      {isOpen && (
        <div className="spending-window">
          <div className="spending-header">
            <h3>Spending Tracker</h3>
            <button className="close-button" onClick={() => setIsOpen(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="spending-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={language === 'en-US' ? 
                "e.g., Lunch 50k yesterday and taxi 200k" : 
                "VD: Ăn trưa 50k hôm qua và taxi 200k"}
            />
            <button type="button" onClick={toggleLanguage} className="language-button">
              <i className="fas fa-globe"></i>
              <span>{language === 'en-US' ? 'EN' : 'VI'}</span>
            </button>
            <button type="button" onClick={toggleVoiceInput} className="voice-button">
              <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
            </button>
            <button type="submit">
              <i className="fas fa-plus"></i>
            </button>
          </form>

          {status && <div className="status-message">{status}</div>}

          <div className="spending-list">
            {spendings.map((spending, index) => (
              <div key={index} className={`spending-item ${spending.category}`}>
                <div className="spending-date">{formatDate(spending.date)}</div>
                <div className="spending-details">
                  <div className="spending-description">{spending.description}</div>
                  <div className="spending-category">{spending.category}</div>
                </div>
                <div className="spending-amount">{formatAmount(spending.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SpendingTracker; 