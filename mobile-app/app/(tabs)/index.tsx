import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Linking,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import io from "socket.io-client";
import { Feather } from "@expo/vector-icons";
// LinkifyText component for clickable links
const LinkifyText = ({ text }: any) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <Text>
      {parts.map((part: any, i: any) => {
        if (part.match(urlRegex)) {
          return (
            <Text
              key={i}
              style={styles.link}
              onPress={() => Linking.openURL(part)}
            >
              {part}
              {"\n"}
            </Text>
          );
        }
        return <Text key={i}>{}</Text>;
      })}
    </Text>
  );
};

const LoadingSkeleton = () => (
  <View style={styles.skeletonContainer}>
    {[1, 2, 3].map((i) => (
      <View key={i} style={styles.skeleton}>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    ))}
  </View>
);

export default function index() {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({ title: "", content: "" });
  const [socket, setSocket] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isNewNote, setIsNewNote] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Socket initialization
  const initSocket = useCallback(() => {
    const socketInstance = io("http://20.197.3.60:3000", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketInstance.on("connect", () => {
      setConnected(true);
      socketInstance.emit("sections:subscribe");
    });

    socketInstance.on("connect_error", () => {
      setConnected(false);
    });

    socketInstance.on("disconnect", () => {
      setConnected(false);
    });

    socketInstance.on("sections:initial", (data) => {
      setSections(data);
      // console.log("here");
      setLoading(false);
    });

    socketInstance.on("sections:created", (section) => {
      // setSections((prev) => [section, ...prev]);
      console.log("HEre");
      addUniqueSection(section);
    });

    socketInstance.on("sections:updated", (updatedSection) => {
      setSections((prev) =>
        prev.map((section) =>
          section.id === updatedSection.id ? updatedSection : section
        )
      );
    });

    socketInstance.on("sections:deleted", (id) => {
      setSections((prev) => prev.filter((section) => section.id !== id));
      if (selectedSection?.id === id) {
        setSelectedSection(null);
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [selectedSection?.id]);

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
    setIsNewNote(true);
    setFormData({ title: "", content: "" });
    setModalVisible(true);
  };

  const handleEdit = (section: any) => {
    setIsNewNote(false);
    setSelectedSection(section);
    setFormData({
      title: section.title,
      content: section.content,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!connected) {
      Alert.alert("Error", "Not connected to server");
      return;
    }

    if (!formData.title.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }

    setSaving(true);
    try {
      const endpoint = isNewNote
        ? "http://20.197.3.60:3000/api/sections"
        : `http://20.197.3.60:3000/api/sections/${selectedSection.id}`;
      const method = isNewNote ? "POST" : "PATCH";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save");

      setModalVisible(false);
      setFormData({ title: "", content: "" });
    } catch (error) {
      Alert.alert("Error", "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: any) => {
    if (!connected) return;

    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await fetch(
              `http://20.197.3.60:3000/api/sections/${id}`,
              { method: "DELETE" }
            );

            if (!response.ok) throw new Error("Failed to delete");
          } catch (error) {
            Alert.alert("Error", "Failed to delete note");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      key={item.id}
      style={styles.noteCard}
      onPress={() => handleEdit(item)}
    >
      <View style={styles.noteHeader}>
        <Text style={styles.noteTitle}>{item.title}</Text>
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          style={styles.deleteButton}
        >
          <Feather name="trash-2" size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>
      <Text style={styles.notePreview} numberOfLines={2}>
        {item.content || "No content"}
      </Text>
      <Text style={styles.noteDate}>
        {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  const handleRefresh = useCallback(async () => {
    if (!connected) {
      Alert.alert("Error", "Not connected to server");
      return;
    }

    setIsRefreshing(true);
    try {
      const response = await fetch("http://20.197.3.60:3000/api/sections");
      if (!response.ok) throw new Error("Failed to refresh");
      const data = await response.json();
      // Ensure unique items by filtering based on ID
      const uniqueData = Array.from(
        new Map(data.map((item: any) => [item.id, item])).values()
      );
      setSections(uniqueData);
    } catch (error) {
      Alert.alert("Error", "Failed to refresh notes");
    } finally {
      setIsRefreshing(false);
    }
  }, [connected]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notes</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={isRefreshing || !connected}
            style={styles.refreshButton}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Feather name="refresh-cw" size={20} color="#007AFF" />
            )}
          </TouchableOpacity>
          <Feather
            name={connected ? "wifi" : "wifi-off"}
            size={20}
            color={connected ? "#4CAF50" : "#FF4444"}
            style={styles.statusIcon}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreate}
            disabled={!connected}
          >
            <Feather name="plus" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <FlatList
          data={sections}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)} // Ensure key is always a string
          contentContainerStyle={styles.listContainer}
          onRefresh={handleRefresh} // Add pull-to-refresh functionality
          refreshing={isRefreshing}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {isNewNote ? "New Note" : "Edit Note"}
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={styles.saveButton}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Feather name="save" size={24} color="white" />
                )}
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.titleInput}
              value={formData.title}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, title: text }))
              }
              placeholder="Note title"
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.contentInput}
              value={formData.content}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, content: text }))
              }
              placeholder="Start typing your note..."
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
            />
            <View style={styles.contentContainer}>
              <LinkifyText text={formData.content} />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },

  statusIcon: {
    marginRight: 12,
  },
  addButton: {
    backgroundColor: "#007AFF",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 16,
  },
  noteCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  notePreview: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
    color: "#999",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 8,
    borderRadius: 8,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: "600",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    padding: 16,
    lineHeight: 24,
  },
  link: {
    color: "#007AFF",
    textDecorationLine: "underline",
  },
  skeletonContainer: {
    padding: 16,
  },
  skeleton: {
    height: 100,
    backgroundColor: "#e0e0e0",
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
