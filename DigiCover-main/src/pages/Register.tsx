import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/Register.css';
import showPasswordEye from '../assets/eye-password-show.svg';
import hidePasswordEye from '../assets/eye-password-hide.svg';

function Register() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_URL;

      // Use the same URL style that worked for your Login
      const response = await fetch(`${API_BASE}/register`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        alert("Registration Successful! Please login.");
        navigate('/Login');
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (err) {
      setError("Cannot connect to server. Is the backend running?");
    }
  };

  return (
    <div className="register-page">
      <div className="intro-text">
        <h1>DigiCover</h1>
        <p>Your digital library for creators of all kinds! Author, interact, and read your stories anytime, anywhere.</p>
      </div>

      <div className="divider"></div>

      <div className="register-card">
        <h1>Register</h1>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={{ flex: 1 }}
            />
          </div>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              <img
                src={showPassword ? hidePasswordEye : showPasswordEye}
                alt="toggle password visibility"
                className="eye-icon"
              />
            </button>
          </div>

          <div className="password-field">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <img
                src={showConfirmPassword ? hidePasswordEye : showPasswordEye}
                alt="toggle password visibility"
                className="eye-icon"
              />
            </button>
          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit">Register</button>

          <h2>Already have an account? <a href="/Login">Login</a></h2>
        </form>
      </div>
    </div>
  );
}

export default Register;
