// ==============================================================================
// 대림 대기배출시설 운영기록부 - Supabase 클라우드 데이터 연동 클라이언트
// ==============================================================================

(function(window) {
  'use strict';

  // 로컬 스토리지 키 상수 정의
  const STORAGE_KEY_URL = 'daelim_air_supabase_url';
  const STORAGE_KEY_KEY = 'daelim_air_supabase_key';

  // Supabase 클라이언트 인스턴스 보관 변수
  let supabaseInstance = null;

  /**
   * Supabase URL 정규화 (끝부분 슬래시 및 API 경로 제거)
   * @param {string} url - 원본 URL
   * @returns {string} 정규화된 URL
   */
  function normalizeUrl(url) {
    if (!url) return '';
    let cleaned = url.trim();
    cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
    cleaned = cleaned.replace(/\/+$/, '');
    return cleaned;
  }

  // 기본 Supabase 프로젝트 URL 및 공개 키
  const DEFAULT_SUPABASE_URL = 'https://mdvgqerpterawrwejgoz.supabase.co';
  const DEFAULT_SUPABASE_KEY = 'sb_publishable_XMVjKwHH9TydkEGgXHUINQ_PBi7SL2R';

  /**
   * 저장된 Supabase 연결 설정 가져오기
   * @returns {{ url: string, key: string }}
   */
  function getSupabaseConfig() {
    const url = localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_SUPABASE_URL;
    const key = localStorage.getItem(STORAGE_KEY_KEY) || DEFAULT_SUPABASE_KEY;
    return {
      url: normalizeUrl(url),
      key: key.trim()
    };
  }

  /**
   * Supabase 클라이언트 초기화
   * @returns {object|null} Supabase 클라이언트 객체
   */
  function initSupabaseClient() {
    const { url, key } = getSupabaseConfig();
    
    // Supabase JS 라이브러리가 로드되었고 URL/Key가 설정된 경우
    if (window.supabase && typeof window.supabase.createClient === 'function' && url && key) {
      try {
        supabaseInstance = window.supabase.createClient(url, key, {
          auth: { persistSession: false },
          realtime: { params: { eventsPerSecond: 10 } }
        });
        return supabaseInstance;
      } catch (err) {
        console.warn('[Supabase] 클라이언트 생성 실패 (로컬 모드로 전환):', err);
        supabaseInstance = null;
        return null;
      }
    }
    supabaseInstance = null;
    return null;
  }

  /**
   * Supabase 인스턴스 반환 (없으면 초기화 시도)
   */
  function getSupabase() {
    if (!supabaseInstance) {
      initSupabaseClient();
    }
    return supabaseInstance;
  }

  /**
   * Supabase 연동 설정 여부 확인
   * @returns {boolean}
   */
  function isSupabaseConfigured() {
    const { url, key } = getSupabaseConfig();
    return Boolean(url && key && url.startsWith('http'));
  }

  /**
   * Supabase 설정 저장 및 클라이언트 재초기화
   * @param {string} url - Supabase Project URL
   * @param {string} key - Supabase Anon Key
   */
  function saveSupabaseConfig(url, key) {
    if (url && url.trim()) {
      localStorage.setItem(STORAGE_KEY_URL, normalizeUrl(url));
    } else {
      localStorage.removeItem(STORAGE_KEY_URL);
    }

    if (key && key.trim()) {
      localStorage.setItem(STORAGE_KEY_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_KEY);
    }

    return initSupabaseClient();
  }

  /**
   * Supabase 연결 테스트
   * @param {string} url - Project URL
   * @param {string} key - Anon API Key
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async function testSupabaseConnection(url, key) {
    const normUrl = normalizeUrl(url);
    const normKey = (key || '').trim();

    if (!normUrl || !normKey) {
      return { success: false, message: 'URL과 API 키를 모두 입력해주세요.' };
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      return { success: false, message: 'Supabase JS 라이브러리가 로드되지 않았습니다.' };
    }

    try {
      const testClient = window.supabase.createClient(normUrl, normKey);
      // 테이블 조회 시도 (1건만 조회하여 권한 및 테이블 유무 확인)
      const { data, error } = await testClient
        .from('air_operation_records')
        .select('record_date')
        .limit(1);

      if (error) {
        // 테이블이 아직 없는 경우
        if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
          return {
            success: true,
            warning: true,
            message: 'Supabase 연결에 성공했습니다! (단, air_operation_records 테이블이 없습니다. 제공된 supabase_schema.sql을 SQL Editor에서 실행해 주세요.)'
          };
        }
        return { success: false, message: '연결 실패: ' + error.message };
      }

      return { success: true, message: 'Supabase 데이터베이스에 정상적으로 연결되었습니다!' };
    } catch (err) {
      return { success: false, message: '연결 테스트 중 오류 발생: ' + (err.message || err) };
    }
  }

  /**
   * 특정 일자의 운영기록 조회
   * @param {string} dateStr - YYYY-MM-DD
   * @returns {Promise<{ success: boolean, data: object|null, message?: string }>}
   */
  async function fetchSupabaseRecord(dateStr) {
    const sb = getSupabase();
    if (!sb) {
      return { success: false, message: 'Supabase 미연동' };
    }

    try {
      const { data, error } = await sb
        .from('air_operation_records')
        .select('*')
        .eq('record_date', dateStr)
        .maybeSingle();

      if (error) {
        console.warn(`[Supabase] ${dateStr} 조회 오류:`, error);
        return { success: false, message: error.message };
      }

      if (data && data.record_data) {
        return {
          success: true,
          data: {
            date: data.record_date,
            status: data.status || 'NORMAL',
            ...data.record_data
          }
        };
      }

      return { success: false, notFound: true, message: '해당 일자 기록 없음' };
    } catch (err) {
      console.error(`[Supabase] ${dateStr} 로드 예외:`, err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 특정 일자의 운영기록 저장 또는 업데이트 (Upsert)
   * @param {string} dateStr - YYYY-MM-DD
   * @param {object} recordData - 일일 운영기록 데이터
   * @param {string} status - NORMAL / IDLE / HOLIDAY
   * @returns {Promise<{ success: boolean, message?: string }>}
   */
  async function saveSupabaseRecord(dateStr, recordData, status = 'NORMAL') {
    const sb = getSupabase();
    if (!sb) {
      return { success: false, message: 'Supabase 미연동' };
    }

    try {
      const payload = {
        record_date: dateStr,
        record_data: recordData,
        status: status,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await sb
        .from('air_operation_records')
        .upsert(payload, { onConflict: 'record_date' })
        .select();

      if (error) {
        console.error(`[Supabase] ${dateStr} 저장 실패:`, error);
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Supabase 저장 완료' };
    } catch (err) {
      console.error(`[Supabase] ${dateStr} 저장 예외:`, err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 저장된 전체 기록 일자 목록 조회
   * @returns {Promise<string[]>}
   */
  async function fetchSupabaseRecordDates() {
    const sb = getSupabase();
    if (!sb) return [];

    try {
      const { data, error } = await sb
        .from('air_operation_records')
        .select('record_date')
        .order('record_date', { ascending: false });

      if (error || !data) return [];
      return data.map(item => item.record_date);
    } catch (err) {
      console.warn('[Supabase] 날짜 목록 조회 실패:', err);
      return [];
    }
  }

  /**
   * 저장된 전체 운영기록 목록 조회 (데이터 포함)
   * @returns {Promise<Array<{ record_date: string, record_data: object, status: string }>>}
   */
  async function fetchSupabaseRecords() {
    const sb = getSupabase();
    if (!sb) return [];

    try {
      const { data, error } = await sb
        .from('air_operation_records')
        .select('*')
        .order('record_date', { ascending: true });

      if (error || !data) {
        console.warn('[Supabase] 전체 기록 조회 오류:', error);
        return [];
      }
      return data;
    } catch (err) {
      console.warn('[Supabase] 전체 기록 조회 예외:', err);
      return [];
    }
  }

  // 전역 서비스 객체 등록
  window.SupabaseService = {
    getSupabaseConfig,
    saveSupabaseConfig,
    initSupabaseClient,
    getSupabase,
    isSupabaseConfigured,
    testSupabaseConnection,
    fetchSupabaseRecord,
    fetchSupabaseRecordByDate: fetchSupabaseRecord, // 별칭 등록
    saveSupabaseRecord,
    fetchSupabaseRecordDates,
    fetchSupabaseRecords
  };

  // 초기화 실행
  initSupabaseClient();

})(window);
