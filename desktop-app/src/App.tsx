/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Save, Trash2, X, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

// Helper to convert links to clickable elements
const LinkifyText = ({ text }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
};

const App = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ title: "", content: "" });
  const [socket, setSocket] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Socket initialization with reconnection logic
  const initSocket = useCallback(() => {
    const socketInstance = io("http://localhost:3000", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected");
      setConnected(true);
      setRetryCount(0);
      socketInstance.emit("sections:subscribe");
      toast.success("Connected to server");
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setConnected(false);
      setRetryCount((prev) => prev + 1);
      if (retryCount >= 5) {
        toast.error("Unable to connect to server. Please refresh the page.");
      }
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
      setConnected(false);
      toast.error("Disconnected from server");
    });

    // Debounce section updates to prevent rapid UI updates
    let updateTimeout;
    socketInstance.on("sections:initial", (data) => {
      setSections(data);
      setLoading(false);
    });

    socketInstance.on("sections:created", (section) => {
      clearTimeout(updateTimeout);
      // addUniqueSection(section);
      updateTimeout = setTimeout(() => {
        // setSections((prev) => [section, ...prev]);
        addUniqueSection(section);
        toast.success("New note created");
      }, 100);
    });

    socketInstance.on("sections:updated", (updatedSection) => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        setSections((prev) =>
          prev.map((section) =>
            section.id === updatedSection.id ? updatedSection : section
          )
        );
        toast.success("Note updated");
      }, 100);
    });

    socketInstance.on("sections:deleted", (id) => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        setSections((prev) => prev.filter((section) => section.id !== id));
        if (selectedSection?.id === id) {
          setSelectedSection(null);
          setEditMode(false);
        }
        toast.success("Note deleted");
      }, 100);
    });

    setSocket(socketInstance);

    return () => {
      clearTimeout(updateTimeout);
      socketInstance.disconnect();
    };
  }, [selectedSection?.id, retryCount]);

  const addUniqueSection = (newSection: any) => {
    setSections((prevSections) => {
      const isDuplicate = prevSections.some(
        (section) => section.id === newSection.id
      );
      if (!isDuplicate) {
        return [newSection, ...prevSections];
      }
      console.warn(`Duplicate section ignored: ${newSection.id}`);
      return prevSections;
    });
  };

  useEffect(() => {
    initSocket();
  }, [initSocket]);

  const handleCreate = () => {
    if (!connected) {
      toast.error("Not connected to server");
      return;
    }
    setEditMode(true);
    setSelectedSection(null);
    setFormData({ title: "", content: "" });
  };

  const handleSave = async () => {
    if (!connected) {
      toast.error("Not connected to server");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const endpoint = selectedSection
        ? `http://localhost:3000/api/sections/${selectedSection.id}`
        : "http://localhost:3000/api/sections";
      const method = selectedSection ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save");

      setEditMode(false);
      if (!selectedSection) {
        setFormData({ title: "", content: "" });
      }
    } catch (error) {
      toast.error("Failed to save note");
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!connected || !selectedSection) return;

    if (!window.confirm("Are you sure you want to delete this note?")) return;

    try {
      const response = await fetch(
        `http://localhost:3000/api/sections/${selectedSection.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete");
    } catch (error) {
      toast.error("Failed to delete note");
      console.error("Delete error:", error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 p-4">
      {/* Sidebar */}
      <Card className="w-64 mr-4">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Notes</h2>
              {connected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </div>
            <Button
              size="sm"
              onClick={handleCreate}
              className="px-2"
              disabled={!connected}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-8rem)]">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <div className="space-y-2">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    onClick={() => {
                      setSelectedSection(section);
                      setFormData({
                        title: section.title,
                        content: section.content,
                      });
                      setEditMode(false);
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedSection?.id === section.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <h3 className="font-medium truncate">{section.title}</h3>
                    <p className="text-sm truncate opacity-70">
                      {section.content || "No content"}
                    </p>
                    <p className="text-xs mt-1 opacity-50">
                      {new Date(section.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="flex-1">
        <CardContent className="p-4 h-full">
          {selectedSection || editMode ? (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div className="flex-1">
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Note title"
                    className="text-xl font-bold"
                    disabled={!editMode}
                  />
                </div>
                <div className="space-x-2">
                  {editMode ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditMode(false);
                          if (selectedSection) {
                            setFormData({
                              title: selectedSection.title,
                              content: selectedSection.content,
                            });
                          }
                        }}
                      >
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={saving || !connected}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {saving ? "Saving..." : "Save"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setEditMode(true)}
                        disabled={!connected}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={!connected}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {editMode ? (
                <Textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  placeholder="Start typing your note... URLs will be automatically converted to clickable links"
                  className="flex-1 resize-none"
                />
              ) : (
                <div className="flex-1 overflow-auto whitespace-pre-wrap">
                  <LinkifyText text={formData.content || ""} />
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <p>Select a note or create a new one</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Skeleton key={i} className="h-24 w-full" />
    ))}
  </div>
);

export default App;
