// src/App.tsx
import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { fetchUnreadMessageIds, fetchMessageDetails, archiveMessages } from './GmailService';
import CleaningCanvas from './components/CleaningCanvas'; 

// 修正: type を追加
import type { EmailMessage } from './types';
import './App.css';

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [cleanedIds, setCleanedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // Googleログイン処理
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
      setStatus('ログイン成功！メールを取得できます。');
    },
    scope: 'https://www.googleapis.com/auth/gmail.modify', // 読み書き権限
  });

  // メール取得フロー
  const handleFetchEmails = async () => {
    if (!accessToken) return;
    setLoading(true);
    setStatus('未読メールをスキャン中...');
    
    try {
      // 1. 未読メールのIDリスト取得
      const messages = await fetchUnreadMessageIds(accessToken, 5); // テスト用に5件だけ
      
      // 2. 詳細情報の取得（並列処理）
      const emailDetails = await Promise.all(
        messages.map((msg: any) => fetchMessageDetails(accessToken, msg.id))
      );
      
      setEmails(emailDetails);
      setStatus(`${emailDetails.length} 件の汚れ（未読メール）が見つかりました！`);
    } catch (error) {
      console.error(error);
      setStatus('メール取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // Gmailへの同期（アーカイブ実行）
  const handleSyncToGmail = async () => {
    if (!accessToken || cleanedIds.length === 0) return;
    
    const confirm = window.confirm(`${cleanedIds.length} 件のメールを本当にアーカイブしますか？`);
    if (!confirm) return;

    setLoading(true);
    try {
      await archiveMessages(accessToken, cleanedIds);
      setStatus('洗浄完了！Gmailに反映しました。');
      setCleanedIds([]);
      setEmails([]); // 画面リセット
    } catch (error) {
      console.error(error);
      setStatus('反映に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <h1>Email Power Wash (Prototype)</h1>
      
      {/* ステータス表示 */}
      <div style={{ margin: '20px 0', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
        Status: <strong>{status}</strong>
      </div>

      {/* コントロールパネル */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {!accessToken ? (
          <button onClick={() => login()}>Googleでログイン</button>
        ) : (
          <>
            <button onClick={handleFetchEmails} disabled={loading || emails.length > 0}>
              1. 汚れをスキャン (メール取得)
            </button>
            <button 
              onClick={handleSyncToGmail} 
              disabled={loading || cleanedIds.length === 0}
              style={{ backgroundColor: cleanedIds.length > 0 ? '#4CAF50' : '#ccc' }}
            >
              2. 洗浄結果を反映 (アーカイブ実行: {cleanedIds.length}件)
            </button>
          </>
        )}
      </div>

      {/* ゲームキャンバス表示 */}
      {emails.length > 0 && (
        <CleaningCanvas 
          emails={emails} 
          onCleanComplete={(ids) => setCleanedIds(ids)} 
        />
      )}
    </div>
  );
}

export default App;