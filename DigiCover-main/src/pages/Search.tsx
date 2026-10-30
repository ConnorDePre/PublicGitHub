import { useState } from "react";
import BookPost from "../components/BookPost";
import { GENRES } from "../constants/genres";
import { useScrollRestore } from "../hooks/useScrollRestore";
import "./styles/Search.css";

type SearchBook = {
  bookId: string;
  title: string;
  author: string;
  coverImage?: string;
  likes: number;
  genre?: string;
};

type GenreFilter = "all" | (typeof GENRES)[number];

function Search() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [genre, setGenre] = useState<GenreFilter>("all");
  const [books, setBooks] = useState<SearchBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useScrollRestore(books.length > 0);

  const runSearch = async (q: string, g: GenreFilter) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const API_BASE = import.meta.env.VITE_API_URL;
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (g !== "all") params.set("genre", g);

      const res = await fetch(`${API_BASE}/books/search?${params.toString()}`);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);

      const data = await res.json();
      setBooks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Search error:", err);
      setErrorMessage("Could not run that search. Try again.");
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = query;
    setSubmittedQuery(next);
    runSearch(next, genre);
  };

  const handleGenreChange = (next: GenreFilter) => {
    setGenre(next);
    if (submittedQuery !== null) {
      runSearch(submittedQuery, next);
    }
  };

  const showInitialPrompt = submittedQuery === null && !loading && !errorMessage;
  const showEmptyResults =
    submittedQuery !== null && !loading && !errorMessage && books.length === 0;

  return (
    <div className="search-page">
      <div className="search-header">
        <h1 className="search-title">Search</h1>
        <p className="search-subtitle">
          Find books by title, author, or description.
        </p>
      </div>

      <form className="search-controls" onSubmit={handleSubmit}>
        <div className="search-bar">
          <input
            type="search"
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books..."
            aria-label="Search books"
            autoFocus
          />
          <button
            type="submit"
            className="search-submit"
            aria-label="Run search"
          >
            &#10148;
          </button>
        </div>

        <div className="search-genre-wrap">
          <label className="search-genre-label" htmlFor="search-genre">
            Genre
          </label>
          <select
            id="search-genre"
            className="search-genre-select"
            value={genre}
            onChange={(e) => handleGenreChange(e.target.value as GenreFilter)}
          >
            <option value="all">All genres</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="search-results-shell">
        <div className="search-results-box">
          {loading ? (
            <p className="search-empty">Searching...</p>
          ) : errorMessage ? (
            <div className="search-state">
              <div className="search-state-title">Something went wrong</div>
              <div className="search-state-muted">{errorMessage}</div>
            </div>
          ) : showInitialPrompt ? (
            <div className="search-state">
              <div className="search-state-title">Type something to search</div>
              <div className="search-state-muted">
                Press Enter or the arrow button to look for books.
              </div>
            </div>
          ) : showEmptyResults ? (
            <div className="search-state">
              <div className="search-state-title">No books match</div>
              <div className="search-state-muted">
                Try a different query or change the genre.
              </div>
            </div>
          ) : (
            <>
              <div className="search-results-count">
                Showing <strong>{books.length}</strong> result
                {books.length === 1 ? "" : "s"}
              </div>
              <div className="search-book-grid">
                {books.map((b) => (
                  <BookPost
                    key={b.bookId}
                    bookId={b.bookId}
                    title={b.title}
                    author={b.author}
                    coverImage={b.coverImage}
                    likes={b.likes}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Search;
