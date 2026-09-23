// ==============================================================================
// 2026년 9월 1일 ~ 9월 22일 대기배출시설 운영기록부 일괄 생성 및 Supabase 동기화 스크립트
// ==============================================================================

const fs = require('fs');
const path = require('path');
const { checkIsHoliday } = require('../holidays');

// 프로젝트 설정 및 데이터 경로
const RECORDS_FILE = path.join(__dirname, '..', 'data', 'records.json');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mdvgqerpterawrwejgoz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_XMVjKwHH9TydkEGgXHUINQ_PBi7SL2R';

// 한국어 요일 배열
const DAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

/**
 * 날짜 문자열 포맷팅 (YYYY-MM-DD -> YYYY년 M월 D일 요일)
 */
function formatKoreanDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayName = DAY_NAMES[d.getDay()];
  return `${year}년 ${month}월 ${day}일 ${dayName}`;
}

/**
 * 2026년 9월 일별 기상 기본 데이터 (맑음/구름조금/흐림)
 */
function getEstimatedWeather(dayNum) {
  // 초가을 9월 평년 기온 및 날씨
  const weathers = ['맑음', '구름조금', '맑음', '맑음', '흐림', '비', '맑음', '맑음', '구름조금', '맑음'];
  const w = weathers[dayNum % weathers.length];
  const minTemp = 16 + (dayNum % 4);
  const maxTemp = 24 + (dayNum % 5);
  return {
    weather: w,
    temp: `${minTemp} ~ ${maxTemp}℃`
  };
}

/**
 * 일일 운영기록 데이터 생성 함수
 */
function createDailyRecord(dateStr) {
  const holidayInfo = checkIsHoliday(dateStr);
  const isHoliday = holidayInfo.isHoliday;
  const holidayReason = holidayInfo.reason;

  const dayNum = parseInt(dateStr.split('-')[2], 10);
  const weatherInfo = getEstimatedWeather(dayNum);

  const defaultNote = isHoliday ? '휴무' : '미가동';
  const opinion = isHoliday ? '휴무로 인한 배출시설 미가동.' : '배출시설 미가동.';
  const status = isHoliday ? 'HOLIDAY' : 'IDLE';

  return {
    date: dateStr,
    formattedDate: formatKoreanDate(dateStr),
    isHoliday: isHoliday,
    holidayReason: holidayReason,
    status: status,
    workHours: '09:00 ~ 18:00',
    weatherInfo: weatherInfo,
    exhaustList: [
      { id: '1', facility: '혼합시설', opTime: '-', note: defaultNote },
      { id: '2', facility: '혼합시설', opTime: '-', note: defaultNote },
      { id: '3', facility: '혼합시설', opTime: '-', note: defaultNote },
      { id: '4', facility: '혼합시설', opTime: '-', note: defaultNote }
    ],
    preventionOperation: {
      exempt: true,
      text: '방지시설 면제',
      rows: []
    },
    preventionMaintenance: {
      exempt: false,
      rows: []
    },
    selfMeasurement: {
      measureDate: '',
      weather: '',
      temp: '',
      humidity: '',
      pressure: '',
      windDir: '',
      windSpeed: '',
      rows: []
    },
    fuelUsage: '-',
    rawMaterialUsage: '-',
    engineerOpinion: opinion,
    etc: '-',
    technician: {
      position: '부장',
      name: '윤 경 용'
    },
    managerSign: '',
    technicianSign: '',
    updatedAt: new Date().toISOString()
  };
}

/**
 * 일괄 생성 및 동기화 메인 실행 함수
 */
async function runBatchGenerate() {
  console.log('========================================================');
  console.log('2026년 9월 1일 ~ 9월 22일 운영기록 일괄 생성 시작...');
  console.log('========================================================');

  // 1. 기존 로컬 JSON 로드
  let records = {};
  if (fs.existsSync(RECORDS_FILE)) {
    try {
      records = JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf8'));
    } catch (e) {
      console.warn('기존 records.json 파싱 오류, 새로 시작합니다.');
    }
  }

  const generatedList = [];

  // 2. 9월 1일(01)부터 22일(22)까지 루프
  for (let i = 1; i <= 22; i++) {
    const dayStr = String(i).padStart(2, '0');
    const dateStr = `2026-09-${dayStr}`;
    const record = createDailyRecord(dateStr);

    records[dateStr] = record;
    generatedList.push(record);
    console.log(`[생성] ${dateStr} (${record.isHoliday ? '휴무' : '미가동'}) 완료`);
  }

  // 3. 로컬 파일 저장
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2), 'utf8');
  console.log(`[로컬 저장] ${RECORDS_FILE} 총 ${Object.keys(records).length}건 기록 보관 완료`);

  // 4. Supabase 클라우드 동기화 (Upsert)
  const endpoint = `${SUPABASE_URL}/rest/v1/air_operation_records`;
  console.log(`[Supabase 전송] ${endpoint} 업서트 진행 중...`);

  let successCount = 0;
  for (const item of generatedList) {
    try {
      const payload = {
        record_date: item.date,
        record_data: item,
        status: item.status,
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
        console.warn(`[Supabase 경고] ${item.date} 전송 실패 HTTP ${res.status}`);
      }
    } catch (err) {
      console.error(`[Supabase 예외] ${item.date}:`, err.message);
    }
  }

  console.log(`========================================================`);
  console.log(`일괄 생성 및 동기화 완료: 총 22건 중 Supabase ${successCount}건 성공!`);
  console.log(`========================================================`);
}

// 스크립트 직접 실행 시 구동
if (require.main === module) {
  runBatchGenerate();
}

module.exports = {
  createDailyRecord,
  runBatchGenerate
};
