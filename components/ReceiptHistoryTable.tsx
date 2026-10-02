'use client';

import React, { useState, useEffect } from 'react';
import { supabase, ReceiptItem } from '@/lib/supabase';
// Trash2(쓰레기통 아이콘) 추가
import { Download, RefreshCw, CheckCircle2, AlertCircle, FileSpreadsheet, ExternalLink, Trash2 } from 'lucide-react';

interface ReceiptHistoryTableProps {
  refreshTrigger: number;
}

export const ReceiptHistoryTable: React.FC<ReceiptHistoryTableProps> = ({ refreshTrigger }) => {
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchReceipts = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`データ取得失敗: ${error.message}`);
      }

      setReceipts((data as ReceiptItem[]) || []);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'データ取得中にエラーが発生しました (데이터 조회 실패).');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [refreshTrigger]);

  // -------------------------------------------------------------
  // [신규 추가] 삭제 이벤트 핸들러 (DB 행 + 스토리지 파일 동시 삭제)
  // -------------------------------------------------------------
  const handleDelete = async (id: string | undefined, imageUrl: string) => {
    if (!id) return;
    
    // 1. 사용자에게 삭제 여부 최종 확인
    const isConfirmed = window.confirm('本当にこの領収書データを削除しますか？\n(정말 이 영수증 데이터를 삭제하시겠습니까?)');
    if (!isConfirmed) return;

    try {
      setIsLoading(true);

      // 2. Storage 파일 경로 추출 (URL에서 'receipts/' 이후의 텍스트 추출)
      // 예: https://.../public/receipts/receipt_images/123.jpg -> receipt_images/123.jpg
      const urlParts = imageUrl.split('/receipts/');
      const filePath = urlParts.length > 1 ? urlParts[1] : null;

      // 3. Supabase DB에서 레코드 삭제
      const { error: dbError } = await supabase
        .from('receipts')
        .delete()
        .eq('id', id);

      if (dbError) throw new Error(`DB削除エラー: ${dbError.message}`);

      // 4. Supabase Storage에서 원본 이미지 파일 삭제 (고아 파일 방지)
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('receipts')
          .remove([filePath]);
          
        if (storageError) {
          console.warn('Storage画像削除失敗 (스토리지 이미지 삭제 실패):', storageError.message);
        }
      }

      // 5. 화면(UI) 갱신: 삭제된 항목을 제외하고 리스트 렌더링
      setReceipts((prev) => prev.filter((r) => r.id !== id));
      alert('削除されました (삭제되었습니다).');

    } catch (err: any) {
      console.error(err);
      alert(`エラーが発生しました: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // CSV 다운로드 핸들러
  const handleExportCSV = () => {
    if (receipts.length === 0) {
      alert('エクスポートするデータがありません (다운로드할 데이터가 없습니다).');
      return;
    }

    const headers = [
      'ID', '取引年月日', '取引先名', '合計金額',
      '但し書き・取引内容', 'インボイス登録番号', '10%対象金額',
      '8%軽減税率対象金額', '領収書画像URL', '登録日時'
    ];

    const rows = receipts.map((r) => [
      `"${r.id || ''}"`,
      `"${r.issued_at || ''}"`,
      `"${(r.vendor_name || '').replace(/"/g, '""')}"`,
      r.total_amount || 0,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      `"${r.invoice_number || '未登録'}"`,
      r.amount_10_percent || 0,
      r.amount_8_percent || 0,
      `"${r.image_url || ''}"`,
      `"${r.created_at || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `経費精算データ_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border-2 border-gray-300 rounded-xl shadow-md p-6 mt-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-gray-200 gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-gray-950 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            経費精算・領収書一覧 (경비 정산 내역 목록)
          </h2>
          <p className="text-xs font-medium text-gray-600 mt-0.5">
            電子帳簿保存法の要件を満たした検索・出力が可能です (전자장부보존법 요건 데이터).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchReceipts}
            disabled={isLoading}
            className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
            title="最新情報に更新 (새로고침)"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={receipts.length === 0 || isLoading}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow transition"
          >
            <Download className="w-4 h-4" />
            <span>CSVエクスポート (CSV 다운로드)</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg flex items-center text-red-900 font-bold text-xs">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-800">
          <thead className="bg-slate-100 text-gray-900 font-extrabold uppercase border-y border-gray-300">
            <tr>
              <th className="px-3 py-3">取引日 (일자)</th>
              <th className="px-3 py-3">取引先 (상호)</th>
              <th className="px-3 py-3">合計金額 (총액)</th>
              <th className="px-3 py-3">インボイス番号 (T번호)</th>
              <th className="px-3 py-3">但し書き (적요)</th>
              <th className="px-3 py-3 text-center">原本 (영수증)</th>
              {/* 삭제 버튼 열 추가 */}
              <th className="px-3 py-3 text-center text-red-600">削除 (삭제)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 font-bold">
                  データを読み込み中... (데이터 로딩 중)
                </td>
              </tr>
            ) : receipts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  登録された領収書がありません (등록된 영수증이 없습니다).
                </td>
              </tr>
            ) : (
              receipts.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition font-medium">
                  <td className="px-3 py-3 font-bold text-gray-950 whitespace-nowrap">{item.issued_at}</td>
                  <td className="px-3 py-3 font-bold text-gray-900">{item.vendor_name}</td>
                  <td className="px-3 py-3 font-extrabold text-emerald-800 whitespace-nowrap">
                    ¥{item.total_amount?.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {item.invoice_number ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-200">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-blue-600" />
                        {item.invoice_number}
                      </span>
                    ) : (
                      <span className="text-gray-400 font-normal">未登録 (비적격)</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-600 max-w-[150px] truncate" title={item.description || ''}>
                    {item.description || '-'}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <a
                      href={item.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 underline text-xs font-bold"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-0.5" />
                      表示
                    </a>
                  </td>
                  {/* 삭제 버튼 추가 */}
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => handleDelete(item.id, item.image_url)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                      title="削除 (삭제)"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};