// components/Navbar/index.tsx


import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FaBars } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout(); // update context
        navigate("/login"); /// Redirect to login page
    };
    
    return (
        <nav className="navbar">

        <FaBars className="nav-bars" />

        <div className="nav-menu">
            <NavLink to="/home" className="nav-link">
            Home
            </NavLink>

            <NavLink to="/search" className="nav-link">
            Search
            </NavLink>

            <NavLink to="/profile" className="nav-link">
            Profile
            </NavLink>

            <NavLink to="/library" className="nav-link">
            Personal Library
            </NavLink>

            <NavLink to="/book-editor" className="nav-link">
            Create Book
            </NavLink>

            <NavLink to="/settings" className="nav-link">
            Settings
            </NavLink>
        </div>

        <div className="nav-btn">
            {isAuthenticated ? (
            <button className="logout-btn" onClick={handleLogout}>
                Logout
            </button>
            ) : (
            <NavLink className="nav-btn-link" to="/login">
                Login
            </NavLink>
            )}
        </div>

        </nav>
    );
};

export default Navbar;