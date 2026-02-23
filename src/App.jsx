import { useEffect, useState } from 'react'
import './App.css'
import questions from './questions.json'
import { supabase, retryWithBackoff, verifyProfileExists } from './supabaseClient'
import Profile from './components/Profile'
import Leaderboard from './components/Leaderboard'

const TEST_DURATION_SECONDS = 90 * 60
const QUESTION_COUNT = 45

const questionBank = questions

const shuffle = (items) => {
  const array = [...items]
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authSuccess, setAuthSuccess] = useState('')
  
  const [started, setStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION_SECONDS)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState('')
  const [resultFilter, setResultFilter] = useState('all') // 'all', 'wrong', 'correct'
  const [expandedQuestion, setExpandedQuestion] = useState(null)
  const [testStartTime, setTestStartTime] = useState(null)
  const [savingResult, setSavingResult] = useState(false)
  const [activeTab, setActiveTab] = useState('home') // 'home', 'profile', 'leaderboard'
  const [userStats, setUserStats] = useState(null)
  const [testHistory, setTestHistory] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [selectedPdf, setSelectedPdf] = useState(null)
  const [showStudyGuide, setShowStudyGuide] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved === 'true'
  })

  const totalQuestions = Math.min(QUESTION_COUNT, questionBank.length)

  const [selectedQuestions, setSelectedQuestions] = useState([])

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev)
  }

  // Check for existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch user stats and test history
  useEffect(() => {
    if (!user) return

    const fetchUserData = async () => {
      setLoadingStats(true)
      try {
        // Fetch user stats
        const { data: stats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single()

        setUserStats(stats)

        // Fetch test history
        const { data: history } = await supabase
          .from('test_results')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        setTestHistory(history || [])

        // Fetch leaderboard
        const { data: leaderboardData } = await supabase
          .from('leaderboard')
          .select('*')
          .limit(50)

        setLeaderboard(leaderboardData || [])
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    fetchUserData()
  }, [user, submitted])

  // Fetch user stats and test history
  useEffect(() => {
    if (!user) return

    const fetchUserData = async () => {
      setLoadingStats(true)
      try {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        setUserProfile(profile)

        // Fetch user stats
        const { data: stats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single()

        setUserStats(stats)

        // Fetch test history
        const { data: history } = await supabase
          .from('test_results')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        setTestHistory(history || [])

        // Fetch leaderboard
        const { data: leaderboardData } = await supabase
          .from('leaderboard')
          .select('*')
          .limit(50)

        setLeaderboard(leaderboardData || [])
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    fetchUserData()
  }, [user, submitted])

  useEffect(() => {
    if (!started || submitted) return undefined

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setSubmitted(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [started, submitted])

  const startTest = () => {
    if (!user) return
    const randomSelection = shuffle(questionBank).slice(0, totalQuestions)
    setSelectedQuestions(randomSelection)
    setAnswers({})
    setCurrentIndex(0)
    setTimeLeft(TEST_DURATION_SECONDS)
    setSubmitted(false)
    setStarted(true)
    setTestStartTime(Date.now())
  }

  const handleSelect = (questionId, optionIndex, isMulti) => {
    if (isMulti) {
      setAnswers((prev) => {
        const existing = prev[questionId] || []
        const next = existing.includes(optionIndex)
          ? existing.filter((value) => value !== optionIndex)
          : [...existing, optionIndex]
        return {
          ...prev,
          [questionId]: next,
        }
      })
      return
    }

    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }))
  }

  const handleSubmit = async () => {
    setSubmitted(true)
    setSavingResult(true)

    try {
      const timeTakenSeconds = Math.floor((Date.now() - testStartTime) / 1000)
      const testScore = selectedQuestions.reduce((total, question) => {
        if (question.multiSelect && Array.isArray(question.correctIndices)) {
          const selected = Array.isArray(answers[question.id])
            ? answers[question.id]
            : []
          const correct = question.correctIndices
          const isCorrect =
            selected.length === correct.length &&
            selected.every((value) => correct.includes(value))
          return isCorrect ? total + 1 : total
        }
        return answers[question.id] === question.correctIndex ? total + 1 : total
      }, 0)

      const { error } = await supabase.from('test_results').insert({
        user_id: user.id,
        test_name: 'Databricks Certified Associate Data Engineer Test',
        score: testScore,
        total_questions: selectedQuestions.length,
        time_taken_seconds: timeTakenSeconds,
        answers: answers,
        questions: selectedQuestions.map(q => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          code: q.code || null
        }))
      })

      if (error) {
        console.error('Error saving test result:', error)
      }
    } catch (error) {
      console.error('Error saving test result:', error)
    } finally {
      setSavingResult(false)
    }
  }

  const handleRestart = () => {
    // If already submitted, no need for confirmation
    if (submitted || window.confirm('Are you sure you want to end the test? Your progress will be lost.')) {
      setStarted(false)
      setSubmitted(false)
      setAnswers({})
      setSelectedQuestions([])
      setTimeLeft(TEST_DURATION_SECONDS)
      setCurrentIndex(0)
      setTestStartTime(null)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')
    setAuthLoading(true)

    try {
      if (isSignUp) {
        // Sign up with retry logic for rate limiting
        const signUpResult = await retryWithBackoff(async () => {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}`,
              data: {
                email: email
              }
            }
          })
          if (error) throw error
          return data
        })

        if (signUpResult?.user) {
          // Verify profile was created
          const profileExists = await verifyProfileExists(signUpResult.user.id)
          
          if (!profileExists) {
            // If profile doesn't exist after retries, try to create it manually
            try {
              await supabase.from('profiles').insert({
                id: signUpResult.user.id,
                email: email
              })
            } catch (insertError) {
              console.error('Error creating profile:', insertError)
              throw new Error('Account created but profile setup failed. Please contact support.')
            }
          }

          setAuthSuccess('✅ Success! Please check your email for the confirmation link. Check spam folder if you don\'t see it.')
          setEmail('')
          setPassword('')
        } else {
          throw new Error('Signup failed. Please try again.')
        }
      } else {
        // Login with retry logic for rate limiting
        await retryWithBackoff(async () => {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (error) throw error
        })
        setAuthSuccess('✅ Successfully logged in!')
        setEmail('')
        setPassword('')
      }
    } catch (error) {
      console.error('Auth error:', error)
      
      // Provide user-friendly error messages
      let errorMessage = error.message
      
      if (error.message?.toLowerCase().includes('rate limit')) {
        errorMessage = '⚠️ Too many requests. Please wait a moment and try again.'
      } else if (error.message?.toLowerCase().includes('invalid login credentials')) {
        errorMessage = '❌ Invalid email or password. Please check and try again.'
      } else if (error.message?.toLowerCase().includes('email not confirmed')) {
        errorMessage = '⚠️ Please confirm your email address first. Check your inbox for the confirmation link.'
      } else if (error.message?.toLowerCase().includes('user already registered')) {
        errorMessage = '⚠️ This email is already registered. Try logging in instead or use password reset if you forgot your password.'
      }
      
      setAuthError(errorMessage)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setStarted(false)
    setSubmitted(false)
    setAnswers({})
    setSelectedQuestions([])
    setName('')
  }

  const score = submitted
    ? selectedQuestions.reduce((total, question) => {
        if (question.multiSelect && Array.isArray(question.correctIndices)) {
          const selected = Array.isArray(answers[question.id])
            ? answers[question.id]
            : []
          const correct = question.correctIndices
          const isCorrect =
            selected.length === correct.length &&
            selected.every((value) => correct.includes(value))
          return isCorrect ? total + 1 : total
        }

        return answers[question.id] === question.correctIndex ? total + 1 : total
      }, 0)
    : 0

  const currentQuestion = selectedQuestions[currentIndex]
  const displayName = user?.email?.split('@')[0] || 'User'
  const canStart = Boolean(user)

  if (loading) {
    return (
      <div className="page">
        <header className="cf-header">
          <div className="cf-header__content">
            <div className="cf-header__left">
              <h1 className="cf-logo">Mock.sh 🐦</h1>
            </div>
          </div>
        </header>
        <div className="cf-container">
          <div className="cf-box">
            <div className="cf-box__body" style={{ textAlign: 'center', padding: '40px' }}>
              Loading...
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page">
        <header className="cf-header">
          <div className="cf-header__content">
            <div className="cf-header__left">
              <div>
                <h1 className="cf-logo">Mock.sh🐦</h1>
                <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>
                  made with love ❤️ by niazi
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="cf-container">
          <div className="cf-box">
            <div className="cf-box__header">
              {isSignUp ? 'Create Account' : 'Login'}
            </div>
            <div className="cf-box__body">
              <form onSubmit={handleAuth}>
                <div className="cf-form-group">
                  <label className="cf-label">Email</label>
                  <input
                    type="email"
                    className="cf-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={authLoading}
                  />
                </div>
                <div className="cf-form-group">
                  <label className="cf-label">Password</label>
                  <input
                    type="password"
                    className="cf-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    minLength={6}
                    disabled={authLoading}
                  />
                  {!isSignUp && (
                    <div style={{ fontSize: '0.85rem', marginTop: '4px', opacity: 0.7 }}>
                      Minimum 6 characters
                    </div>
                  )}
                </div>
                {authSuccess && (
                  <div className="cf-alert cf-alert--success">
                    {authSuccess}
                  </div>
                )}
                {authError && (
                  <div className="cf-alert cf-alert--error">
                    {authError}
                  </div>
                )}
                {isSignUp && (
                  <div className="cf-alert" style={{ backgroundColor: '#e3f2fd', borderColor: '#2196f3', color: '#1565c0', fontSize: '0.9rem' }}>
                    💡 <strong>Important:</strong> After signing up, you'll receive a confirmation email. 
                    Please check your inbox (and spam folder) and click the confirmation link to activate your account.
                  </div>
                )}
                <button 
                  type="submit" 
                  className="cf-btn cf-btn--primary" 
                  style={{ width: '100%' }}
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <>
                      <span style={{ display: 'inline-block', marginRight: '8px' }}>⏳</span>
                      {isSignUp ? 'Creating Account...' : 'Logging in...'}
                    </>
                  ) : (
                    <>{isSignUp ? 'Sign Up' : 'Login'}</>
                  )}
                </button>
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="cf-link"
                    onClick={() => {
                      setIsSignUp(!isSignUp)
                      setAuthError('')
                      setAuthSuccess('')
                    }}
                    disabled={authLoading}
                  >
                    {isSignUp
                      ? 'Already have an account? Login'
                      : "Don't have an account? Sign up"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="cf-header">
        <div className="cf-header__content">
          <div className="cf-header__left">
            <h1 className="cf-logo">Mock.sh🐦</h1>
            {started && <span className="cf-header__subtitle">Testing Mode</span>}
          </div>
          {started ? (
            <div className="cf-header__right">
              <div className="cf-user">
                <span className="cf-user__avatar">
                  {displayName ? displayName[0].toUpperCase() : 'U'}
                </span>
                <span className="cf-user__name">{displayName}</span>
              </div>
              <div className="cf-timer">
                <svg className="cf-timer__icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm0 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm1 2v4.5l3 1.5-.5 1-3.5-1.75V4h1z"/>
                </svg>
                {formatTime(timeLeft)}
              </div>
              <button className="cf-theme-toggle" onClick={toggleDarkMode} title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button className="cf-btn cf-btn--secondary" onClick={handleRestart}>
                End Test
              </button>
            </div>
          ) : (
            <div className="cf-header__right">
              <div className="cf-user">
                <span className="cf-user__avatar">
                  {user.email ? user.email[0].toUpperCase() : 'U'}
                </span>
                <span className="cf-user__name">{user.email}</span>
              </div>
              <button className="cf-theme-toggle" onClick={toggleDarkMode} title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button className="cf-btn cf-btn--secondary" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {!started && !submitted && (
        <nav className="cf-nav">
          <button
            className={`cf-nav-tab ${activeTab === 'home' ? 'cf-nav-tab--active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.707 1.5ZM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5 5 5Z"/>
            </svg>
            Home
          </button>
          <button
            className={`cf-nav-tab ${activeTab === 'profile' ? 'cf-nav-tab--active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z"/>
            </svg>
            Profile
          </button>
          <button
            className={`cf-nav-tab ${activeTab === 'leaderboard' ? 'cf-nav-tab--active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.752.066a.5.5 0 0 1 .496 0l3.75 2.143a.5.5 0 0 1 .252.434v3.995l3.498 2A.5.5 0 0 1 16 9.07v4.286a.5.5 0 0 1-.252.434l-3.75 2.143a.5.5 0 0 1-.496 0l-3.502-2-3.502 2.001a.5.5 0 0 1-.496 0l-3.75-2.143A.5.5 0 0 1 0 13.357V9.071a.5.5 0 0 1 .252-.434L3.75 6.638V2.643a.5.5 0 0 1 .252-.434L7.752.066Z"/>
            </svg>
            Leaderboard
          </button>
        </nav>
      )}

      {!started ? (
        activeTab === 'home' ? (
        <div className="cf-home-layout">
          <div className="cf-main-content">
            <div className="cf-box">
              <div className="cf-box__header">Test Information</div>
              <div className="cf-box__body">
                <table className="cf-table">
                  <tbody>
                    <tr>
                      <td className="cf-table__label">Questions:</td>
                      <td>{totalQuestions}</td>
                    </tr>
                    <tr>
                      <td className="cf-table__label">Duration:</td>
                      <td>90 minutes</td>
                    </tr>
                    <tr>
                      <td className="cf-table__label">Total Points:</td>
                      <td>{totalQuestions}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="cf-box">
              <div className="cf-box__header" style={{ background: '#1976d2', color: '#ffffff', borderColor: '#1976d2' }}>
                Databricks Certified Associate Data Engineer Test
              </div>
              <div className="cf-box__body" style={{ 
                position: 'relative',
                backgroundImage: 'url(/primary-lockup-full-color-rgb.svg)',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center center',
                backgroundSize: '50%',
                backgroundBlendMode: 'overlay',
                opacity: 1
              }}>
                <div className="cf-welcome-box">
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: '12px' }}>Welcome, {displayName}!</h3>
                    <p style={{ lineHeight: '1.6' }}>
                      This is a comprehensive assessment covering core data engineering concepts including:
                    </p>
                    <ul style={{ lineHeight: '1.8', marginLeft: '20px' }}>
                      <li>Data architecture and design patterns</li>
                      <li>ETL/ELT processes and workflows</li>
                      <li>Data modeling and optimization</li>
                      <li>Database systems and query performance</li>
                      <li>Data quality and governance</li>
                    </ul>
                  </div>
                  <button className="cf-btn cf-btn--primary" onClick={startTest} disabled={!canStart}>
                    Begin Test
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <aside className="cf-sidebar">
            <div className="cf-box">
              <div className="cf-box__header">Study Resources</div>
              <div className="cf-box__body">
                <div className="cf-resources">
                  <div className="cf-resource-item">
                    <div className="cf-resource-icon">
                      <svg width="24" height="24" viewBox="0 0 16 16" fill="#dc2626">
                        <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                      </svg>
                    </div>
                    <div className="cf-resource-content">
                      <div className="cf-resource-title" title="Databricks Associate_Data_Engineer dumps 1.pdf">Databricks Associate Data Engineer Dumps 1</div>
                      <div className="cf-resource-meta">Practice Questions</div>
                    </div>
                    <div className="cf-resource-actions">
                      <button 
                        className="cf-resource-btn" 
                        onClick={() => setSelectedPdf('/Databricks Associate_Data_Engineer dumps 1.pdf')}
                        title="Preview"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                          <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                        </svg>
                      </button>
                      <a 
                        href="/Databricks Associate_Data_Engineer dumps 1.pdf" 
                        download
                        className="cf-resource-btn"
                        title="Download"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                          <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                        </svg>
                      </a>
                    </div>
                  </div>

                  <div className="cf-resource-item">
                    <div className="cf-resource-icon">
                      <svg width="24" height="24" viewBox="0 0 16 16" fill="#dc2626">
                        <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                      </svg>
                    </div>
                    <div className="cf-resource-content">
                      <div className="cf-resource-title" title="Databricks1 .pdf">Databricks 1</div>
                      <div className="cf-resource-meta">Study Guide</div>
                    </div>
                    <div className="cf-resource-actions">
                      <button 
                        className="cf-resource-btn" 
                        onClick={() => setSelectedPdf('/Databricks1 .pdf')}
                        title="Preview"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                          <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                        </svg>
                      </button>
                      <a 
                        href="/Databricks1 .pdf" 
                        download
                        className="cf-resource-btn"
                        title="Download"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                          <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                        </svg>
                      </a>
                    </div>
                  </div>

                  <div className="cf-resource-item">
                    <div className="cf-resource-icon">
                      <svg width="24" height="24" viewBox="0 0 16 16" fill="#dc2626">
                        <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                      </svg>
                    </div>
                    <div className="cf-resource-content">
                      <div className="cf-resource-title" title="databricks_de_associate 1.pdf">Databricks DE Associate 1</div>
                      <div className="cf-resource-meta">Exam Preparation</div>
                    </div>
                    <div className="cf-resource-actions">
                      <button 
                        className="cf-resource-btn" 
                        onClick={() => setSelectedPdf('/databricks_de_associate 1.pdf')}
                        title="Preview"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                          <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                        </svg>
                      </button>
                      <a 
                        href="/databricks_de_associate 1.pdf" 
                        download
                        className="cf-resource-btn"
                        title="Download"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                          <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                        </svg>
                      </a>
                    </div>
                  </div>

                  <div className="cf-resource-item">
                    <div className="cf-resource-icon">
                      <svg width="24" height="24" viewBox="0 0 16 16" fill="#dc2626">
                        <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                      </svg>
                    </div>
                    <div className="cf-resource-content">
                      <div className="cf-resource-title" title="Databricks2.pdf">Databricks 2</div>
                      <div className="cf-resource-meta">Study Guide</div>
                    </div>
                    <div className="cf-resource-actions">
                      <button 
                        className="cf-resource-btn" 
                        onClick={() => setSelectedPdf('/Databricks2.pdf')}
                        title="Preview"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                          <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                        </svg>
                      </button>
                      <a 
                        href="/Databricks2.pdf" 
                        download
                        className="cf-resource-btn"
                        title="Download"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                          <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Study Journey Link */}
            <div className="cf-box" style={{ marginTop: '20px' }}>
              <div className="cf-box__header">Success Story</div>
              <div className="cf-box__body">
                <button 
                  className="cf-btn cf-btn--primary" 
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => setShowStudyGuide(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 2.5a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1 5 0v.006c0 .07 0 .27-.038.494H15a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1v7.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 14.5V7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h2.038A2.968 2.968 0 0 1 3 2.506V2.5zm1.068.5H7v-.5a1.5 1.5 0 1 0-3 0c0 .085.002.274.045.43a.522.522 0 0 0 .023.07zM9 3h2.932a.56.56 0 0 0 .023-.07c.043-.156.045-.345.045-.43a1.5 1.5 0 0 0-3 0V3zM1 4v2h6V4H1zm8 0v2h6V4H9zm5 3H9v8h4.5a.5.5 0 0 0 .5-.5V7zm-7 8V7H2v7.5a.5.5 0 0 0 .5.5H7z"/>
                  </svg>
                  How I Passed the Exam
                </button>
                <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', textAlign: 'center' }}>
                  Read about preparation tips, resources, and exam insights
                </p>
              </div>
            </div>
          </aside>
        </div>
        ) : activeTab === 'profile' ? (
          <Profile user={user} userProfile={userProfile} userStats={userStats} testHistory={testHistory} loadingStats={loadingStats} totalQuestionsInBank={questionBank.length} />
        ) : (
          <Leaderboard leaderboard={leaderboard} currentUserId={user?.id} />
        )
      ) : submitted ? (
        <div className="cf-container">
          <div className="cf-box">
            <div className="cf-box__header">Final Standings</div>
            <div className="cf-box__body">
              <table className="cf-standings">
                <tbody>
                  <tr>
                    <td className="cf-standings__rank">#1</td>
                    <td className="cf-standings__participant">{displayName}</td>
                    <td className="cf-standings__score">
                      <span className="cf-score-value">{score}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="cf-score-summary">
                <span className="cf-score-label">Total Score:</span>
                <span className="cf-score-main">{score} / {selectedQuestions.length}</span>
                <span className="cf-score-percent">({Math.round((score / selectedQuestions.length) * 100)}%)</span>
              </div>
            </div>
          </div>
          <div className="cf-box">
            <div className="cf-box__header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Problem Results</span>
                <div className="cf-filter">
                  <button
                    className={`cf-filter-btn ${resultFilter === 'all' ? 'cf-filter-btn--active' : ''}`}
                    onClick={() => setResultFilter('all')}
                  >
                    All ({selectedQuestions.length})
                  </button>
                  <button
                    className={`cf-filter-btn ${resultFilter === 'wrong' ? 'cf-filter-btn--active' : ''}`}
                    onClick={() => setResultFilter('wrong')}
                  >
                    Wrong ({selectedQuestions.length - score})
                  </button>
                  <button
                    className={`cf-filter-btn ${resultFilter === 'correct' ? 'cf-filter-btn--active' : ''}`}
                    onClick={() => setResultFilter('correct')}
                  >
                    Correct ({score})
                  </button>
                </div>
              </div>
            </div>
            <div className="cf-box__body">
              <div className="cf-results-list">
                {selectedQuestions
                  .filter((question) => {
                    const userAnswer = answers[question.id]
                    let isCorrect
                    if (question.multiSelect && Array.isArray(question.correctIndices)) {
                      const selected = Array.isArray(userAnswer) ? userAnswer : []
                      const correct = question.correctIndices
                      isCorrect = selected.length === correct.length && selected.every((value) => correct.includes(value))
                    } else {
                      isCorrect = userAnswer === question.correctIndex
                    }
                    if (resultFilter === 'wrong') return !isCorrect
                    if (resultFilter === 'correct') return isCorrect
                    return true
                  })
                  .map((question, index) => {
                    const userAnswer = answers[question.id]
                    let isCorrect
                    if (question.multiSelect && Array.isArray(question.correctIndices)) {
                      const selected = Array.isArray(userAnswer) ? userAnswer : []
                      const correct = question.correctIndices
                      isCorrect = selected.length === correct.length && selected.every((value) => correct.includes(value))
                    } else {
                      isCorrect = userAnswer === question.correctIndex
                    }
                    const isExpanded = expandedQuestion === question.id
                    const actualIndex = selectedQuestions.indexOf(question)
                    return (
                      <div key={question.id} className="cf-result-item">
                        <div
                          className="cf-result-item__header"
                          onClick={() => setExpandedQuestion(isExpanded ? null : question.id)}
                        >
                          <div className="cf-result-item__left">
                            <span className="cf-result-item__number">#{actualIndex + 1}</span>
                            <span className="cf-result-item__title">{question.question}</span>
                          </div>
                          <div className="cf-result-item__right">
                            <span className={isCorrect ? 'cf-verdict cf-verdict--accepted' : 'cf-verdict cf-verdict--wrong'}>
                              {isCorrect ? 'Accepted' : 'Wrong Answer'}
                            </span>
                            <svg
                              className={`cf-result-item__icon ${isExpanded ? 'cf-result-item__icon--expanded' : ''}`}
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="currentColor"
                            >
                              <path d="M4 6l4 4 4-4z" />
                            </svg>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="cf-result-item__content">
                            {question.code && (
                              <pre className="cf-code">
                                <code>{question.code}</code>
                              </pre>
                            )}
                            <div className="cf-answer-comparison">
                              <div className="cf-answer-box cf-answer-box--user">
                                <div className="cf-answer-box__label">
                                  Your Answer:
                                </div>
                                <div className="cf-answer-box__content">
                                  {question.multiSelect && Array.isArray(question.correctIndices) ? (
                                    Array.isArray(userAnswer) && userAnswer.length > 0 ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {userAnswer.map((idx) => (
                                          <div key={idx}>
                                            <span className="cf-answer-option">{String.fromCharCode(65 + idx)}</span>
                                            <span>{question.options[idx]}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span style={{ color: '#999' }}>Not answered</span>
                                    )
                                  ) : (
                                    userAnswer !== undefined ? (
                                      <>
                                        <span className="cf-answer-option">{String.fromCharCode(65 + userAnswer)}</span>
                                        <span>{question.options[userAnswer]}</span>
                                      </>
                                    ) : (
                                      <span style={{ color: '#999' }}>Not answered</span>
                                    )
                                  )}
                                </div>
                              </div>
                              <div className={`cf-answer-box ${isCorrect ? 'cf-answer-box--correct' : 'cf-answer-box--wrong'}`}>
                                <div className="cf-answer-box__label">
                                  Correct Answer:
                                </div>
                                <div className="cf-answer-box__content">
                                  {question.multiSelect && Array.isArray(question.correctIndices) ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      {question.correctIndices.map((idx) => (
                                        <div key={idx}>
                                          <span className="cf-answer-option">{String.fromCharCode(65 + idx)}</span>
                                          <span>{question.options[idx]}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <>
                                      <span className="cf-answer-option">{String.fromCharCode(65 + question.correctIndex)}</span>
                                      <span>{question.options[question.correctIndex]}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="cf-all-options">
                              <div className="cf-all-options__label">All Options:</div>
                              {question.options.map((option, idx) => {
                                const isCorrectOption = question.multiSelect && Array.isArray(question.correctIndices)
                                  ? question.correctIndices.includes(idx)
                                  : idx === question.correctIndex
                                const isUserChoice = question.multiSelect && Array.isArray(userAnswer)
                                  ? userAnswer.includes(idx)
                                  : idx === userAnswer
                                const isWrongChoice = isUserChoice && !isCorrectOption
                                
                                return (
                                  <div
                                    key={idx}
                                    className={`cf-option-display ${
                                      isCorrectOption ? 'cf-option-display--correct' : ''
                                    } ${
                                      isWrongChoice ? 'cf-option-display--wrong' : ''
                                    }`}
                                  >
                                    <span className="cf-option-display__label">{String.fromCharCode(65 + idx)}</span>
                                    <span>{option}</span>
                                    {isCorrectOption && (
                                      <span className="cf-option-display__badge">✓ Correct</span>
                                    )}
                                    {isWrongChoice && (
                                      <span className="cf-option-display__badge cf-option-display__badge--wrong">✗ Your choice</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                            {/* Domain and Explanation */}
                            {question.domain && (
                              <div className="cf-question-domain">
                                <div className="cf-question-domain__label">Domain:</div>
                                <div className="cf-question-domain__value">{question.domain}</div>
                              </div>
                            )}
                            {question.explanation && (
                              <div className="cf-question-explanation">
                                <div className="cf-question-explanation__label">Explanation</div>
                                <div className="cf-question-explanation__text">{question.explanation}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
          <div className="cf-actions">
            <button className="cf-btn cf-btn--primary" onClick={startTest}>
              Virtual Participation Again
            </button>
          </div>
        </div>
      ) : (
        <div className="cf-container">
          <div className="cf-problem-nav">
            {selectedQuestions.map((q, idx) => (
              <button
                key={q.id}
                className={`cf-problem-nav__item ${
                  idx === currentIndex ? 'cf-problem-nav__item--active' : ''
                } ${
                  answers[q.id] !== undefined ? 'cf-problem-nav__item--answered' : ''
                }`}
                onClick={() => setCurrentIndex(idx)}
              >
                {String.fromCharCode(65 + idx)}
              </button>
            ))}
          </div>
          {currentQuestion ? (
            <div className="cf-box">
              <div className="cf-box__header">
                Problem {String.fromCharCode(65 + currentIndex)}. {currentQuestion.question.substring(0, 50)}{currentQuestion.question.length > 50 ? '...' : ''}
                {currentQuestion.multiSelect && <span className="cf-badge">Multiple Choice</span>}
              </div>
              <div className="cf-box__body cf-problem">
                <div className="cf-problem__statement">
                  <p>{currentQuestion.question}</p>
                  {currentQuestion.code ? (
                    <pre className="cf-code">
                      <code>{currentQuestion.code}</code>
                    </pre>
                  ) : null}
                </div>
                <div className="cf-problem__section">
                  <div className="cf-section-title">Select your answer:</div>
                  <div className="cf-options">
                    {currentQuestion.options.map((option, index) => (
                      <label
                        key={`${currentQuestion.id}-${index}`}
                        className={`cf-option${
                          currentQuestion.multiSelect
                            ? Array.isArray(answers[currentQuestion.id]) &&
                              answers[currentQuestion.id].includes(index)
                              ? ' cf-option--selected'
                              : ''
                            : answers[currentQuestion.id] === index
                              ? ' cf-option--selected'
                              : ''
                        }`}
                      >
                        <input
                          type={currentQuestion.multiSelect ? 'checkbox' : 'radio'}
                          name={`question-${currentQuestion.id}`}
                          checked={
                            currentQuestion.multiSelect
                              ? Array.isArray(answers[currentQuestion.id]) &&
                                answers[currentQuestion.id].includes(index)
                              : answers[currentQuestion.id] === index
                          }
                          onChange={() =>
                            handleSelect(
                              currentQuestion.id,
                              index,
                              currentQuestion.multiSelect
                            )
                          }
                        />
                        <span className="cf-option__label">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="cf-option__text">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="cf-problem__actions">
                  <button
                    className="cf-btn cf-btn--secondary"
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                    disabled={currentIndex === 0}
                  >
                    ← Previous
                  </button>
                  <span className="cf-problem__counter">
                    {currentIndex + 1} of {selectedQuestions.length}
                  </span>
                  {currentIndex === selectedQuestions.length - 1 ? (
                    <button className="cf-btn cf-btn--primary" type="button" onClick={handleSubmit}>
                      Submit All
                    </button>
                  ) : (
                    <button
                      className="cf-btn cf-btn--primary"
                      type="button"
                      onClick={() =>
                        setCurrentIndex((prev) =>
                          Math.min(prev + 1, selectedQuestions.length - 1)
                        )
                      }
                    >
                      Next →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="cf-box">
              <div className="cf-box__body">Loading...</div>
            </div>
          )}
        </div>
      )}

      {selectedPdf && (
        <div className="cf-modal" onClick={() => setSelectedPdf(null)}>
          <div className="cf-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="cf-modal__header">
              <h3>Resource Preview</h3>
              <button className="cf-modal__close" onClick={() => setSelectedPdf(null)}>
                <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                </svg>
              </button>
            </div>
            <div className="cf-modal__body">
              <iframe
                src={selectedPdf}
                title="PDF Preview"
                className="cf-pdf-viewer"
              />
            </div>
            <div className="cf-modal__footer">
              <a href={selectedPdf} download className="cf-btn cf-btn--primary">
                Download PDF
              </a>
              <button className="cf-btn cf-btn--secondary" onClick={() => setSelectedPdf(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Study Guide Modal */}
      {showStudyGuide && (
        <div className="cf-modal-overlay" onClick={() => setShowStudyGuide(false)}>
          <div className="cf-modal-content cf-modal-content--large" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="cf-modal-header">
              <h2>🎓 My Journey to Databricks Certification Success</h2>
              <button className="cf-modal__close" onClick={() => setShowStudyGuide(false)}>
                <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                </svg>
              </button>
            </div>
            
            <div className="cf-modal-body" style={{ padding: '24px', lineHeight: '1.8' }}>
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  I recently cleared the <strong>Databricks Certified Data Engineer Associate</strong> exam and wanted to share my preparation experience, key resources, and what to expect on the actual test.
                </p>
                <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>
                  This certification is ideal for data professionals who work with the Databricks Lakehouse Platform and need to design, build, and manage data pipelines using tools like Apache Spark, Delta Lake, and Databricks SQL.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: 'var(--accent-primary)', marginBottom: '12px', fontSize: '1.3rem' }}>📚 How I Prepared</h3>
                <p style={{ marginBottom: '12px' }}>I focused on hands-on experience, structured learning paths, and high-quality mock exams to get ready:</p>
                
                <div style={{ marginLeft: '20px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: 'var(--accent-correct)' }}>✓ Databricks Academy – Data Engineer Associate Learning Path</strong>
                    <p style={{ marginLeft: '20px', color: 'var(--text-secondary)' }}>
                      This is the official and free learning resource. It gives solid coverage of all exam domains and includes hands-on labs in the Databricks workspace.
                    </p>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: 'var(--accent-correct)' }}>✓ Databricks Documentation</strong>
                    <p style={{ marginLeft: '20px', color: 'var(--text-secondary)' }}>
                      I referred to this frequently for syntax and in-depth understanding of Delta Lake, Spark transformations, and structured streaming.
                    </p>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: 'var(--accent-correct)' }}>✓ YouTube Tutorials</strong>
                    <p style={{ marginLeft: '20px', color: 'var(--text-secondary)' }}>
                      I used short video walkthroughs to better understand key topics like Delta Lake, auto-loader, and data ingestion methods.
                    </p>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: 'var(--accent-correct)' }}>✓ Mock.sh Practice Exams</strong>
                    <p style={{ marginLeft: '20px', color: 'var(--text-secondary)' }}>
                      These were the most helpful in building exam confidence and getting used to the question patterns.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ padding: '20px', background: 'var(--bg-correct)', borderRadius: '8px', borderLeft: '4px solid var(--accent-correct)', marginBottom: '24px' }}>
                <h4 style={{ color: 'var(--accent-correct)', marginBottom: '12px' }}>💯 Mock.sh Practice Exams</h4>
                <p style={{ color: 'var(--text-primary)' }}>
                  The Mock.sh practice tests were a game-changer. About <strong>75–80%</strong> of the questions I saw in the real exam were either directly covered or similar in concept.
                  The explanations helped me understand the "why" behind each answer, which was critical for reasoning through real-world scenarios on the exam.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: 'var(--accent-primary)', marginBottom: '12px', fontSize: '1.3rem' }}>📝 What Came Up on the Actual Exam</h3>
                <p style={{ marginBottom: '12px' }}>The exam had a mix of conceptual, scenario-based, and code-related questions. Here are the main topics I encountered:</p>
                
                <ul style={{ marginLeft: '20px', color: 'var(--text-secondary)' }}>
                  <li>Delta Lake fundamentals: ACID transactions, schema enforcement, time travel</li>
                  <li>Apache Spark APIs: DataFrame transformations, actions, and Spark SQL</li>
                  <li>Data ingestion using Auto Loader and COPY INTO</li>
                  <li>Structured Streaming concepts and triggers</li>
                  <li>Optimizing performance with Z-Ordering, caching, and partitioning</li>
                  <li>Data governance: Unity Catalog basics, table permissions, and access control</li>
                  <li>Job orchestration: tasks, clusters, scheduling, and dependencies</li>
                  <li>Lakehouse architecture understanding and benefits</li>
                  <li>Reading/writing data in various formats (JSON, Parquet, CSV)</li>
                  <li>Error handling and troubleshooting during data pipeline execution</li>
                </ul>
                
                <p style={{ marginTop: '12px', fontStyle: 'italic' }}>
                  Many questions required understanding best practices, interpreting code snippets, or choosing the most efficient and scalable solution.
                </p>
              </div>

              <div style={{ padding: '20px', background: 'var(--bg-wrong)', borderRadius: '8px', borderLeft: '4px solid var(--accent-wrong)', marginBottom: '24px' }}>
                <h4 style={{ color: 'var(--accent-wrong)', marginBottom: '12px' }}>⚠️ Common Mistakes to Watch Out For</h4>
                <ul style={{ marginLeft: '20px', color: 'var(--text-primary)' }}>
                  <li>Confusing Auto Loader with COPY INTO — know when to use each</li>
                  <li>Not reading the question carefully — some are intentionally tricky</li>
                  <li>Misunderstanding Delta Lake features like OPTIMIZE, MERGE, and DELETE</li>
                  <li>Overlooking how structured streaming handles triggers and checkpoints</li>
                  <li>Not knowing the Unity Catalog scope (catalog {'>'} schema {'>'} table)</li>
                </ul>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: 'var(--accent-primary)', marginBottom: '12px', fontSize: '1.3rem' }}>🎯 Key Topics to Focus On</h3>
                
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ padding: '16px', background: 'var(--bg-box-header)', borderRadius: '6px', border: '1px solid var(--border-primary)' }}>
                    <h4 style={{ marginBottom: '8px', color: 'var(--accent-primary)' }}>Databricks Lakehouse Architecture</h4>
                    <ul style={{ marginLeft: '20px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                      <li>Lakehouse vs traditional warehouse</li>
                      <li>Bronze, Silver, Gold layer design</li>
                    </ul>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg-box-header)', borderRadius: '6px', border: '1px solid var(--border-primary)' }}>
                    <h4 style={{ marginBottom: '8px', color: 'var(--accent-primary)' }}>Delta Lake</h4>
                    <ul style={{ marginLeft: '20px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                      <li>ACID properties</li>
                      <li>Schema evolution and enforcement</li>
                      <li>OPTIMIZE, ZORDER, MERGE, VACUUM</li>
                    </ul>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg-box-header)', borderRadius: '6px', border: '1px solid var(--border-primary)' }}>
                    <h4 style={{ marginBottom: '8px', color: 'var(--accent-primary)' }}>Apache Spark with Databricks</h4>
                    <ul style={{ marginLeft: '20px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                      <li>DataFrame operations</li>
                      <li>Caching and performance tuning</li>
                      <li>Spark SQL</li>
                    </ul>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg-box-header)', borderRadius: '6px', border: '1px solid var(--border-primary)' }}>
                    <h4 style={{ marginBottom: '8px', color: 'var(--accent-primary)' }}>Data Ingestion & Streaming</h4>
                    <ul style={{ marginLeft: '20px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                      <li>Auto Loader, COPY INTO</li>
                      <li>Structured streaming modes and checkpointing</li>
                    </ul>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg-box-header)', borderRadius: '6px', border: '1px solid var(--border-primary)' }}>
                    <h4 style={{ marginBottom: '8px', color: 'var(--accent-primary)' }}>Databricks Jobs and Pipelines</h4>
                    <ul style={{ marginLeft: '20px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                      <li>Task configuration</li>
                      <li>Job clusters vs all-purpose clusters</li>
                      <li>Trigger intervals</li>
                    </ul>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg-box-header)', borderRadius: '6px', border: '1px solid var(--border-primary)' }}>
                    <h4 style={{ marginBottom: '8px', color: 'var(--accent-primary)' }}>Unity Catalog and Governance</h4>
                    <ul style={{ marginLeft: '20px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                      <li>Table access control</li>
                      <li>Managing catalogs and schemas</li>
                      <li>Data lineage basics</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: 'var(--accent-primary)', marginBottom: '12px', fontSize: '1.3rem' }}>💡 Tips That Helped Me</h3>
                <ul style={{ marginLeft: '20px', color: 'var(--text-secondary)' }}>
                  <li>Get hands-on practice inside the Databricks workspace</li>
                  <li>Review Databricks documentation examples regularly</li>
                  <li>Use Mock.sh mock exams to test your understanding and timing</li>
                  <li>Don't just memorize syntax—understand the use cases</li>
                  <li>Practice reading and interpreting PySpark or SQL code quickly</li>
                  <li>Know how Lakehouse design applies to real-world pipelines</li>
                </ul>
              </div>

              <div style={{ padding: '24px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-correct))', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '12px', fontSize: '1.4rem' }}>✨ Final Thoughts</h3>
                <p style={{ fontSize: '1.05rem', lineHeight: '1.7', opacity: '0.95' }}>
                  The Databricks Data Engineer Associate exam is highly practical, and passing it proves you're ready to design and maintain reliable data pipelines using the Lakehouse platform.
                </p>
                <p style={{ marginTop: '12px', fontSize: '1.05rem', lineHeight: '1.7', opacity: '0.95' }}>
                  If you're preparing for this certification, I strongly recommend using the Databricks Academy, hands-on practice, and <strong>Mock.sh mock exams</strong>. 
                  Focus on understanding the architecture, workflow logic, and best practices. With consistent effort over 2–3 weeks, it's very achievable.
                </p>
                <p style={{ marginTop: '16px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  Good luck! 🚀
                </p>
              </div>
            </div>

            <div className="cf-modal__footer">
              <button className="cf-btn cf-btn--primary" onClick={() => setShowStudyGuide(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
