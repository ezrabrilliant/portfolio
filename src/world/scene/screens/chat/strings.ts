export interface ChatScriptLine {
  who: "user" | "bot";
  text: string;
}

export interface Conversation {
  /** The toolbar's chat topic title. */
  title: string;
  script: readonly ChatScriptLine[];
}

/**
 * The app's own conversations, translated faithfully (spec §5.4); they add no legal claims of their own.
 * 1. From the capstone presentation screenshots. 2. From the app's Gemini prompt examples.
 */
const CONVERSATIONS: readonly Conversation[] = [
  {
    title: "Hit-and-run",
    script: [
      { who: "user", text: "Hi, I'd like to ask: in a hit-and-run case, which article would it violate?" },
      {
        who: "bot",
        text:
          "To answer your question about the hit-and-run case, I need more detail. The article violated depends on " +
          "several factors, including: 1. Was anyone killed? 2. Was anyone injured? 3. How badly were the vehicle " +
          "and/or other property damaged? 4. Did the driver flee the scene? 5. Was it negligence or intent? With more " +
          "complete information I can identify the right article in the Road Traffic and Transport Law and the " +
          "possible penalty. Please give more detail so I can answer more accurately.",
      },
    ],
  },
  {
    title: "Motorcycle theft",
    script: [
      { who: "user", text: "Which article fits a motorcycle theft case?" },
      {
        who: "bot",
        text:
          "Article 362: Whoever takes property belonging to another with the intent of unlawfully owning it is " +
          "punishable by up to 5 years in prison or a fine of up to Rp900,000.",
      },
      { who: "user", text: "What if it happened at night, by two people?" },
      {
        who: "bot",
        text: "Article 363: Aggravated theft (for example at night, or by two or more people). Penalty: 7 years in prison.",
      },
    ],
  },
];

/**
 * Every visible string of the PeduliPasal chat screen (the app's activity_message, night theme), in English.
 * Sub-project 2E reuses this glossary. The chips are the repo's hard-coded set, translated.
 */
export const CHAT_STRINGS = {
  conversations: CONVERSATIONS,
  chips: ["Which article fits a motorcycle theft case", "Which article covers a land dispute", "Explain the articles on inheritance cases"],
  input: "Type your message here",
};
