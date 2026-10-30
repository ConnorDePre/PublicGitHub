import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useScrollRestore } from "../hooks/useScrollRestore";
import BookPost from "../components/BookPost";
import "./styles/Library.css";

type SortOption = "newest" | "oldest" | "mine" | "others" | "az";

type SavedBook = {
  bookId: string;
  title: string;
  author: string;
  coverImage?: string;
  savedAt: string;
};

type FetchedSavedBook = {
  bookId?: string;
  title?: string;
  author?: string;
  coverImage?: string;
  savedAt?: string;
};

const SORT_ITEMS: { key: SortOption; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "mine", label: "Made by you" },
  { key: "others", label: "Made by others" },
  { key: "az", label: "Alphabetical" },
];

function SortPills({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (next: SortOption) => void;
}) {
  return (
    <div className="sortRow" role="group" aria-label="Sort by options">
      {SORT_ITEMS.map((it) => (
        <button
          key={it.key}
          type="button"
          className={`pill ${value === it.key ? "pillActive" : ""}`}
          onClick={() => onChange(it.key)}
          aria-pressed={value === it.key}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function Library() {
  const { isAuthenticated, currentUsername, displayName } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [books, setBooks] = useState<SavedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useScrollRestore(books.length > 0);

  useEffect(() => {
    if (!isAuthenticated || !currentUsername) {
      setBooks([]);
      return;
    }

    const API_BASE = import.meta.env.VITE_API_URL;
    const controller = new AbortController();
    setLoading(true);
    setErrorMessage(null);

    fetch(
      `${API_BASE}/users/${encodeURIComponent(currentUsername)}/saves`,
      { signal: controller.signal },
    )
      .then((res) => {
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        return res.json();
      })
      .then((data: FetchedSavedBook[]) => {
        if (!Array.isArray(data)) {
          setBooks([]);
          return;
        }
        const mapped: SavedBook[] = data
          .map((b) => ({
            bookId: b.bookId || "",
            title: b.title || "Untitled Book",
            author: b.author || "",
            coverImage: b.coverImage || undefined,
            savedAt: b.savedAt || new Date().toISOString(),
          }))
          .filter((b) => b.bookId);
        setBooks(mapped);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        console.error("Failed to fetch saved books:", err);
        setErrorMessage("Could not load your saved books.");
        setBooks([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [isAuthenticated, currentUsername]);

  const visibleBooks = useMemo(() => {
    let list = [...books];

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q),
      );
    }

    const mineKey = (displayName || "").trim().toLowerCase();

    if (sortBy === "newest") {
      list.sort(
        (a, b) =>
          new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
      );
    } else if (sortBy === "oldest") {
      list.sort(
        (a, b) =>
          new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime(),
      );
    } else if (sortBy === "mine") {
      list = list.filter(
        (b) => mineKey && b.author.trim().toLowerCase() === mineKey,
      );
      list.sort(
        (a, b) =>
          new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
      );
    } else if (sortBy === "others") {
      list = list.filter(
        (b) => !mineKey || b.author.trim().toLowerCase() !== mineKey,
      );
      list.sort(
        (a, b) =>
          new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
      );
    } else if (sortBy === "az") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [books, query, sortBy, displayName]);

  if (!isAuthenticated) {
    return (
      <div className="libraryPage">
        <div className="libraryHeader">
          <div>
            <h1 className="libraryTitle">Personal Library</h1>
            <p className="librarySubtitle">
              Sign in to see the books you have saved.
            </p>
          </div>
        </div>
        <div className="profile-gate-red">
          <div className="profile-gate-box">
            <h1>Please sign in</h1>
            <p>You need to be signed in to view your Library.</p>
            <button className="profile-gate-button" onClick={() => navigate("/Login")}>
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="libraryPage">
      <div className="libraryHeader">
        <div>
          <h1 className="libraryTitle">Personal Library</h1>
          <p className="librarySubtitle">
            Your saved books. Newest shows first by default.
          </p>
        </div>
      </div>

      <div className="controls">
        <div className="searchWrap">
          <input
            className="searchInput"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your saved books..."
            aria-label="Search saved books"
          />
          {query.trim().length > 0 && (
            <button
              type="button"
              className="clearBtn"
              onClick={() => setQuery("")}
            >
              Clear
            </button>
          )}
        </div>

        <div className="sortWrap">
          <div className="sortLabel">Sort By</div>
          <SortPills value={sortBy} onChange={setSortBy} />
        </div>
      </div>

      <div className="listHeader">
        <div className="muted">
          Showing <strong>{visibleBooks.length}</strong> of{" "}
          <strong>{books.length}</strong>
        </div>
      </div>

      <div className="library-bottom">
        <div className="library-book-box">
          {loading && books.length === 0 ? (
            <p className="profile-empty">Loading your saved books...</p>
          ) : errorMessage ? (
            <div className="emptyState">
              <div className="emptyTitle">Something went wrong</div>
              <div className="muted">{errorMessage}</div>
            </div>
          ) : visibleBooks.length === 0 ? (
            <div className="emptyState">
              <div className="emptyTitle">
                {books.length === 0
                  ? "No saved books yet"
                  : "No books match your filters"}
              </div>
              <div className="muted">
                {books.length === 0
                  ? "Click Save on any book to add it to your library."
                  : "Try a different search or sort filter."}
              </div>
            </div>
          ) : (
            <div className="library-book-grid">
              {visibleBooks.map((b) => (
                <BookPost
                  key={b.bookId}
                  bookId={b.bookId}
                  title={b.title}
                  author={b.author}
                  coverImage={b.coverImage}
                  likes={0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Library;
