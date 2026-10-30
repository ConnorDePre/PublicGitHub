import React, { useState, useRef, useEffect } from 'react';
import FileTools from '../components/FileTools.jsx';
import ShareTools from '../components/ShareTools.jsx';
import PageNavigator from '../components/PageNavigator';
import TextPage from '../components/TextPage';
import Navbar from '../components/Navbar';
import MediaTools from "../components/MediaTools.tsx"
import { useBlocker, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createPortal } from "react-dom";
import './styles/BookEditor.css';
import './styles/Profile.css';

const BookEditor = () => {
  const FONT_OPTIONS = ['Arial', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Helvetica'];
  const HEADING_OPTIONS: { label: string; tag: string }[] = [
    { label: 'Normal', tag: 'p' },
    { label: 'Heading 1', tag: 'h1' },
    { label: 'Heading 2', tag: 'h2' },
    { label: 'Heading 3', tag: 'h3' },
    { label: 'Heading 4', tag: 'h4' },
    { label: 'Heading 5', tag: 'h5' },
  ];
  const ALIGNMENT_OPTIONS: { label: string; cmd: string; icon: string }[] = [
    { label: 'Left', cmd: 'justifyLeft', icon: '⯇' },
    { label: 'Center', cmd: 'justifyCenter', icon: '≡' },
    { label: 'Right', cmd: 'justifyRight', icon: '⯈' },
  ];
  const TEXT_COLORS = ['#000000', '#ffffff', '#80011F', '#db5151', '#ff8c00', '#ffd700', '#00a000', '#0066cc', '#6633cc', '#a0a0a0'];
  const HIGHLIGHT_COLORS = ['transparent', '#ffff00', '#ffd54f', '#ff8a80', '#b9f6ca', '#80d8ff', '#e1bee7', '#bcaaa4', '#cfd8dc'];

  
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [showMediaTools, setShowMediaTools] = useState(false);
    const [pages, setPages] = useState<string[]>(() => {
      const draft = (location.state as { draft?: { content?: { pages?: { text?: string }[] } } } | null)?.draft;
      const restored = draft?.content?.pages?.map(p => p.text || '');
      if (Array.isArray(restored) && restored.length > 0) return restored;
      return [''];
    });
    const [currentPage, setCurrentPage] = useState(0);
    const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
    const [currentFont, setCurrentFont] = useState('Arial');
    const [currentSize, setCurrentSize] = useState(16);
    const [currentColor, setCurrentColor] = useState('#000000');
    const [currentHighlight, setCurrentHighlight] = useState('#ffff00');
    const [currentAlignment, setCurrentAlignment] = useState(ALIGNMENT_OPTIONS[0]);
    const [currentHeading, setCurrentHeading] = useState(HEADING_OPTIONS[0]);
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);

    const clearCurrentPage = () => {
      const updated = [...pages];
      updated[currentPage] = '';
      setPages(updated);
      showToast("Page cleared");
    };

    const hasUnsavedContent = pages.some(p => p.replace(/<[^>]*>/g, '').trim() !== '');

    const blocker = useBlocker(({ nextLocation }) =>
      hasUnsavedContent && nextLocation.pathname !== '/Publish'
    );

    useEffect(() => {
      if (!hasUnsavedContent) return;
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }, [hasUnsavedContent]);

    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toastId = useRef(0);
    const lastRange = useRef<Range | null>(null);



    useEffect(() => {
      if (activeTab === null) return;
      const handler = (e: MouseEvent) => {
        const target = e.target as Element;
        if (target.closest('.toolbar-tab')) return;
        if (target.closest('.share-modal-backdrop')) return;
        if (target.closest('.confirm-modal-backdrop')) return;
        setActiveTab(null);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [activeTab]);

    const getEditor = () => document.querySelector('.text-page') as HTMLElement | null;

    const toHex = (color: string) => {
      if (!color) return '';
      if (color[0] === '#') return color.toLowerCase();
      const parts = color.match(/\d+/g);
      if (!parts) return '';
      return '#' + parts.slice(0, 3).map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('');
    };

    const isTransparent = (color: string) =>
      !color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)';

    const syncState = () => {
      const editor = getEditor();
      if (!editor) return;
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) return;
      lastRange.current = range.cloneRange();

      let target: Node = range.startContainer;
      if (target.nodeType === 1) {
        const children = target.childNodes;
        target = children[range.startOffset - 1] || children[range.startOffset] || target;
      }
      const el = (target.nodeType === 3 ? target.parentElement : (target as Element)) as HTMLElement | null;
      if (!el) return;
      const computed = window.getComputedStyle(el);

      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));

      const fam = computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      const fontMatch = FONT_OPTIONS.find(f => f.toLowerCase() === fam.toLowerCase());
      if (fontMatch) setCurrentFont(fontMatch);

      const colorVal = toHex(computed.color);
      if (colorVal) setCurrentColor(colorVal);

      const bgEl = el.closest('[style*="background-color"]') as HTMLElement | null;
      const bg = bgEl ? bgEl.style.backgroundColor : '';
      setCurrentHighlight(isTransparent(bg) ? 'transparent' : toHex(bg));

      const blockEl = (el.closest('h1,h2,h3,h4,h5,h6,p,div') as HTMLElement | null) || el;
      const align = window.getComputedStyle(blockEl).textAlign;
      if (align === 'center') setCurrentAlignment(ALIGNMENT_OPTIONS[1]);
      else if (align === 'right') setCurrentAlignment(ALIGNMENT_OPTIONS[2]);
      else setCurrentAlignment(ALIGNMENT_OPTIONS[0]);

      const headingEl = el.closest('h1,h2,h3,h4,h5') as HTMLElement | null;
      const tag = headingEl ? headingEl.tagName.toLowerCase() : 'p';
      const headingMatch = HEADING_OPTIONS.find(h => h.tag === tag);
      setCurrentHeading(headingMatch || HEADING_OPTIONS[0]);

      const size = parseInt(computed.fontSize, 10);
      if (size) setCurrentSize(size);
    };

    useEffect(() => {
      document.addEventListener('selectionchange', syncState);
      return () => document.removeEventListener('selectionchange', syncState);
    }, []);

    const exec = (command: string, value?: string) => {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand(command, false, value);
      syncState();
    };

    const showToast = (message: string) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastId.current += 1;
      setToast({ message, id: toastId.current });
      toastTimer.current = setTimeout(() => setToast(null), 2500);
    };

    const handlePageTextChange = (newText: string) => {
      const updatedPages = [...pages];
      updatedPages[currentPage] = newText;
      setPages(updatedPages);
    };

    const snapshotCurrentPage = () => {
      const editor = getEditor();
      if (!editor) return;
      const html = editor.innerHTML;
      setPages(prev => prev.map((p, i) => (i === currentPage ? html : p)));
    };

    const nextPage = () => {
      if (currentPage < pages.length - 1) {
        snapshotCurrentPage();
        setCurrentPage(prev => prev + 1);
      }
    };

    const prevPage = () => {
      if (currentPage > 0) {
        snapshotCurrentPage();
        setCurrentPage(currentPage - 1);
      }
    };

    const jumpToPage = (idx: number) => {
      snapshotCurrentPage();
      setCurrentPage(idx);
    };

    const addPage = () => {
      snapshotCurrentPage();
      setPages(prev => [...prev, '']);
      showToast("New page added");
    };

    const deletePage = (idx: number) => {
      if (pages.length === 1) {
        showToast("Can't delete the last page");
        return;
      }
      if (pages[idx].replace(/<[^>]*>/g, '').trim() !== '') {
        setConfirmDelete(idx);
        return;
      }
      performDelete(idx);
    };

    const performDelete = (idx: number) => {
      const newPages = pages.filter((_, i) => i !== idx);
      setPages(newPages);
      setCurrentPage(prev => {
        if (idx < prev) return prev - 1;
        if (idx === prev) return idx < newPages.length ? idx : newPages.length - 1;
        return prev;
      });
      showToast("Page deleted");
    };

    const buildBookJSON = (pagesSnapshot: string[] = pages) => ({
      bookId: `dc-${Date.now()}`,
      metadata: {
        title: "",
        author: { name: "Santiago", bio: "", id: "auth-local" },
        genre: "Unknown",
        publishedDate: new Date().toISOString(),
        coverImage: ""
      },
      content: {
        totalPages: pagesSnapshot.length,
        pages: pagesSnapshot.map((text, index) => ({
          pageNumber: index + 1,
          text: text,
          assets: []
        }))
      },
      social: { shares: 0, likes: 0, tags: [] }
    });

    const goToPublish = () => {
      const editor = getEditor();
      const latestPages = editor
        ? pages.map((p, i) => (i === currentPage ? editor.innerHTML : p))
        : pages;
      const bookJSON = buildBookJSON(latestPages);
      localStorage.setItem("digicover_draft", JSON.stringify(bookJSON));
      navigate('/Publish', { state: { draft: bookJSON } });
    };

    const keepFocus = (e: React.MouseEvent) => e.preventDefault();

    const applyHeading = (option: typeof HEADING_OPTIONS[number]) => {
      setCurrentHeading(option);
      exec('formatBlock', option.tag);
      setActiveTab(null);
    };

    const styleSelection = (
      apply: (span: HTMLElement) => void,
      options: { clearProp?: 'fontFamily' | 'backgroundColor'; onCollapsed?: () => void } = {}
    ) => {
      const editor = getEditor();
      if (!editor) return;
      const sel = window.getSelection();
      if (!sel) return;
      let range = sel.rangeCount ? sel.getRangeAt(0) : null;
      if (!range || !editor.contains(range.commonAncestorContainer)) {
        range = lastRange.current;
      }
      if (!range) return;
      if (range.collapsed) {
        if (options.onCollapsed) {
          options.onCollapsed();
          return;
        }
        const span = document.createElement('span');
        apply(span);
        span.appendChild(document.createTextNode('\u200B'));
        range.insertNode(span);
        const caret = document.createRange();
        caret.setStart(span.firstChild as Node, 1);
        caret.collapse(true);
        editor.focus();
        sel.removeAllRanges();
        sel.addRange(caret);
        lastRange.current = caret.cloneRange();
        return;
      }
      const span = document.createElement('span');
      const frag = range.extractContents();
      if (options.clearProp) {
        frag.querySelectorAll('*').forEach(child => {
          (child as HTMLElement).style[options.clearProp!] = '';
        });
      }
      apply(span);
      span.appendChild(frag);
      range.insertNode(span);
      const picked = document.createRange();
      picked.selectNodeContents(span);
      editor.focus();
      sel.removeAllRanges();
      sel.addRange(picked);
      lastRange.current = picked.cloneRange();
    };

    const applyFont = (font: string) => {
      setCurrentFont(font);
      setActiveTab(null);
      styleSelection(span => { span.style.fontFamily = font; }, { clearProp: 'fontFamily' });
    };

    const applySize = (size: number) => {
      const clamped = Math.max(8, Math.min(100, Math.round(size)));
      setCurrentSize(clamped);
      styleSelection(span => { span.style.fontSize = clamped + 'px'; });
    };

    const applyColor = (color: string) => {
      setCurrentColor(color);
      exec('foreColor', color);
      setActiveTab(null);
    };

    const applyHighlight = (color: string) => {
      setCurrentHighlight(color);
      setActiveTab(null);
      styleSelection(
        span => { if (color !== 'transparent') span.style.backgroundColor = color; },
        { clearProp: 'backgroundColor', onCollapsed: () => exec('hiliteColor', color) }
      );
    };

    const applyAlignment = (option: typeof ALIGNMENT_OPTIONS[number]) => {
      setCurrentAlignment(option);
      exec(option.cmd);
      setActiveTab(null);
    };

    if (!isAuthenticated && process.env.NODE_ENV !== 'development') {
      return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <div style={{ flex: 1, paddingTop: '1px' }}>
            <div className="profile-gate">
              <div className="profile-gate-header">
                <div>
                  <h1 className="profile-gate-page-title">Create Book</h1>
                  <p className="profile-gate-page-subtitle">
                    Sign in to create and publish your own books.
                  </p>
                </div>
              </div>
              <div className="profile-gate-red">
                <div className="profile-gate-box">
                  <h1>Please sign in</h1>
                  <p>You need to be signed in to create a book.</p>
                  <button className="profile-gate-button" onClick={() => navigate("/Login")}>
                    Sign In
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="book-editor-page-container">
        <Navbar />

        {toast && (
          <div className="toast" key={toast.id}>
            {toast.message}
          </div>
        )}

        {confirmDelete !== null && (
          <div className="confirm-modal-backdrop" onClick={() => setConfirmDelete(null)}>
            <div className="confirm-modal" onClick={e => e.stopPropagation()}>
              <button className="confirm-modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
              <h2>Delete page?</h2>
              <p>This page has content. Are you sure you want to delete it?</p>
              <div className="confirm-modal-actions">
                <button className="confirm-modal-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="confirm-modal-confirm" onClick={() => { performDelete(confirmDelete); setConfirmDelete(null); }}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {blocker.state === 'blocked' && (
          <div className="confirm-modal-backdrop" onClick={() => blocker.reset?.()}>
            <div className="confirm-modal" onClick={e => e.stopPropagation()}>
              <button className="confirm-modal-close" onClick={() => blocker.reset?.()}>✕</button>
              <h2>Leave editor?</h2>
              <p>Your changes will be lost if you leave. Publish the book to keep your work.</p>
              <div className="confirm-modal-actions">
                <button className="confirm-modal-cancel" onClick={() => blocker.reset?.()}>Cancel</button>
                <button className="confirm-modal-confirm" onClick={() => blocker.proceed?.()}>Leave</button>
              </div>
            </div>
          </div>
        )}

        <div className="book-editor-toolbar">
          <div className="toolbar-section toolbar-section-left">
            <div className="toolbar-tab">
              <button
                className={activeTab === 'file' ? 'toolbar-btn active' : 'toolbar-btn'}
                onClick={() => setActiveTab(activeTab === 'file' ? null : 'file')}
              >
                File
              </button>
              {activeTab === 'file' && (
                <FileTools onClose={() => setActiveTab(null)} showToast={showToast} />
              )}
            </div>

            <div className="toolbar-tab">
              <button 
                className="toolbar-btn" 
                onClick={() => setShowMediaTools(prev => !prev)}
              >
                Add Media
              </button>
              {showMediaTools && 
                createPortal(
                  <MediaTools onClose={() => setShowMediaTools(false)} />,
                  document.body
                )
              }
            </div>
            
            <button className="toolbar-btn" onClick={() => showToast('Add Shapes')}>
              Add Shapes
            </button>
          </div>

          <div className="toolbar-section toolbar-section-format">
            <div className="toolbar-tab">
              <button
                className="format-btn-text"
                onMouseDown={keepFocus}
                onClick={() => setActiveTab(activeTab === 'heading' ? null : 'heading')}
              >
                <span className="format-btn-truncate">{currentHeading.label}</span>
                <span className="format-btn-chevron">▾</span>
              </button>
              {activeTab === 'heading' && (
                <div className="toolbar-dropdown">
                  {HEADING_OPTIONS.map(option => (
                    <button
                      key={option.tag}
                      onMouseDown={keepFocus}
                      onClick={() => applyHeading(option)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="toolbar-tab">
              <button
                className="format-btn-text"
                onMouseDown={keepFocus}
                onClick={() => setActiveTab(activeTab === 'font' ? null : 'font')}
              >
                <span className="format-btn-truncate" style={{ fontFamily: currentFont }}>{currentFont}</span>
                <span className="format-btn-chevron">▾</span>
              </button>
              {activeTab === 'font' && (
                <div className="toolbar-dropdown">
                  {FONT_OPTIONS.map(font => (
                    <button
                      key={font}
                      style={{ fontFamily: font }}
                      onMouseDown={keepFocus}
                      onClick={() => applyFont(font)}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="toolbar-divider" />

            <div className="size-group">
              <button
                className="format-btn size-step"
                onMouseDown={keepFocus}
                onClick={() => applySize(currentSize - 1)}
                aria-label="Decrease size"
              >−</button>
              <input
                type="number"
                min="8"
                max="100"
                className="size-input"
                value={currentSize}
                onChange={(e) => applySize(parseInt(e.target.value) || currentSize)}
              />
              <button
                className="format-btn size-step"
                onMouseDown={keepFocus}
                onClick={() => applySize(currentSize + 1)}
                aria-label="Increase size"
              >+</button>
            </div>

            <span className="toolbar-divider" />

            <button className={isBold ? 'format-btn active' : 'format-btn'} onMouseDown={keepFocus} onClick={() => exec('bold')}><b>B</b></button>
            <button className={isItalic ? 'format-btn active' : 'format-btn'} onMouseDown={keepFocus} onClick={() => exec('italic')}><i>I</i></button>
            <button className={isUnderline ? 'format-btn active' : 'format-btn'} onMouseDown={keepFocus} onClick={() => exec('underline')}><u>U</u></button>

            <div className="toolbar-tab">
              <button
                className="format-btn color-btn"
                onMouseDown={keepFocus}
                onClick={() => setActiveTab(activeTab === 'color' ? null : 'color')}
                aria-label="Text color"
              >
                <span className="color-btn-letter">A</span>
                <span className="color-btn-bar" style={{ backgroundColor: currentColor }} />
              </button>
              {activeTab === 'color' && (
                <div className="toolbar-dropdown color-dropdown">
                  {TEXT_COLORS.map(color => (
                    <button
                      key={color}
                      className="color-swatch"
                      style={{ backgroundColor: color }}
                      onMouseDown={keepFocus}
                      onClick={() => applyColor(color)}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="toolbar-tab">
              <button
                className="format-btn color-btn highlight-btn"
                onMouseDown={keepFocus}
                onClick={() => setActiveTab(activeTab === 'highlight' ? null : 'highlight')}
                aria-label="Highlight"
              >
                <span className="highlight-btn-icon">▰</span>
                <span className="color-btn-bar" style={{ backgroundColor: currentHighlight }} />
              </button>
              {activeTab === 'highlight' && (
                <div className="toolbar-dropdown color-dropdown">
                  {HIGHLIGHT_COLORS.map(color => (
                    <button
                      key={color}
                      className="color-swatch"
                      style={{ backgroundColor: color === 'transparent' ? '#ffffff' : color, backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, transparent 45%, #d00 45%, #d00 55%, transparent 55%)' : 'none' }}
                      onMouseDown={keepFocus}
                      onClick={() => applyHighlight(color)}
                      aria-label={`Highlight ${color}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <span className="toolbar-divider" />

            <div className="toolbar-tab">
              <button
                className="format-btn-text format-btn-text-narrow"
                onMouseDown={keepFocus}
                onClick={() => setActiveTab(activeTab === 'alignment' ? null : 'alignment')}
                aria-label="Alignment"
              >
                <span>{currentAlignment.icon}</span>
                <span className="format-btn-chevron">▾</span>
              </button>
              {activeTab === 'alignment' && (
                <div className="toolbar-dropdown">
                  {ALIGNMENT_OPTIONS.map(option => (
                    <button
                      key={option.cmd}
                      onMouseDown={keepFocus}
                      onClick={() => applyAlignment(option)}
                    >
                      <span className="alignment-icon">{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="toolbar-divider" />

            <button className="format-btn" onMouseDown={keepFocus} onClick={() => exec('insertUnorderedList')} aria-label="Bullet list">•</button>
            <button className="format-btn" onMouseDown={keepFocus} onClick={() => exec('insertOrderedList')} aria-label="Numbered list">1.</button>
          </div>

          <div className="toolbar-section toolbar-section-right">
            <div className="toolbar-tab">
              <button
                className={activeTab === 'share' ? 'toolbar-btn active' : 'toolbar-btn'}
                onClick={() => setActiveTab(activeTab === 'share' ? null : 'share')}
              >
                Share
              </button>
              {activeTab === 'share' && (
                <ShareTools onClose={() => setActiveTab(null)} showToast={showToast} />
              )}
            </div>
            <button className="toolbar-btn toolbar-btn-primary" onClick={goToPublish}>
              Publish
            </button>
            
            <button className="toolbar-btn" onClick={clearCurrentPage}>
              Clear Page
            </button>

          </div>        
          
          


        </div>

        <div className="book-editor-main">
          <PageNavigator
            pages={pages}
            currentPage={currentPage}
            onJump={jumpToPage}
            onAdd={addPage}
            onDelete={deletePage}
          />

          <div className="page-canvas">
            <div className="page-wrapper">
              <TextPage
                text={pages[currentPage] || ''}
                pageKey={currentPage}
                editable={true}
                onChange={handlePageTextChange}
                placeholder="Start typing your book here..."
              />

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
                  Page {currentPage + 1} / {pages.length}
                </span>

                <button
                  className="page-arrow right-arrow"
                  aria-label="Next page"
                  onClick={nextPage}
                  disabled={currentPage === pages.length - 1}
                >
                  &#10095;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
export default BookEditor;
