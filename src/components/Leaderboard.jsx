import { useState } from 'react'

function Leaderboard({ leaderboard, currentUserId }) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const totalPages = Math.ceil(leaderboard.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentLeaderboard = leaderboard.slice(startIndex, endIndex)

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  return (
    <div className="cf-container">
      <div className="cf-box">
        <div className="cf-box__header">
          Global Leaderboard
          {leaderboard.length > 0 && (
            <span style={{ marginLeft: '12px', fontSize: '0.85rem', opacity: 0.8 }}>
              ({leaderboard.length} total entries)
            </span>
          )}
        </div>
        <div className="cf-box__body">
          {leaderboard.length > 0 ? (
            <>
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
                  {currentLeaderboard.map((entry) => (
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
                          <span>
                            {entry.full_name || entry.email?.split('@')[0] || 'Anonymous'}
                          </span>
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

              {totalPages > 1 && (
                <div className="cf-pagination">
                  <button
                    className="cf-pagination__btn"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    ← Previous
                  </button>

                  <div className="cf-pagination__pages">
                    {currentPage > 2 && (
                      <>
                        <button className="cf-pagination__page" onClick={() => goToPage(1)}>
                          1
                        </button>
                        {currentPage > 3 && <span className="cf-pagination__ellipsis">...</span>}
                      </>
                    )}

                    {currentPage > 1 && (
                      <button
                        className="cf-pagination__page"
                        onClick={() => goToPage(currentPage - 1)}
                      >
                        {currentPage - 1}
                      </button>
                    )}

                    <button className="cf-pagination__page cf-pagination__page--active">
                      {currentPage}
                    </button>

                    {currentPage < totalPages && (
                      <button
                        className="cf-pagination__page"
                        onClick={() => goToPage(currentPage + 1)}
                      >
                        {currentPage + 1}
                      </button>
                    )}

                    {currentPage < totalPages - 1 && (
                      <>
                        {currentPage < totalPages - 2 && (
                          <span className="cf-pagination__ellipsis">...</span>
                        )}
                        <button
                          className="cf-pagination__page"
                          onClick={() => goToPage(totalPages)}
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    className="cf-pagination__btn"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
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
