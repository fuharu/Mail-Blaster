// src/GmailService.ts
import axios from 'axios';
// 修正: type を追加
import type { EmailMessage } from './types';

const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

// メールリストを取得（クエリと件数を指定可能に）
export const fetchUnreadMessageIds = async (accessToken: string, maxResults: number = 5) => {
  const response = await axios.get(`${GMAIL_API_URL}/messages`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      // ★変更: 未読の中で「メイン」「プロモーション」「ソーシャル」などを対象にする
      // 「スパム以外」という要件なので、category:promotions や category:social を含めます
      q: 'is:unread (category:promotions OR category:social OR label:inbox)', 
      maxResults: maxResults,
    },
  });
  return response.data.messages || [];
};

// 個別のメール詳細を取得
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

// メールをアーカイブする（青ノズル用）
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

// ★追加: メールをゴミ箱に移動する（赤ノズル用）
export const trashMessages = async (accessToken: string, messageIds: string[]) => {
  if (messageIds.length === 0) return;

  // Gmail APIには batchTrash がないので、Promise.all で並列実行します
  // (batchModifyで TRASH ラベルを付ける方法はシステムラベル制限があるため確実な trash エンドポイントを使用)
  await Promise.all(
    messageIds.map(id => 
      axios.post(
        `${GMAIL_API_URL}/messages/${id}/trash`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
    )
  );
};