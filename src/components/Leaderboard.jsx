function Leaderboard({ leaderboard, currentUserId }) {
  return (
    <div className="cf-container">
      <div className="cf-box">
        <div className="cf-box__header">Global Leaderboard</div>
        <div className="cf-box__body">
          {leaderboard.length > 0 ? (
            <table className="cf-leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>User</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Time</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.user_id + entry.created_at}
                    className={
                      entry.user_id === currentUserId ? 'cf-leaderboard-table__highlight' : ''
                    }
                  >
                    <td className="cf-leaderboard-table__rank">
                      <span className={`cf-rank ${entry.rank <= 3 ? `cf-rank--${entry.rank}` : ''}`}>
                        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                      </span>
                    </td>
                    <td className="cf-leaderboard-table__user">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{entry.email?.split('@')[0] || 'Anonymous'}</span>
                        {entry.user_id === currentUserId && (
                          <span className="cf-badge-you">You</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {entry.score} / {entry.total_questions}
                    </td>
                    <td>
                      <span
                        className={`cf-percentage ${
                          entry.percentage >= 70
                            ? 'cf-percentage--good'
                            : entry.percentage >= 50
                              ? 'cf-percentage--ok'
                              : 'cf-percentage--low'
                        }`}
                      >
                        {Math.round(entry.percentage)}%
                      </span>
                    </td>
                    <td>
                      {Math.floor(entry.time_taken_seconds / 60)}m {entry.time_taken_seconds % 60}s
                    </td>
                    <td>{new Date(entry.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No leaderboard data available.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Leaderboard
