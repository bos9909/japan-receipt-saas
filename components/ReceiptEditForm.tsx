'use client';

import React, { useState, useEffect } from 'react';
import { supabase, ReceiptItem } from '@/lib/supabase';
import { Save, Check, AlertCircle, Calendar, Store, JapaneseYen, FileText, Hash, Percent, Sparkles, ArrowRight } from 'lucide-react';

interface ReceiptEditFormProps {
  initialData: any;
  imageUrl: string;
  onSaveSuccess: () => void;
  // [신규] 큐에 남아있는 영수증 갯수를 부모로부터 받아옵니다.
  remainingCount: number; 
}

export const ReceiptEditForm: React.FC<ReceiptEditFormProps> = ({
  initialData,
  imageUrl,
  onSaveSuccess,
  remainingCount,
}) => {
  const [formData, setFormData] = useState<ReceiptItem>({
    image_url: imageUrl,
    issued_at: initialData?.issued_at || '',
    vendor_name: initialData?.vendor_name || '',
    total_amount: Number(initialData?.total_amount) || 0,
    description: initialData?.description || '',
    invoice_number: initialData?.invoice_number || null,
    amount_10_percent: Number(initialData?.amount_10_percent) || 0,
    amount_8_percent: Number(initialData?.amount_8_percent) || 0,
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        image_url: imageUrl,
        issued_at: initialData.issued_at || '',
        vendor_name: initialData.vendor_name || '',
        total_amount: Number(initialData.total_amount) || 0,
        description: initialData.description || '',
        invoice_number: initialData.invoice_number || null,
        amount_10_percent: Number(initialData.amount_10_percent) || 0,
        amount_8_percent: Number(initialData.amount_8_percent) || 0,
      });
      setSaveSuccess(false);
    }
  }, [initialData, imageUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value,
    }));
  };

  const handleSaveToDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (!formData.issued_at || !formData.vendor_name || formData.total_amount <= 0) {
        throw new Error('取引年月日、取引先名、金額は必須入力です (거래일자, 거래처명, 금액은 필수입니다).');
      }

      const { error } = await supabase
        .from('receipts')
        .insert([
          {
            image_url: formData.image_url,
            issued_at: formData.issued_at,
            vendor_name: formData.vendor_name,
            total_amount: formData.total_amount,
            description: formData.description || null,
            invoice_number: formData.invoice_number || null,
            amount_10_percent: formData.amount_10_percent || 0,
            amount_8_percent: formData.amount_8_percent || 0,
          },
        ]);

      if (error) throw new Error(`DB保存失敗: ${error.message}`);

      setSaveSuccess(true);
      setTimeout(() => {
        onSaveSuccess();
      }, 1000); // 딜레이를 약간 줄여서 빠른 연속 처리를 돕습니다.

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || '保存中にエラーが発生しました (저장 중 오류 발생).');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-gray-300 rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-extrabold text-gray-950 flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-blue-600" />
            AI解析結果の確認 (AI 판독 결과 확인)
          </h2>
        </div>
        {formData.invoice_number ? (
          <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <Check className="w-3.5 h-3.5 mr-1" /> 適格請求書
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            区分記載等
          </span>
        )}
      </div>

      <form onSubmit={handleSaveToDatabase} className="space-y-4">
        <div>
          <label className="flex items-center text-xs font-bold text-gray-900 mb-1.5">
            <Calendar className="w-4 h-4 mr-1 text-blue-600" /> 取引年月日 <span className="text-red-600 ml-0.5">*必須</span>
          </label>
          <input type="date" name="issued_at" value={formData.issued_at} onChange={handleChange} required className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-lg text-base font-bold text-gray-950 focus:bg-white focus:border-blue-600 focus:outline-none transition" />
        </div>

        <div>
          <label className="flex items-center text-xs font-bold text-gray-900 mb-1.5">
            <Store className="w-4 h-4 mr-1 text-blue-600" /> 取引先名 <span className="text-red-600 ml-0.5">*必須</span>
          </label>
          <input type="text" name="vendor_name" value={formData.vendor_name} onChange={handleChange} required className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-lg text-base font-bold text-gray-950 focus:bg-white focus:border-blue-600 focus:outline-none transition" />
        </div>

        <div>
          <label className="flex items-center text-xs font-bold text-gray-900 mb-1.5">
            <JapaneseYen className="w-4 h-4 mr-1 text-emerald-600" /> 合計金額 / JPY <span className="text-red-600 ml-0.5">*必須</span>
          </label>
          <input type="number" name="total_amount" value={formData.total_amount || ''} onChange={handleChange} required className="w-full px-3.5 py-2.5 bg-emerald-50/60 border-2 border-emerald-400 rounded-lg text-lg font-black text-emerald-950 focus:bg-white focus:border-emerald-600 focus:outline-none transition" />
        </div>

        <div>
          <label className="flex items-center text-xs font-bold text-gray-900 mb-1.5">
            <FileText className="w-4 h-4 mr-1 text-blue-600" /> 取引内容・但し書き
          </label>
          <input type="text" name="description" value={formData.description || ''} onChange={handleChange} className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-lg text-base font-bold text-gray-950 focus:bg-white focus:border-blue-600 focus:outline-none transition" />
        </div>

        <div>
          <label className="flex items-center text-xs font-bold text-gray-900 mb-1.5">
            <Hash className="w-4 h-4 mr-1 text-indigo-600" /> 登録番号 T+13桁
          </label>
          <input type="text" name="invoice_number" value={formData.invoice_number || ''} onChange={handleChange} className="w-full px-3.5 py-2.5 bg-indigo-50/50 border-2 border-indigo-300 rounded-lg text-base font-mono font-black text-indigo-950 focus:bg-white focus:border-indigo-600 focus:outline-none transition placeholder:text-gray-400" />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="flex items-center text-xs font-bold text-gray-800 mb-1"><Percent className="w-3.5 h-3.5 mr-1 text-gray-600" /> 10% 対象</label>
            <input type="number" name="amount_10_percent" value={formData.amount_10_percent || 0} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-300 rounded-lg text-sm font-bold text-gray-950 focus:bg-white focus:border-blue-600 focus:outline-none" />
          </div>
          <div>
            <label className="flex items-center text-xs font-bold text-gray-800 mb-1"><Percent className="w-3.5 h-3.5 mr-1 text-gray-600" /> 8% 軽減対象</label>
            <input type="number" name="amount_8_percent" value={formData.amount_8_percent || 0} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-300 rounded-lg text-sm font-bold text-gray-950 focus:bg-white focus:border-blue-600 focus:outline-none" />
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-100 border border-red-300 rounded-lg flex items-center text-red-900 font-bold text-xs">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-red-600" /><span>{errorMessage}</span>
          </div>
        )}

        <div className="pt-3">
          <button
            type="submit"
            disabled={isSaving || saveSuccess}
            className={`w-full py-3 px-4 rounded-lg font-extrabold text-base text-white flex items-center justify-center space-x-2 shadow transition ${saveSuccess ? 'bg-green-600' : isSaving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'}`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-5 h-5" />
                <span>保存完了！</span>
              </>
            ) : isSaving ? (
              <span>処理中...</span>
            ) : remainingCount > 0 ? (
              <>
                {/* ⭐️ 남아있는 큐가 있을 경우 '저장하고 다음으로' 표시 */}
                <Save className="w-5 h-5" />
                <span>保存して次へ (저장 및 다음)</span>
                <span className="text-blue-200 text-sm font-medium ml-2">残 {remainingCount} 件</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>確定・DB保存 (정산 확정)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};