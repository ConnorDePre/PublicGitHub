import { useNavigate } from 'react-router-dom';
import './styles/Landing.css';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <div className="landing-card">
        <h1>DigiCover</h1>
        <p className="landing-desc">Your digital library for creators of all kinds! Author, interact, and read your stories anytime, anywhere.</p>

        <div className="landing-buttons">
          <button onClick={() => navigate('/Login')}>Login</button>
          <button onClick={() => navigate('/Register')}>Register</button>
        </div>
      </div>
    </div>
  );
}

export default Landing;
