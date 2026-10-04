import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import MedicalDisclaimer from '../components/MedicalDisclaimer';
import { aiService } from '../services/aiService';

const INITIAL_MESSAGES = [
  {
    id: 'm1',
    sender: 'ai',
    text: 'Hello! I am your AI Skin Assistant. You can ask me general questions about skin care, common conditions, or upload a skin photo for preliminary visual feedback.\n\nHow can I help you today?',
    time: 'Just now',
    suggestions: [
      'Why is my skin becoming dry?',
      'How to treat acne breakouts?',
      'Adapalene vs Benzoyl Peroxide',
      'What causes red itchy skin?',
    ],
  },
];

export default function AiAssistantScreen({ navigation }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();

  const handleSend = async (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: query.trim(),
      time: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await aiService.askAssistant(query);
      const aiMsg = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: response.reply,
        time: 'Just now',
        suggestions: response.suggestions,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      console.log('Error querying assistant:', e);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  return (
    <SafeAreaView style={styles.safe}>
      <Header navigation={navigation} />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Assistant Header matching Image 4 */}
        <View style={styles.assistantHeaderCard}>
          <View style={styles.assistantHeaderLeft}>
            <View style={styles.robotIconBox}>
              <Text style={styles.robotEmoji}>🤖</Text>
            </View>
            <View style={styles.assistantTitleCol}>
              <Text style={styles.assistantMainTitle}>
                AI Skin Assistant (Educational Guidance)
              </Text>
              <Text style={styles.assistantSubTitle}>
                General skin QA & visual preliminary analysis • Not a medical diagnosis
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.startConsultBtn}
            onPress={() => navigation.navigate('ConsultationFlow', { initialStep: 1 })}
            activeOpacity={0.8}
          >
            <Text style={styles.startConsultBtnText}>Start Doctor Consultation ➔</Text>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <View style={{ paddingHorizontal: 16 }}>
          <MedicalDisclaimer compact={true} />
        </View>

        {/* Chat Feed */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((item) => {
            const isAi = item.sender === 'ai';
            return (
              <View key={item.id} style={styles.messageRow}>
                {isAi && (
                  <View style={styles.aiAvatar}>
                    <Text style={styles.aiAvatarText}>🤖</Text>
                  </View>
                )}
                <View style={[styles.bubbleCol, !isAi && styles.userBubbleCol]}>
                  <View style={[styles.bubble, isAi ? styles.aiBubble : styles.userBubble]}>
                    <Text style={[styles.bubbleText, isAi ? styles.aiBubbleText : styles.userBubbleText]}>
                      {item.text}
                    </Text>
                  </View>
                  <Text style={[styles.messageTime, !isAi && { textAlign: 'right' }]}>
                    {item.time}
                  </Text>

                  {/* Suggestion Chips */}
                  {isAi && item.suggestions && item.suggestions.length > 0 && (
                    <View style={styles.suggestionsWrap}>
                      {item.suggestions.map((sug, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.suggestionChip}
                          onPress={() => handleSend(sug)}
                        >
                          <Text style={styles.suggestionChipText}>{sug}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {isTyping && (
            <View style={styles.messageRow}>
              <View style={styles.aiAvatar}>
                <Text style={styles.aiAvatarText}>🤖</Text>
              </View>
              <View style={[styles.bubble, styles.aiBubble, { paddingVertical: 10 }]}>
                <ActivityIndicator size="small" color={Colors.secondary} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Input Area matching Image 4 */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={() => navigation.navigate('ConsultationFlow', { initialStep: 1 })}
          >
            <Text style={styles.attachIcon}>🖼️</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask a question (e.g. 'Why is my skin becoming dry?')..."
            placeholderTextColor={Colors.textMuted}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />

          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            disabled={!inputText.trim()}
            onPress={() => handleSend()}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  assistantHeaderCard: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  assistantHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 220,
  },
  robotIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  robotEmoji: {
    fontSize: 20,
  },
  assistantTitleCol: {
    flex: 1,
  },
  assistantMainTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
  },
  assistantSubTitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  startConsultBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  startConsultBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  aiAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  aiAvatarText: {
    fontSize: 18,
  },
  bubbleCol: {
    flex: 1,
    maxWidth: '85%',
  },
  userBubbleCol: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  aiBubble: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  aiBubbleText: {
    color: Colors.textDark,
  },
  userBubbleText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    marginLeft: 4,
  },
  suggestionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  suggestionChip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  suggestionChipText: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '600',
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  attachIcon: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    height: 42,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 13,
    color: Colors.textDark,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
