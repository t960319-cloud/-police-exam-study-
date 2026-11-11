import { getChatGPTUser } from "../app/chatgpt-auth";

export async function getStudyUser() {
  const user = await getChatGPTUser();
  if (user) return { userId: user.userId, displayName: user.displayName, mode: "account" as const };
  if (import.meta.env.DEV) return { userId: "local-preview", displayName: "本機開發", mode: "development" as const };
  return null;
}
