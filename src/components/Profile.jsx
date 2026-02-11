function Profile({ userStats, testHistory, loadingStats }) {
  return (
    <div className="cf-container">
      <div className="cf-box">
        <div className="cf-box__header">Your Statistics</div>
        <div className="cf-box__body">
          {loadingStats ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading statistics...</div>
          ) : userStats ? (
            <div className="cf-stats-grid">
              <div className="cf-stat-card">
                <div className="cf-stat-card__value">{userStats.total_tests || 0}</div>
                <div className="cf-stat-card__label">Total Tests</div>
              </div>
              <div className="cf-stat-card">
                <div className="cf-stat-card__value">
                  {userStats.avg_percentage ? Math.round(userStats.avg_percentage) : 0}%
                </div>
                <div className="cf-stat-card__label">Average Score</div>
              </div>
              <div className="cf-stat-card cf-stat-card--success">
                <div className="cf-stat-card__value">
                  {userStats.best_percentage ? Math.round(userStats.best_percentage) : 0}%
                </div>
                <div className="cf-stat-card__label">Best Score</div>
              </div>
              <div className="cf-stat-card">
                <div className="cf-stat-card__value">{userStats.total_questions_attempted || 0}</div>
                <div className="cf-stat-card__label">Questions Attempted</div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No test data yet. Take your first test to see statistics!</p>
            </div>
          )}
        </div>
      </div>

      {testHistory.length > 0 && (
        <div className="cf-box">
          <div className="cf-box__header">Performance Over Time</div>
          <div className="cf-box__body">
            <div className="cf-chart">
              {testHistory.slice(0, 10).reverse().map((test, idx) => (
                <div key={test.id} className="cf-chart-bar">
                  <div className="cf-chart-bar__label">Test {testHistory.length - idx}</div>
                  <div className="cf-chart-bar__container">
                    <div
                      className="cf-chart-bar__fill"
                      style={{ width: `${test.percentage}%` }}
                    >
                      <span className="cf-chart-bar__value">{Math.round(test.percentage)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No test history available.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
