import React, { useState } from "react";
import { X, MessageSquare, Send, Paperclip, Minimize2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { cn } from "../lib/utils";

interface ChatDockProps {
  isOpen: boolean;
  onClose: () => void;
  userType: "advogado" | "cliente";
}

// Mock data removed - using real queries from ChatDockController

export function ChatDock({ isOpen, onClose, userType }: ChatDockProps) {
  const [activeThread, setActiveThread] = useState(mockThreads[0].id);
  const [message, setMessage] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // TODO: Implement real message sending
    console.log("Sending message:", message);
    setMessage("");
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 right-4 bg-white shadow-strong rounded-t-lg border border-b-0 z-50 transition-all duration-200",
        isMinimized ? "h-12" : "h-96",
        "w-80",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-brand-700 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4" />
          <span className="font-medium text-sm">Chat</span>
          {mockThreads.some((t) => t.unread > 0) && (
            <Badge
              variant="secondary"
              className="bg-white text-brand-700 text-xs"
            >
              {mockThreads.reduce((sum, t) => sum + t.unread, 0)}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:bg-brand-600 h-6 w-6 p-0"
          >
            <Minimize2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-brand-600 h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Thread List */}
          <div className="h-24 border-b border-border overflow-y-auto">
            <div className="space-y-1 p-2">
              {mockThreads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => setActiveThread(thread.id)}
                  className={cn(
                    "p-2 rounded cursor-pointer transition-colors text-sm",
                    activeThread === thread.id
                      ? "bg-brand-50 border border-brand-200"
                      : "hover:bg-neutral-50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs truncate">
                      {thread.title}
                    </span>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-neutral-500">
                        {thread.time}
                      </span>
                      {thread.unread > 0 && (
                        <Badge
                          variant="destructive"
                          className="text-xs h-4 w-4 p-0 rounded-full"
                        >
                          {thread.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-600 truncate mt-1">
                    {thread.lastMessage}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 h-48 overflow-y-auto p-3 space-y-3">
            {mockMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg p-2 text-sm",
                    msg.role === "user"
                      ? "bg-brand-600 text-white"
                      : "bg-neutral-100 text-neutral-900",
                  )}
                >
                  <p>{msg.content}</p>
                  <div
                    className={cn(
                      "flex items-center justify-between mt-1 text-xs",
                      msg.role === "user"
                        ? "text-brand-100"
                        : "text-neutral-500",
                    )}
                  >
                    <span>{msg.author}</span>
                    <span>{msg.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-border"
          >
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-neutral-500 hover:text-neutral-700 h-8 w-8 p-0"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!message.trim()}
                className="h-8 w-8 p-0 bg-brand-600 hover:bg-brand-700"
              >
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
