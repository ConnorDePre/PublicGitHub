import React, { useRef } from "react";
import "./styles/MediaTools.css";


interface MediaToolsProps {
    onClose: () => void;
}

function MediaTools({ onClose }: MediaToolsProps) {

    const imageInputRef = useRef<HTMLInputElement>(null);
    const gifInputRef = useRef<HTMLInputElement>(null);
    const stickerInputRef = useRef<HTMLInputElement>(null);

    const fileToBase64 = (file:File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.readAsDataURL(file);

            reader.onload = () => {
                resolve(reader.result as string);
            };

            reader.onerror = reject;
        });
    };

    const insertHTML = (html: string) => {
        const editor = document.querySelector('.text-page') as HTMLElement;
        editor?.focus();
        document.execCommand("insertHTML", false, html);
    };

    const handleImageUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const base64 = await fileToBase64(file);

        insertHTML(`
            <img
                src="${base64}"
                style="max-width:300px; display:block; margin:10px 0;"
            />
        `);
    };

    const handleGifUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const base64 = await fileToBase64(file);

        insertHTML(`
            <img
                src="${base64}"
                style="max-width:300px; display:block; margin:10px 0;"
            />
        `);
    };

    const handleStickerUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const base64 = await fileToBase64(file);

        insertHTML(`
            <img 
                src="${base64}" 
                style="width:120px; display:inline-block;"
            />
        `);
    };

    const embedVideo = () => {
        const url = prompt("Enter Youtube URL");

        if (!url) return;

        let videoId = "";

        if (url.includes("watch?v=")) {
            videoId = url.split("watch?v=")[1].split("&")[0];
        } else if (url.includes("youtu.be/")) {
            videoId = url.split("youtu.be/")[1].split("?")[0];
        }

        else if (url.includes("/embed/")) {
            videoId = url.split("embed/")[1].split("?")[0];
        }

        if(!videoId) {
            alert("Invalid Youtube URL");
            return;
        }

        const embedUrl = `https://www.youtube.com/embed/${videoId}`;

        insertHTML(`
            <div class="embedded-video" contenteditable="false">
                <button class="remove-video-btn">
                    Remove Video
                </button>

                <iframe
                    width="400"
                    height="225"
                    src="${embedUrl}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen
                    referrerPolicy="strict-origin-when-cross-origin"
                ></iframe>
            </div>
        `);
    };

    return (
        <div className="media-tools-panel">
            
            <button onClick={() => imageInputRef.current?.click()}>
                Add image
            </button>

            <input
                type="file"
                accept="image/*"
                ref={imageInputRef}
                style={{ display: "none" }}
                onChange={handleImageUpload}
            />

            <button onClick={() => gifInputRef.current?.click()}>
                Add GIF
            </button>

            <input
                type="file"
                accept="image/gif"
                ref={gifInputRef}
                style={{ display: "none" }}
                onChange={handleGifUpload}
            />

            <button onClick={embedVideo}>
                Embed Video
            </button>

            <button onClick={() => stickerInputRef.current?.click()}>
                Add Sticker
            </button>

            <input
                type="file"
                accept="image/*"
                ref={stickerInputRef}
                style={{ display: "none" }}
                onChange={handleStickerUpload}
            />

            <button onClick={onClose}>
                Close
            </button>

        </div>
    );
}

export default MediaTools;