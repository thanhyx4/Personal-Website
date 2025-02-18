import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import About from './pages/About'
import Projects from './pages/Projects'
import Contact from './pages/Contact'
import Chatbot from './components/Chatbot'
import SpendingTracker from './components/SpendingTracker'
import Statistics from './pages/Statistics'
import Secret from './pages/Secret'
import LuckyWheel from './pages/LuckyWheel'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/secret" element={<Secret />} />
            <Route path="/lucky-wheel" element={<LuckyWheel />} />
          </Routes>
        </main>
        <SpendingTracker />
        <Chatbot />
      </div>
    </Router>
  )
}

export default App 