// @supabase/supabase-js 라이브러리에서 createClient 함수를 가져옵니다.
import { createClient } from '@supabase/supabase-js';

// .env.local 파일에 정의해 둔 Supabase URL을 읽어옵니다.
// C#의 IConfiguration["SupabaseUrl"]과 같은 개념입니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// .env.local 파일에 정의해 둔 Supabase Publishable Key(구 anon key)를 읽어옵니다.
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// 환경 변수가 빠져있을 경우 런타임에서 조기에 에러를 감지(Fail-Fast)하기 위한 유효성 검사입니다.
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Supabase URL 또는 Publishable Key 환경 변수가 누락되었습니다. .env.local 파일을 확인하세요.');
}

// --------------------------------------------------------------------------
// Supabase 클라이언트 싱글톤(Singleton) 객체 생성
// C#의 AddSingleton<ISupabaseClient>()과 동일하게 앱 전체에서 재사용됩니다.
// --------------------------------------------------------------------------
export const supabase = createClient(supabaseUrl, supabasePublishableKey);

// --------------------------------------------------------------------------
// 데이터베이스 receipts 테이블의 스키마를 나타내는 TypeScript 타입 정의
// C#의 public class ReceiptModel { ... } DTO/Entity 정의와 완벽하게 일치합니다.
// --------------------------------------------------------------------------
export interface ReceiptItem {
  id?: string;                        // 고유 ID (생성 시 DB 자동 발급)
  image_url: string;                  // 업로드된 영수증 이미지 URL
  issued_at: string;                  // 거래일자 (YYYY-MM-DD)
  vendor_name: string;                // 상호명/가게명
  total_amount: number;               // 총 결제 금액
  description: string | null;         // 거래 내용/품목
  invoice_number: string | null;      // T번호 (예: T1234567890123)
  amount_10_percent?: number;         // 10% 대상 금액
  amount_8_percent?: number;          // 8% 경감세율 대상 금액
  created_at?: string;                // 생성일시
}