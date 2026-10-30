import { useState } from 'react';
import './styles/ShareTools.css';

interface ShareToolsProps {
	onClose: () => void;
	showToast: (message: string) => void;
}

const currentUsername = 'fscottfitzgerald';

const initialMembers = [
	{ username: 'fscottfitzgerald', isOwner: true },
	{ username: 'williamshakespeare', isOwner: false },
	{ username: 'jkrowling', isOwner: false },
];

function ShareTools({ showToast }: ShareToolsProps) {
	const [activeMenu, setActiveMenu] = useState<string | null>(null);
	const [inviteUsername, setInviteUsername] = useState('');
	const [inviteMessage, setInviteMessage] = useState('');
	const [members, setMembers] = useState(initialMembers);

	const owner = members.find(m => m.isOwner);
	const isOwner = owner?.username === currentUsername;

	const closeMenu = () => {
		setActiveMenu(null);
		setInviteUsername('');
		setInviteMessage('');
	};

	const sendInvite = () => {
		showToast('Invite sent to ' + (inviteUsername || 'user'));
		closeMenu();
	};

	const removeMember = (username: string) => {
		setMembers(members.filter(m => m.username !== username));
		showToast('Removed ' + username);
	};

	const sortedMembers = [...members].sort((a, b) => Number(b.isOwner) - Number(a.isOwner));

	return (
		<>
			<div className="share-tools-panel">
				<button onClick={() => showToast('Link copied!')}>Copy Link</button>
				<button onClick={() => setActiveMenu('invite')}>Invite Editor</button>
				<button onClick={() => setActiveMenu('manage')}>Manage Access</button>
			</div>

			{activeMenu === 'invite' && (
				<div className="share-modal-backdrop" onClick={closeMenu}>
					<div className="share-modal" onClick={e => e.stopPropagation()}>
						<button className="share-modal-close" onClick={closeMenu}>✕</button>
						<h2>Invite Editor</h2>
						<input
							type="text"
							placeholder="Enter username"
							value={inviteUsername}
							onChange={e => setInviteUsername(e.target.value)}
						/>
						<textarea
							placeholder="Add a message"
							value={inviteMessage}
							onChange={e => setInviteMessage(e.target.value)}
						/>
						<button className="share-modal-send" onClick={sendInvite}>Send</button>
					</div>
				</div>
			)}

			{activeMenu === 'manage' && (
				<div className="share-modal-backdrop" onClick={closeMenu}>
					<div className="share-modal" onClick={e => e.stopPropagation()}>
						<button className="share-modal-close" onClick={closeMenu}>✕</button>
						<h2>Manage Access</h2>
						<ul className="share-member-list">
							{sortedMembers.map(m => (
								<li key={m.username}>
									<span>{m.username}</span>
									{m.isOwner ? (
										<span className="share-owner-tag">Owner</span>
									) : isOwner ? (
										<button onClick={() => removeMember(m.username)}>Remove</button>
									) : null}
								</li>
							))}
						</ul>
					</div>
				</div>
			)}
		</>
	);
}

export default ShareTools;
