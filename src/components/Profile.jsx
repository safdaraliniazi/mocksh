import { useState } from 'react'

// Circular progress chart component
const CircularProgress = ({ percentage, label, color = 'var(--accent-primary)' }) => {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  return (
    <div className="cf-circular-chart">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="var(--border-primary)"
          strokeWidth="12"
        />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
          className="cf-circular-chart__progress"
        />
        <text
          x="90"
          y="85"
          textAnchor="middle"
          fontSize="32"
          fontWeight="700"
          fill="var(--text-primary)"
        >
          {Math.round(percentage)}%
        </text>
        <text
          x="90"
          y="105"
          textAnchor="middle"
          fontSize="12"
          fill="var(--text-secondary)"
        >
          {label}
        </text>
      </svg>
    </div>
  )
}

// Line chart component for score progression
const LineChart = ({ data, width = 800, height = 300 }) => {
  if (!data || data.length === 0) return null

  const padding = { top: 20, right: 30, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxY = 100
  const minY = 0
  const maxX = data.length - 1

  const getX = (index) => padding.left + (index / maxX) * chartWidth
  const getY = (value) => padding.top + chartHeight - ((value - minY) / (maxY - minY)) * chartHeight

  // Create path for line
  const linePath = data
    .map((point, index) => {
      const x = getX(index)
      const y = getY(point.percentage)
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    })
    .join(' ')

  // Create area path for gradient fill
  const areaPath = 
    linePath +
    ` L ${getX(data.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`

  // Calculate average line
  const average = data.reduce((sum, d) => sum + d.percentage, 0) / data.length

  return (
    <div className="cf-line-chart">
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line
              x1={padding.left}
              y1={getY(value)}
              x2={padding.left + chartWidth}
              y2={getY(value)}
              stroke="var(--border-light)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 10}
              y={getY(value) + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--text-secondary)"
            >
              {value}%
            </text>
          </g>
        ))}

        {/* Average line */}
        <line
          x1={padding.left}
          y1={getY(average)}
          x2={padding.left + chartWidth}
          y2={getY(average)}
          stroke="var(--accent-correct)"
          strokeWidth="2"
          strokeDasharray="6 3"
        />
        <text
          x={padding.left + chartWidth + 5}
          y={getY(average) - 5}
          fontSize="10"
          fill="var(--accent-correct)"
          fontWeight="600"
        >
          Avg
        </text>

        {/* Area */}
        <path d={areaPath} fill="url(#areaGradient)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--accent-primary)" strokeWidth="3" />

        {/* Data points */}
        {data.map((point, index) => (
          <g key={index}>
            <circle
              cx={getX(index)}
              cy={getY(point.percentage)}
              r="5"
              fill="var(--bg-secondary)"
              stroke="var(--accent-primary)"
              strokeWidth="3"
            />
            {/* X-axis labels */}
            {index % Math.ceil(data.length / 8) === 0 && (
              <text
                x={getX(index)}
                y={padding.top + chartHeight + 20}
                textAnchor="middle"
                fontSize="11"
                fill="var(--text-secondary)"
              >
                {index + 1}
              </text>
            )}
          </g>
        ))}

        {/* X-axis label */}
        <text
          x={padding.left + chartWidth / 2}
          y={height - 5}
          textAnchor="middle"
          fontSize="12"
          fill="var(--text-secondary)"
          fontWeight="600"
        >
          Test Number
        </text>
      </svg>
    </div>
  )
}

