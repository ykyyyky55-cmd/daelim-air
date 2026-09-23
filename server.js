// 대기배출시설 및 방지시설 운영기록부 백엔드 서버
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const cron = require('node-cron');

// 대한민국 공휴일 및 클라우드 동기화 모듈 임포트
const { checkIsHoliday } = require('./holidays');
const { loadCloudConfig, saveCloudConfig, syncToCloud } = require('./cloudSync');

const app = express();
const PORT = 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 전자서명 Base64 이미지 수용
app.use(express.static(path.join(__dirname, 'public')));

// 데이터 디렉터리 및 저장 파일 경로 설정
const DATA_DIR = path.join(__dirname, 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');

// 데이터 디렉터리가 없으면 자동 생성
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 기존 데이터 불러오기 헬퍼 함수
function loadRecords() {
  try {
    if (fs.existsSync(RECORDS_FILE)) {
      const raw = fs.readFileSync(RECORDS_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error('기록 불러오기 오류:', error);
  }
  return {};
}

// 데이터 파일 저장 헬퍼 함수
function saveRecords(data) {
  try {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('기록 저장 오류:', error);
    return false;
  }
}

// WMO 날씨 코드를 한글 명칭으로 변환하는 함수
function convertWmoToWeatherName(code, rainMm = 0) {
  if (code === 0 || code === 1) return '맑음';
  if (code === 2) return '구름조금';
  if (code === 3) return '구름많음';
  if (code === 45 || code === 48) return '흐림';
  if ([51, 53, 55, 61, 80].includes(code)) return rainMm > 5 ? '비' : '비조금';
  if ([63, 65, 81, 82, 95, 96, 99].includes(code)) return '비';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return rainMm > 3 ? '눈' : '눈조금';
  return '맑음';
}

// 16방위 풍향 각도를 한글 풍향으로 변환하는 함수
function convertDegreeToDirection(deg) {
  if (deg === null || deg === undefined) return '북';
  const directions = [
    '북', '북북동', '북동', '동북동',
    '동', '동남동', '남동', '남남동',
    '남', '남남서', '남서', '서남서',
    '서', '서북서', '북서', '북북서'
  ];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

// 김포시 월곶면 날씨 내부 조회 헬퍼 함수
async function fetchWeatherInternal(targetDate) {
  const lat = 37.6997;
  const lon = 126.5431;
  const today = new Date().toISOString().split('T')[0];
  const isPast = targetDate < today;

  try {
    let url = '';
    if (isPast) {
      url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${targetDate}&end_date=${targetDate}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&hourly=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m&timezone=Asia%2FTokyo`;
    } else {
      url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code&hourly=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m&timezone=Asia%2FTokyo`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`날씨 API 응답 오류: ${response.status}`);
    }

    const data = await response.json();

    let weatherCode = 0;
    let minTemp = 15;
    let maxTemp = 25;
    let rainSum = 0;

    if (data.daily && data.daily.time && data.daily.time.length > 0) {
      const idx = data.daily.time.indexOf(targetDate);
      const targetIdx = idx !== -1 ? idx : 0;
      weatherCode = data.daily.weather_code ? data.daily.weather_code[targetIdx] : 0;
      minTemp = data.daily.temperature_2m_min ? Math.round(data.daily.temperature_2m_min[targetIdx]) : 15;
      maxTemp = data.daily.temperature_2m_max ? Math.round(data.daily.temperature_2m_max[targetIdx]) : 25;
      rainSum = data.daily.precipitation_sum ? data.daily.precipitation_sum[targetIdx] : 0;
    }

    let curTemp = Math.round((minTemp + maxTemp) / 2);
    let humidity = 60;
    let pressure = 1013;
    let windDir = '서';
    let windSpeed = 2.0;

    if (data.current && targetDate === today) {
      curTemp = Math.round(data.current.temperature_2m);
      humidity = Math.round(data.current.relative_humidity_2m);
      pressure = Math.round(data.current.surface_pressure);
      windSpeed = Math.round((data.current.wind_speed_10m / 3.6) * 10) / 10;
      windDir = convertDegreeToDirection(data.current.wind_direction_10m);
    } else if (data.hourly && data.hourly.temperature_2m) {
      const sampleHour = 14;
      curTemp = Math.round(data.hourly.temperature_2m[sampleHour] || curTemp);
      humidity = Math.round(data.hourly.relative_humidity_2m[sampleHour] || humidity);
      pressure = Math.round(data.hourly.surface_pressure[sampleHour] || pressure);
      const rawWindSpeed = data.hourly.wind_speed_10m[sampleHour] || 7.2;
      windSpeed = Math.round((rawWindSpeed / 3.6) * 10) / 10;
      windDir = convertDegreeToDirection(data.hourly.wind_direction_10m[sampleHour]);
    }

    const weatherName = convertWmoToWeatherName(weatherCode, rainSum);

    return {
      success: true,
      targetDate,
      location: '경기도 김포시 월곶면',
      weather: weatherName,
      minTemp,
      maxTemp,
      tempStr: `${minTemp} ~ ${maxTemp}℃`,
      measurement: {
        temp: curTemp,
        humidity,
        pressure,
        windDir,
        windSpeed
      }
    };
  } catch (error) {
    console.error('날씨 연동 실패:', error.message);
    return {
      success: false,
      targetDate,
      location: '경기도 김포시 월곶면',
      weather: '맑음',
      minTemp: 15,
      maxTemp: 25,
      tempStr: '15 ~ 25℃',
      measurement: {
        temp: 20,
        humidity: 60,
        pressure: 1013,
        windDir: '서',
        windSpeed: 2.0
      },
      error: error.message
    };
  }
}

// 김포시 월곶면 날씨 조회 API
app.get('/api/weather', async (req, res) => {
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];
  const weatherResult = await fetchWeatherInternal(targetDate);
  res.json(weatherResult);
});

// 기본 템플릿 생성 함수 (배출구 4번까지, 공휴일/휴무 및 미가동, 방지시설 면제 기본 설정)
function createDefaultRecord(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dayOfWeek = dayNames[d.getDay()];

  // 대한민국 토요일 및 법정/임시공휴일 판별
  const holidayCheck = checkIsHoliday(dateStr);
  const defaultNote = holidayCheck.isHoliday ? '휴무' : '미가동';
  const defaultOpTime = '-';
  const defaultOpinion = holidayCheck.isHoliday 
    ? `${holidayCheck.reason}로 인한 배출시설 미가동.` 
    : '배출시설 미가동.';

  return {
    date: dateStr,
    formattedDate: `${year}년 ${month}월 ${day}일 ${dayOfWeek}`,
    isHoliday: holidayCheck.isHoliday,
    holidayReason: holidayCheck.reason,
    approval: {
      inCharge: '담당',
      reviewer: '',
      manager: '부서장'
    },
    weatherInfo: {
      weather: '맑음',
      temp: '15 ~ 25℃'
    },
    workHours: '09:00 ~ 18:00',
    // 배출구 수: 4번까지 (1~4번 혼합시설, 휴무/미가동 적용)
    exhaustList: [
      { id: 1, facility: '혼합시설', opTime: defaultOpTime, note: defaultNote },
      { id: 2, facility: '혼합시설', opTime: defaultOpTime, note: defaultNote },
      { id: 3, facility: '혼합시설', opTime: defaultOpTime, note: defaultNote },
      { id: 4, facility: '혼합시설', opTime: defaultOpTime, note: defaultNote }
    ],
    // 방지시설 운영사항: 면제로 설정
    preventionOperation: {
      exempt: true,
      text: '방지시설면제',
      rows: []
    },
    preventionMaintenance: {
      exempt: true,
      text: '방지시설 면제',
      rows: [
        {
          facility: '-',
          exhaustNo: '-',
          period: '-',
          worker: '-',
          details: '특이사항 없음'
        }
      ]
    },
    selfMeasurement: {
      measureDate: '',
      weather: '',
      temp: '',
      humidity: '',
      pressure: '',
      windDir: '',
      windSpeed: '',
      rows: [
        { exhaustNo: '', facilityName: '', item: '', density: '', dailyFlow: '', dailyEmission: '', device: '', method: '' }
      ]
    },
    fuelUsage: '-',
    fuelDay: '',
    rawMaterialUsage: '-',
    engineerOpinion: defaultOpinion,
    etc: '-',
    technician: {
      position: '부장',
      name: '윤경용'
    },
    managerSign: '',
    technicianSign: '',
    chargeSign: ''
  };
}

// 매일 18:00 자동 작성 및 클라우드 동기화 핵심 함수
async function autoCreateDailyRecord(targetDate) {
  const dateStr = targetDate || new Date().toISOString().split('T')[0];
  const records = loadRecords();

  let recordToSave;
  if (records[dateStr]) {
    recordToSave = records[dateStr];
    console.log(`[일일 자동 작성] ${dateStr} 기존 기록 확인 -> 클라우드 동기화 진행`);
  } else {
    // 1. 신규 템플릿 생성 (배출구 4번까지, 공휴일 휴무 / 평일 미가동, 방지시설 면제, 자가측정 빈칸)
    recordToSave = createDefaultRecord(dateStr);

    // 2. 김포시 월곶면 앞면 날씨 자동 연동 (자가측정란은 사용자 직접 입력을 위해 빈칸 유지)
    const weatherData = await fetchWeatherInternal(dateStr);
    if (weatherData && weatherData.success) {
      recordToSave.weatherInfo = {
        weather: weatherData.weather,
        temp: weatherData.tempStr
      };
    }

    records[dateStr] = {
      ...recordToSave,
      autoGenerated: true,
      updatedAt: new Date().toISOString()
    };
    saveRecords(records);
    console.log(`[일일 자동 작성 완료] ${dateStr} (상태: ${recordToSave.exhaustList[0].note}, 사유: ${recordToSave.holidayReason})`);
  }

  // 3. 매일 클라우드에 영구 저장/동기화
  await syncToCloud(dateStr, recordToSave);
  return recordToSave;
}

// ============================================================
// 매일 오후 6시 (18:00) 정각 자동 작성 스케줄러 등록
// ============================================================
cron.schedule('0 18 * * *', async () => {
  const todayStr = new Date().toISOString().split('T')[0];
  console.log(`\n======================================================`);
  console.log(`[스케줄러 가동] 18:00 정각 - ${todayStr} 일일 운영기록부 자동 작성 시작`);
  console.log(`======================================================`);
  await autoCreateDailyRecord(todayStr);
}, {
  timezone: 'Asia/Seoul'
});

// 특정 일자 기록 조회 API
app.get('/api/records/:date', (req, res) => {
  const dateStr = req.params.date;
  const records = loadRecords();

  if (records[dateStr]) {
    res.json({ success: true, isNew: false, data: records[dateStr] });
  } else {
    const newRecord = createDefaultRecord(dateStr);
    res.json({ success: true, isNew: true, data: newRecord });
  }
});

// 특정 일자 기록 저장 API (언제나 수정 가능하며 저장 시 즉시 클라우드 동기화)
app.post('/api/records/:date', async (req, res) => {
  const dateStr = req.params.date;
  const newRecord = req.body;

  const records = loadRecords();
  records[dateStr] = {
    ...newRecord,
    updatedAt: new Date().toISOString()
  };

  const ok = saveRecords(records);
  if (ok) {
    // 클라우드 저장소로 실시간 동기화
    const cloudSyncResult = await syncToCloud(dateStr, records[dateStr]);
    res.json({ 
      success: true, 
      message: '로컬 및 클라우드 저장이 완료되었습니다.',
      cloudSync: cloudSyncResult 
    });
  } else {
    res.status(500).json({ success: false, message: '저장 중 오류가 발생했습니다.' });
  }
});

// 저장된 일자 목록 조회 API
app.get('/api/records-list', (req, res) => {
  const records = loadRecords();
  const dates = Object.keys(records).sort().reverse();
  res.json({ success: true, dates });
});

// 클라우드 상태 조회 API
app.get('/api/cloud-status', (req, res) => {
  const config = loadCloudConfig();
  res.json({ success: true, config });
});

// 클라우드 설정 저장 API
app.post('/api/cloud-config', (req, res) => {
  const { webhookUrl, enabled } = req.body;
  const config = loadCloudConfig();
  if (webhookUrl !== undefined) config.webhookUrl = webhookUrl;
  if (enabled !== undefined) config.enabled = !!enabled;
  saveCloudConfig(config);
  res.json({ success: true, message: '클라우드 설정이 저장되었습니다.', config });
});

// 수동 일일 자동작성 트리거 API (테스트 및 즉시 실행용)
app.post('/api/trigger-daily-auto', async (req, res) => {
  const targetDate = req.body.date || new Date().toISOString().split('T')[0];
  try {
    const record = await autoCreateDailyRecord(targetDate);
    res.json({ success: true, message: `${targetDate} 자동 작성이 완료되었습니다.`, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 기간별 일괄 자동작성 트리거 API
app.post('/api/records/batch-generate', async (req, res) => {
  const { startDate, endDate } = req.body;
  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: '시작일과 종료일(YYYY-MM-DD)이 필요합니다.' });
  }

  try {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const results = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const curDateStr = d.toISOString().split('T')[0];
      const rec = await autoCreateDailyRecord(curDateStr);
      results.push({ date: curDateStr, status: rec.status });
    }

    res.json({ success: true, message: `${results.length}건의 일일 기록이 일괄 생성되었습니다.`, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 엑셀(.xlsx) 내보내기 API
app.get('/api/export/excel/:date', async (req, res) => {
  const dateStr = req.params.date;
  const records = loadRecords();
  const data = records[dateStr] || createDefaultRecord(dateStr);

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '대림 공조기록 시스템';
    const sheet = workbook.addWorksheet(dateStr.replace(/-/g, '').slice(4));

    sheet.pageSetup = {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 2
    };

    sheet.columns = [
      { width: 5 }, { width: 5 }, { width: 5 }, { width: 7 },
      { width: 7 }, { width: 5 }, { width: 5 }, { width: 5 },
      { width: 5 }, { width: 5 }, { width: 5 }, { width: 6 },
      { width: 6 }, { width: 6 }, { width: 6 }, { width: 8 }
    ];

    // 제목 및 결재란
    sheet.mergeCells('A2:L4');
    const titleCell = sheet.getCell('A2');
    titleCell.value = '대기배출시설 및 방지시설 운영기록부';
    titleCell.font = { name: '맑은 고딕', size: 16 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('M2:M4');
    sheet.getCell('M2').value = '결\n재';
    sheet.getCell('M2').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    sheet.mergeCells('N2:O2');
    sheet.getCell('N2').value = '담당';
    sheet.getCell('N2').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('P2:P2');
    sheet.getCell('P2').value = '부서장';
    sheet.getCell('P2').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('N3:O4');
    sheet.mergeCells('P3:P4');

    // 일자 및 날씨
    sheet.mergeCells('A5:F5');
    sheet.getCell('A5').value = data.formattedDate || dateStr;
    sheet.getCell('A5').alignment = { horizontal: 'left', vertical: 'middle' };

    sheet.mergeCells('G5:P5');
    sheet.getCell('G5').value = `날씨 : ${data.weatherInfo?.weather || ''}       온도 : ${data.weatherInfo?.temp || ''}`;
    sheet.getCell('G5').alignment = { horizontal: 'right', vertical: 'middle' };

    // 1. 배출구별 가동시간
    sheet.mergeCells('A7:P7');
    sheet.getCell('A7').value = '1. 배출구별 주요 배출시설 및 방지시설 가동(조업)시간';

    sheet.mergeCells('A8:C8');
    sheet.getCell('A8').value = '배 출 구';
    sheet.mergeCells('D8:E8');
    sheet.getCell('D8').value = '배 출 시 설';
    sheet.mergeCells('F8:K8');
    sheet.getCell('F8').value = '가 동 시 간';
    sheet.mergeCells('L8:P8');
    sheet.getCell('L8').value = '비 고';

    ['A8', 'D8', 'F8', 'L8'].forEach(addr => {
      const c = sheet.getCell(addr);
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let curRow = 9;
    const exhaustList = data.exhaustList && data.exhaustList.length > 0 ? data.exhaustList : [
      { id: 1, facility: '혼합시설', opTime: '-', note: '미가동' },
      { id: 2, facility: '혼합시설', opTime: '-', note: '미가동' },
      { id: 3, facility: '혼합시설', opTime: '-', note: '미가동' },
      { id: 4, facility: '혼합시설', opTime: '-', note: '미가동' }
    ];

    exhaustList.forEach(item => {
      sheet.mergeCells(`A${curRow}:C${curRow}`);
      sheet.getCell(`A${curRow}`).value = item.id;
      sheet.getCell(`A${curRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

      sheet.mergeCells(`D${curRow}:E${curRow}`);
      sheet.getCell(`D${curRow}`).value = item.facility;
      sheet.getCell(`D${curRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

      sheet.mergeCells(`F${curRow}:K${curRow}`);
      sheet.getCell(`F${curRow}`).value = item.opTime;
      sheet.getCell(`F${curRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

      sheet.mergeCells(`L${curRow}:P${curRow}`);
      sheet.getCell(`L${curRow}`).value = item.note;
      sheet.getCell(`L${curRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      curRow++;
    });

    sheet.mergeCells(`A${curRow}:P${curRow}`);
    sheet.getCell(`A${curRow}`).value = '* 비고란은 정상 여부를 기재합니다.';
    curRow++;

    // 2. 방지시설 운영사항
    sheet.mergeCells(`A${curRow}:P${curRow}`);
    sheet.getCell(`A${curRow}`).value = '2. 방지시설 운영사항';
    curRow++;

    sheet.mergeCells(`A${curRow}:P${curRow}`);
    sheet.getCell(`A${curRow}`).value = '가. 방지시설 운전사항';
    curRow++;

    const h1Row = curRow;
    const h2Row = curRow + 1;
    sheet.getCell(`A${h1Row}`).value = '방 지';
    sheet.getCell(`A${h2Row}`).value = '시설명';
    sheet.getCell(`B${h1Row}`).value = '설치';
    sheet.getCell(`B${h2Row}`).value = '위치';
    sheet.mergeCells(`C${h1Row}:D${h1Row}`);
    sheet.getCell(`C${h1Row}`).value = '전력사용량';
    sheet.mergeCells(`C${h2Row}:D${h2Row}`);
    sheet.getCell(`C${h2Row}`).value = '(㎾/h)';
    sheet.mergeCells(`E${h1Row}:F${h1Row}`);
    sheet.getCell(`E${h1Row}`).value = '처리용량';
    sheet.mergeCells(`E${h2Row}:F${h2Row}`);
    sheet.getCell(`E${h2Row}`).value = '(㎥/min)';
    sheet.getCell(`G${h1Row}`).value = '처리오염';
    sheet.getCell(`G${h2Row}`).value = '물 질';
    sheet.mergeCells(`H${h1Row}:J${h2Row}`);
    sheet.getCell(`H${h1Row}`).value = '처리농도(ppm 또는 ㎎/S㎥)';
    sheet.mergeCells(`K${h1Row}:M${h1Row}`);
    sheet.getCell(`K${h1Row}`).value = '처리효율';
    sheet.mergeCells(`K${h2Row}:M${h2Row}`);
    sheet.getCell(`K${h2Row}`).value = '(%)';
    sheet.mergeCells(`N${h1Row}:P${h1Row}`);
    sheet.getCell(`N${h1Row}`).value = '사용약품';
    sheet.mergeCells(`N${h2Row}:O${h2Row}`);
    sheet.getCell(`N${h2Row}`).value = '약품명';
    sheet.getCell(`P${h2Row}`).value = '사용량';
    curRow += 2;

    // 방지시설 면제 설정 반영
    if (data.preventionOperation?.exempt) {
      sheet.mergeCells(`A${curRow}:P${curRow}`);
      sheet.getCell(`A${curRow}`).value = '방지시설면제';
      sheet.getCell(`A${curRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      curRow++;
    } else {
      const opRows = (data.preventionOperation && data.preventionOperation.rows && data.preventionOperation.rows.length > 0)
        ? data.preventionOperation.rows
        : [{ facility: '방지시설면제', location: '', power: '', capacity: '', pollutant: '', density: '', efficiency: '', chemName: '', chemAmount: '' }];

      opRows.forEach(op => {
        sheet.getCell(`A${curRow}`).value = op.facility || '';
        sheet.getCell(`B${curRow}`).value = op.location || '';
        sheet.mergeCells(`C${curRow}:D${curRow}`);
        sheet.getCell(`C${curRow}`).value = op.power || '';
        sheet.mergeCells(`E${curRow}:F${curRow}`);
        sheet.getCell(`E${curRow}`).value = op.capacity || '';
        sheet.getCell(`G${curRow}`).value = op.pollutant || '';
        sheet.mergeCells(`H${curRow}:J${curRow}`);
        sheet.getCell(`H${curRow}`).value = op.density || '';
        sheet.mergeCells(`K${curRow}:M${curRow}`);
        sheet.getCell(`K${curRow}`).value = op.efficiency || '';
        sheet.mergeCells(`N${curRow}:O${curRow}`);
        sheet.getCell(`N${curRow}`).value = op.chemName || '';
        sheet.getCell(`P${curRow}`).value = op.chemAmount || '';
        ['A', 'B', 'C', 'E', 'G', 'H', 'K', 'N', 'P'].forEach(col => {
          sheet.getCell(`${col}${curRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
        });
        curRow++;
      });
    }

    sheet.mergeCells(`A${curRow}:P${curRow}`);
    sheet.getCell(`A${curRow}`).value = '210㎜×297㎜(신문용지 54g/㎡)';
    sheet.getCell(`A${curRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
    curRow++;

    // 뒷면
    sheet.mergeCells(`A${curRow}:P${curRow}`);
    sheet.getCell(`A${curRow}`).value = '(뒤 쪽)';
    sheet.getCell(`A${curRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
    curRow++;

    sheet.mergeCells(`A${curRow}:P${curRow}`);
    sheet.getCell(`A${curRow}`).value = '나. 방지시설 보수사항';
    curRow++;

    sheet.mergeCells(`A${curRow}:C${curRow}`);
    sheet.getCell(`A${curRow}`).value = '방지시설명';
    sheet.mergeCells(`D${curRow}:F${curRow}`);
    sheet.getCell(`D${curRow}`).value = '배 출 구 별';
    sheet.mergeCells(`G${curRow}:I${curRow}`);
    sheet.getCell(`G${curRow}`).value = '보 수 기 간';
    sheet.mergeCells(`J${curRow}:M${curRow}`);
    sheet.getCell(`J${curRow}`).value = '보 수 자';
    sheet.mergeCells(`N${curRow}:P${curRow}`);
    sheet.getCell(`N${curRow}`).value = '보 수 명 세';
    curRow++;

    const maintRows = (data.preventionMaintenance && data.preventionMaintenance.rows && data.preventionMaintenance.rows.length > 0)
      ? data.preventionMaintenance.rows
      : [{ facility: '방지시설 면제', exhaustNo: '', period: '', worker: '', details: '' }];

    maintRows.forEach(mr => {
      sheet.mergeCells(`A${curRow}:C${curRow}`);
      sheet.getCell(`A${curRow}`).value = mr.facility || '';
      sheet.mergeCells(`D${curRow}:F${curRow}`);
      sheet.getCell(`D${curRow}`).value = mr.exhaustNo || '';
      sheet.mergeCells(`G${curRow}:I${curRow}`);
      sheet.getCell(`G${curRow}`).value = mr.period || '';
      sheet.mergeCells(`J${curRow}:M${curRow}`);
      sheet.getCell(`J${curRow}`).value = mr.worker || '';
      sheet.mergeCells(`N${curRow}:P${curRow}`);
      sheet.getCell(`N${curRow}`).value = mr.details || '';
      ['A', 'D', 'G', 'J', 'N'].forEach(col => {
        sheet.getCell(`${col}${curRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      });
      curRow++;
    });

    // 3. 자가측정사항
    sheet.mergeCells(`A${curRow}:P${curRow}`);
    sheet.getCell(`A${curRow}`).value = '3. 자가측정사항';
    curRow++;

    sheet.mergeCells(`A${curRow}:P${curRow}`);
    sheet.getCell(`A${curRow}`).value = `측정일: ${data.selfMeasurement?.measureDate || ''}`;
    curRow++;

    const m = data.selfMeasurement || {};
    sheet.mergeCells(`A${curRow}:E${curRow}`);
    sheet.getCell(`A${curRow}`).value = '①기 상';
    sheet.mergeCells(`F${curRow}:G${curRow}`);
    sheet.getCell(`F${curRow}`).value = '②기온';
    sheet.mergeCells(`H${curRow}:J${curRow}`);
    sheet.getCell(`H${curRow}`).value = '③습도';
    sheet.mergeCells(`K${curRow}:M${curRow}`);
    sheet.getCell(`K${curRow}`).value = '④기압';
    sheet.mergeCells(`N${curRow}:O${curRow}`);
    sheet.getCell(`N${curRow}`).value = '⑤풍향';
    sheet.getCell(`P${curRow}`).value = '⑥풍속';
    curRow++;

    sheet.mergeCells(`A${curRow}:E${curRow}`);
    sheet.getCell(`A${curRow}`).value = `날씨: ${m.weather || '맑음'}`;
    sheet.mergeCells(`F${curRow}:G${curRow}`);
    sheet.getCell(`F${curRow}`).value = `${m.temp || ''} ℃`;
    sheet.mergeCells(`H${curRow}:J${curRow}`);
    sheet.getCell(`H${curRow}`).value = `${m.humidity || ''} %`;
    sheet.mergeCells(`K${curRow}:M${curRow}`);
    sheet.getCell(`K${curRow}`).value = `${m.pressure || ''} mb`;
    sheet.mergeCells(`N${curRow}:O${curRow}`);
    sheet.getCell(`N${curRow}`).value = `${m.windDir || ''} 풍`;
    sheet.getCell(`P${curRow}`).value = `${m.windSpeed || ''} m/sec`;
    curRow++;

    curRow += 4;
    sheet.mergeCells(`A${curRow}:P${curRow}`);
    sheet.getCell(`A${curRow}`).value = `환경기술인 직급 : ${data.technician?.position || '부장'}                                                    성명 : ${data.technician?.name || '윤경용'}  (인)`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Air_Record_${dateStr}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('엑셀 생성 오류:', error);
    res.status(500).send('엑셀 생성 중 오류가 발생했습니다.');
  }
});

// 서버 기동
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`대기배출시설 운영기록부 시스템 실행 완료!`);
  console.log(`접속 주소: http://localhost:${PORT}`);
  console.log(`[스케줄러] 매일 18:00 자동 작성 활성화 (배출구 1~4번, 공휴일 휴무/평일 미가동, 방지시설 면제, 클라우드 저장)`);
  console.log(`====================================================`);

  // 서버 기동 시 오늘 18시 이후인데 기록이 없으면 즉시 자동 작성 및 클라우드 동기화 수행
  const now = new Date();
  const currentHour = now.getHours();
  const todayStr = now.toISOString().split('T')[0];
  if (currentHour >= 18) {
    console.log(`[시작 검사] 현재 18시 이후 -> ${todayStr} 일일 운영기록부 자동 작성 상태 확인...`);
    await autoCreateDailyRecord(todayStr);
  }
});
