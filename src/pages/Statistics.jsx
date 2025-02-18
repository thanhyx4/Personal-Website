import { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import './Statistics.css';
import config from '../config';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of current month
    end: new Date().toISOString().split('T')[0] // Today
  });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [chartType, setChartType] = useState('pie'); // 'pie' or 'bar'

  const categoryColors = {
    food: '#FF9800',
    transport: '#2196F3',
    shopping: '#E91E63',
    utilities: '#673AB7',
    entertainment: '#9C27B0',
    health: '#F44336',
    education: '#4CAF50',
    other: '#607D8B'
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `${config.apiUrl}/api/spending/stats?startDate=${dateRange.start}&endDate=${dateRange.end}`
      );
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.message || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const filteredStats = stats ? {
    ...stats,
    byCategory: selectedCategories.length > 0
      ? Object.fromEntries(
          Object.entries(stats.byCategory)
            .filter(([category]) => selectedCategories.includes(category))
        )
      : stats.byCategory
  } : null;

  const chartData = filteredStats ? {
    labels: Object.keys(filteredStats.byCategory),
    datasets: [{
      data: Object.values(filteredStats.byCategory),
      backgroundColor: Object.keys(filteredStats.byCategory).map(cat => categoryColors[cat]),
      borderWidth: 1
    }]
  } : {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
      borderWidth: 1
    }]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right'
      },
      title: {
        display: true,
        text: 'Spending by Category'
      }
    }
  };

  if (loading) return (
    <div className="statistics-page loading">
      <div className="loading-spinner">
        <i className="fas fa-spinner fa-spin"></i>
        <span>Loading statistics...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="statistics-page error">
      <div className="error-message">
        <i className="fas fa-exclamation-circle"></i>
        <span>{error}</span>
        <button onClick={fetchStats}>Try Again</button>
      </div>
    </div>
  );

  if (!stats) return null;

  return (
    <div className="statistics-page">
      <h1>Spending Statistics</h1>
      
      <div className="date-range">
        <input
          type="date"
          value={dateRange.start}
          onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
        />
        <span>to</span>
        <input
          type="date"
          value={dateRange.end}
          onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
        />
      </div>

      {stats && (
        <>
          <div className="category-filters">
            {Object.keys(categoryColors).map(category => (
              <button
                key={category}
                className={`category-filter ${selectedCategories.includes(category) ? 'active' : ''}`}
                style={{ '--category-color': categoryColors[category] }}
                onClick={() => toggleCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="chart-controls">
            <button
              className={`chart-type-button ${chartType === 'pie' ? 'active' : ''}`}
              onClick={() => setChartType('pie')}
            >
              <i className="fas fa-chart-pie"></i>
            </button>
            <button
              className={`chart-type-button ${chartType === 'bar' ? 'active' : ''}`}
              onClick={() => setChartType('bar')}
            >
              <i className="fas fa-chart-bar"></i>
            </button>
          </div>

          <div className="chart-container">
            {chartType === 'pie' ? (
              <Pie data={chartData} options={chartOptions} />
            ) : (
              <Bar data={chartData} options={chartOptions} />
            )}
          </div>

          <div className="stats-grid">
            <div className="stats-card total">
              <h2>Total Spending</h2>
              <div className="amount">{formatAmount(stats.total)}</div>
            </div>

            <div className="stats-card categories">
              <h2>By Category</h2>
              {Object.entries(stats.byCategory).map(([category, amount]) => (
                <div key={category} className="category-row">
                  <span className={`category-dot ${category}`}></span>
                  <span className="category-name">{category}</span>
                  <span className="category-amount">{formatAmount(amount)}</span>
                </div>
              ))}
            </div>

            <div className="stats-card recent">
              <h2>Recent Transactions</h2>
              {stats.recentTransactions.map((transaction, index) => (
                <div key={index} className="transaction-row">
                  <div className="transaction-date">
                    {new Date(transaction.date).toLocaleDateString()}
                  </div>
                  <div className="transaction-description">
                    {transaction.description}
                  </div>
                  <div className="transaction-amount">
                    {formatAmount(transaction.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Statistics; 