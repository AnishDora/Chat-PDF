"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import ChatList from "@/components/ChatList";
import ChatInterface from "@/components/ChatInterface";
import { MessageCircle, Plus, ArrowLeft, FileText } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface Document {
  id: string;
  title: string;
  status: "processing" | "ready" | "failed";
  bytes: number;
  page_count?: number;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  is_user: boolean;
  created_at: string;
}

interface Chat {
  id: string;
  title: string;
  document_ids: string[];
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatDocuments, setChatDocuments] = useState<Document[]>([]);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Load chat data when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      loadChatData(selectedChat.id);
    }
  }, [selectedChat]);

  const loadChatData = async (chatId: string) => {
    setLoading(true);
    try {
      // Load chat with messages
      const chatResponse = await fetch(`/api/chats/${chatId}`);
      const chatData = await chatResponse.json();
      
      if (chatResponse.ok) {
        setChatMessages(chatData.chat.messages || []);
        
        // Load documents for this chat
        if (chatData.chat.document_ids && chatData.chat.document_ids.length > 0) {
          const documentsResponse = await fetch(`/api/documents`);
          const documentsData = await documentsResponse.json();
          
          if (documentsResponse.ok) {
            const chatDocs = documentsData.documents.filter((doc: Document) => 
              chatData.chat.document_ids.includes(doc.id)
            );
            setChatDocuments(chatDocs);
          }
        } else {
          setChatDocuments([]);
        }
      }
    } catch (error) {
      console.error("Error loading chat data:", error);
    } finally {
      setLoading(false);
    }
  };

  // If the URL has ?list=1, clear any selected chat and remove the param
  useEffect(() => {
    if (searchParams.get("list") === "1") {
      if (selectedChat) {
        handleBackToChats();
      }
      // Remove the param without adding a new history entry
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("list");
        router.replace(url.pathname + url.search);
      } catch {}
    }
  }, [searchParams, selectedChat, router]);

  const handleCreateNewChat = async () => {
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `New Chat ${new Date().toLocaleDateString()}`,
          document_ids: [],
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Refresh chat list and select the new chat
        setSelectedChat(data.chat);
      } else {
        alert("Failed to create chat: " + data.error);
      }
    } catch (error) {
      console.error("Error creating chat:", error);
      alert("Failed to create chat");
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedChat) return;

    try {
      const response = await fetch(`/api/chats/${selectedChat.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          is_user: true,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Add message to local state
        setChatMessages(prev => [...prev, data.message]);
        // Request AI answer constrained to this chat's PDFs
        const answerRes = await fetch(`/api/chats/${selectedChat.id}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: content }),
        });
        const answerData = await answerRes.json();
        if (answerRes.ok && answerData.message) {
          setChatMessages(prev => [...prev, answerData.message]);
        } else if (!answerRes.ok) {
          console.error("AI answer error:", answerData.error);
        }
      } else {
        alert("Failed to send message: " + data.error);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    }
  };

  const handleAddDocuments = async (documentIds: string[]) => {
    if (!selectedChat) return;

    try {
      const response = await fetch(`/api/chats/${selectedChat.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_ids: [...selectedChat.document_ids, ...documentIds],
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update local state
        setSelectedChat(prev => prev ? {
          ...prev,
          document_ids: [...prev.document_ids, ...documentIds]
        } : null);
        
        // Reload chat data to get updated documents
        loadChatData(selectedChat.id);
      } else {
        alert("Failed to add documents: " + data.error);
      }
    } catch (error) {
      console.error("Error adding documents:", error);
      alert("Failed to add documents");
    }
  };

  const handleRemoveDocument = async (documentId: string) => {
    if (!selectedChat) return;

    try {
      const updatedDocumentIds = selectedChat.document_ids.filter(id => id !== documentId);
      
      const response = await fetch(`/api/chats/${selectedChat.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_ids: updatedDocumentIds,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update local state
        setSelectedChat(prev => prev ? {
          ...prev,
          document_ids: updatedDocumentIds
        } : null);
        
        setChatDocuments(prev => prev.filter(doc => doc.id !== documentId));
      } else {
        alert("Failed to remove document: " + data.error);
      }
    } catch (error) {
      console.error("Error removing document:", error);
      alert("Failed to remove document");
    }
  };

  const handleUpdateChatTitle = async (title: string) => {
    if (!selectedChat) return;

    try {
      const response = await fetch(`/api/chats/${selectedChat.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSelectedChat(prev => prev ? { ...prev, title } : null);
      } else {
        alert("Failed to update chat title: " + data.error);
      }
    } catch (error) {
      console.error("Error updating chat title:", error);
      alert("Failed to update chat title");
    }
  };

  const handleBackToChats = () => {
    setSelectedChat(null);
    setChatDocuments([]);
    setChatMessages([]);
  };

  // If a chat is selected, show the chat interface
  if (selectedChat) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
          {/* Chat area - Full width */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleBackToChats}
                    variant="outline"
                    size="sm"
                    className="mr-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Chats
                  </Button>
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedChat.title}
                  </h2>
                </div>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="flex-1">
              <ChatInterface
                chatId={selectedChat.id}
                chatTitle={selectedChat.title}
                documents={chatDocuments}
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                onAddDocuments={handleAddDocuments}
                onRemoveDocument={handleRemoveDocument}
                onUpdateChatTitle={handleUpdateChatTitle}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show chat list
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Your Chats
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Start conversations with your PDFs or continue existing chats
          </p>
        </div>

        {/* New Chat Button */}
        <div className="mb-6">
          <Button
            onClick={handleCreateNewChat}
            className="flex items-center gap-2"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            New Chat
          </Button>
        </div>
        
        {/* Chat List */}
        <ChatList 
          onChatSelect={(chat) => {
            setSelectedChat(chat);
          }}
        />
      </div>
    </div>
  );
}
