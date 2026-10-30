import { useRef, useEffect } from 'react';
import type { ClipboardEvent } from 'react';
import './styles/TextPage.css';

interface TextPageProps {
	text: string;
	pageKey?: string | number;
	editable?: boolean;
	onChange?: (text: string) => void;
	placeholder?: string;
}

function TextPage({ text, pageKey, editable = false, onChange, placeholder }: TextPageProps) {
	const ref = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (editable && ref.current && ref.current.innerHTML !== text) {
			ref.current.innerHTML = text;
		}
	}, [pageKey, text, editable]);

	const handleInput = () => {
		if (ref.current && onChange) {
			onChange(ref.current.innerHTML);
		}
	};

	const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
		e.preventDefault();
		const pasted = e.clipboardData.getData('text/plain');
		document.execCommand('insertText', false, pasted);
	};

	if (!editable) {
		return (
			<div
				className="text-page"
				data-placeholder={placeholder}
				dangerouslySetInnerHTML={{ __html: text || '' }}
			/>
		);
	}

	return (
		<div
			ref={ref}
			className="text-page"
			contentEditable={true}
			suppressContentEditableWarning={true}
			onInput={handleInput}
			onPaste={handlePaste}
			data-placeholder={placeholder}
		/>
	);
}

export default TextPage;
