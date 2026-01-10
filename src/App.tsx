// src/App.tsx
import { useState, useEffect, useRef } from 'react'; // useRef, useEffectを追加
import { useGoogleLogin } from '@react-oauth/google';
import { fetchUnreadMessageIds, fetchMessageDetails, archiveMessages, trashMessages } from './GmailService';
import CleaningCanvas from './components/CleaningCanvas';
import type { EmailMessage, CleanedMessage } from './types';
import { SoundManager } from './systems/SoundManager'; // インポート追加
import './App.css';

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [cleanedResults, setCleanedResults] = useState<CleanedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [fetchCount, setFetchCount] = useState<number>(5);

  // ★追加: SoundManagerをApp全体で1つだけ保持する
  const soundManagerRef = useRef<SoundManager | null>(null);

  // ★追加: 初回マウント時にSoundManagerを初期化
  useEffect(() => {
    const initSound = async () => {
      const sm = new SoundManager();
      await sm.loadAll();
      soundManagerRef.current = sm;
      console.log('SoundManager initialized');
    };
    initSound();

    // クリーンアップ（念の為）
    return () => {
      // SoundManagerにdispose/closeメソッドがあれば呼ぶが、
      // 基本的にAppが死ぬまで使い回すのでnull代入のみ
      soundManagerRef.current = null;
    };
  }, []);

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
    setStatus(`メールをスキャン中... (${fetchCount}件)`);
    
    try {
      const messages = await fetchUnreadMessageIds(accessToken, fetchCount);
      
      const emailDetails = await Promise.all(
        messages.map((msg: any) => fetchMessageDetails(accessToken, msg.id))
      );
      
      setEmails(emailDetails);
      setStatus(`${emailDetails.length} 件の汚れ（迷惑メール・未読）が見つかりました！`);
      setCleanedResults([]);
    } catch (error) {
      console.error(error);
      setStatus('メール取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // Gmailへの同期
  const handleSyncToGmail = async () => {
    if (!accessToken || cleanedResults.length === 0) return;
    
    const archiveIds = cleanedResults
      .filter(r => r.action === 'ARCHIVE')
      .map(r => r.id);
      
    const trashIds = cleanedResults
      .filter(r => r.action === 'DELETE')
      .map(r => r.id);

    const confirmMsg = `以下の処理を実行しますか？\n\n・アーカイブ: ${archiveIds.length}件\n・ゴミ箱へ: ${trashIds.length}件`;
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      await Promise.all([
        archiveMessages(accessToken, archiveIds),
        trashMessages(accessToken, trashIds)
      ]);
      
      setStatus('洗浄完了！Gmailに反映しました。');
      setCleanedResults([]);
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
            <select 
              value={fetchCount} 
              onChange={(e) => setFetchCount(Number(e.target.value))}
              disabled={loading || emails.length > 0}
              style={{ padding: '8px', borderRadius: '4px' }}
            >
              <option value={5}>5件</option>
              <option value={10}>10件</option>
              <option value={15}>15件</option>
              <option value={20}>20件</option>
            </select>

            <button onClick={handleFetchEmails} disabled={loading || emails.length > 0}>
              1. 汚れをスキャン
            </button>
            <button 
              onClick={handleSyncToGmail} 
              disabled={loading || cleanedResults.length === 0}
              style={{ backgroundColor: cleanedResults.length > 0 ? '#4CAF50' : '#ccc' }}
            >
              2. 洗浄結果を反映 (実行: {cleanedResults.length}件)
            </button>
          </>
        )}
      </div>

      {/* soundManagerの準備ができていない場合は表示しないガードを入れることも可能ですが、
          現状はnullチェックをCanvas側でするか、ここで渡す */}
      {emails.length > 0 && soundManagerRef.current && (
        <CleaningCanvas 
          emails={emails} 
          onCleanComplete={(results) => setCleanedResults(results)} 
          soundManager={soundManagerRef.current}
        />
      )}
    </div>
  );
}

export default App;