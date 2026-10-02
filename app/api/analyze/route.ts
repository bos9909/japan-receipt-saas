import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function GET() {
  return NextResponse.json({ message: 'Analyze API 정상 동작 중' });
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: '서버 환경 변수에 GEMINI_API_KEY가 없습니다.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: '분석할 영수증 이미지 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. Supabase Storage에서 업로드된 이미지 다운로드
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`스토리지 이미지 로드 실패: ${imageResponse.statusText}`);
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const base64ImageData = Buffer.from(imageArrayBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // 2. 일본 인보이스 영수증 필수 6대 항목 프롬프트
    const prompt = `
당신은 일본의 세무 회계 감사관입니다. 영수증(レシート/領収書) 이미지를 분석하여 '인보이스 제도(インボイス制度)' 및 '전자장부보존법(電子帳簿保存法)'에 필요한 데이터를 JSON으로 추출하세요.

반드시 다음 필드를 포함하는 순수 JSON 객체 1개만 응답하세요:
{
  "issued_at": "YYYY-MM-DD",
  "vendor_name": "상호명/가게명",
  "total_amount": 총액숫자만(정수),
  "description": "내용/적요(예: 飲食代, 消耗品費 등)",
  "invoice_number": "T13자리번호(영수증에 없으면 null)",
  "amount_10_percent": 10프로대상금액(정수, 없으면 0),
  "amount_8_percent": 8프로경감세율대상금액(정수, 없으면 0)
}
`;

    const ai = new GoogleGenAI({ apiKey });

    // -------------------------------------------------------------
    // 3. 2026년 기준 활성 모델 체계 (최신 공식 별칭 및 3.x 라인업)
    // -------------------------------------------------------------
    const modelsToTry = [
      'gemini-flash-latest',          // 공식 최신 핫스왑 별칭 (권장)
      'gemini-3.8-flash',             // 최신 플래그십 모델
      'gemini-3.6-flash',             // 안정형 모델 (503 혼잡 회피용)
      'gemini-3.1-flash-lite-preview' // 초경량 저지연 모델
    ];

    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`📡 [AI 분석 시도] 대상 모델: ${modelName}`);

        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64ImageData,
              },
            },
            {
              text: prompt,
            },
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text || '{}';
        console.log(`🎉 [분석 성공!] 모델: ${modelName}\n응답:`, rawText);

        const parsedData = JSON.parse(rawText);

        return NextResponse.json({
          success: true,
          data: parsedData,
          usedModel: modelName,
        });

      } catch (err: any) {
        console.warn(`⚠️ [${modelName} 호출 실패]: ${err.message || err.status}`);
        lastError = err;
        // 일시적인 503 트래픽 과부하를 회피하기 위한 짧은 지연
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    throw lastError || new Error('모든 가용 모델 호출에 실패했습니다.');

  } catch (error: any) {
    console.error('백엔드 파싱 최종 에러:', error);
    return NextResponse.json(
      { error: error.message || '영수증 파싱 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}