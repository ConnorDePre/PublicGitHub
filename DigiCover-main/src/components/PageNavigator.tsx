import './styles/PageNavigator.css';

interface PageNavigatorProps {
	pages: unknown[];
	currentPage: number;
	onJump: (idx: number) => void;
	onAdd?: () => void;
	onDelete?: (idx: number) => void;
	readOnly?: boolean;
}

function PageNavigator({ pages, currentPage, onJump, onAdd, onDelete, readOnly = false }: PageNavigatorProps) {
	return (
		<aside className="page-navigator">
			<div className="page-nav-header">Pages</div>
			{!readOnly && (
				<>
					<button className="page-nav-add" onClick={onAdd}>+ New Page</button>
					<hr className="page-nav-divider" />
				</>
			)}
			<div className="page-nav-list">
				{pages.map((_, idx) => (
					<div
						key={idx}
						className={`page-nav-item ${idx === currentPage ? 'active' : ''}`}
						onClick={() => onJump(idx)}
					>
						<span>Page {idx + 1}</span>
						{!readOnly && (
							<button
								className="page-nav-delete"
								onClick={(e) => { e.stopPropagation(); onDelete?.(idx); }}
								aria-label={`Delete page ${idx + 1}`}
							>
								✕
							</button>
						)}
					</div>
				))}
			</div>
		</aside>
	);
}

export default PageNavigator;
