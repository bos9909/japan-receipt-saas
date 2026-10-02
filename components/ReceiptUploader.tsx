'use client';

import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabase';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ReceiptUploaderProps {
  // 이제 단일 URL이 아니라 URL 배열(string[])을 반환합니다.
  onUploadSuccess: (publicUrls: string[]) => void;
  isProcessing: boolean;
}

export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({
  onUploadSuccess,
  isProcessing,
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // 현재 몇 번째 파일을 업로드 중인지 보여주기 위한 상태
  const [progressText, setProgressText] = useState<string>('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // 1. 선택된 여러 개의 파일을 배열로 변환 (C#의 files.ToArray()와 유사)
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setErrorMessage(null);
    setIsUploading(true);
    
    // 업로드 성공한 URL들을 담을 빈 배열 리스트 (C#의 List<string>)
    const uploadedUrls: string[] = [];

    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };

      // 2. 파일 갯수만큼 순회하며 압축 및 업로드 진행
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgressText(`画像処理中... (${i + 1}/${files.length}枚)`); // UI 진행도 표시

        // [단계 A] 압축
        const compressedFile = await imageCompression(file, options);

        // [단계 B] 파일명 생성 및 Supabase 업로드
        const fileExt = file.name.split('.').pop();
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `receipt_images/${uniqueFileName}`;

        const { error } = await supabase.storage
          .from('receipts')
          .upload(filePath, compressedFile, { cacheControl: '3600', upsert: false });

        if (error) throw new Error(`ストレージ保存失敗: ${error.message}`);

        // [단계 C] URL 획득 후 리스트에 추가
        const { data: publicUrlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      // 3. 모든 업로드가 끝나면 부모에게 URL 배열 전달
      setProgressText('アップロード完了！ (업로드 완료)');
      onUploadSuccess(uploadedUrls);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'アップロード中にエラーが発生しました (업로드 중 오류 발생).');
    } finally {
      // 1초 뒤 상태 초기화
      setTimeout(() => {
        setIsUploading(false);
        setProgressText('');
      }, 1000);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-1">
        領収書一括アップロード (다중 영수증 업로드)
      </h2>
      <p className="text-xs text-gray-600 mb-4">
        複数枚の領収書を同時に選択して、順次処理できます (여러 장을 한 번에 올릴 수 있습니다).
      </p>

      <label className={`
        flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition
        ${isUploading || isProcessing 
          ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
          : 'border-blue-400 hover:bg-blue-50/50 bg-white'}
      `}>
        {/* ⭐️ multiple 속성 추가로 여러 파일 동시 선택 허용 */}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading || isProcessing}
        />

        {isUploading ? (
          <div className="flex flex-col items-center text-blue-600">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span className="text-sm font-bold">{progressText}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-gray-600">
            <Upload className="w-10 h-10 text-gray-400 mb-2" />
            <span className="text-sm font-bold text-gray-800">クリックして複数画像を選択</span>
            <span className="text-xs text-gray-500 mt-1">Ctrl(Cmd)を押しながら複数選択可能</span>
          </div>
        )}
      </label>

      {errorMessage && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 text-xs">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};