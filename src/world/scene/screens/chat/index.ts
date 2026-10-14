import type { ScreenApp } from "../types";
import { CHAT_LOGICAL, actChat, autoChat, busyChat, initChat } from "./chat";
import type { ChatState } from "./chat";
import { drawChat } from "./chatDraw";

export type { ChatState } from "./chat";

/** The PeduliPasal chat screen (night theme), for a LiveScreen inside the giant phone (portrait, 240 × 520). */
export const chatApp: ScreenApp<ChatState> = {
  logical: CHAT_LOGICAL,
  init: initChat,
  act: actChat,
  auto: autoChat,
  busy: busyChat,
  draw: drawChat,
};
