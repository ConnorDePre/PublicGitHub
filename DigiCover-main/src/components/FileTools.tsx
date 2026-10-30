import { useState } from 'react';
import './styles/FileTools.css';

interface FileToolsProps {
	onClose: () => void;
	showToast: (message: string) => void;
}

function FileTools({ showToast }: FileToolsProps) {
	const [exportHovered, setExportHovered] = useState(false);

	return (
		<div className="file-tools-panel">
			<button onClick={() => showToast('Copied!')}>Copy</button>
			<button onClick={() => showToast('Imported!')}>Import</button>
			<div
				className="file-tools-item"
				onMouseEnter={() => setExportHovered(true)}
				onMouseLeave={() => setExportHovered(false)}
			>
				<button>Export ▶</button>
				{exportHovered && (
					<div className="file-tools-submenu">
						<button onClick={() => { setExportHovered(false); showToast('Exported as PDF'); }}>PDF</button>
						<button onClick={() => { setExportHovered(false); showToast('Exported as JPG'); }}>JPG</button>
						<button onClick={() => { setExportHovered(false); showToast('Exported as MP4'); }}>MP4</button>
					</div>
				)}
			</div>
			<button onClick={() => showToast('Saved!')}>Save</button>
		</div>
	);
}

export default FileTools;
