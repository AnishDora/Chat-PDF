"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Trash2, Calendar, FileText, RefreshCw } from "lucide-react";

interface Chat {
  id: string;
  title: string;
  document_ids: string[];
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface ChatListProps {
  onChatSelect: (chat: Chat) => void;
}

export default function ChatList({ onChatSelect }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/chats");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch chats");
      }
      
      setChats(data.chats || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch chats");
    } finally {
      setLoading(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!confirm("Are you sure you want to delete this chat? This will also delete all messages in this chat.")) {
      return;
    }

    try {
      const response = await fetch(`/api/chats?id=${chatId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete chat");
      }
      
      // Remove from local state
      setChats(prev => prev.filter(chat => chat.id !== chatId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete chat");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading chats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-4">
          <MessageCircle className="h-12 w-12 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
        </div>
        <Button onClick={fetchChats} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="p-8 text-center">
        <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">No chats yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Start a new chat with your documents to begin conversations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Your Chats ({chats.length})
        </h3>
        <Button onClick={fetchChats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <div className="space-y-2">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            onClick={() => onChatSelect(chat)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {chat.title}
                  </h4>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {chat.document_ids.length} document{chat.document_ids.length !== 1 ? 's' : ''}
                  </span>
                  {chat.message_count !== undefined && (
                    <span>{chat.message_count} messages</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(chat.updated_at)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
