import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState, useEffect, useRef } from "react";
import { ScaleLoader } from "react-spinners";

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

        if (!prompt.trim()) return;

        setLoading(true);
        setNewChat(false);

        console.log(
            "message ",
            prompt,
            " threadId ",
            currThreadId
        );

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
                "http://localhost:8080/api/chat",
                options
            );

            const res = await response.json();

            console.log(res);

            setReply(res.reply);

        } catch (err) {

            console.log(err);

        }

        setLoading(false);
    };


    // =========================
    // PDF UPLOAD
    // =========================

    const handleFileChange = async (event) => {

        const file = event.target.files[0];

        if (!file) return;


        // Check PDF
        if (file.type !== "application/pdf") {

            setUploadMessage("Please select a PDF file.");

            return;
        }


        setUploading(true);
        setUploadMessage("Uploading PDF...");


        const formData = new FormData();

        // IMPORTANT:
        // "file" must match multer.single("file")
        formData.append("file", file);


        try {

            const response = await fetch(
                "http://localhost:8080/api/documents/upload",
                {
                    method: "POST",
                    body: formData
                }
            );


            const res = await response.json();

            console.log("Upload response:", res);


            if (!response.ok) {

                setUploadMessage(
                    res.error || "PDF upload failed."
                );

                return;
            }


            setUploadMessage(
                `✅ ${res.filename} uploaded successfully. ${res.chunks} chunks created.`
            );


        } catch (err) {

            console.log("Upload error:", err);

            setUploadMessage(
                "❌ Failed to upload PDF."
            );

        } finally {

            setUploading(false);

            // Reset input so same PDF can be selected again
            event.target.value = "";
        }
    };


    // Open file picker
    const handleUploadClick = () => {

        fileInputRef.current.click();

    };


    // =========================
    // ADD CHAT TO PREVIOUS CHATS
    // =========================

    useEffect(() => {

        if (prompt && reply) {

            setPrevChats(prevChats => (

                [
                    ...prevChats,

                    {
                        role: "user",
                        content: prompt
                    },

                    {
                        role: "assistant",
                        content: reply
                    }
                ]

            ));

        }

        setPrompt("");

    }, [reply]);


    // =========================
    // PROFILE MENU
    // =========================

    const handleProfileClick = () => {

        setIsOpen(!isOpen);

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

            {
                isOpen &&

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
            }


            {/* CHAT */}

            <Chat />


            {/* LOADING */}

            <ScaleLoader
                color="#fff"
                loading={loading}
            />


            {/* UPLOAD STATUS */}

            {
                uploadMessage &&

                <div className="uploadMessage">
                    {uploadMessage}
                </div>
            }


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
                        onChange={(e) =>
                            setPrompt(e.target.value)
                        }
                        onKeyDown={(e) =>
                            e.key === "Enter"
                                ? getReply()
                                : null
                        }
                    />


                    {/* SEND BUTTON */}

                    <div
                        id="submit"
                        onClick={getReply}
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