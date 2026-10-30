import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AuthUser } from '../context/AuthContext';
import './styles/Login.css';
import showPasswordEye from '../assets/eye-password-show.svg';
import hidePasswordEye from '../assets/eye-password-hide.svg';

type LoginResponse = {
  message: string;
  user?: AuthUser;
};

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting login with email:", email); // Debugging log

    try {
      const API_BASE = import.meta.env.VITE_API_URL;

      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      let data: LoginResponse = { message: "WIP" };

      try {
        data = await response.json();
      } catch {
        data = { message: "Invalid server response" };
      }

      if (response.ok && data.user) {
        login(data.user);
        navigate('/Home');
      } else {
        alert(data.message); // Shows "User not found" or "Wrong password"
      }
    } catch (err) {
      alert("Cannot connect to server.");
    }
  };

  return (
    <div className="login-page">
      <div className="intro-text">
        <h1>DigiCover</h1>
        <p>Your digital library for creators of all kinds! Author, interact, and read your stories anytime, anywhere.</p>
      </div>

      <div className="divider"></div>

      <div className="login-card">
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
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


          <button type="submit">
            Login
          </button>
          <h2>Don't have an account? <a href="/Register">Sign Up</a></h2>
        </form>
      </div>
    </div>
  );

}

export default Login;
