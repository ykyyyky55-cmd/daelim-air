import {
  recordDateInput, supabaseStatusBadge, btnSupabaseModal, supabaseModal, btnCloseSupabaseModal,
  supabaseUrlInput, supabaseKeyInput, btnTestSupabase, btnSaveSupabaseConfig,
  btnDisconnectSupabase, supabaseTestResult
} from './dom.js';
import { loadRecord } from './editor.js';

// ============================================================
// Supabase 클라우드 연동 모달 및 상태 관리
// ============================================================
export function updateSupabaseStatusBadge() {
  if (!supabaseStatusBadge) return;
  if (window.SupabaseService && window.SupabaseService.isSupabaseConfigured()) {
    supabaseStatusBadge.textContent = '⚡ Supabase 연동됨';
    supabaseStatusBadge.className = 'status-badge supabase-connected';
    supabaseStatusBadge.title = 'Supabase 클라우드 데이터베이스 연동 활성화 (클릭 시 설정)';
  } else {
    supabaseStatusBadge.textContent = '⚡ Supabase 미연동';
    supabaseStatusBadge.className = 'status-badge supabase-disconnected';
    supabaseStatusBadge.title = 'Supabase 미연동 (로컬 모드로 동작 중, 클릭 시 설정)';
  }
}

export function openSupabaseModal() {
  if (!supabaseModal) return;
  const config = window.SupabaseService ? window.SupabaseService.getSupabaseConfig() : { url: '', key: '' };
  supabaseUrlInput.value = config.url || '';
  supabaseKeyInput.value = config.key || '';
  supabaseTestResult.style.display = 'none';
  supabaseTestResult.textContent = '';
  supabaseModal.style.display = 'flex';
}

export function closeSupabaseModal() {
  if (supabaseModal) supabaseModal.style.display = 'none';
}

export function bindSupabaseSettingsEvents() {
  if (btnSupabaseModal) btnSupabaseModal.addEventListener('click', openSupabaseModal);
  if (supabaseStatusBadge) supabaseStatusBadge.addEventListener('click', openSupabaseModal);
  if (btnCloseSupabaseModal) btnCloseSupabaseModal.addEventListener('click', closeSupabaseModal);
  if (supabaseModal) {
    supabaseModal.addEventListener('click', (e) => {
      if (e.target === supabaseModal) closeSupabaseModal();
    });
  }

  if (btnTestSupabase) {
    btnTestSupabase.addEventListener('click', async () => {
      const url = supabaseUrlInput.value.trim();
      const key = supabaseKeyInput.value.trim();
      btnTestSupabase.disabled = true;
      btnTestSupabase.textContent = '⏳ 테스트 중...';
      supabaseTestResult.style.display = 'block';
      supabaseTestResult.style.background = '#f1f5f9';
      supabaseTestResult.style.color = '#334155';
      supabaseTestResult.textContent = 'Supabase 서버 연결을 확인하고 있습니다...';

      const res = await window.SupabaseService.testSupabaseConnection(url, key);
      btnTestSupabase.disabled = false;
      btnTestSupabase.textContent = '🔌 연결 테스트';

      if (res.success) {
        if (res.warning) {
          supabaseTestResult.style.background = '#fef3c7';
          supabaseTestResult.style.color = '#92400e';
          supabaseTestResult.innerHTML = '⚠️ ' + res.message;
        } else {
          supabaseTestResult.style.background = '#dcfce7';
          supabaseTestResult.style.color = '#15803d';
          supabaseTestResult.innerHTML = '✅ ' + res.message;
        }
      } else {
        supabaseTestResult.style.background = '#fee2e2';
        supabaseTestResult.style.color = '#b91c1c';
        supabaseTestResult.innerHTML = '❌ ' + res.message;
      }
    });
  }

  if (btnSaveSupabaseConfig) {
    btnSaveSupabaseConfig.addEventListener('click', async () => {
      const url = supabaseUrlInput.value.trim();
      const key = supabaseKeyInput.value.trim();
      if (!url || !key) {
        if (!confirm('URL 또는 API 키가 비어있습니다. 연동을 해제하시겠습니까?')) return;
      }

      window.SupabaseService.saveSupabaseConfig(url, key);
      updateSupabaseStatusBadge();
      closeSupabaseModal();
      alert('Supabase 연동 설정이 저장되었습니다.');
      // 현재 일자 기록 Supabase에서 다시 로드 시도
      await loadRecord(recordDateInput.value);
    });
  }

  if (btnDisconnectSupabase) {
    btnDisconnectSupabase.addEventListener('click', () => {
      if (confirm('Supabase 연동을 해제하시겠습니까? (로컬/오프라인 모드로 동작합니다)')) {
        window.SupabaseService.saveSupabaseConfig('', '');
        supabaseUrlInput.value = '';
        supabaseKeyInput.value = '';
        updateSupabaseStatusBadge();
        closeSupabaseModal();
        alert('Supabase 연동이 해제되었습니다.');
      }
    });
  }
}
