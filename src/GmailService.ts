// src/GmailService.ts
import axios from 'axios';
// 修正: type を追加
import type { EmailMessage } from './types';

const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

// メールリスト（IDのみ）を取得
export const fetchUnreadMessageIds = async (accessToken: string, maxResults: number = 10) => {
  const response = await axios.get(`${GMAIL_API_URL}/messages`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      q: 'is:unread', // 未読のみ対象
      maxResults: maxResults,
    },
  });
  return response.data.messages || [];
};

// 個別のメール詳細（件名や送信者）を取得
export const fetchMessageDetails = async (accessToken: string, messageId: string): Promise<EmailMessage> => {
  const response = await axios.get(`${GMAIL_API_URL}/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const payload = response.data.payload;
  const headers = payload.headers;
  
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
  const sender = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
  
  return {
    id: messageId,
    threadId: response.data.threadId,
    snippet: response.data.snippet,
    subject,
    sender,
    date: response.data.internalDate,
    isDirt: true,
    opacity: 1.0,
  };
};

// メールをアーカイブする（ラベル変更）
export const archiveMessages = async (accessToken: string, messageIds: string[]) => {
  if (messageIds.length === 0) return;
  
  // batchModifyを使って一括アーカイブ（INBOXラベルを外す）
  await axios.post(
    `${GMAIL_API_URL}/messages/batchModify`,
    {
      ids: messageIds,
      removeLabelIds: ['INBOX'],
    },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
};