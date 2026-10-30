import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_GENRE, GENRES } from '../constants/genres';
import type { Genre } from '../constants/genres';
import DOMPurify from 'dompurify';
import './styles/Publish.css';

interface BookPage {
	pageNumber: number;
	text: string;
	assets: unknown[];
}

interface BookDraft {
	bookId: string;
	metadata?: {
		title?: string;
		description?: string;
		genre?: Genre;
	};
	content: {
		pages: BookPage[];
	};
	social?: {
		shares: number;
		likes: number;
		tags: string[];
	};
}

function Publish() {
	const navigate = useNavigate();
	const location = useLocation();
	const { isAuthenticated, user, displayName } = useAuth();
	const [currentPage, setCurrentPage] = useState(0);
	const [postMessage, setPostMessage] = useState('');
	const [isBoldActive, setIsBoldActive] = useState(false);
	const [isItalicActive, setIsItalicActive] = useState(false);
	const [bookData, setBookData] = useState<BookDraft | null>(null);
	const [title, setTitle] = useState('');
	const [genre, setGenre] = useState<Genre>(DEFAULT_GENRE);
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);
	const [validationError, setValidationError] = useState('');
	const descriptionRef = useRef<HTMLDivElement | null>(null);

	const totalPages = bookData?.content.pages.length || 0;

	//const pageText = useMemo(() => {
	//	return bookData?.content.pages[currentPage]?.text ?? '';
	//}, [bookData, currentPage]);

	const handlePreviousPage = () => {
		setCurrentPage((prev) => (prev > 0 ? prev - 1 : prev));
	};

	const handleNextPage = () => {
		setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : prev));
	};

	const applyDescriptionFormat = (command: 'bold' | 'italic') => {
		if (!descriptionRef.current) return;
		descriptionRef.current.focus();
		document.execCommand(command);
		syncFormatState();
	};

	const syncFormatState = () => {
		setIsBoldActive(document.queryCommandState('bold'));
		setIsItalicActive(document.queryCommandState('italic'));
	};

	const buildUpdatedDraft = (): BookDraft | null => {
		if (!bookData) return null;
		return {
			...bookData,
			metadata: {
				...(bookData.metadata || {}),
				title: title || 'Untitled Book',
				description: descriptionRef.current?.innerText || '',
			},
		};
	};

	const saveCurrentDraft = (): BookDraft | null => {
		const updatedDraft = buildUpdatedDraft();
		if (!updatedDraft) return null;
		setBookData(updatedDraft);
		localStorage.setItem('digicover_draft', JSON.stringify(updatedDraft));
		return updatedDraft;
	};

	const handlePostClick = () => {
		const trimmedTitle = title.trim();
		const hasContent = (bookData?.content?.pages || []).some(p =>
			(p.text || '').replace(/<[^>]*>/g, '').trim() !== ''
		);

		if (!hasContent) {
			setValidationError('Your book has no content yet.');
			return;
		}
		if (!trimmedTitle) {
			setValidationError('Please enter a title before posting.');
			return;
		}

		setValidationError('');
		saveCurrentDraft();
		setShowConfirmModal(true);
	};

	const handleConfirmCancel = () => {
		setShowConfirmModal(false);
	};

	const handleProceedPublish = async () => {
		if (!bookData) return;

		setShowConfirmModal(false);
		setIsPublishing(true);
		setPostMessage('');

		const authorName = (displayName && displayName.trim()) || user?.username;

		const payload = {
			bookId: `dc-${Date.now()}`,
			title: title || 'Untitled Book',
			author: authorName,
			description: descriptionRef.current?.innerText || "",
			genre,
			pages: bookData.content.pages,
			social: bookData.social || { shares: 0, likes: 0, tags: [] },
		};

		const API_BASE = import.meta.env.VITE_API_URL;

		try {
			const primaryResponse = await fetch(`${API_BASE}/publish`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			let response = primaryResponse;
			if (!primaryResponse.ok && primaryResponse.status === 404) {
				response = await fetch(`${API_BASE}/api/publish`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});
			}

			if (response.ok) {
				setPostMessage('Book published successfully!');
				localStorage.removeItem('digicover_draft');
				setTimeout(() => navigate('/profile'), 900);
			} else {
				setPostMessage('Failed to publish.');
			}
		} catch (error) {
			console.error('Publish error:', error);
			setPostMessage('Error connecting to server.');
		} finally {
			setIsPublishing(false);
		}
	};

	useEffect(() => {
		const passedDraft = (location.state as { draft?: BookDraft } | null)?.draft;
		let source: BookDraft | null = passedDraft ?? null;

		if (!source) {
			const savedDraft = localStorage.getItem('digicover_draft');
			if (savedDraft) {
				try {
					source = JSON.parse(savedDraft) as BookDraft;
				} catch (error) {
					console.error('Could not parse saved draft:', error);
					setPostMessage('Could not load saved draft.');
					return;
				}
			}
		}

		if (!source) return;

		setBookData(source);
		setTitle(source?.metadata?.title || '');

		const draftGenre = source?.metadata?.genre;
		if (draftGenre && (GENRES as readonly string[]).includes(draftGenre)) {
			setGenre(draftGenre as Genre);
		}

		if (descriptionRef.current) {
			descriptionRef.current.innerText = source?.metadata?.description || '';
		}
	}, []);

	if (!isAuthenticated && process.env.NODE_ENV !== 'development') {
		return <Navigate to="/Login" replace />;
	}


	const handleBackToEditor = () => {
		const updated = saveCurrentDraft();
		navigate('/Book-Editor', { state: { draft: updated } });
	};

	return (
		<div className="publish-page-container">
			<header className="publish-header">
				<h1 className="publish-title">Publish</h1>
			</header>

			<main className="publish-main-content">
				<section className="publish-preview-section" aria-label="Book preview">

					<div className="publish-book-preview">
						<div
							dangerouslySetInnerHTML={{
								__html: DOMPurify.sanitize(
									bookData?.content?.pages?.[currentPage]?.text || ''
								)
							}}
						/>
					</div>

					<div className="publish-page-controls">
						<button
							className="publish-page-arrow"
							onClick={handlePreviousPage}
							aria-label="Previous page"
							disabled={currentPage === 0}
						>
							&#10094;
						</button>

						<span className="publish-page-number">Page {currentPage + 1} of {totalPages}</span>

						<button
							className="publish-page-arrow"
							onClick={handleNextPage}
							aria-label="Next page"
							disabled={currentPage === totalPages - 1}
						>
							&#10095;
						</button>
					</div>
				</section>

				<section className="publish-description-section" aria-label="Description and post">
					<h2 className="publish-title-label">Title</h2>

					<input
						type="text"
						className="publish-title-input"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="Enter book title"
						maxLength={120}
					/>

					<h2 className="publish-title-label">Genre</h2>

					<select
						className="publish-genre-select"
						value={genre}
						onChange={(e) => setGenre(e.target.value as Genre)}
						aria-label="Book genre"
					>
						{GENRES.map((g) => (
							<option key={g} value={g}>
								{g}
							</option>
						))}
					</select>

					<h2 className="publish-description-title">Description</h2>

					<div className="publish-description-tools" role="toolbar" aria-label="Description formatting toolbar">
						<button
							type="button"
							onClick={() => applyDescriptionFormat('bold')}
							className={isBoldActive ? 'active' : ''}
							aria-label="Bold text"
							aria-pressed={isBoldActive}
						>
							B
						</button>
						<button
							type="button"
							onClick={() => applyDescriptionFormat('italic')}
							className={isItalicActive ? 'active' : ''}
							aria-label="Italic text"
							aria-pressed={isItalicActive}
						>
							I
						</button>
					</div>

					<div
						ref={descriptionRef}
						className="publish-description-box"
						contentEditable
						suppressContentEditableWarning
						data-placeholder="Type Here"
						aria-label="Book description"
						onKeyUp={syncFormatState}
						onMouseUp={syncFormatState}
						onFocus={syncFormatState}
					/>

					<div className="publish-action-row">
						<button className="publish-back-button" onClick={handleBackToEditor} disabled={isPublishing}>
							Back to Editor
						</button>

						<button className="publish-post-button" onClick={handlePostClick} disabled={!bookData || isPublishing}>
							Post
						</button>
					</div>

					{validationError && <div className="publish-error">{validationError}</div>}
					{postMessage && (
						<div className={postMessage.toLowerCase().includes('success') ? 'publish-success' : 'publish-toast'}>
							{postMessage}
						</div>
					)}
				</section>
			</main>

			{showConfirmModal && (
				<div className="confirm-modal-backdrop" onClick={handleConfirmCancel}>
					<div className="confirm-modal" onClick={e => e.stopPropagation()}>
						<button className="confirm-modal-close" onClick={handleConfirmCancel}>✕</button>
						<h2>Publish this book?</h2>
						<p>Your draft has been saved. Choose Post to publish, or Cancel to keep editing.</p>
						<div className="confirm-modal-actions">
							<button className="confirm-modal-cancel" onClick={handleConfirmCancel}>Cancel</button>
							<button className="confirm-modal-confirm" onClick={handleProceedPublish}>Post</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default Publish;
