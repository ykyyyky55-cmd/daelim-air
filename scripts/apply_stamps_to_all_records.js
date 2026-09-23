// ==============================================================================
// 운영기록부 일자별 결재도장(부서장/환경기술인) 자동 날인 및 Supabase 동기화 스크립트
// ==============================================================================

const fs = require('fs');
const path = require('path');

const RECORDS_FILE = path.join(__dirname, '..', 'data', 'records.json');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mdvgqerpterawrwejgoz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_XMVjKwHH9TydkEGgXHUINQ_PBi7SL2R';

/**
 * 일자에 맞는 고해상도 벡터 전자도장 SVG Data URL 생성 함수
 * @param {string} nameText 도장 중앙 이름 (예: '윤경용')
 * @param {string} dateStr 날짜 문자열 (YYYY-MM-DD)
 * @returns {string} SVG Data URL
 */
function generateStampSvg(nameText, dateStr) {
  const dStr = (dateStr || '').replace(/-/g, '.');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140">
    <!-- 외곽 굵은 원 -->
    <circle cx="70" cy="70" r="63" fill="none" stroke="#dc2626" stroke-width="3.5" />
    <!-- 안쪽 가는 원 -->
    <circle cx="70" cy="70" r="57" fill="none" stroke="#dc2626" stroke-width="1.5" />
    <!-- 상단 텍스트: 전자결재 -->
    <text x="70" y="37" fill="#dc2626" font-family="'Noto Sans KR', sans-serif" font-weight="bold" font-size="13" text-anchor="middle">전자결재</text>
    <!-- 중앙 이름: 윤경용 -->
    <text x="70" y="78" fill="#dc2626" font-family="'Noto Sans KR', sans-serif" font-weight="bold" font-size="25" text-anchor="middle">${nameText}</text>
    <!-- 하단 일자: YYYY.MM.DD -->
    <text x="70" y="108" fill="#dc2626" font-family="'Noto Sans KR', sans-serif" font-weight="bold" font-size="11" text-anchor="middle">${dStr}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/**
 * 전체 운영기록에 일자별 결재도장 소급 날인 실행
 */
async function applyStampsToAllRecords() {
  console.log('========================================================');
  console.log('전체 운영기록부 일자별 결재도장 자동 날인 시작...');
  console.log('========================================================');

  if (!fs.existsSync(RECORDS_FILE)) {
    console.error('records.json 파일이 존재하지 않습니다.');
    return;
  }

  const records = JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf8'));
  const dates = Object.keys(records).sort();
  console.log(`총 ${dates.length}건의 운영기록 발견.`);

  // 1. 각 일자에 맞는 도장 생성 및 주입
  for (const dateStr of dates) {
    const rec = records[dateStr];
    // 부서장 결재도장 (윤경용 + 해당 날짜)
    rec.managerSign = generateStampSvg('윤경용', dateStr);
    // 환경기술인 서명도장 (윤경용 + 해당 날짜)
    rec.technicianSign = generateStampSvg('윤경용', dateStr);
    rec.updatedAt = new Date().toISOString();
  }

  // 2. 로컬 파일 저장
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2), 'utf8');
  console.log(`[로컬 파일 저장 완료] ${dates.length}건 일자별 도장 반영 완료.`);

  // 3. Supabase 클라우드 동기화 (Upsert)
  const endpoint = `${SUPABASE_URL}/rest/v1/air_operation_records`;
  console.log(`[Supabase 전송] ${dates.length}건 클라우드 업데이트 진행...`);

  let successCount = 0;
  for (const dateStr of dates) {
    const rec = records[dateStr];
    try {
      const payload = {
        record_date: dateStr,
        record_data: rec,
        status: rec.status || (rec.isHoliday ? 'HOLIDAY' : 'IDLE'),
        updated_at: new Date().toISOString()
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        successCount++;
      } else {
        console.warn(`[Supabase 실패] ${dateStr} HTTP ${res.status}`);
      }
    } catch (err) {
      console.error(`[Supabase 예외] ${dateStr}:`, err.message);
    }
  }

  console.log('========================================================');
  console.log(`도장 날인 완료: 총 ${dates.length}건 중 Supabase ${successCount}건 성공!`);
  console.log('========================================================');
}

if (require.main === module) {
  applyStampsToAllRecords();
}

module.exports = {
  generateStampSvg,
  applyStampsToAllRecords
};
