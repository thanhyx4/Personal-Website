import { useState, useRef, useEffect } from 'react';
import './LuckyWheel.css';

function LuckyWheel() {
  const [values, setValues] = useState([
    '🎁 Prize 1',
    '🎮 Game Console',
    '💰 Cash Prize',
    '🎨 Art Supply',
    '📱 Phone',
    '🎵 Music Player',
    '🎪 Theme Park Tickets',
    '🎭 Movie Tickets'
  ]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [eliminatedValues, setEliminatedValues] = useState([]);
  const [spinMode, setSpinMode] = useState('normal'); // 'normal' or 'eliminate'
  const [spinDuration, setSpinDuration] = useState(8000);
  const [isMoving, setIsMoving] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const wheelRef = useRef(null);
  const [spinSound] = useState(() => {
    const audio = new Audio('/sounds/spin-sound.mp3');
    audio.volume = 1.0; // Max volume
    audio.loop = true;
    return audio;
  });
  const [resultSound] = useState(() => {
    const audio = new Audio('/sounds/result-sound.mp3');
    audio.volume = 0.5; // Max volume
    return audio;
  });
  const slowSpinInterval = useRef(null);
  const [lastSpinTime, setLastSpinTime] = useState(0);
  const [collectionMode, setCollectionMode] = useState(false);
  const [spinTimes, setSpinTimes] = useState(2);
  const [currentSpinCount, setCurrentSpinCount] = useState(0);
  const [collection, setCollection] = useState([]);
  const resultTimeoutRef = useRef(null);
  const [showingSummary, setShowingSummary] = useState(false);

  useEffect(() => {
    // Configure sounds
    spinSound.loop = false; // Make spin sound loop while spinning
    resultSound.loop = false;
    
    // Cleanup function
    return () => {
      spinSound.pause();
      resultSound.pause();
      spinSound.currentTime = 0;
      resultSound.currentTime = 0;
    };
  }, [spinSound, resultSound]);

  useEffect(() => {
    // Start slow spinning animation
    startSlowSpin();
    return () => clearInterval(slowSpinInterval.current);
  }, [isMoving]);

  const startSlowSpin = () => {
    if (isMoving && !spinning) {
      let rotation = 0;
      slowSpinInterval.current = setInterval(() => {
        rotation += 0.5;
        if (wheelRef.current) {
          wheelRef.current.style.transform = `rotate(${rotation}deg)`;
        }
      }, 50);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const rows = pasteData.split(/\n/).filter(row => row.trim());
    setValues(rows);
  };

  const handleInputChange = (e) => {
    // Split by newlines and filter out empty/whitespace-only values
    const inputValues = e.target.value
      .split('\n')
      .map(v => v.trim())
      .filter(v => v !== '');
    
    // If the last character is a newline, add an empty line
    if (e.target.value.endsWith('\n')) {
      inputValues.push('');
    }
    
    setValues(inputValues);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // Don't add new line if current line is empty and it's the last line
      if (e.target.value.trim().endsWith('\n')) {
        e.preventDefault();
      }
    }
  };

  const addInput = () => {
    setValues([...values, '']);
  };

  const removeInput = (index) => {
    const newValues = values.filter((_, i) => i !== index);
    setValues(newValues);
  };

  const shuffleValues = () => {
    const shuffled = [...values].sort(() => Math.random() - 0.5);
    setValues(shuffled);
  };

  const getValidValues = () => values.filter(v => v.trim());

  // Update validateSpinTimes to require minimum 2 spins
  const validateSpinTimes = (value) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 2) return 2; // Changed minimum to 2
    const maxSpins = spinMode === 'eliminate' ? getActiveValues().length : 100;
    return Math.min(num, maxSpins);
  };

  const handleSpinTimesChange = (e) => {
    const value = validateSpinTimes(e.target.value);
    setSpinTimes(value);
  };

  const getActiveValues = () => {
    const validValues = values.filter(v => v.trim());
    return spinMode === 'eliminate' 
      ? validValues.filter(v => !eliminatedValues.includes(v))
      : validValues;
  };

  const handleSpin = () => {
    const activeValues = getActiveValues();
    if (spinning || activeValues.length === 0) return;

    // Check if we've reached the target number of spins
    if (collectionMode && currentSpinCount >= spinTimes) {
      return;
    }

    setSpinning(true);
    setResult(null);
    clearInterval(slowSpinInterval.current);

    // Start spin sound from last position or beginning
    if (lastSpinTime > 0) {
      spinSound.currentTime = lastSpinTime;
    } else {
      spinSound.currentTime = 0;
    }
    
    let volume = 0;
    spinSound.volume = volume;
    spinSound.play();
    
    // Fade in the spin sound
    const fadeIn = setInterval(() => {
      volume = Math.min(volume + 0.1, 1.0);
      spinSound.volume = volume;
      if (volume >= 1.0) clearInterval(fadeIn);
    }, 50);

    const randomIndex = Math.floor(Math.random() * activeValues.length);
    const selectedValue = activeValues[randomIndex];
    const totalRotation = 3600 + (360 * randomIndex / activeValues.length);

    if (wheelRef.current) {
      wheelRef.current.style.transition = `transform ${spinDuration/1000}s cubic-bezier(0.2, 0.8, 0.2, 1)`;
      wheelRef.current.style.transform = `rotate(${totalRotation}deg)`;
    }

    setTimeout(() => {
      setSpinning(false);
      setResult(selectedValue);
      setShowResult(true);
      
      // Store current position before fade out
      setLastSpinTime(spinSound.currentTime);
      
      // Fade out spin sound and play result sound
      const fadeOut = setInterval(() => {
        volume = Math.max(spinSound.volume - 0.1, 0);
        spinSound.volume = volume;
        if (volume <= 0) {
          clearInterval(fadeOut);
          spinSound.pause();
          resultSound.currentTime = 0;
          resultSound.play();
        }
      }, 50);

      if (spinMode === 'eliminate') {
        setEliminatedValues([...eliminatedValues, selectedValue]);
      }

      if (collectionMode) {
        const newCollection = [...collection, selectedValue];
        setCollection(newCollection);
        
        // Increment count after successful spin
        const newCount = currentSpinCount + 1;
        setCurrentSpinCount(newCount);
        
        // Check if this is the last spin
        if (newCount >= spinTimes) {
          setCollectionMode(false);
          // Don't show summary yet - wait for handleResultClose
        }
      }

      if (isMoving) {
        startSlowSpin();
      }
    }, spinDuration);
  };

  const resetWheel = () => {
    setEliminatedValues([]);
    setResult(null);
    if (wheelRef.current) {
      wheelRef.current.style.transition = 'none';
      wheelRef.current.style.transform = 'rotate(0deg)';
    }
  };

  const toggleMovement = () => {
    setIsMoving(!isMoving);
    if (!isMoving) {
      startSlowSpin();
    } else {
      clearInterval(slowSpinInterval.current);
    }
  };

  const handleResultClose = () => {
    setShowResult(false);
    resultSound.pause();
    resultSound.currentTime = 0;
    
    if (collectionMode) {
      if (currentSpinCount < spinTimes) {
        handleSpin();
      }
    } else if (currentSpinCount === spinTimes && !showingSummary) {
      // Show summary after closing the last result
      setShowingSummary(true);
      setTimeout(() => showCollectionSummary(collection), 100);
    }
    
    if (spinMode === 'eliminate' && result && !collectionMode) {
      setValues(values.filter(v => v !== result));
      setResult(null);
    }

    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
    }
  };

  const startCollection = () => {
    setCollectionMode(true);
    setCollection([]);
    setShowingSummary(false);
    setCurrentSpinCount(0); // Start from 0
  };

  // Add this useEffect to handle the first spin
  useEffect(() => {
    if (collectionMode && currentSpinCount === 0) {
      const activeValues = getActiveValues();
      if (activeValues.length > 0) {
        handleSpin();
      }
    }
  }, [collectionMode, currentSpinCount]); // Only run when these values change

  const showCollectionSummary = (finalCollection) => {
    if (!finalCollection || finalCollection.length === 0) return;

    const summary = spinMode === 'eliminate' 
      ? [...new Set(finalCollection)] 
      : finalCollection;

    setShowResult(true);
    setResult(
      <div className="collection-summary">
        <h4>Collection Complete! 🎉</h4>
        <div className="collection-count">
          {summary.length} {spinMode === 'eliminate' ? 'unique items' : 'items'} collected in {spinTimes} spins
        </div>
        <div className="collection-list">
          <h5>Collection History:</h5>
          <div className="collection-items">
            {finalCollection.map((item, index) => (
              <div key={index} className="collection-item">
                <span className="item-number">{index + 1}.</span>
                <span className="item-value">{item}</span>
              </div>
            ))}
          </div>
          {spinMode === 'eliminate' && summary.length !== finalCollection.length && (
            <div className="unique-items">
              <h5>Unique Items ({summary.length} unique out of {finalCollection.length} total):</h5>
              <div className="collection-items">
                {summary.map((item, index) => (
                  <div key={index} className="collection-item unique">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add error handling for sounds
  const handleSoundError = (e) => {
    console.error('Sound failed to load:', e);
  };

  useEffect(() => {
    // Add error handlers to sounds
    spinSound.addEventListener('error', handleSoundError);
    resultSound.addEventListener('error', handleSoundError);

    return () => {
      spinSound.removeEventListener('error', handleSoundError);
      resultSound.removeEventListener('error', handleSoundError);
    };
  }, [spinSound, resultSound]);

  // Add cleanup for lastSpinTime when component unmounts
  useEffect(() => {
    return () => {
      setLastSpinTime(0);
      spinSound.pause();
      resultSound.pause();
      spinSound.currentTime = 0;
      resultSound.currentTime = 0;
    };
  }, [spinSound, resultSound]);

  // Add cleanup for collection mode
  useEffect(() => {
    return () => {
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
      }
    };
  }, []);

  const resetCollection = () => {
    setCollectionMode(false);
    setCurrentSpinCount(0);
    setCollection([]);
    setSpinning(false);
    setShowingSummary(false); // Reset summary state
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
    }
    // Stop any ongoing animations
    if (wheelRef.current) {
      wheelRef.current.style.transition = 'none';
      wheelRef.current.style.transform = 'rotate(0deg)';
    }
    // Reset sounds
    spinSound.pause();
    resultSound.pause();
    spinSound.currentTime = 0;
    resultSound.currentTime = 0;
  };

  return (
    <div className="lucky-wheel-page">
      <div className="wheel-controls">
        <h2>Lucky Wheel Values</h2>
        <div className="input-list">
          <textarea
            className="multi-input"
            value={values.join('\n')}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Enter values (one per line)&#10;Or paste multiple values"
            rows={10}
          />
          <div className="input-info">
            {values.filter(v => v.trim()).length} values added
          </div>
        </div>

        <div className="wheel-settings">
          <div className="mode-selector">
            <label>
              <input
                type="radio"
                value="normal"
                checked={spinMode === 'normal'}
                onChange={(e) => setSpinMode(e.target.value)}
              /> Normal Spin
            </label>
            <label>
              <input
                type="radio"
                value="eliminate"
                checked={spinMode === 'eliminate'}
                onChange={(e) => setSpinMode(e.target.value)}
              /> Eliminate Mode
            </label>
          </div>

          <button onClick={shuffleValues} className="shuffle-btn">
            <i className="fas fa-random"></i> Shuffle Values
          </button>

          <button onClick={toggleMovement} className="movement-btn">
            {isMoving ? 'Stop Movement' : 'Start Movement'}
          </button>

          {spinMode === 'eliminate' && (
            <button onClick={resetWheel} className="reset-btn">
              Reset Eliminations
            </button>
          )}
        </div>

        <div className="collection-controls">
          <div className="spins-input">
            <label>Number of Spins:</label>
            <input
              type="number"
              min="2" // Changed minimum to 2
              max={spinMode === 'eliminate' ? getActiveValues().length : 100}
              value={spinTimes}
              onChange={handleSpinTimesChange}
              disabled={spinning || collectionMode}
              placeholder="2"
            />
          </div>
          
          <div className="collection-buttons">
            <button 
              onClick={startCollection}
              disabled={spinning || collectionMode || getActiveValues().length === 0}
              className="collection-btn"
            >
              {collectionMode 
                ? `Collecting ${currentSpinCount + 1}/${spinTimes}` 
                : 'Start Collection'}
            </button>

            {collectionMode && (
              <button 
                onClick={resetCollection}
                className="reset-collection-btn"
              >
                Stop & Reset
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="wheel-container">
        <div className="wheel-pointer"></div>
        <div className="wheel" ref={wheelRef}>
          {getActiveValues().map((value, index) => {
            const rotation = (360 / getActiveValues().length) * index;
            const hue = (360 / getActiveValues().length) * index;
            return (
              <div
                key={index}
                className="wheel-item"
                style={{
                  transform: `rotate(${rotation}deg) translateY(-50%)`,
                  background: `linear-gradient(90deg, 
                    hsl(${hue}, 70%, 35%) 0%, 
                    hsl(${hue}, 70%, 45%) 50%, 
                    hsl(${hue}, 70%, 35%) 100%)`
                }}
              >
                <div className="wheel-text" style={{ transform: `rotate(90deg)` }}>
                  {value}
                </div>
              </div>
            );
          })}
        </div>
        <button 
          onClick={handleSpin} 
          disabled={spinning || getActiveValues().length === 0 || collectionMode}
          className="spin-btn"
        >
          {spinning ? 'Spinning...' : collectionMode 
            ? `Spin ${currentSpinCount + 1}/${spinTimes}`
            : 'SPIN!'}
        </button>
      </div>

      {showResult && (
        <div className="result-overlay" onClick={handleResultClose}>
          <div className="result-display" onClick={e => e.stopPropagation()}>
            <div className="fireworks">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="firework" style={{ '--delay': `${i * 0.2}s` }} />
              ))}
            </div>
            <h3>🎉 Congratulations! 🎉</h3>
            <div className="result-value">
              {typeof result === 'string' ? result : result}
            </div>
            {collectionMode && currentSpinCount < spinTimes && (
              <div className="spins-remaining">
                {spinTimes - currentSpinCount} spins remaining
              </div>
            )}
            <button 
              onClick={handleResultClose} 
              className="close-btn"
            >
              {collectionMode && currentSpinCount < spinTimes 
                ? 'Continue Collection' 
                : showingSummary 
                  ? 'Close Summary'
                  : spinMode === 'eliminate' && !collectionMode 
                    ? 'Remove & Close' 
                    : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LuckyWheel; 