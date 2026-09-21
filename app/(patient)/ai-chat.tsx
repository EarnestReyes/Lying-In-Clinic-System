import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth } from '../../src/config/firebase';
import {
  createSupportRequest,
  subscribePatientSupportRequests,
} from '../../src/services/supportRequestService';

type ChatMessage = {
  id: string;
  text: string;
  sender: 'patient' | 'staff';
  status: string;
  createdAt: Date;
};

export default function AiChatScreen() {
  const router = useRouter();

  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
  const uid = auth.currentUser?.uid;

  if (!uid) {
    return;
  }

  const unsubscribe = subscribePatientSupportRequests(
    uid,
    (requests) => {
      const sortedRequests: ChatMessage[] = requests
        .map((request, index): ChatMessage => {
          let createdAt = new Date(0);

          // Handle Firestore Timestamp
          if (request.createdAt?.toDate) {
            createdAt = request.createdAt.toDate();
          } else if (request.createdAt instanceof Date) {
            createdAt = request.createdAt;
          }

          // Make sure sender is strictly typed
          const sender: 'patient' | 'staff' =
            request.sender === 'staff'
              ? 'staff'
              : 'patient';

          return {
            id: request.id ?? `message-${index}`,
            text: request.message ?? '',
            sender,
            status: request.status ?? 'pending',
            createdAt,
          };
        })
        .sort(
          (a, b) =>
            a.createdAt.getTime() - b.createdAt.getTime()
        );

      setChatLog(sortedRequests);
    }
  );

  return unsubscribe;
}, []);

  const handleSend = async () => {
    const text = message.trim();

    if (!text || sending) {
      return;
    }

    const uid = auth.currentUser?.uid;

    if (!uid) {
      return;
    }

    setSending(true);

    try {
      await createSupportRequest(uid, text);
      setMessage('');
    } catch (error) {
      console.error('Failed to send support message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: Date) => {
    if (
      !(date instanceof Date) ||
      Number.isNaN(date.getTime()) ||
      date.getTime() === 0
    ) {
      return '';
    }

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color="#0F172A"
          />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            Clinic Support
          </Text>

          <Text style={styles.headerSubtitle}>
            Send a message to clinic staff
          </Text>
        </View>

        <View style={styles.onlineIndicator}>
          <View style={styles.onlineDot} />

          <Text style={styles.onlineText}>
            Messages
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        style={styles.keyboardContainer}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? 0 : 20
        }
      >
        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.chatScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({
              animated: true,
            });
          }}
        >
          {/* Disclaimer */}
          <View style={styles.disclaimerBox}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#0284C7"
              style={{ marginRight: 6 }}
            />

            <Text style={styles.disclaimerText}>
              Messages are sent to clinic staff for
              follow-up. For emergencies, contact your
              clinic directly.
            </Text>
          </View>

          {/* Empty State */}
          {chatLog.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={26}
                  color="#0D9488"
                />
              </View>

              <Text style={styles.emptyTitle}>
                No messages yet
              </Text>

              <Text style={styles.emptyText}>
                Send a message below if you need help from
                the clinic staff.
              </Text>
            </View>
          )}

          {/* Messages */}
          {chatLog.map((chat) => {
            const isPatient =
              chat.sender === 'patient';

            const time = formatTime(chat.createdAt);

            return (
              <View
                key={chat.id}
                style={[
                  styles.messageRow,
                  isPatient
                    ? styles.userMessageRow
                    : styles.staffMessageRow,
                ]}
              >
                {/* Staff Avatar */}
                {!isPatient && (
                  <View style={styles.staffAvatar}>
                    <Ionicons
                      name="medkit-outline"
                      size={15}
                      color="#FFFFFF"
                    />
                  </View>
                )}

                <View
                  style={[
                    styles.messageContent,
                    isPatient
                      ? styles.patientMessageContent
                      : styles.staffMessageContent,
                  ]}
                >
                  {!isPatient && (
                    <Text style={styles.senderName}>
                      Clinic Staff
                    </Text>
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      isPatient
                        ? styles.userBubble
                        : styles.staffBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isPatient
                          ? styles.userText
                          : styles.staffText,
                      ]}
                    >
                      {chat.text}
                    </Text>

                    <Text
                      style={[
                        styles.timeText,
                        isPatient
                          ? styles.userTime
                          : styles.staffTime,
                      ]}
                    >
                      {isPatient
                        ? chat.status === 'completed'
                          ? 'Seen'
                          : 'Sent'
                        : 'Staff'}

                      {time ? ` · ${time}` : ''}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Quick Suggestions */}
        <View style={styles.chipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={styles.chip}
              onPress={() =>
                setMessage(
                  'I would like clinic assistance.'
                )
              }
            >
              <Text style={styles.chipText}>
                Request assistance
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chip}
              onPress={() =>
                setMessage(
                  'I have a question about my appointment.'
                )
              }
            >
              <Text style={styles.chipText}>
                Appointment question
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Write a message to clinic staff..."
            placeholderTextColor="#94A3B8"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() || sending) &&
                styles.sendButtonDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleSend}
            disabled={!message.trim() || sending}
          >
            <Ionicons
              name={
                sending
                  ? 'hourglass-outline'
                  : 'send'
              }
              size={16}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  headerTitleContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },

  headerSubtitle: {
    fontSize: 11,
    color: '#0D9488',
    fontWeight: '700',
    marginTop: 2,
  },

  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },

  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 4,
  },

  onlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },

  keyboardContainer: {
    flex: 1,
  },

  chatScroll: {
    padding: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },

  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },

  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#0369A1',
    lineHeight: 15,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 5,
  },

  emptyText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
  },

  messageRow: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },

  userMessageRow: {
    justifyContent: 'flex-end',
  },

  staffMessageRow: {
    justifyContent: 'flex-start',
  },

  staffAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },

  messageContent: {
    maxWidth: '78%',
  },

  patientMessageContent: {
    alignItems: 'flex-end',
  },

  staffMessageContent: {
    alignItems: 'flex-start',
  },

  senderName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 5,
    marginBottom: 4,
  },

  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 17,
  },

  userBubble: {
    backgroundColor: '#0D9488',
    borderBottomRightRadius: 4,
  },

  staffBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
  },

  messageText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },

  userText: {
    color: '#FFFFFF',
  },

  staffText: {
    color: '#1E293B',
  },

  timeText: {
    fontSize: 9,
  },

  userTime: {
    color: '#CCFBF1',
    textAlign: 'right',
  },

  staffTime: {
    color: '#94A3B8',
  },

  chipsContainer: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 10,
  },

  chip: {
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },

  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 90,
    minHeight: 40,
    fontSize: 13,
    color: '#0F172A',
  },

  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  sendButtonDisabled: {
    opacity: 0.45,
  },
});