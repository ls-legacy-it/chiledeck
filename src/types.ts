export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};
export type WhatsappState = {
  lastGreeting: Date | null;
  lastGoodbye: Date | null;
  messageHistory: Message[];
  isMuted?: boolean;
  waiting?: boolean;
};

export type Flow = {
  keyword: string;
  action: (chatId: string, messageHistory: Message[]) => Promise<void>;
};
