import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import PageNavigator from '../components/PageNavigator';
import TextPage from '../components/TextPage';
import './styles/ReadBook.css';

const HARDCODED_COMMENTS = [
  { id: 1, author: 'Commenter 1', text: 'Test comment.' },
  { id: 2, author: 'Commenter 2', text: 'Test comment.' },
  { id: 3, author: 'Commenter 3', text: 'Test comment.' },
  { id: 4, author: 'Commenter 4', text: 'Test comment.' },
  { id: 5, author: 'Commenter 5', text: 'Test comment.' }
];

const CLOUDFRONT_URL = "https://d1cn7q2tof9i1s.cloudfront.net";

const ReadBook: React.FC = () => {
  const navigate = useNavigate();
  const { currentUsername } = useAuth();
  const { bookId, title } = useParams();
  const [book, setBook] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);

  const postActivity = useCallback(async (
    eventType: 'view' | 'like',
    data: { bookId: string; author?: string; tags?: string[] },
  ) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL;
      await fetch(`${API_BASE}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUsername || 'guest',
          bookId: data.bookId,
          eventType,
          author: data.author || '',
          tags: data.tags || [],
        }),
      });
    } catch (error) {
      console.warn(`Failed to record ${eventType} activity`, error);
    }
  }, [currentUsername]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchBook = async () => {
      const API_BASE = import.meta.env.VITE_API_URL;

      try {
        const res = await fetch(
          `${API_BASE}/books/${bookId}/${title}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          throw new Error(`Failed to fetch book: ${res.status}`);
        }
        const data = await res.json();
        setBook(data);

        setLikeCount(data.social?.likes || 0);
        setShareCount(data.social?.shares || 0);

        const resolvedBookId = data.bookId || String(bookId || '');

        if (currentUsername && resolvedBookId) {
          try {
            const [statusRes, saveStatusRes] = await Promise.all([
              fetch(
                `${API_BASE}/books/${resolvedBookId}/like-status?username=${encodeURIComponent(currentUsername)}`,
                { signal: controller.signal },
              ),
              fetch(
                `${API_BASE}/books/${resolvedBookId}/save-status?username=${encodeURIComponent(currentUsername)}`,
                { signal: controller.signal },
              ),
            ]);

            if (statusRes.ok) {
              const status = await statusRes.json();
              setLiked(!!status.liked);
            } else {
              setLiked(false);
            }

            if (saveStatusRes.ok) {
              const saveStatus = await saveStatusRes.json();
              setSaved(!!saveStatus.saved);
            } else {
              setSaved(false);
            }
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return;
            setLiked(false);
            setSaved(false);
          }
        } else {
          setLiked(false);
          setSaved(false);
        }

        await postActivity('view', {
          bookId: resolvedBookId,
          author: data.metadata?.author?.name,
          tags: data.social?.tags || [],
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error("Failed to fetch book:", err);
        setLiked(false);
      }
    };

    fetchBook();
    return () => controller.abort();
  }, [bookId, title, postActivity, currentUsername]);

  if (!book) {
    return <div className="read-book-loading">Loading book...</div>;
  }

  const nextPage = () => {
    if (currentPage < book.content.pages.length - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleLike = async () => {
    if (!currentUsername) {
      navigate('/Login');
      return;
    }
    if (!book?.bookId) return;

    const previousLiked = liked;
    const previousCount = likeCount;
    const nextLiked = !previousLiked;

    setLiked(nextLiked);
    setLikeCount(prev => Math.max(0, prev + (nextLiked ? 1 : -1)));

    try {
      const API_BASE = import.meta.env.VITE_API_URL;
      const res = await fetch(`${API_BASE}/books/${book.bookId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUsername,
          like: nextLiked,
          title: book.metadata?.title || title || '',
          author: book.metadata?.author?.name || '',
          coverImage: book.metadata?.coverImage || '',
          tags: book.social?.tags || [],
        }),
      });

      if (!res.ok) throw new Error(`Like request failed: ${res.status}`);

      const data = await res.json();
      setLiked(!!data.liked);
      setLikeCount(Math.max(0, Number(data.likes ?? previousCount)));
    } catch (error) {
      console.warn('Failed to update like', error);
      setLiked(previousLiked);
      setLikeCount(Math.max(0, previousCount));
    }
  };

  const handleSave = async () => {
    if (!currentUsername) {
      navigate('/Login');
      return;
    }
    if (!book?.bookId) return;

    const previousSaved = saved;
    const nextSaved = !previousSaved;

    setSaved(nextSaved);

    try {
      const API_BASE = import.meta.env.VITE_API_URL;
      const res = await fetch(`${API_BASE}/books/${book.bookId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUsername,
          save: nextSaved,
          title: book.metadata?.title || title || '',
          author: book.metadata?.author?.name || '',
          coverImage: book.metadata?.coverImage || '',
          tags: book.social?.tags || [],
        }),
      });

      if (!res.ok) throw new Error(`Save request failed: ${res.status}`);

      const data = await res.json();
      setSaved(!!data.saved);
    } catch (error) {
      console.warn('Failed to update save', error);
      setSaved(previousSaved);
    }
  };

  const handleShare = () => {
    setShareCount(prev => prev + 1);
  };

  const pageAssets = book.content.pages[currentPage].assets || [];

  return (
    <div className="read-book-container">
      <Navbar />

      <main className="read-book-content">
        <PageNavigator
          pages={book.content.pages}
          currentPage={currentPage}
          onJump={setCurrentPage}
          readOnly
        />

        <div className="read-page-layout">
          <div className="page-wrapper">
            <TextPage
              text={book.content.pages[currentPage].text}
              pageKey={currentPage}
            />

            {pageAssets.length > 0 && (
              <div className="page-assets">
                {pageAssets.map((asset: any, idx: number) => {
                  if (asset.type === 'image') {
                    return (
                      <img
                        key={idx}
                        src={asset.url.startsWith('http') ? asset.url : `${CLOUDFRONT_URL}${asset.url}`}
                        alt={asset.altText || 'Book image'}
                        className="book-page-image"
                      />
                    );
                  }
                  return null;
                })}
              </div>
            )}

            <div className="page-controls">
              <button
                className="page-arrow left-arrow"
                aria-label="Previous page"
                onClick={prevPage}
                disabled={currentPage === 0}
              >
                &#10094;
              </button>

              <span className="page-number">
                Page {currentPage + 1} / {book.content.totalPages}
              </span>

              <button
                className="page-arrow right-arrow"
                aria-label="Next page"
                onClick={nextPage}
                disabled={currentPage === book.content.pages.length - 1}
              >
                &#10095;
              </button>
            </div>
          </div>
        </div>

        <aside className={`read-book-sidebar ${sidebarExpanded ? 'expanded' : 'collapsed'}`}>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarExpanded(prev => !prev)}
            aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarExpanded ? '>' : '<'}
          </button>

          {sidebarExpanded ? (
            <div className="sidebar-info">
              <div className="sidebar-box">
                <div className="author-row">
                  <div className="author-avatar">
                    {book.metadata.author.name.charAt(0)}
                  </div>

                  <div className="author-text">
                    <h2>{book.metadata.author.name}</h2>
                    <p>{book.metadata.author.accountCreatedOn}</p>
                  </div>
                </div>

                <p className="author-bio">{book.metadata.author.bio}</p>
              </div>

              <div className="sidebar-box">
                <h3>{book.metadata.title}</h3>
                <p>{book.metadata.description}</p>
                <p>Posted On: {book.metadata.publishedDate}</p>
                <p>Last Updated: {book.metadata.publishedDate}</p>
              </div>
            </div>
          ) : (
            <div className="sidebar-compact">
              <div className="sidebar-box compact-box">
                <div className="author-avatar">
                  {book.metadata.author.name.charAt(0)}
                </div>

                <div className="sidebar-main-info">
                  <h2>{book.metadata.author.name}</h2>
                  <p>{book.metadata.title}</p>
                </div>
              </div>
            </div>
          )}

          <div className={`sidebar-actions ${sidebarExpanded ? 'row' : 'column'}`}>
            <div className="action-item">
              <button
                className={`sidebar-action-button like-button ${liked ? 'liked' : ''}`}
                onClick={handleLike}
                disabled={!currentUsername}
                title={currentUsername ? undefined : 'Sign in to like'}
                aria-pressed={liked}
              >
                {liked ? 'Liked' : 'Like'}
              </button>
              <span className="action-count">{likeCount}</span>
            </div>

            <div className="action-item">
              <button
                className={`sidebar-action-button save-button ${saved ? 'saved' : ''}`}
                onClick={handleSave}
                disabled={!currentUsername}
                title={currentUsername ? undefined : 'Sign in to save'}
                aria-pressed={saved}
              >
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>

            <div className="action-item">
              <button className="sidebar-action-button" type="button" onClick={handleShare}>
                Share
              </button>
              <span className="action-count">{shareCount}</span>
            </div>
          </div>

          {sidebarExpanded && (
            <div className="sidebar-box comments-box">
              <h3>Comments ({HARDCODED_COMMENTS.length})</h3>
              <div className="read-book-comments">
                {HARDCODED_COMMENTS.map(comment => (
                  <div className="read-book-comment" key={comment.id}>
                    <span className="comment-author">{comment.author}</span>
                    <p>{comment.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
};

export default ReadBook;
