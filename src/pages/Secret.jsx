import { useState, useRef, useEffect } from 'react';
import './Secret.css';

function Secret() {
  const [noButtonStyle, setNoButtonStyle] = useState({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [message, setMessage] = useState("Will you be my Valentine?");
  const [noCount, setNoCount] = useState(0);
  const [yesPressed, setYesPressed] = useState(false);
  const noButtonRef = useRef(null);
  const audioRef = useRef(null);

  const messages = [
    "Are you sure?",
    "Really sure?",
    "Think again!",
    "Last chance!",
    "Surely not?",
    "You might regret this!",
    "Give it another thought!",
    "Are you absolutely sure?",
    "This could be a mistake!",
    "Have a heart!",
    "Don't be so cold!",
    "Change of heart?",
    "Wouldn't you reconsider?",
    "Is that your final answer?",
    "You're breaking my heart ;(",
  ];

  useEffect(() => {
    if (yesPressed) {
      document.body.style.overflow = 'hidden';
      audioRef.current?.play();
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [yesPressed]);

  const handleNoClick = () => {
    setNoCount(prev => prev + 1);
    setMessage(messages[Math.min(noCount, messages.length - 1)]);
    
    // Make Yes button bigger with each No
    const yesButton = document.querySelector('.yes-button');
    const currentSize = parseFloat(getComputedStyle(yesButton).fontSize);
    yesButton.style.fontSize = `${currentSize * 1.1}px`;

    // Random position for No button
    const maxX = window.innerWidth - noButtonRef.current.offsetWidth;
    const maxY = window.innerHeight - noButtonRef.current.offsetHeight;
    const newX = Math.random() * maxX;
    const newY = Math.random() * maxY;
    
    setNoButtonStyle({
      position: 'fixed',
      left: `${newX}px`,
      top: `${newY}px`,
      transition: 'all 0.3s ease'
    });
  };

  const handleYesClick = () => {
    setYesPressed(true);
    setShowConfetti(true);
    setMessage("Yay! You've made my heart skip a beat! ❤️");
  };

  const handleMouseOver = () => {
    if (!yesPressed) {
      const maxX = window.innerWidth - noButtonRef.current.offsetWidth;
      const maxY = window.innerHeight - noButtonRef.current.offsetHeight;
      const newX = Math.random() * maxX;
      const newY = Math.random() * maxY;
      
      setNoButtonStyle({
        position: 'fixed',
        left: `${newX}px`,
        top: `${newY}px`,
        transition: 'all 0.3s ease'
      });
    }
  };

  return (
    <div className="secret-page">
      <audio ref={audioRef} src="/romantic-music.mp3" />
      
      <div className="hearts-background"></div>
      
      <div className="content">
        <h1>{message}</h1>
        
        <div className="buttons">
          <button 
            className="yes-button"
            onClick={handleYesClick}
            style={{ fontSize: `${Math.min(16 + noCount * 2, 40)}px` }}
          >
            Yes 🥰
          </button>
          
          {!yesPressed && (
            <button
              ref={noButtonRef}
              className="no-button"
              onClick={handleNoClick}
              onMouseOver={handleMouseOver}
              style={noButtonStyle}
            >
              No 😢
            </button>
          )}
        </div>
      </div>

      {yesPressed && (
        <div className="celebration">
          <div className="confetti-container">
            {[...Array(50)].map((_, i) => (
              <div 
                key={i} 
                className="confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  backgroundColor: ['#ff6b6b', '#f06292', '#e91e63'][Math.floor(Math.random() * 3)]
                }}
              >
                ❤️
              </div>
            ))}
          </div>
          <div className="celebration-message">
            <h2>You've made my heart skip a beat! ❤️</h2>
            <p>Thank you for saying Yes!</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Secret; 