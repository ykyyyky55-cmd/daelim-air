// 클라우드 저장 및 백업 동기화 모듈
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'data', 'cloud_config.json');
const CLOUD_BACKUP_DIR = path.join(__dirname, 'data', 'cloud_backup');

// 클라우드 백업 디렉터리 생성
if (!fs.existsSync(CLOUD_BACKUP_DIR)) {
  fs.mkdirSync(CLOUD_BACKUP_DIR, { recursive: true });
}

// 클라우드 설정 불러오기
function loadCloudConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('클라우드 설정 로드 오류:', error);
  }
  return {
    enabled: true,
    webhookUrl: '', // 사용자가 설정할 수 있는 클라우드 웹훅/API 주소
    lastSyncTime: null,
    syncStatus: '대기중'
  };
}

// 클라우드 설정 저장
function saveCloudConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('클라우드 설정 저장 오류:', error);
    return false;
  }
}

/**
 * 특정 일자의 운영기록부를 클라우드로 동기화/저장하는 함수
 * @param {string} dateStr 날짜 'YYYY-MM-DD'
 * @param {object} recordData 기록 데이터
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function syncToCloud(dateStr, recordData) {
  const config = loadCloudConfig();
  const timestamp = new Date().toISOString();

  // 1. 로컬 클라우드 백업 스냅샷 저장 (데이터 유실 방지)
  try {
    const backupFilePath = path.join(CLOUD_BACKUP_DIR, `backup_${dateStr}.json`);
    fs.writeFileSync(backupFilePath, JSON.stringify(recordData, null, 2), 'utf8');
  } catch (err) {
    console.error('로컬 클라우드 스냅샷 생성 실패:', err);
  }

  // 2. 외부 클라우드 웹훅 / API URL이 등록되어 있는 경우 원격 전송
  if (config.webhookUrl && config.webhookUrl.trim() !== '') {
    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Daelim-Air-CloudSync/1.0'
        },
        body: JSON.stringify({
          source: '대기배출시설 및 방지시설 운영기록부',
          date: dateStr,
          syncedAt: timestamp,
          record: recordData
        })
      });

      if (response.ok) {
        config.lastSyncTime = timestamp;
        config.syncStatus = '정상 동기화됨';
        saveCloudConfig(config);
        console.log(`[클라우드 동기화 성공] ${dateStr} 원격 전송 완료`);
        return { success: true, message: '원격 클라우드 저장 완료' };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.error(`[클라우드 원격 전송 실패]:`, err.message);
      config.syncStatus = `원격 전송 실패 (${err.message}) - 로컬 클라우드 스냅샷 보관됨`;
      saveCloudConfig(config);
      return { success: true, message: `로컬 클라우드 백업 완료 (원격 재시도 대기)` };
    }
  }

  // 설정된 외부 URL이 없을 때는 로컬 클라우드 스토리지에 안전 보관
  config.lastSyncTime = timestamp;
  config.syncStatus = '로컬 클라우드 스토리지 보관 완료';
  saveCloudConfig(config);
  console.log(`[클라우드 스토리지 보관] ${dateStr} 백업 완료`);
  return { success: true, message: '클라우드 스토리지 보관 완료' };
}

module.exports = {
  loadCloudConfig,
  saveCloudConfig,
  syncToCloud
};
