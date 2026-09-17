import React, { useState } from 'react';
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

export default function AiChatScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  
  // Sample conversation flow including Tagalog/English support
  const [chatLog, setChatLog] = useState([
    {
      sender: 'ai',
      text: 'Hello Mommy Maria! Kumusta ang pakiramdam mo ngayon? May gusto ka bang malaman tungkol sa iyong 31nd week of pregnancy?',
      time: '10:00 AM',
    },
    {
      sender: 'user',
      text: 'Normal lang ba sumakit ang lower back ko ngayon?',
      time: '10:02 AM',
    },
    {
      sender: 'ai',
      text: 'Yes Mommy, mild lower back pain is common at 31 weeks as your baby grows and your center of gravity shifts. Make sure to rest, maintain good posture, and avoid heavy lifting. However, if the pain becomes severe or is accompanied by bleeding, inform your midwife immediately!',
      time: '10:02 AM',
    },
  ]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    // Append user message
    const newMsg = { sender: 'user', text: message, time: 'Just now' };
    setChatLog([...chatLog, newMsg]);
    setMessage('');

    // Simulate AI response response placeholder
    setTimeout(() => {
      setChatLog(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Naitala ko na po ito. Para sa sigurado, pwede nating i-discuss yan sa iyong next checkup sa Sept 21!',
          time: 'Just now',
        },
      ]);
    }, 1000);
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
          <Text style={styles.headerTitle}>AI Health Assistant</Text>
          <Text style={styles.headerSubtitle}>Tagalog & English Support</Text>
        </View>
        <View style={styles.onlineIndicator}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Chat Messages Body */}
        <ScrollView contentContainerStyle={styles.chatScroll} showsVerticalScrollIndicator={false}>
          
          <View style={styles.disclaimerBox}>
            <Ionicons name="information-circle-outline" size={16} color="#0284C7" style={{ marginRight: 6 }} />
            <Text style={styles.disclaimerText}>
              This AI assistant provides general guidance. For emergencies, please contact your lying-in clinic directly.
            </Text>
          </View>

          {chatLog.map((chat, index) => (
            <View 
              key={index} 
              style={[
                styles.messageRow, 
                chat.sender === 'user' ? styles.userMessageRow : styles.aiMessageRow
              ]}
            >
              {chat.sender === 'ai' && (
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                </View>
              )}
              <View 
                style={[
                  styles.messageBubble, 
                  chat.sender === 'user' ? styles.userBubble : styles.aiBubble
                ]}
              >
                <Text style={[styles.messageText, chat.sender === 'user' ? styles.userText : styles.aiText]}>
                  {chat.text}
                </Text>
                <Text style={[styles.timeText, chat.sender === 'user' ? styles.userTime : styles.aiTime]}>
                  {chat.time}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Quick Suggestion Chips */}
        <View style={styles.chipsContainer}>
          <TouchableOpacity style={styles.chip} onPress={() => setMessage('Normal ba ang sumasakit ang ulo?')}>
            <Text style={styles.chipText}>Normal ba ang headache?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chip} onPress={() => setMessage('Ano ang mga bawal kainin?')}>
            <Text style={styles.chipText}>Mga bawal kainin</Text>
          </TouchableOpacity>
        </View>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Magtanong dito (Tagalog or English)..."
            placeholderTextColor="#94A3B8"
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} activeOpacity={0.8} onPress={handleSend}>
            <Ionicons name="send" size={16} color="#FFFFFF" />
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
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  aiMessageRow: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 14,
    borderRadius: 16,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#0D9488',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  aiText: {
    color: '#1E293B',
  },
  userText: {
    color: '#FFFFFF',
  },
  timeText: {
    fontSize: 9,
  },
  aiTime: {
    color: '#94A3B8',
    textAlign: 'right',
  },
  userTime: {
    color: '#CCFBF1',
    textAlign: 'right',
  },
  chipsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 8,
  },
  chip: {
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
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
});