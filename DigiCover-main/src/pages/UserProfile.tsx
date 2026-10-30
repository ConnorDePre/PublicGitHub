import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useScrollRestore } from "../hooks/useScrollRestore";
import BookPost from "../components/BookPost";
import "./styles/UserProfile.css";

type BookEntry = {
  bookId: string;
  title: string;
  author: string;
  likes: number;
  coverImage?: string;
};

type Profile = {
  username: string;
  displayName: string;
  bio: string;
  joinDate: string;
  followers: number;
  following: number;
  posts: BookEntry[];
  liked: BookEntry[];
};

type FetchedBook = {
  bookId?: string;
  title?: string;
  author?: string;
  coverImage?: string;
  likes?: number;
};

type HeaderProps = {
  profile: Profile;
  isOwnProfile: boolean;
};

function ProfileHeader({ profile, isOwnProfile }: HeaderProps) {
  const navigate = useNavigate();
  const avatarChar = (profile.displayName || profile.username || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="profile-header">
      <div className="profile-avatar">{avatarChar}</div>

      <div className="profile-info">
        <div className="profile-top-row">
          <h1 className="profile-username">@{profile.username}</h1>
          {isOwnProfile ? (
            <button
              className="profile-action"
              onClick={() => navigate(`/profile/${profile.username}/edit`)}
            >
              Edit Profile
            </button>
          ) : (
            <button className="profile-action">Follow</button>
          )}
        </div>

        <div className="profile-stats">
          <span><strong>{profile.posts.length}</strong> posts</span>
          <span><strong>{profile.followers}</strong> followers</span>
          <span><strong>{profile.following}</strong> following</span>
        </div>

        <h2 className="profile-display-name">{profile.displayName}</h2>
        <p className="profile-bio">{profile.bio}</p>
        <p className="profile-join-date">Joined {profile.joinDate}</p>
      </div>
    </div>
  );
}

type TabsProps = {
  activeTab: "posts" | "liked";
  onChange: (tab: "posts" | "liked") => void;
};

function ProfileTabs({ activeTab, onChange }: TabsProps) {
  return (
    <div className="profile-tabs">
      <button
        className={`profile-tab ${activeTab === "posts" ? "active" : ""}`}
        onClick={() => onChange("posts")}
      >
        Posts
      </button>
      <button
        className={`profile-tab ${activeTab === "liked" ? "active" : ""}`}
        onClick={() => onChange("liked")}
      >
        Liked
      </button>
    </div>
  );
}

type GridProps = {
  books: BookEntry[];
};

function BookGrid({ books }: GridProps) {
  if (books.length === 0) {
    return <p className="profile-empty">Nothing here yet.</p>;
  }

  return (
    <div className="profile-book-grid">
      {books.map((book) => (
        <BookPost
          key={book.bookId}
          bookId={book.bookId}
          title={book.title}
          author={book.author}
          likes={book.likes}
          coverImage={book.coverImage}
        />
      ))}
    </div>
  );
}

const UserProfile = () => {
  const { username } = useParams<{ username: string }>();
  const { isAuthenticated, currentUsername, user, displayName } = useAuth();
  const [activeTab, setActiveTab] = useState<"posts" | "liked">("posts");
  const [posts, setPosts] = useState<BookEntry[]>([]);
  const [liked, setLiked] = useState<BookEntry[]>([]);

  useScrollRestore(posts.length > 0 || liked.length > 0);

  const isOwnProfile =
    isAuthenticated &&
    !!currentUsername &&
    !!username &&
    currentUsername.toLowerCase() === username.toLowerCase();

  useEffect(() => {
    if (!isOwnProfile || !displayName) {
      setPosts([]);
      return;
    }

    const API_BASE = import.meta.env.VITE_API_URL;
    const controller = new AbortController();

    fetch(`${API_BASE}/books`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: FetchedBook[]) => {
        if (!Array.isArray(data)) {
          setPosts([]);
          return;
        }

        const mine = data
          .filter(
            (book) =>
              typeof book.author === "string" &&
              book.author.trim().toLowerCase() === displayName.toLowerCase(),
          )
          .map<BookEntry>((book) => ({
            bookId: book.bookId || "",
            title: book.title || "Untitled Book",
            author: book.author || displayName,
            likes: Number(book.likes || 0),
            coverImage: book.coverImage,
          }))
          .filter((book) => book.bookId);

        setPosts(mine);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        console.error("Failed to fetch profile posts:", err);
        setPosts([]);
      });

    return () => controller.abort();
  }, [isOwnProfile, displayName]);

  useEffect(() => {
    if (!isOwnProfile || !currentUsername) {
      setLiked([]);
      return;
    }

    const API_BASE = import.meta.env.VITE_API_URL;
    const controller = new AbortController();

    fetch(
      `${API_BASE}/users/${encodeURIComponent(currentUsername)}/likes`,
      { signal: controller.signal },
    )
      .then((res) => (res.ok ? res.json() : []))
      .then((data: FetchedBook[]) => {
        if (!Array.isArray(data)) {
          setLiked([]);
          return;
        }

        const likedBooks = data
          .map<BookEntry>((book) => ({
            bookId: book.bookId || "",
            title: book.title || "Untitled Book",
            author: book.author || "",
            likes: Number(book.likes || 0),
            coverImage: book.coverImage,
          }))
          .filter((book) => book.bookId);

        setLiked(likedBooks);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        console.error("Failed to fetch liked books:", err);
        setLiked([]);
      });

    return () => controller.abort();
  }, [isOwnProfile, currentUsername]);

  const profile = useMemo<Profile | null>(() => {
    if (!isOwnProfile || !user) return null;

    return {
      username: user.username,
      displayName: displayName || user.username,
      bio: "",
      joinDate: "recently",
      followers: 0,
      following: 0,
      posts,
      liked,
    };
  }, [isOwnProfile, user, displayName, posts, liked]);

  if (!profile) {
    return (
      <div className="profile-not-found">
        <h1>User not found</h1>
      </div>
    );
  }

  const books = activeTab === "posts" ? profile.posts : profile.liked;

  return (
    <div className="profile-page">
      <div className="profile-top">
        <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />
        <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>
      <div className="profile-bottom">
        <div className="profile-book-box">
          <BookGrid books={books} />
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