function Profile({ user, userProfile, userStats, testHistory, loadingStats, totalQuestionsInBank }) {
  const [reviewingTest, setReviewingTest] = useState(null)

  // Calculate unique questions solved correctly
  const calculateUniqueQuestionsSolved = () => {
    if (!testHistory || testHistory.length === 0) return 0
    
    const correctQuestions = new Set()
    
    testHistory.forEach(test => {
      if (!test.questions || !test.answers) return
      
      test.questions.forEach(question => {
        const userAnswer = test.answers[question.id]
        const isMultiSelect = Array.isArray(question.correctIndex)
        
        let isCorrect = false
        if (isMultiSelect) {
          const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : []
          const correctAnswer = question.correctIndex
          isCorrect = userAnswerArray.length === correctAnswer.length &&
                      userAnswerArray.every(val => correctAnswer.includes(val))
        } else {
          isCorrect = userAnswer === question.correctIndex
        }
        
        if (isCorrect) {
          correctQuestions.add(question.id)
        }
      })
    })
    
    return correctQuestions.size
  }

  // Determine rank based on average percentage
  const getRank = (avgPercentage) => {
    if (!avgPercentage) return { name: 'Newbie', color: '#808080' }
    if (avgPercentage >= 90) return { name: 'Grandmaster', color: '#ff0000' }
    if (avgPercentage >= 80) return { name: 'Master', color: '#ff8c00' }
    if (avgPercentage >= 70) return { name: 'Expert', color: '#aa00aa' }
    if (avgPercentage >= 60) return { name: 'Specialist', color: '#03a89e' }
    if (avgPercentage >= 50) return { name: 'Pupil', color: '#008000' }
    return { name: 'Newbie', color: '#808080' }
  }

  const uniqueQuestionsSolved = calculateUniqueQuestionsSolved()
  const rank = getRank(userStats?.avg_percentage)
  const displayName = userProfile?.full_name || user?.email?.split('@')[0] || 'User'

  // Calculate insights
  const calculateInsights = () => {
    if (!testHistory || testHistory.length < 2) return null

    let trend = 0
    
    if (testHistory.length >= 4) {
      // Split tests in half and compare
      const midPoint = Math.floor(testHistory.length / 2)
      const recentTests = testHistory.slice(0, midPoint)
      const olderTests = testHistory.slice(midPoint)
      
      const recentAvg = recentTests.reduce((sum, t) => sum + t.percentage, 0) / recentTests.length
      const olderAvg = olderTests.reduce((sum, t) => sum + t.percentage, 0) / olderTests.length
      
      trend = recentAvg - olderAvg
    } else {
      // For 2-3 tests, compare latest with earliest
      const latestScore = testHistory[0].percentage
      const earliestScore = testHistory[testHistory.length - 1].percentage
      trend = latestScore - earliestScore
    }

    // Calculate consistency (lower standard deviation = more consistent)
    const avg = userStats.avg_percentage || 0
    const variance = testHistory.reduce((sum, t) => sum + Math.pow(t.percentage - avg, 2), 0) / testHistory.length
    const stdDev = Math.sqrt(variance)
    const consistency = Math.max(0, 100 - stdDev * 2)

    return { trend, consistency }
  }

  const insights = calculateInsights()

  return (
    <div className="cf-container">
      {/* Profile Header */}
      <div className="cf-profile-header">
        <div className="cf-profile-header__main">
          <div className="cf-profile-avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="cf-profile-info">
            <h1 className="cf-profile-name">{displayName}</h1>
            <div className="cf-profile-rank" style={{ color: rank.color }}>
              {rank.name}
            </div>
          </div>
        </div>
        <div className="cf-profile-stats-summary">
          <div className="cf-profile-stat">
            <div className="cf-profile-stat__value">{userStats?.total_tests || 0}</div>
            <div className="cf-profile-stat__label">Tests Taken</div>
          </div>
          <div className="cf-profile-stat">
            <div className="cf-profile-stat__value">{uniqueQuestionsSolved} / {totalQuestionsInBank || 0}</div>
            <div className="cf-profile-stat__label">Questions Solved</div>
          </div>
        </div>
      </div>

      {/* Main Statistics */}
      <div className="cf-box">
        <div className="cf-box__header">Your Statistics</div>
        <div className="cf-box__body">
          {loadingStats ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading statistics...</div>
          ) : userStats ? (
            <>
              {/* Performance Metrics */}
              {insights && (
                <div className="cf-performance-metrics">
                  <div className="cf-metrics-grid">
                    <CircularProgress 
                      percentage={userStats.avg_percentage || 0}
                      label="Average"
                      color="var(--accent-primary)"
                    />
                    <CircularProgress 
                      percentage={userStats.best_percentage || 0}
                      label="Best Score"
                      color="var(--accent-correct)"
                    />
                    <CircularProgress 
                      percentage={insights.consistency}
                      label="Consistency"
                      color="var(--accent-neutral)"
                    />
                    <div className="cf-insight-card">
                      <div className="cf-insight-card__label">Recent Trend</div>
                      <div className={`cf-insight-card__value ${insights.trend >= 0 ? 'cf-insight-card__value--positive' : 'cf-insight-card__value--negative'}`}>
                        {insights.trend >= 0 ? '↑' : '↓'} {Math.abs(insights.trend).toFixed(1)}%
                      </div>
                      <div className="cf-insight-card__description">
                        {insights.trend >= 5 
                          ? 'Great improvement!' 
                          : insights.trend >= 0 
                            ? 'Steady progress' 
                            : insights.trend >= -5 
                              ? 'Minor dip' 
                              : 'Need more practice'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <p>No test data yet. Take your first test to see statistics!</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Chart */}
      {testHistory.length > 0 && (
        <div className="cf-box">
          <div className="cf-box__header">Performance Over Time</div>
          <div className="cf-box__body">
            <LineChart 
              data={testHistory.slice().reverse()} 
              width={Math.min(800, window.innerWidth - 100)}
              height={300}
            />
          </div>
        </div>
      )}

      {/* Test History Table */}
      <div className="cf-box">
        <div className="cf-box__header">Test History</div>
        <div className="cf-box__body">
          {testHistory.length > 0 ? (
            <table className="cf-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Test</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {testHistory.map((test) => (
                  <tr key={test.id}>
                    <td>{new Date(test.created_at).toLocaleDateString()}</td>
                    <td>{test.test_name}</td>
                    <td>
                      {test.score} / {test.total_questions}
                    </td>
                    <td>
                      <span
                        className={`cf-percentage ${
                          test.percentage >= 70
                            ? 'cf-percentage--good'
                            : test.percentage >= 50
                              ? 'cf-percentage--ok'
                              : 'cf-percentage--low'
                        }`}
                      >
                        {Math.round(test.percentage)}%
                      </span>
                    </td>
                    <td>
                      {Math.floor(test.time_taken_seconds / 60)}m {test.time_taken_seconds % 60}s
                    </td>
                    <td>
                      <button
                        className="cf-btn cf-btn--secondary cf-btn--small"
                        onClick={() => setReviewingTest(test)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No test history available.
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewingTest && (
        <div className="cf-modal-overlay" onClick={() => setReviewingTest(null)}>
          <div className="cf-modal-content cf-modal-content--large" onClick={(e) => e.stopPropagation()}>
            <div className="cf-modal-header">
              <h2>Test Review</h2>
              <button className="cf-modal-close" onClick={() => setReviewingTest(null)}>
                ✕
              </button>
            </div>
            
            <div className="cf-modal-body">
              {/* Test Summary */}
              <div className="cf-review-summary">
                <div className="cf-review-summary__item">
                  <span className="cf-review-summary__label">Date:</span>
                  <span>{new Date(reviewingTest.created_at).toLocaleDateString()}</span>
                </div>
                <div className="cf-review-summary__item">
                  <span className="cf-review-summary__label">Score:</span>
                  <span className={`cf-percentage ${
                    reviewingTest.percentage >= 70
                      ? 'cf-percentage--good'
                      : reviewingTest.percentage >= 50
                        ? 'cf-percentage--ok'
                        : 'cf-percentage--low'
                  }`}>
                    {reviewingTest.score} / {reviewingTest.total_questions} ({Math.round(reviewingTest.percentage)}%)
                  </span>
                </div>
                <div className="cf-review-summary__item">
                  <span className="cf-review-summary__label">Time:</span>
                  <span>{Math.floor(reviewingTest.time_taken_seconds / 60)}m {reviewingTest.time_taken_seconds % 60}s</span>
                </div>
              </div>

              {/* Questions Review */}
              {reviewingTest.questions && reviewingTest.questions.length > 0 ? (
                <div className="cf-review-questions">
                  {reviewingTest.questions.map((question, index) => {
                    const userAnswer = reviewingTest.answers[question.id]
                    const isMultiSelect = Array.isArray(question.correctIndex)
                    const correctAnswer = isMultiSelect ? question.correctIndex : [question.correctIndex]
                    
                    let isCorrect = false
                    if (isMultiSelect) {
                      const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : []
                      isCorrect = userAnswerArray.length === correctAnswer.length &&
                                  userAnswerArray.every(val => correctAnswer.includes(val))
                    } else {
                      isCorrect = userAnswer === question.correctIndex
                    }

                    return (
                      <div key={question.id} className="cf-review-question">
                        <div className="cf-review-question__header">
                          <span className="cf-review-question__number">Question {index + 1}</span>
                          <span className={`cf-review-question__badge ${isCorrect ? 'cf-review-question__badge--correct' : 'cf-review-question__badge--wrong'}`}>
                            {isCorrect ? 'Correct' : 'Wrong'}
                          </span>
                        </div>
                        
                        <div className="cf-review-question__text">
                          {question.question}
                        </div>

                        {question.code && (
                          <pre className="cf-code">{question.code}</pre>
                        )}

                        <div className="cf-review-options">
                          {question.options.map((option, optIndex) => {
                            const isUserAnswer = isMultiSelect 
                              ? (Array.isArray(userAnswer) && userAnswer.includes(optIndex))
                              : userAnswer === optIndex
                            const isCorrectOption = correctAnswer.includes(optIndex)
                            
                            let optionClass = 'cf-review-option'
                            if (isCorrectOption) {
                              optionClass += ' cf-review-option--correct'
                            } else if (isUserAnswer && !isCorrectOption) {
                              optionClass += ' cf-review-option--wrong'
                            }

                            return (
                              <div key={optIndex} className={optionClass}>
                                <span className="cf-review-option__label">
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                <span className="cf-review-option__text">{option}</span>
                                {isCorrectOption && (
                                  <span className="cf-review-option__indicator">Correct Answer</span>
                                )}
                                {isUserAnswer && !isCorrectOption && (
                                  <span className="cf-review-option__indicator">Your Answer</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  Detailed results not available for this test.
                </div>
              )}
            </div>

            <div className="cf-modal__footer">
              <button
                className="cf-btn cf-btn--primary"
                onClick={() => setReviewingTest(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
