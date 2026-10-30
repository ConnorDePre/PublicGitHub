import { useEffect, useState } from 'react';
import BookPost from '../components/BookPost';
import { useScrollRestore } from '../hooks/useScrollRestore';
import './styles/Home.css';

interface Book {
  bookId: string;
  title: string;
  author: string;
  coverImage?: string;
  likes: number;
}

function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const API_BASE = import.meta.env.VITE_API_URL;

  useScrollRestore(books.length > 0);

  useEffect(() => {
    fetch(`${API_BASE}/books`)
      .then(res => res.json())
      .then(data => {
        console.log("Books response:", data);
        setBooks(data);
      })
      .catch(err => console.error("Failed to fetch books:", err));
  }, [API_BASE]);

  return (
    <div className="home-page">
      <div className="home-header">
        <div>
          <h1 className="home-title">Home</h1>
          <p className="home-subtitle">
            Your book feed, picked for you.
          </p>
        </div>
      </div>
      <div className="home-red-section">
        <div className="feed-container">
          {Array.isArray(books) && books.map((book) => (
            <BookPost
              key={book.bookId}
              bookId={book.bookId}
              title={book.title}
              author={book.author}
              coverImage={book.coverImage}
              likes={book.likes}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;
