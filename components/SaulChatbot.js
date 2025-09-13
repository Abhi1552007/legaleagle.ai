import { useState } from "react";

export default function SaulChatbot({ documentText, fileName, onClose }) {
  const [messages, setMessages] = useState([
    { sender: "saul", text: `Hi, I'm Saul Goodman. Ask me anything about "${fileName}".` },
  ]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    const newMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, newMessage]);

    // Call backend API
    try {
      const response = await fetch("/api/ask-saul", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input, documentText, fileName }),
      });

      const data = await response.json();
      const answer = data.answer || "Hmm, I couldn’t figure that out. Try again!";

      setMessages((prev) => [...prev, { sender: "saul", text: answer }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: "saul", text: "⚠️ Error contacting Saul. Please try again." },
      ]);
    }

    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#fff",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem",
          background: "linear-gradient(45deg, #FFD700, #FFA500)",
          color: "#1a1a2e",
          fontWeight: "bold",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Chat with Saul</span>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            fontSize: "1.2rem",
            cursor: "pointer",
            color: "#1a1a2e",
          }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: "1rem",
          overflowY: "auto",
          background: "#f9f9f9",
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                maxWidth: "70%",
                padding: "0.6rem 1rem",
                borderRadius: "15px",
                background:
                  msg.sender === "user" ? "#0070f3" : "rgba(0,0,0,0.1)",
                color: msg.sender === "user" ? "#fff" : "#000",
                fontSize: "0.95rem",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          borderTop: "1px solid #ddd",
          padding: "0.5rem",
          background: "#fff",
        }}
      >
        <input
          type="text"
          placeholder="Ask Saul..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{
            flex: 1,
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "0.5rem",
            fontSize: "1rem",
            marginRight: "0.5rem",
          }}
        />
        <button
          onClick={handleSend}
          style={{
            background: "linear-gradient(45deg, #FFD700, #FFA500)",
            border: "none",
            borderRadius: "8px",
            padding: "0.5rem 1rem",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
