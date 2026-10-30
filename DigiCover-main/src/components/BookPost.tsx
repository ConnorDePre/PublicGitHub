import './styles/BookPost.css';
import { useLocation, useNavigate } from 'react-router-dom';

interface BookPostProps {
  bookId: string;
  title: string;
  author: string;
  coverImage?: string;
  likes: number;
}

const CLOUDFRONT_URL = "https://d1cn7q2tof9i1s.cloudfront.net";

function BookPost({ bookId, title, author, coverImage, likes }: BookPostProps) {
  const randomColor = `hsl(${Math.random() * 360}, 70%, 60%)`;

  const coverUrl = coverImage ? `${CLOUDFRONT_URL}${coverImage}` : undefined;
  const navigate = useNavigate();
  const location = useLocation();

  const openReader = () => {
    const from = `${location.pathname}${location.search}`;
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    navigate(
      `/read-book/${bookId}/${title.replace(/\s+/g, "-")}`,
      { state: { from, scrollY } },
    );
  };

  return (
    <button className="book-post" onClick={openReader}>

      <div className="book-cover" style={{ 
        backgroundColor: coverUrl ? "transparent" : randomColor,
        backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}/>

      <div className="book-content">
        <h3 className="book-title">{title}</h3>
        <p className="book-author">{"Author: " + author}</p>
      </div>

      <div className="book-likes">

        <svg className="book-like-icon" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="80" fill="url(#paint0_radial)" fillOpacity="0.4"/>

          <path d="M60 40C60 34.4772 64.4772 30 70 30H140C145.523 30 150 34.4772 150 40V150C150 155.523 145.523 160 140 160H70C64.4772 160 60 155.523 60 150V40Z"
            fill="#1D4ED8"
            stroke="#1E3A8A"
            strokeWidth="4"
          />

          <path d="M70 30V160" stroke="#1E3A8A" strokeWidth="4" strokeLinecap="round"/>

          <rect x="80" y="50" width="50" height="4" rx="2" fill="#DBEAFE"/>
          <rect x="80" y="65" width="40" height="4" rx="2" fill="#DBEAFE"/>
          <rect x="80" y="80" width="45" height="4" rx="2" fill="#DBEAFE"/>

          <g>
            <path d="M155 130C155 141.5 140 155 130 155C120 155 105 141.5 105 130C105 121.716 111.716 115 120 115C124.142 115 127.892 116.679 130 119.394C132.108 116.679 135.858 115 140 115C148.284 115 155 121.716 155 130Z"
              fill="#EF4444"
            />
          </g>
        </svg>

        <span className="like-count">{likes}</span>

      </div>

    </button>
  );
}

export default BookPost;
