import React, { useState, useEffect, useRef } from "react";
import { Send, Settings2, Trash2, MessageSquare } from "lucide-react";

const ChatCard = ({
  messages,
  currentUser,
  canControl,
  onClearChat,
  onSendMessage
}) => {
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [message, setMessage] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  return (
    <div className="flex-1 min-h-[450px] shrink-0 flex flex-col overflow-hidden border-b border-white/5 m-4 bg-[#141414] rounded-xl border border-white/5 shadow-lg">
      <div className="h-12 flex items-center justify-between px-5 border-b border-white/5 relative">
        <h4 className="text-sm font-bold">Chat</h4>
        {canControl && (
          <div className="relative">
            <button
              onClick={() => setShowChatSettings(!showChatSettings)}
              className="focus:outline-none p-1 hover:bg-white/5 rounded transition-colors active:scale-95"
              type="button"
            >
              <Settings2
                size={14}
                className="text-white/40 hover:text-white transition-colors"
              />
            </button>
            {showChatSettings && (
              <div className="absolute right-0 top-8 w-32 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl z-[100] p-1 animate-in slide-in-from-top-2">
                <button
                  onClick={() => {
                    onClearChat();
                    setShowChatSettings(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-red-500/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors text-red-500/80"
                  type="button"
                >
                  <Trash2 size={12} /> Clear Chat
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-10 p-8">
            <MessageSquare size={48} strokeWidth={1} className="mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender === currentUser?.name;
            const timeStr = msg.timestamp
              ? new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";

            return (
              <div
                key={i}
                className={`flex flex-col mb-4 ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  {!isMe && (
                    <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
                      {msg.sender}
                    </span>
                  )}
                  <span className="text-[8px] font-medium text-orange-500">
                    {timeStr}
                  </span>
                  {isMe && (
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-tighter">
                      You
                    </span>
                  )}
                </div>
                <div
                  className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-[13px] font-medium leading-relaxed transition-all hover:shadow-lg whitespace-pre-wrap ${
                    isMe
                      ? "bg-zinc-800 text-white rounded-tr-none border border-white/5 shadow-md"
                      : "bg-white/5 text-white/90 rounded-tl-none border border-white/10"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <div className="p-4 bg-black/20">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center gap-2"
        >
          <textarea
            rows={1}
            placeholder="Type a message..."
            className="flex-1 bg-[#1e1e1e] border border-white/5 rounded-lg py-3 px-4 pr-12 text-sm focus:outline-none focus:border-orange-500 transition-all font-medium resize-none min-h-[46px] max-h-[120px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            className="absolute right-3 text-orange-500 hover:text-primary transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
        <p className="text-[8px] text-center text-white/10 mt-3 font-medium uppercase tracking-widest">
          Press Enter to send • Shift + Enter for new line
        </p>
      </div>
    </div>
  );
};

export default ChatCard;
