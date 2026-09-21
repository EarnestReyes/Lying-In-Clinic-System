import React, { useEffect, useState, useRef } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { subscribeAllSupportRequests, sendStaffSupportReply, SupportRequest } from '../../src/services/supportRequestService';
import { fetchPatients } from '../../src/services/patientService';

interface PatientThread {
  patientUid: string;
  patientName: string;
  contactNumber: string;
  lastMessage: string;
  lastTimestamp: Date;
  status: string;
  messages: SupportRequest[];
}

export default function AdminChatPatientScreen() {
  const router = useRouter();
  const [threads, setThreads] = useState<PatientThread[]>([]);
  const [selectedPatientUid, setSelectedPatientUid] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function loadThreadsAndSubscribe() {
      try {
        const patientsList = await fetchPatients();
        const patientMap = new Map<string, string>();
        const contactMap = new Map<string, string>();

        patientsList.forEach((p: any) => {
          const uid = p.id || p.uid;
          const name = p.name || p.fullName || 'Unnamed Patient';
          const contact = p.contactNumber || p.phone || 'No phone';
          if (uid) {
            patientMap.set(uid, name);
            contactMap.set(uid, contact);
          }
        });

        const unsubscribe = subscribeAllSupportRequests((requests) => {
          const threadMap = new Map<string, SupportRequest[]>();

          requests.forEach((req) => {
            if (!req.patientUid) return;
            const existing = threadMap.get(req.patientUid) || [];
            existing.push(req);
            threadMap.set(req.patientUid, existing);
          });

          const formattedThreads: PatientThread[] = [];

          threadMap.forEach((msgs, uid) => {
            // Sort messages chronologically
            msgs.sort((a, b) => {
              const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
              const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
              return timeA - timeB;
            });

            const lastMsg = msgs[msgs.length - 1];
            formattedThreads.push({
              patientUid: uid,
              patientName: patientMap.get(uid) || `Patient (${uid.slice(0, 6)})`,
              contactNumber: '+63 ' + contactMap.get(uid) || 'No contact info',
              lastMessage: lastMsg?.message || '',
              lastTimestamp: lastMsg?.createdAt?.toDate?.() || new Date(0),
              status: lastMsg?.status || 'pending',
              messages: msgs,
            });
          });

          // Sort threads by most recent message
          formattedThreads.sort((a, b) => b.lastTimestamp.getTime() - a.lastTimestamp.getTime());

          if (isMounted) {
            setThreads(formattedThreads);
            // Default select the first thread if none selected
            if (!selectedPatientUid && formattedThreads.length > 0) {
              setSelectedPatientUid(formattedThreads[0].patientUid);
            }
            setLoading(false);
          }
        }, (error) => {
          console.error("Error subscribing to support requests:", error);
          if (isMounted) setLoading(false);
        });

        return unsubscribe;
      } catch (err) {
        console.error("Failed to initialize chat threads:", err);
        if (isMounted) setLoading(false);
      }
    }

    const unsubPromise = loadThreadsAndSubscribe();
    return () => {
      isMounted = false;
      unsubPromise.then(unsub => unsub && unsub());
    };
  }, []);

  const activeThread = threads.find(t => t.patientUid === selectedPatientUid);

  const handleSendReply = async () => {
    const text = replyMessage.trim();
    if (!text || !selectedPatientUid || sending) return;

    setSending(true);
    try {
      await sendStaffSupportReply(selectedPatientUid, text);
      setReplyMessage('');
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Error sending staff reply:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Patient Inquiries & Support</Text>
          <Text style={styles.headerSubtitle}>Real-time clinic messaging console</Text>
        </View>
        <View style={styles.onlineIndicator}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>{threads.length} Active Convo{threads.length === 1 ? '' : 's'}</Text>
        </View>
      </View>

      <View style={styles.workspace}>
        {/* Left Sidebar: Patient Thread List */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Conversations</Text>
          </View>
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="small" color="#0D9488" />
            </View>
          ) : threads.length === 0 ? (
            <View style={styles.emptySidebar}>
              <Ionicons name="chatbubbles-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyText}>No patient messages yet.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {threads.map((thread) => {
                const isSelected = thread.patientUid === selectedPatientUid;
                return (
                  <TouchableOpacity
                    key={thread.patientUid}
                    style={[styles.threadItem, isSelected && styles.threadItemActive]}
                    onPress={() => setSelectedPatientUid(thread.patientUid)}
                  >
                    <View style={styles.threadAvatar}>
                      <Text style={styles.threadAvatarText}>
                        {thread.patientName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.threadInfo}>
                      <View style={styles.threadRowTop}>
                        <Text style={[styles.threadName, isSelected && styles.threadNameActive]} numberOfLines={1}>
                          {thread.patientName}
                        </Text>
                        <Text style={styles.threadTime}>
                          {thread.lastTimestamp.getTime() > 0 ? thread.lastTimestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
                        </Text>
                      </View>
                      <Text style={styles.threadSnippet} numberOfLines={1}>
                        {thread.lastMessage}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Right Pane: Active Conversation */}
        <View style={styles.chatPane}>
          {activeThread ? (
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
              style={styles.keyboardContainer}
            >
              {/* Chat Header Info */}
              <View style={styles.chatHeaderInfo}>
                <View style={styles.chatHeaderUser}>
                  <Text style={styles.chatHeaderName}>{activeThread.patientName}</Text>
                  <Text style={styles.chatHeaderPhone}>Contact: {activeThread.contactNumber}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{activeThread.status.toUpperCase()}</Text>
                </View>
              </View>

              {/* Messages Scroll Area */}
              <ScrollView 
                ref={scrollViewRef}
                contentContainerStyle={styles.chatScroll} 
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
              >
                {activeThread.messages.map((msg, index) => {
                  const isStaff = msg.sender === 'staff';
                  const msgDate = msg.createdAt?.toDate?.() || new Date();
                  return (
                    <View 
                      key={msg.id || index} 
                      style={[
                        styles.messageRow, 
                        isStaff ? styles.staffMessageRow : styles.patientMessageRow
                      ]}
                    >
                      {!isStaff && (
                        <View style={styles.messageAvatar}>
                          <Text style={styles.messageAvatarText}>{activeThread.patientName.charAt(0)}</Text>
                        </View>
                      )}
                      <View 
                        style={[
                          styles.messageBubble, 
                          isStaff ? styles.staffBubble : styles.patientBubble
                        ]}
                      >
                        <Text style={[styles.messageText, isStaff ? styles.staffText : styles.patientText]}>
                          {msg.message}
                        </Text>
                        <Text style={[styles.timeText, isStaff ? styles.staffTime : styles.patientTime]}>
                          {msgDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Reply Input Bar */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder={`Reply to ${activeThread.patientName}...`}
                  placeholderTextColor="#94A3B8"
                  value={replyMessage}
                  onChangeText={setReplyMessage}
                  multiline
                />
                <TouchableOpacity 
                  style={[styles.sendButton, sending && styles.sendButtonDisabled]} 
                  activeOpacity={0.8} 
                  onPress={handleSendReply} 
                  disabled={sending}
                >
                  <Ionicons name={sending ? 'hourglass-outline' : 'send'} size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          ) : (
            <View style={styles.noChatSelected}>
              <Ionicons name="chatbubble-outline" size={48} color="#CBD5E1" />
              <Text style={styles.noChatTitle}>No Conversation Selected</Text>
              <Text style={styles.noChatSubtitle}>Select a patient from the left list to view messages and reply.</Text>
            </View>
          )}
        </View>
      </View>
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
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  workspace: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  sidebarHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sidebarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySidebar: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  threadItem: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  threadItemActive: {
    backgroundColor: '#F0FDFA',
    borderRightWidth: 3,
    borderRightColor: '#0D9488',
  },
  threadAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  threadAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D9488',
  },
  threadInfo: {
    flex: 1,
  },
  threadRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  threadName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  threadNameActive: {
    color: '#0D9488',
  },
  threadTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  threadSnippet: {
    fontSize: 12,
    color: '#64748B',
  },
  chatPane: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardContainer: {
    flex: 1,
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  chatHeaderUser: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  chatHeaderPhone: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  chatScroll: {
    padding: 20,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  patientMessageRow: {
    justifyContent: 'flex-start',
  },
  staffMessageRow: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  messageAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 14,
    borderRadius: 16,
  },
  patientBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
  },
  staffBubble: {
    backgroundColor: '#0D9488',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  patientText: {
    color: '#1E293B',
  },
  staffText: {
    color: '#FFFFFF',
  },
  timeText: {
    fontSize: 9,
  },
  patientTime: {
    color: '#94A3B8',
    textAlign: 'right',
  },
  staffTime: {
    color: '#CCFBF1',
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 13,
    color: '#0F172A',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    opacity: 0.65,
  },
  noChatSelected: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noChatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  noChatSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },
});