
import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState, useEffect, useRef } from "react";
import { ScaleLoader } from "react-spinners";

// Local development ke liye fallback URL.
// Deployment par VITE_API_URL environment variable set karna.
const API_BASE_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:8080"
).replace(/\/+$/, "");

function ChatWindow() {
    const {
        prompt,
        setPrompt,
        reply,
        setReply,
        currThreadId,
        setPrevChats,
        setNewChat
    } = useContext(MyContext);

    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // PDF upload states
    const [uploading, setUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState("");

    const fileInputRef = useRef(null);

    // =========================
    // SEND CHAT MESSAGE
    // =========================

    const getReply = async () => {
        if (!prompt.trim() || loading) return;

        setLoading(true);
        setNewChat(false);

        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: prompt,
                threadId: currThreadId
            })
        };

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/chat`,
                options
            );

            const res = await response.json();

            if (!response.ok) {
                throw new Error(
                    res.error || res.message || "Failed to get a reply."
                );
            }

            setReply(res.reply);
        } catch (err) {
            console.error("Chat error:", err);
            setReply(
                "Sorry, something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    // =========================
    // PDF UPLOAD
    // =========================

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (file.type !== "application/pdf") {
            setUploadMessage("Please select a PDF file.");
            event.target.value = "";
            return;
        }

        setUploading(true);
        setUploadMessage("Uploading PDF...");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/documents/upload`,
                {
                    method: "POST",
                    body: formData
                }
            );

            const res = await response.json();

            console.log("Upload response:", res);

            if (!response.ok) {
                throw new Error(
                    res.error || res.message || "PDF upload failed."
                );
            }

            setUploadMessage(
                `✅ ${res.filename || file.name} uploaded successfully. ${
                    res.chunks ?? 0
                } chunks created.`
            );
        } catch (err) {
            console.error("Upload error:", err);
            setUploadMessage(`❌ ${err.message || "Failed to upload PDF."}`);
        } finally {
            setUploading(false);
            event.target.value = "";
        }
    };

    // Open file picker
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    // =========================
    // ADD CHAT TO PREVIOUS CHATS
    // =========================

    useEffect(() => {
        if (prompt && reply) {
            setPrevChats((prevChats) => [
                ...prevChats,
                {
                    role: "user",
                    content: prompt
                },
                {
                    role: "assistant",
                    content: reply
                }
            ]);
        }

        setPrompt("");
    }, [reply]);

    // =========================
    // PROFILE MENU
    // =========================

    const handleProfileClick = () => {
        setIsOpen((prev) => !prev);
    };

    return (
        <div className="chatWindow">
            {/* NAVBAR */}
            <div className="navbar">
                <span>
                    SigmaGPT
                    <i className="fa-solid fa-chevron-down"></i>
                </span>

                <div
                    className="userIconDiv"
                    onClick={handleProfileClick}
                >
                    <span className="userIcon">
                        <i className="fa-solid fa-user"></i>
                    </span>
                </div>
            </div>

            {/* DROPDOWN */}
            {isOpen && (
                <div className="dropDown">
                    <div className="dropDownItem">
                        <i className="fa-solid fa-gear"></i>
                        Settings
                    </div>

                    <div className="dropDownItem">
                        <i className="fa-solid fa-cloud-arrow-up"></i>
                        Upgrade plan
                    </div>

                    <div className="dropDownItem">
                        <i className="fa-solid fa-arrow-right-from-bracket"></i>
                        Log out
                    </div>
                </div>
            )}

            {/* CHAT */}
            <Chat />

            {/* LOADING */}
            <ScaleLoader color="#fff" loading={loading} />

            {/* UPLOAD STATUS */}
            {uploadMessage && (
                <div className="uploadMessage">
                    {uploadMessage}
                </div>
            )}

            {/* CHAT INPUT */}
            <div className="chatInput">
                <div className="inputBox">
                    {/* HIDDEN FILE INPUT */}
                    <input
                        type="file"
                        accept=".pdf,application/pdf"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                    />

                    {/* UPLOAD BUTTON */}
                    <button
                        type="button"
                        className="uploadButton"
                        onClick={handleUploadClick}
                        disabled={uploading}
                        title="Upload PDF"
                    >
                        <i className="fa-solid fa-paperclip"></i>
                    </button>

                    {/* TEXT INPUT */}
                    <input
                        placeholder="Ask anything"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                getReply();
                            }
                        }}
                    />

                    {/* SEND BUTTON */}
                    <div
                        id="submit"
                        onClick={getReply}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                getReply();
                            }
                        }}
                    >
                        <i className="fa-solid fa-paper-plane"></i>
                    </div>
                </div>

                <p className="info">
                    SigmaGPT can make mistakes.
                    Check important info.
                    See Cookie Preferences.
                </p>
            </div>
        </div>
    );
}

export default ChatWindow;
