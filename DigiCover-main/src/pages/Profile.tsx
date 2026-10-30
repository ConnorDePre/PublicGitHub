import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./styles/Profile.css";

const Profile = () => {
  const { isAuthenticated, currentUsername } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated && currentUsername) {
    return <Navigate to={`/profile/${currentUsername}`} replace />;
  }

  return (
    <div className="profile-gate">
      <div className="profile-gate-header">
        <div>
          <h1 className="profile-gate-page-title">Profile</h1>
          <p className="profile-gate-page-subtitle">
            Sign in to see your account and the books you have made.
          </p>
        </div>
      </div>
      <div className="profile-gate-red">
        <div className="profile-gate-box">
          <h1>Please sign in</h1>
          <p>You need to be signed in to view your profile.</p>
          <button className="profile-gate-button" onClick={() => navigate("/Login")}>
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
