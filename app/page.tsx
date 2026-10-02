'use client';

import { useState, useEffect } from 'react';
import { ReceiptUploader } from '@/components/ReceiptUploader';
import { ReceiptEditForm } from '@/components/ReceiptEditForm';
import { ReceiptHistoryTable } from '@/components/ReceiptHistoryTable';
import { Loader2, Sparkles, ReceiptText, Zap, ArrowRightCircle } from 'lucide-react';

// -------------------------------------------------------------
// [핵심 아키텍처] 작업 큐 객체 타입 정의
// C#의 class TaskItem { public string Url; public TaskStatus Status; ... } 와 동일
// -------------------------------------------------------------
type TaskStatus = 'pending' | 'analyzing' | 'done' | 'error';

interface ReceiptTask {
  id: string;         // 고유 식별자
  url: string;        // 이미지 URL
  status: TaskStatus; // 현재 상태
  data?: any;         // AI 분석 완료된 데이터
  error?: string;     // 에러 메시지
}

export default function Home() {
  // 전체 작업 대기열 (큐)
  const [tasks, setTasks] = useState<ReceiptTask[]>([]);
  // 사용자가 화면에서 보고 있는 현재 영수증의 인덱스 번호
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  
  // 테이블 새로고침용
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // -------------------------------------------------------------
  // 1. 업로드 완료 시: 작업 큐에 'pending(대기중)' 상태로 등록
  // -------------------------------------------------------------
  const handleUploadSuccess = (publicUrls: string[]) => {
    const newTasks: ReceiptTask[] = publicUrls.map((url, idx) => ({
      id: `${Date.now()}-${idx}`,
      url: url,
      status: 'pending',
    }));
    setTasks((prev) => [...prev, ...newTasks]);
  };

  // -------------------------------------------------------------
  // 2. [백그라운드 워커] useEffect를 이용한 비동기 백그라운드 프리패치
  // 사용자가 화면을 보는 것과 상관없이, 백그라운드에서 순차적으로 AI를 호출합니다.
  // -------------------------------------------------------------
  useEffect(() => {
    // 큐에서 가장 먼저 처리해야 할 'pending' 상태의 인덱스 찾기
    const nextPendingIndex = tasks.findIndex((t) => t.status === 'pending');
    
    // 동시에 여러 개를 보내면 API Rate Limit(과부하)이 걸릴 수 있으므로 
    // 현재 'analyzing' 중인 작업이 있는지 확인하여 1개씩 순차 처리합니다.
    const isCurrentlyAnalyzing = tasks.some((t) => t.status === 'analyzing');

    if (nextPendingIndex !== -1 && !isCurrentlyAnalyzing) {
      // 해당 작업을 'analyzing' 상태로 변경
      setTasks((prev) => {
        const newTasks = [...prev];
        newTasks[nextPendingIndex] = { ...newTasks[nextPendingIndex], status: 'analyzing' };
        return newTasks;
      });

      const taskToAnalyze = tasks[nextPendingIndex];

      // 백그라운드 AI 호출 (await를 쓰지 않고 Promise then으로 비동기 실행)
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: taskToAnalyze.url }),
      })
        .then(async (res) => {
          const rawText = await res.text();
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const result = JSON.parse(rawText);
          if (!result.success) throw new Error(result.error || 'AI解析失敗');
          return result.data;
        })
        .then((analyzedData) => {
          // 성공 시 상태를 'done'으로 바꾸고 데이터 저장
          setTasks((prev) => {
            const newTasks = [...prev];
            newTasks[nextPendingIndex] = { ...newTasks[nextPendingIndex], status: 'done', data: analyzedData };
            return newTasks;
          });
        })
        .catch((err) => {
          // 에러 발생 시 상태를 'error'로 변경
          setTasks((prev) => {
            const newTasks = [...prev];
            newTasks[nextPendingIndex] = { ...newTasks[nextPendingIndex], status: 'error', error: err.message };
            return newTasks;
          });
        });
    }
  }, [tasks]);

  // -------------------------------------------------------------
  // 3. UI 제어: 현재 사용자가 보고 있는 작업 추출
  // -------------------------------------------------------------
  const currentTask = currentIndex < tasks.length ? tasks[currentIndex] : null;
  const remainingCount = tasks.length - currentIndex - 1; // 내 뒤에 남은 갯수

  // 사용자가 수정을 마치고 DB [저장]을 눌렀을 때
  const handleSaveSuccess = () => {
    setRefreshTrigger((prev) => prev + 1); // 테이블 갱신
    // 다음 작업으로 인덱스 이동 (AI가 미리 분석해 두었다면 0초 대기!)
    setCurrentIndex((prev) => prev + 1);
  };

  // 에러난 파일이거나 저장하지 않고 건너뛸 때
  const handleSkip = () => {
    setCurrentIndex((prev) => prev + 1);
  };

  // 모든 큐를 처리하고 끝났을 때 초기화
  useEffect(() => {
    if (tasks.length > 0 && currentIndex >= tasks.length) {
      setTimeout(() => {
        setTasks([]);
        setCurrentIndex(0);
      }, 2000); // "모든 작업 완료" 메시지를 2초간 보여주고 리셋
    }
  }, [currentIndex, tasks.length]);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-2.5 bg-blue-100 rounded-full text-blue-700 mb-2 shadow-sm">
            <ReceiptText className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            AI 経費精算ツール <span className="text-blue-600 text-2xl">(Pro)</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-600">
            バックグラウンドAI解析機能搭載 (백그라운드 AI 분석 탑재)
          </p>
        </div>

        {/* 1. 영수증 업로더 (작업 큐가 비어있을 때만 표시) */}
        {tasks.length === 0 && (
          <div className="max-w-md mx-auto">
            <ReceiptUploader onUploadSuccess={handleUploadSuccess} isProcessing={false} />
          </div>
        )}

        {/* 2. 모든 작업이 끝났을 때 보여주는 축하 화면 */}
        {tasks.length > 0 && currentIndex >= tasks.length && (
          <div className="max-w-md mx-auto p-8 bg-green-50 border-2 border-green-300 rounded-xl flex flex-col items-center justify-center text-green-800 space-y-3">
            <Sparkles className="w-10 h-10 text-green-500 mb-2" />
            <h2 className="text-xl font-extrabold">すべての処理が完了しました！</h2>
            <p className="text-sm font-bold text-green-600">初期画面に戻ります... (초기 화면으로 돌아갑니다)</p>
          </div>
        )}

        {/* 3. 현재 작업 화면 렌더링 (좌우 Split View) */}
        {currentTask && (
          <div className="space-y-4">
            {/* 상단 프로그레스 안내 바 */}
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 shadow-sm text-sm font-bold text-gray-700">
              <div className="flex items-center space-x-2">
                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">
                  {currentIndex + 1} / {tasks.length}枚目
                </span>
                <span>進行状況 (진행 상황)</span>
              </div>
              
              {/* 백그라운드 작업자가 다음 파일을 처리 중인지 알려주는 깨알 디테일 UI */}
              {tasks.some((t, i) => i > currentIndex && t.status === 'analyzing') && (
                <div className="flex items-center text-blue-600 text-xs">
                  <Zap className="w-3.5 h-3.5 mr-1" />
                  裏で次の画像を解析中... (백그라운드 분석 중)
                </div>
              )}
            </div>

            {/* AI 분석 대기 중 (백그라운드 완료가 아직 안 됐을 때) */}
            {(currentTask.status === 'pending' || currentTask.status === 'analyzing') && (
              <div className="max-w-md mx-auto p-8 bg-blue-50 border border-blue-200 rounded-xl flex flex-col items-center justify-center text-blue-700 space-y-4 shadow-sm">
                <Loader2 className="w-10 h-10 animate-spin" />
                <div className="text-center">
                  <p className="font-extrabold text-base">Gemini AIが領収書を解析中...</p>
                  <p className="text-xs mt-1 text-blue-500 font-semibold">高精度で項目を抽出しています (정밀 추출 중)</p>
                </div>
              </div>
            )}

            {/* 에러 발생 시 */}
            {currentTask.status === 'error' && (
              <div className="max-w-md mx-auto p-6 bg-red-50 border border-red-200 rounded-xl flex flex-col items-center space-y-4 shadow-sm">
                <p className="text-red-600 text-sm font-bold text-center">❌ {currentTask.error}</p>
                <button onClick={handleSkip} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-bold transition flex items-center">
                  スキップして次へ (건너뛰고 다음으로) <ArrowRightCircle className="w-4 h-4 ml-2" />
                </button>
              </div>
            )}

            {/* 분석이 완료된 화면 (대기시간 0초로 짠! 하고 나타남) */}
            {currentTask.status === 'done' && currentTask.data && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white border-2 border-gray-300 rounded-xl p-4 shadow-sm flex flex-col items-center">
                  <h3 className="text-sm font-extrabold text-gray-800 mb-3 self-start">📷 領収書原本 (원본 영수증)</h3>
                  <div className="w-full max-h-[600px] overflow-auto rounded-lg bg-gray-100 flex items-center justify-center p-2">
                    <img src={currentTask.url} alt="領収書原本" className="max-w-full max-h-[550px] object-contain rounded shadow" />
                  </div>
                </div>

                <div>
                  <ReceiptEditForm
                    initialData={currentTask.data}
                    imageUrl={currentTask.url}
                    onSaveSuccess={handleSaveSuccess}
                    remainingCount={remainingCount} // 남은 갯수 전달 (버튼 표시용)
                  />
                  <div className="mt-3 flex justify-end">
                    <button onClick={handleSkip} className="text-xs font-bold text-gray-400 hover:text-gray-700 underline">
                      保存せずにスキップ (저장 안하고 넘기기)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. 정산 내역 및 삭제, CSV 테이블 */}
        <ReceiptHistoryTable refreshTrigger={refreshTrigger} />
      </div>
    </main>
  );
}