// 대기배출시설 및 방지시설 운영기록부 클라이언트 애플리케이션 스크립트

document.addEventListener('DOMContentLoaded', () => {
  // 주요 DOM 요소 참조
  const recordDateInput = document.getElementById('recordDate');
  const btnPrevDate = document.getElementById('btnPrevDate');
  const btnNextDate = document.getElementById('btnNextDate');
  const btnToday = document.getElementById('btnToday');
  const btnFetchWeather = document.getElementById('btnFetchWeather');

  // 작업시간 및 가동/미가동 상태 설정 요소들
  const workHoursSelect = document.getElementById('workHoursSelect');
  let currentWorkHours = '09:00 ~ 18:00';
  const btnApplyWorkHours = document.getElementById('btnApplyWorkHours');
  const btnSetAllRunning = document.getElementById('btnSetAllRunning');
  const btnSetAllIdle = document.getElementById('btnSetAllIdle');
  const btnSetAllHoliday = document.getElementById('btnSetAllHoliday');
  const btnTableSetRunning = document.getElementById('btnTableSetRunning');
  const btnTableSetIdle = document.getElementById('btnTableSetIdle');

  const btnSave = document.getElementById('btnSave');
  const btnPrint = document.getElementById('btnPrint');
  const btnExportExcel = document.getElementById('btnExportExcel');
  const saveStatusBadge = document.getElementById('saveStatus');
  const cloudStatusBadge = document.getElementById('cloudStatus');
  const supabaseStatusBadge = document.getElementById('supabaseStatus');

  // Supabase 모달 관련 DOM 요소
  const btnSupabaseModal = document.getElementById('btnSupabaseModal');
  const supabaseModal = document.getElementById('supabaseModal');
  const btnCloseSupabaseModal = document.getElementById('btnCloseSupabaseModal');
  const supabaseUrlInput = document.getElementById('supabaseUrlInput');
  const supabaseKeyInput = document.getElementById('supabaseKeyInput');
  const btnTestSupabase = document.getElementById('btnTestSupabase');
  const btnSaveSupabaseConfig = document.getElementById('btnSaveSupabaseConfig');
  const btnDisconnectSupabase = document.getElementById('btnDisconnectSupabase');
  const supabaseTestResult = document.getElementById('supabaseTestResult');

  const displayFormattedDate = document.getElementById('displayFormattedDate');
  const weatherSelect = document.getElementById('weatherSelect');
  const tempRangeInput = document.getElementById('tempRangeInput');

  // 배출구 테이블 및 추가 버튼
  const exhaustTableBody = document.getElementById('exhaustTableBody');
  const btnAddExhaustRow = document.getElementById('btnAddExhaustRow');

  // 방지시설 운전사항 테이블 및 컨트롤
  const preventionOpTableBody = document.getElementById('preventionOpTableBody');
  const btnAddPreventionOpRow = document.getElementById('btnAddPreventionOpRow');
  const btnTogglePreventionExempt = document.getElementById('btnTogglePreventionExempt');

  // 방지시설 보수사항 테이블 및 컨트롤
  const maintenanceTableBody = document.getElementById('maintenanceTableBody');
  const btnAddMaintenanceRow = document.getElementById('btnAddMaintenanceRow');

  // 자가측정사항 테이블 및 컨트롤
  const measureDateInput = document.getElementById('measureDateInput');
  const measurementTableBody = document.getElementById('measurementTableBody');
  const btnAddMeasureRow = document.getElementById('btnAddMeasureRow');

  // 자가측정 기상 요소들
  const selfTemp = document.getElementById('selfTemp');
  const selfHumidity = document.getElementById('selfHumidity');
  const selfPressure = document.getElementById('selfPressure');
  const selfWindDir = document.getElementById('selfWindDir');
  const selfWindSpeed = document.getElementById('selfWindSpeed');

  const fuelUsageInput = document.getElementById('fuelUsageInput');
  const rawMaterialUsageInput = document.getElementById('rawMaterialUsageInput');
  const opinionInput = document.getElementById('opinionInput');
  const etcInput = document.getElementById('etcInput');
  const technicianPosition = document.getElementById('technicianPosition');
  const technicianName = document.getElementById('technicianName');

  // 결재 도장 요소들
  const signInCharge = document.getElementById('signInCharge');
  const signManager = document.getElementById('signManager');
  const signTechnician = document.getElementById('signTechnician');

  // 전자결재 모달 요소들
  const signModal = document.getElementById('signModal');
  const modalTitle = document.getElementById('modalTitle');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelSign = document.getElementById('btnCancelSign');
  const btnClearCanvas = document.getElementById('btnClearCanvas');
  const btnAutoStamp = document.getElementById('btnAutoStamp');
  const btnApplySign = document.getElementById('btnApplySign');
  const btnRemoveSign = document.getElementById('btnRemoveSign');
  const signCanvas = document.getElementById('signCanvas');
  const ctx = signCanvas ? signCanvas.getContext('2d') : null;

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

  // 전자결재 서명 상태 (Base64 이미지 문자열)
  let currentManagerSign = '';
  let currentTechnicianSign = '';
  let currentSignTarget = ''; // 'manager' | 'technician'
  let isDrawing = false;

  // 1. 배출구 기본 목록 (1~4번 혼합시설, 평일 미가동 기본 적용)
  let currentExhaustList = [
    { id: '1', facility: '혼합시설', opTime: '-', note: '미가동' },
    { id: '2', facility: '혼합시설', opTime: '-', note: '미가동' },
    { id: '3', facility: '혼합시설', opTime: '-', note: '미가동' },
    { id: '4', facility: '혼합시설', opTime: '-', note: '미가동' }
  ];

  // 2. 방지시설 운전사항 데이터 목록 (기본 '면제'로 설정)
  let isPreventionExempt = true;
  let currentPreventionOpRows = [
    {
      facility: '여과집진시설',
      location: '옥외',
      power: '15',
      capacity: '120',
      pollutant: '입자상물질(먼지)',
      density: '20',
      efficiency: '95',
      chemName: '-',
      chemAmount: '-'
    }
  ];

  // 3. 방지시설 보수사항 데이터 목록
  let currentMaintenanceRows = [
    {
      facility: '-',
      exhaustNo: '-',
      period: '-',
      worker: '-',
      details: '특이사항 없음'
    }
  ];

  // 4. 자가측정사항 결과 데이터 목록 (기본 빈칸 설정)
  let currentMeasurementRows = [
    {
      exhaustNo: '',
      facilityName: '',
      item: '',
      density: '',
      dailyFlow: '',
      dailyEmission: '',
      device: '',
      method: ''
    }
  ];

  // 저장 상태 업데이트 헬퍼
  function markUnsaved() {
    saveStatusBadge.textContent = '수정됨 (저장 필요)';
    saveStatusBadge.className = 'status-badge status-unsaved';
    if (cloudStatusBadge) {
      cloudStatusBadge.textContent = '☁️ 수정중 (저장 시 클라우드 동기화)';
      cloudStatusBadge.style.background = '#64748b';
    }
  }

  function markSaved(cloudSynced = true) {
    saveStatusBadge.textContent = '저장됨';
    saveStatusBadge.className = 'status-badge status-saved';
    if (cloudStatusBadge) {
      cloudStatusBadge.textContent = cloudSynced ? '☁️ 클라우드 영구보관 완료' : '☁️ 클라우드 동기화 대기';
      cloudStatusBadge.style.background = cloudSynced ? '#0284c7' : '#eab308';
    }
  }

  // 날짜 문자열(YYYY-MM-DD)을 'YYYY년 M월 D일 O요일' 포맷으로 변환
  function getFormattedDateString(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return `${y}년 ${m}월 ${day}일 ${days[d.getDay()]}`;
  }

  // ============================================================
  // 배출구 테이블 렌더링 (1~4번 및 추가 배출구)
  // ============================================================
  function renderExhaustTable() {
    exhaustTableBody.innerHTML = '';
    const activeHours = currentWorkHours || '09:00 ~ 18:00';
    const timeOptions = [activeHours, '09:00 ~ 18:00', '08:30 ~ 17:30', '08:00 ~ 17:00', '09:00 ~ 12:00', '13:00 ~ 18:00', '-'];
    const uniqueTimeOptions = [...new Set(timeOptions)];

    currentExhaustList.forEach((item, index) => {
      const tr = document.createElement('tr');

      let customTimeOpt = '';
      if (item.opTime && !uniqueTimeOptions.includes(item.opTime)) {
        customTimeOpt = `<option value="${item.opTime}" selected>${item.opTime}</option>`;
      }

      const opTimeSelectHtml = uniqueTimeOptions.map(opt => 
        `<option value="${opt}" ${item.opTime === opt ? 'selected' : ''}>${opt}</option>`
      ).join('') + customTimeOpt + `<option value="__custom__">직접 입력...</option>`;

      tr.innerHTML = `
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="id" value="${item.id}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="facility" value="${item.facility}"></td>
        <td>
          <select class="editable-cell select-in-cell" data-idx="${index}" data-field="opTime">
            ${opTimeSelectHtml}
          </select>
        </td>
        <td>
          <select class="editable-cell select-in-cell" data-idx="${index}" data-field="note">
            <option value="정상" ${item.note === '정상' ? 'selected' : ''}>정상</option>
            <option value="미가동" ${item.note === '미가동' ? 'selected' : ''}>미가동</option>
            <option value="휴무" ${item.note === '휴무' ? 'selected' : ''}>휴무</option>
            ${!['정상', '미가동', '휴무'].includes(item.note) && item.note ? `<option value="${item.note}" selected>${item.note}</option>` : ''}
            <option value="__custom__">직접 입력...</option>
          </select>
        </td>
        <td class="no-print">
          <button type="button" class="btn-delete btn-del-exhaust" data-idx="${index}" title="삭제">❌</button>
        </td>
      `;
      exhaustTableBody.appendChild(tr);
    });

    // 1. 배출구 id, facility 입력 변경 리스너
    exhaustTableBody.querySelectorAll('input').forEach(elem => {
      elem.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const field = e.target.dataset.field;
        currentExhaustList[idx][field] = e.target.value;
        markUnsaved();
      });
    });

    // 2. 가동(작업)시간 드롭다운 변경 리스너
    exhaustTableBody.querySelectorAll('select[data-field="opTime"]').forEach(selectElem => {
      selectElem.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        let val = e.target.value;

        if (val === '__custom__') {
          const customVal = prompt('가동(작업)시간을 직접 입력하세요 (예: 08:30 ~ 17:30):', currentExhaustList[idx].opTime === '-' ? currentWorkHours : currentExhaustList[idx].opTime);
          if (customVal !== null && customVal.trim() !== '') {
            val = customVal.trim();
          } else {
            val = currentExhaustList[idx].opTime || currentWorkHours;
          }
        }

        currentExhaustList[idx].opTime = val;

        // 가동시간 설정에 따른 비고 자동 연동
        if (val === '-') {
          currentExhaustList[idx].note = '미가동';
        } else if (val !== '' && (currentExhaustList[idx].note === '미가동' || currentExhaustList[idx].note === '휴무')) {
          currentExhaustList[idx].note = '정상';
        }

        renderExhaustTable();
        markUnsaved();
      });
    });

    // 3. 비고(note) 드롭다운 변경 리스너
    exhaustTableBody.querySelectorAll('select[data-field="note"]').forEach(selectElem => {
      selectElem.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        let val = e.target.value;

        if (val === '__custom__') {
          const customVal = prompt('비고 내용을 직접 입력하세요 (예: 부분가동, 점검 등):', currentExhaustList[idx].note || '');
          if (customVal !== null && customVal.trim() !== '') {
            val = customVal.trim();
          } else {
            val = currentExhaustList[idx].note || '정상';
          }
        }

        // 비고 상태값 갱신
        currentExhaustList[idx].note = val;

        // 비고에 따른 가동시간 자동 연동
        if (val === '미가동' || val === '휴무') {
          currentExhaustList[idx].opTime = '-';
        } else if (val === '정상') {
          if (currentExhaustList[idx].opTime === '-' || !currentExhaustList[idx].opTime) {
            currentExhaustList[idx].opTime = currentWorkHours;
          }
        }

        renderExhaustTable();
        markUnsaved();
      });
    });

    // 삭제 버튼 리스너
    exhaustTableBody.querySelectorAll('.btn-del-exhaust').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        currentExhaustList.splice(idx, 1);
        renderExhaustTable();
        markUnsaved();
      });
    });
  }

  // 배출구 행 추가 버튼
  btnAddExhaustRow.addEventListener('click', () => {
    const nextNum = currentExhaustList.length + 1;
    currentExhaustList.push({
      id: `${nextNum}`,
      facility: '혼합시설',
      opTime: '09:00 ~ 18:00',
      note: '정상'
    });
    renderExhaustTable();
    markUnsaved();
  });

  // ============================================================
  // 방지시설 운영사항(가. 운전사항) 렌더링
  // ============================================================
  function renderPreventionOpTable() {
    preventionOpTableBody.innerHTML = '';

    if (isPreventionExempt) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="9" style="height: 110px; font-size: 1.15rem; font-weight: normal; color: #475569; letter-spacing: 3px;">
          방지시설 면제
        </td>
        <td class="no-print">-</td>
      `;
      preventionOpTableBody.appendChild(tr);
      return;
    }

    currentPreventionOpRows.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="facility" value="${row.facility || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="location" value="${row.location || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="power" value="${row.power || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="capacity" value="${row.capacity || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="pollutant" value="${row.pollutant || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="density" value="${row.density || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="efficiency" value="${row.efficiency || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="chemName" value="${row.chemName || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="chemAmount" value="${row.chemAmount || ''}"></td>
        <td class="no-print">
          <button type="button" class="btn-delete btn-del-prev-op" data-idx="${index}" title="삭제">❌</button>
        </td>
      `;
      preventionOpTableBody.appendChild(tr);
    });

    // 기본 최소 2행으로 절반 축소
    const minRows = 2;
    for (let i = currentPreventionOpRows.length; i < minRows; i++) {
      const emptyTr = document.createElement('tr');
      emptyTr.innerHTML = `
        <td><input type="text" class="editable-cell" value="" placeholder="-"></td>
        <td><input type="text" class="editable-cell" value="" placeholder="-"></td>
        <td><input type="text" class="editable-cell" value="" placeholder="-"></td>
        <td><input type="text" class="editable-cell" value="" placeholder="-"></td>
        <td><input type="text" class="editable-cell" value="" placeholder="-"></td>
        <td><input type="text" class="editable-cell" value="" placeholder="-"></td>
        <td><input type="text" class="editable-cell" value="" placeholder="-"></td>
        <td><input type="text" class="editable-cell" value="" placeholder="-"></td>
        <td><input type="text" class="editable-cell" value="" placeholder="-"></td>
        <td class="no-print">-</td>
      `;
      preventionOpTableBody.appendChild(emptyTr);
    }

    // 입력 변경 리스너
    preventionOpTableBody.querySelectorAll('input').forEach(elem => {
      elem.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const field = e.target.dataset.field;
        currentPreventionOpRows[idx][field] = e.target.value;
        markUnsaved();
      });
    });

    // 삭제 버튼 리스너
    preventionOpTableBody.querySelectorAll('.btn-del-prev-op').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        currentPreventionOpRows.splice(idx, 1);
        if (currentPreventionOpRows.length === 0) {
          currentPreventionOpRows.push({
            facility: '', location: '', power: '', capacity: '', pollutant: '', density: '', efficiency: '', chemName: '', chemAmount: ''
          });
        }
        renderPreventionOpTable();
        markUnsaved();
      });
    });
  }

  // 방지시설 운전사항 행 추가 버튼
  btnAddPreventionOpRow.addEventListener('click', () => {
    isPreventionExempt = false;
    currentPreventionOpRows.push({
      facility: '여과집진시설',
      location: '옥외',
      power: '',
      capacity: '',
      pollutant: '입자상물질(먼지)',
      density: '',
      efficiency: '',
      chemName: '-',
      chemAmount: '-'
    });
    renderPreventionOpTable();
    markUnsaved();
  });

  // 방지시설 면제/상세 토글 버튼
  btnTogglePreventionExempt.addEventListener('click', () => {
    isPreventionExempt = !isPreventionExempt;
    renderPreventionOpTable();
    markUnsaved();
  });

  // ============================================================
  // 나. 방지시설 보수사항 렌더링
  // ============================================================
  function renderMaintenanceTable() {
    maintenanceTableBody.innerHTML = '';
    currentMaintenanceRows.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="facility" value="${row.facility || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="exhaustNo" value="${row.exhaustNo || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="period" value="${row.period || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="worker" value="${row.worker || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="details" value="${row.details || ''}"></td>
        <td class="no-print">
          <button type="button" class="btn-delete btn-del-maint" data-idx="${index}" title="삭제">❌</button>
        </td>
      `;
      maintenanceTableBody.appendChild(tr);
    });

    maintenanceTableBody.querySelectorAll('input').forEach(elem => {
      elem.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const field = e.target.dataset.field;
        currentMaintenanceRows[idx][field] = e.target.value;
        markUnsaved();
      });
    });

    maintenanceTableBody.querySelectorAll('.btn-del-maint').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        currentMaintenanceRows.splice(idx, 1);
        if (currentMaintenanceRows.length === 0) {
          currentMaintenanceRows.push({ facility: '-', exhaustNo: '-', period: '-', worker: '-', details: '-' });
        }
        renderMaintenanceTable();
        markUnsaved();
      });
    });
  }

  // 보수사항 행 추가 버튼
  btnAddMaintenanceRow.addEventListener('click', () => {
    currentMaintenanceRows.push({
      facility: '여과집진시설',
      exhaustNo: '1',
      period: recordDateInput.value,
      worker: '자체',
      details: '필터 점검 및 청소'
    });
    renderMaintenanceTable();
    markUnsaved();
  });

  // ============================================================
  // 3. 자가측정 결과 테이블 렌더링
  // ============================================================
  function renderMeasurementTable() {
    measurementTableBody.innerHTML = '';
    currentMeasurementRows.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="exhaustNo" value="${row.exhaustNo || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="facilityName" value="${row.facilityName || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="item" value="${row.item || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="density" value="${row.density || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="dailyFlow" value="${row.dailyFlow || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="dailyEmission" value="${row.dailyEmission || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="device" value="${row.device || ''}"></td>
        <td><input type="text" class="editable-cell" data-idx="${index}" data-field="method" value="${row.method || ''}"></td>
        <td class="no-print">
          <button type="button" class="btn-delete btn-del-meas" data-idx="${index}" title="삭제">❌</button>
        </td>
      `;
      measurementTableBody.appendChild(tr);
    });

    measurementTableBody.querySelectorAll('input').forEach(elem => {
      elem.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const field = e.target.dataset.field;
        currentMeasurementRows[idx][field] = e.target.value;
        markUnsaved();
      });
    });

    measurementTableBody.querySelectorAll('.btn-del-meas').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        currentMeasurementRows.splice(idx, 1);
        if (currentMeasurementRows.length === 0) {
          currentMeasurementRows.push({ exhaustNo: '', facilityName: '', item: '', density: '', dailyFlow: '', dailyEmission: '', device: '', method: '' });
        }
        renderMeasurementTable();
        markUnsaved();
      });
    });
  }

  // 자가측정 행 추가 버튼 (완전한 빈칸 행으로 추가)
  btnAddMeasureRow.addEventListener('click', () => {
    currentMeasurementRows.push({
      exhaustNo: '',
      facilityName: '',
      item: '',
      density: '',
      dailyFlow: '',
      dailyEmission: '',
      device: '',
      method: ''
    });
    renderMeasurementTable();
    markUnsaved();
  });

  // ============================================================
  // 김포시 월곶면 날씨 연동 함수 (로컬 서버 및 웹 직접 연동 지원)
  // ============================================================
  async function fetchWolgotWeather(targetDate) {
    btnFetchWeather.disabled = true;
    btnFetchWeather.innerHTML = '⏳ 날씨 조회 중...';

    try {
      let weather = '';
      let tempStr = '';

      // 1. 로컬 백엔드 API 우선 호출 시도
      try {
        const res = await fetch(`/api/weather?date=${targetDate}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            weather = data.weather || '맑음';
            tempStr = data.tempStr || `${data.minTemp} ~ ${data.maxTemp}℃`;
          }
        }
      } catch (e) {
        // 로컬 서버가 없는 웹 환경(GitHub Pages 등)에서는 브라우저 직접 조회로 전환
      }

      // 2. 백엔드 응답이 없는 경우 Open-Meteo API 브라우저 직접 호출
      if (!weather) {
        const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=37.6975&longitude=126.5413&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul&start_date=${targetDate}&end_date=${targetDate}`;
        const mRes = await fetch(openMeteoUrl);
        if (mRes.ok) {
          const mData = await mRes.json();
          if (mData.daily && mData.daily.weathercode && mData.daily.weathercode.length > 0) {
            const wCode = mData.daily.weathercode[0];
            const maxT = Math.round(mData.daily.temperature_2m_max[0]);
            const minT = Math.round(mData.daily.temperature_2m_min[0]);
            
            // WMO 날씨 코드 한글 변환
            if (wCode === 0) weather = '맑음';
            else if ([1, 2].includes(wCode)) weather = '구름조금';
            else if ([3, 45, 48].includes(wCode)) weather = '흐림';
            else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(wCode)) weather = '비';
            else if ([71, 73, 75, 85, 86].includes(wCode)) weather = '눈';
            else weather = '맑음';

            tempStr = `${minT} ~ ${maxT}℃`;
          }
        }
      }

      if (weather) {
        weatherSelect.value = weather;
        tempRangeInput.value = tempStr;
        markUnsaved();
      } else {
        alert('날씨 연동 안내: 날씨 정보를 불러오지 못했습니다.');
      }
    } catch (err) {
      console.error('날씨 조회 오류:', err);
      alert('날씨 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      btnFetchWeather.disabled = false;
      btnFetchWeather.innerHTML = '<span style="font-size:1.1rem;">⛅</span> 월곶면 날씨 연동';
    }
  }

  // ============================================================
  // ============================================================
  // 운영기록 데이터를 화면 UI에 반영하는 함수
  // ============================================================
  async function applyRecordToUI(record, isNew, targetDate) {
    // 앞면 날씨 및 온도
    if (record.weatherInfo) {
      weatherSelect.value = record.weatherInfo.weather || '맑음';
      tempRangeInput.value = record.weatherInfo.temp || '15 ~ 25℃';
    }

    // 배출구 목록 (없거나 비어있으면 기본 1~4번 혼합시설)
    if (record.exhaustList && record.exhaustList.length > 0) {
      currentExhaustList = record.exhaustList;
    } else {
      const defaultNote = record.isHoliday ? '휴무' : '미가동';
      currentExhaustList = [
        { id: '1', facility: '혼합시설', opTime: '-', note: defaultNote },
        { id: '2', facility: '혼합시설', opTime: '-', note: defaultNote },
        { id: '3', facility: '혼합시설', opTime: '-', note: defaultNote },
        { id: '4', facility: '혼합시설', opTime: '-', note: defaultNote }
      ];
    }
    renderExhaustTable();

    // 방지시설 운전사항 (기본 면제 설정)
    if (record.preventionOperation) {
      isPreventionExempt = record.preventionOperation.exempt !== undefined ? !!record.preventionOperation.exempt : true;
      if (record.preventionOperation.rows && record.preventionOperation.rows.length > 0) {
        currentPreventionOpRows = record.preventionOperation.rows;
      }
    } else {
      isPreventionExempt = true;
    }
    renderPreventionOpTable();

    // 방지시설 보수사항
    if (record.preventionMaintenance && record.preventionMaintenance.rows) {
      currentMaintenanceRows = record.preventionMaintenance.rows;
    }
    renderMaintenanceTable();

    // 자가측정사항 (사용자가 직접 기입 및 수정할 수 있도록 기본 빈칸 처리)
    if (record.selfMeasurement) {
      measureDateInput.value = record.selfMeasurement.measureDate || '';
      selfTemp.value = record.selfMeasurement.temp || '';
      selfHumidity.value = record.selfMeasurement.humidity || '';
      selfPressure.value = record.selfMeasurement.pressure || '';
      selfWindDir.value = record.selfMeasurement.windDir || '';
      selfWindSpeed.value = record.selfMeasurement.windSpeed || '';

      const radios = document.querySelectorAll('input[name="selfWeather"]');
      radios.forEach(r => {
        r.checked = !!(record.selfMeasurement.weather && r.value === record.selfMeasurement.weather);
      });

      if (record.selfMeasurement.rows && record.selfMeasurement.rows.length > 0) {
        currentMeasurementRows = record.selfMeasurement.rows;
      } else {
        currentMeasurementRows = [
          { exhaustNo: '', facilityName: '', item: '', density: '', dailyFlow: '', dailyEmission: '', device: '', method: '' }
        ];
      }
    } else {
      measureDateInput.value = '';
      selfTemp.value = '';
      selfHumidity.value = '';
      selfPressure.value = '';
      selfWindDir.value = '';
      selfWindSpeed.value = '';
      document.querySelectorAll('input[name="selfWeather"]').forEach(r => r.checked = false);
      currentMeasurementRows = [
        { exhaustNo: '', facilityName: '', item: '', density: '', dailyFlow: '', dailyEmission: '', device: '', method: '' }
      ];
    }
    renderMeasurementTable();

    // 작업시간 설정 복원
    if (record.workHours) {
      currentWorkHours = record.workHours;
      if (workHoursSelect) {
        const exists = Array.from(workHoursSelect.options).some(opt => opt.value === record.workHours);
        if (!exists) {
          const opt = document.createElement('option');
          opt.value = record.workHours;
          opt.textContent = record.workHours;
          workHoursSelect.insertBefore(opt, workHoursSelect.lastElementChild);
        }
        workHoursSelect.value = record.workHours;
      }
    }

    fuelUsageInput.value = record.fuelUsage || '-';
    rawMaterialUsageInput.value = record.rawMaterialUsage || '-';
    opinionInput.value = record.engineerOpinion || '특이사항 없음. 정상 가동.';
    etcInput.value = record.etc || '-';

    if (record.technician) {
      technicianPosition.value = record.technician.position || '부장';
      technicianName.value = record.technician.name || '윤 경 용';
    }

    // 전자결재 서명 데이터 복원
    currentManagerSign = record.managerSign || '';
    currentTechnicianSign = record.technicianSign || '';
    renderSignatures();

    // 신규 레코드면 날씨 자동 조회
    if (isNew) {
      await fetchWolgotWeather(targetDate);
      markUnsaved();
    } else {
      markSaved();
    }
  }

  // ============================================================
  // 특정 일자 기록 로드 함수 (Supabase -> 서버 -> LocalStorage 다단계 조회)
  // ============================================================
  async function loadRecord(targetDate) {
    displayFormattedDate.textContent = getFormattedDateString(targetDate);
    measureDateInput.value = targetDate;

    // 1. Supabase 클라우드 데이터베이스 우선 조회
    if (window.SupabaseService && window.SupabaseService.isSupabaseConfigured()) {
      try {
        const sbRes = await window.SupabaseService.fetchSupabaseRecord(targetDate);
        if (sbRes.success && sbRes.data) {
          // 브라우저 로컬 스토리지 캐시 동기화
          try {
            localStorage.setItem('daelim_air_record_' + targetDate, JSON.stringify(sbRes.data));
          } catch (e) {}
          await applyRecordToUI(sbRes.data, false, targetDate);
          return;
        }
      } catch (sbErr) {
        console.warn('[Supabase] 조회 실패, 로컬 데이터 시도:', sbErr);
      }
    }

    // 2. 로컬 백엔드 서버 조회
    try {
      const res = await fetch(`/api/records/${targetDate}`);
      if (res.ok) {
        const resJson = await res.json();
        if (resJson.success && resJson.data) {
          // 브라우저 로컬 스토리지 캐시 동기화
          try {
            localStorage.setItem('daelim_air_record_' + targetDate, JSON.stringify(resJson.data));
          } catch (e) {}
          await applyRecordToUI(resJson.data, !!resJson.isNew, targetDate);
          return;
        }
      }
    } catch (serverErr) {
      // 순수 웹 환경에서는 서버가 없으므로 LocalStorage 확인
    }

    // 3. 브라우저 LocalStorage 로컬 캐시 조회
    try {
      const localCached = localStorage.getItem('daelim_air_record_' + targetDate);
      if (localCached) {
        const parsed = JSON.parse(localCached);
        await applyRecordToUI(parsed, false, targetDate);
        return;
      }
    } catch (e) {
      console.warn('LocalStorage 로드 실패:', e);
    }

    // 4. 저장된 기록이 전혀 없는 신규 날짜: 기본 양식 생성
    const d = new Date(targetDate + 'T00:00:00');
    const dayOfWeek = d.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6); // 토요일(6), 일요일(0)

    const defaultRecord = {
      date: targetDate,
      isHoliday: isWeekend,
      status: isWeekend ? 'HOLIDAY' : 'IDLE',
      workHours: '09:00 ~ 18:00',
      exhaustList: [
        { id: '1', facility: '혼합시설', opTime: '-', note: isWeekend ? '휴무' : '미가동' },
        { id: '2', facility: '혼합시설', opTime: '-', note: isWeekend ? '휴무' : '미가동' },
        { id: '3', facility: '혼합시설', opTime: '-', note: isWeekend ? '휴무' : '미가동' },
        { id: '4', facility: '혼합시설', opTime: '-', note: isWeekend ? '휴무' : '미가동' }
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
      engineerOpinion: '특이사항 없음. 정상 가동.',
      etc: '-',
      technician: { position: '부장', name: '윤 경 용' },
      // 일자에 맞춘 부서장 및 환경기술인 공식 전자결재 도장 자동 날인
      managerSign: generateStampSvg('윤경용', targetDate),
      technicianSign: generateStampSvg('윤경용', targetDate)
    };

    await applyRecordToUI(defaultRecord, true, targetDate);
  }

  // ============================================================
  // 현재 화면의 데이터 수집
  // ============================================================
  function collectFormData() {
    const targetDate = recordDateInput.value;
    const selectedRadio = document.querySelector('input[name="selfWeather"]:checked');

    return {
      date: targetDate,
      formattedDate: getFormattedDateString(targetDate),
      workHours: currentWorkHours || '09:00 ~ 18:00',
      weatherInfo: {
        weather: weatherSelect.value,
        temp: tempRangeInput.value
      },
      exhaustList: currentExhaustList,
      preventionOperation: {
        exempt: isPreventionExempt,
        text: isPreventionExempt ? '방지시설 면제' : '',
        rows: currentPreventionOpRows
      },
      preventionMaintenance: {
        exempt: false,
        rows: currentMaintenanceRows
      },
      selfMeasurement: {
        measureDate: measureDateInput.value,
        weather: selectedRadio ? selectedRadio.value : '맑음',
        temp: selfTemp.value,
        humidity: selfHumidity.value,
        pressure: selfPressure.value,
        windDir: selfWindDir.value,
        windSpeed: selfWindSpeed.value,
        rows: currentMeasurementRows
      },
      fuelUsage: fuelUsageInput.value,
      rawMaterialUsage: rawMaterialUsageInput.value,
      engineerOpinion: opinionInput.value,
      etc: etcInput.value,
      technician: {
        position: technicianPosition.value,
        name: technicianName.value
      },
      managerSign: currentManagerSign,
      technicianSign: currentTechnicianSign
    };
  }

  // ============================================================
  // 저장하기 함수 (Supabase 클라우드, 로컬 서버, 브라우저 스토리지 동기화)
  // ============================================================
  async function saveCurrentRecord() {
    const targetDate = recordDateInput.value;
    const payload = collectFormData();

    btnSave.disabled = true;
    btnSave.textContent = '💾 저장 중...';

    let anySaved = false;
    let errorMessages = [];

    // 1. 브라우저 LocalStorage 로컬 캐시 즉시 보관
    try {
      localStorage.setItem('daelim_air_record_' + targetDate, JSON.stringify(payload));
      anySaved = true;
    } catch (e) {
      console.warn('LocalStorage 저장 실패:', e);
    }

    // 2. Supabase 클라우드 데이터베이스 저장 (연동 설정 시)
    if (window.SupabaseService && window.SupabaseService.isSupabaseConfigured()) {
      try {
        const recordStatus = payload.isHoliday ? 'HOLIDAY' : 'NORMAL';
        const sbRes = await window.SupabaseService.saveSupabaseRecord(targetDate, payload, recordStatus);
        if (sbRes.success) {
          anySaved = true;
        } else {
          errorMessages.push('Supabase: ' + sbRes.message);
        }
      } catch (sbErr) {
        console.error('Supabase 저장 예외:', sbErr);
        errorMessages.push('Supabase 저장 실패');
      }
    }

    // 3. 로컬 백엔드 서버 저장 (Node.js 실행 중인 경우)
    try {
      const res = await fetch(`/api/records/${targetDate}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          anySaved = true;
        }
      }
    } catch (err) {
      // 순수 웹(GitHub Pages) 모드이거나 백엔드가 꺼져 있는 경우 에러 무시
    }

    if (anySaved) {
      markSaved();
    } else {
      alert('저장 실패: ' + (errorMessages.join('\n') || '데이터를 저장하지 못했습니다.'));
    }

    btnSave.disabled = false;
    btnSave.textContent = '💾 저장하기';
  }

  // 날짜 이동 헬퍼 함수
  function changeDateByOffset(offsetDays) {
    const current = new Date(recordDateInput.value + 'T00:00:00');
    current.setDate(current.getDate() + offsetDays);
    const newDateStr = current.toISOString().split('T')[0];
    recordDateInput.value = newDateStr;
    loadRecord(newDateStr);
  }

  // 날짜 변경 이벤트
  recordDateInput.addEventListener('change', () => loadRecord(recordDateInput.value));
  btnPrevDate.addEventListener('click', () => changeDateByOffset(-1));
  btnNextDate.addEventListener('click', () => changeDateByOffset(1));
  btnToday.addEventListener('click', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    recordDateInput.value = todayStr;
    loadRecord(todayStr);
  });

  // 날씨 연동 버튼
  btnFetchWeather.addEventListener('click', () => fetchWolgotWeather(recordDateInput.value));

  // 작업시간 및 가동상태 일괄 설정 함수들
  function setAllToRunning() {
    const hours = currentWorkHours || '09:00 ~ 18:00';
    currentExhaustList.forEach(item => {
      item.facility = '혼합시설';
      item.opTime = hours;
      item.note = '정상';
    });
    renderExhaustTable();
    opinionInput.value = `특이사항 없음. 전 배출시설(혼합시설 1~${currentExhaustList.length}번) 정상 가동.`;
    markUnsaved();
  }

  function setAllToIdle() {
    currentExhaustList.forEach(item => {
      item.facility = '혼합시설';
      item.opTime = '-';
      item.note = '미가동';
    });
    renderExhaustTable();
    opinionInput.value = '배출시설 미가동.';
    markUnsaved();
  }

  function setAllToHoliday() {
    currentExhaustList.forEach(item => {
      item.facility = '혼합시설';
      item.opTime = '-';
      item.note = '휴무';
    });
    renderExhaustTable();
    opinionInput.value = '휴무로 인한 배출시설 미가동.';
    markUnsaved();
  }

  function applyCustomWorkHours() {
    const hours = currentWorkHours || '09:00 ~ 18:00';
    let runningCount = 0;
    currentExhaustList.forEach(item => {
      if (item.note === '정상') {
        item.opTime = hours;
        runningCount++;
      }
    });
    if (runningCount === 0) {
      setAllToRunning();
    } else {
      renderExhaustTable();
      markUnsaved();
    }
  }

  // 상단 바 작업시간 드롭다운 변경 리스너
  if (workHoursSelect) {
    workHoursSelect.addEventListener('change', (e) => {
      let val = e.target.value;
      if (val === '__custom__') {
        const customVal = prompt('작업시간을 직접 입력하세요 (예: 08:30 ~ 17:30):', currentWorkHours);
        if (customVal !== null && customVal.trim() !== '') {
          val = customVal.trim();
          const opt = document.createElement('option');
          opt.value = val;
          opt.textContent = val;
          workHoursSelect.insertBefore(opt, workHoursSelect.lastElementChild);
          workHoursSelect.value = val;
        } else {
          workHoursSelect.value = currentWorkHours;
          return;
        }
      }
      currentWorkHours = val;
      applyCustomWorkHours();
    });
  }

  // 상단 바 및 표 상단 버튼 이벤트 바인딩
  if (btnSetAllRunning) btnSetAllRunning.addEventListener('click', setAllToRunning);
  if (btnTableSetRunning) btnTableSetRunning.addEventListener('click', setAllToRunning);
  if (btnSetAllIdle) btnSetAllIdle.addEventListener('click', setAllToIdle);
  if (btnTableSetIdle) btnTableSetIdle.addEventListener('click', setAllToIdle);
  if (btnSetAllHoliday) btnSetAllHoliday.addEventListener('click', setAllToHoliday);
  if (btnApplyWorkHours) btnApplyWorkHours.addEventListener('click', applyCustomWorkHours);

  // 저장 버튼
  btnSave.addEventListener('click', saveCurrentRecord);

  // 단축키 Ctrl + S 지원
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCurrentRecord();
    }
  });

  // 인쇄 및 엑셀 다운로드 (로컬 서버 및 웹 브라우저 직접 생성 지원)
  btnPrint.addEventListener('click', () => window.print());

  btnExportExcel.addEventListener('click', async () => {
    const dateStr = recordDateInput.value;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // 로컬 서버 실행 중이면 백엔드 다운로드 시도
    if (isLocalhost) {
      try {
        window.location.href = `/api/export/excel/${dateStr}`;
        return;
      } catch (e) {
        // 실패 시 브라우저 직접 생성으로 이동
      }
    }

    // 웹 클라우드(GitHub Pages 등) 또는 오프라인 환경: 브라우저 직접 엑셀 생성
    await exportClientExcel(dateStr);
  });

  /**
   * 브라우저 클라이언트에서 직접 ExcelJS를 사용하여 엑셀 파일을 생성하고 다운로드합니다.
   * @param {string} dateStr 
   */
  async function exportClientExcel(dateStr) {
    if (!window.ExcelJS) {
      alert('ExcelJS 라이브러리를 불러오지 못했습니다. 네트워크를 확인해주세요.');
      return;
    }

    btnExportExcel.disabled = true;
    btnExportExcel.textContent = '📊 엑셀 생성 중...';

    try {
      const data = collectFormData();
      const workbook = new window.ExcelJS.Workbook();
      workbook.creator = '대림 공조기록 시스템';
      const sheetName = dateStr.replace(/-/g, '').slice(4);
      const sheet = workbook.addWorksheet(sheetName);

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

      // 제목
      sheet.mergeCells('A1:L3');
      const titleCell = sheet.getCell('A1');
      titleCell.value = '대기배출시설 및 방지시설 운영기록부';
      titleCell.font = { name: '맑은 고딕', size: 14, bold: true };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // 결재란
      sheet.mergeCells('M1:M3');
      sheet.getCell('M1').value = '결\n재';
      sheet.getCell('M1').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      sheet.getCell('N1').value = '담당';
      sheet.getCell('O1').value = '부서장';
      sheet.getCell('P1').value = '환경기술인';

      // 일자/날씨
      sheet.mergeCells('A4:P4');
      const weatherText = data.weatherInfo ? `${data.weatherInfo.weather || '맑음'} (기온: ${data.weatherInfo.temp || '-'})` : '맑음';
      sheet.getCell('A4').value = `■ 작성일자: ${data.formattedDate || dateStr}   |   ■ 날씨: ${weatherText}`;
      sheet.getCell('A4').font = { bold: true };

      // 1. 배출시설 운전사항
      sheet.mergeCells('A6:P6');
      sheet.getCell('A6').value = '1. 배출시설 운전사항';
      sheet.getCell('A6').font = { bold: true };

      sheet.mergeCells('A7:B7'); sheet.getCell('A7').value = '배출구';
      sheet.mergeCells('C7:H7'); sheet.getCell('C7').value = '배출시설명';
      sheet.mergeCells('I7:M7'); sheet.getCell('I7').value = '가동시간';
      sheet.mergeCells('N7:P7'); sheet.getCell('N7').value = '비고';

      let rIdx = 8;
      (data.exhaustList || []).forEach(item => {
        sheet.mergeCells(`A${rIdx}:B${rIdx}`); sheet.getCell(`A${rIdx}`).value = item.id + '번';
        sheet.mergeCells(`C${rIdx}:H${rIdx}`); sheet.getCell(`C${rIdx}`).value = item.facility;
        sheet.mergeCells(`I${rIdx}:M${rIdx}`); sheet.getCell(`I${rIdx}`).value = item.opTime;
        sheet.mergeCells(`N${rIdx}:P${rIdx}`); sheet.getCell(`N${rIdx}`).value = item.note;
        rIdx++;
      });

      // 2. 방지시설 운전사항
      rIdx++;
      sheet.mergeCells(`A${rIdx}:P${rIdx}`);
      sheet.getCell(`A${rIdx}`).value = '2. 방지시설 운전사항 (면제)';
      sheet.getCell(`A${rIdx}`).font = { bold: true };
      rIdx++;
      sheet.mergeCells(`A${rIdx}:P${rIdx}`);
      sheet.getCell(`A${rIdx}`).value = '방지시설 설치 면제 사업장 (기록 생략)';
      sheet.getCell(`A${rIdx}`).alignment = { horizontal: 'center' };
      rIdx += 2;

      // 3. 자가측정사항
      sheet.mergeCells(`A${rIdx}:P${rIdx}`);
      sheet.getCell(`A${rIdx}`).value = '3. 자가측정사항';
      sheet.getCell(`A${rIdx}`).font = { bold: true };
      rIdx++;
      sheet.mergeCells(`A${rIdx}:B${rIdx}`); sheet.getCell(`A${rIdx}`).value = '배출구';
      sheet.mergeCells(`C${rIdx}:F${rIdx}`); sheet.getCell(`C${rIdx}`).value = '오염물질';
      sheet.mergeCells(`G${rIdx}:I${rIdx}`); sheet.getCell(`G${rIdx}`).value = '농도';
      sheet.mergeCells(`J${rIdx}:L${rIdx}`); sheet.getCell(`J${rIdx}`).value = '유량';
      sheet.mergeCells(`M${rIdx}:P${rIdx}`); sheet.getCell(`M${rIdx}`).value = '측정방법';
      rIdx++;

      (data.selfMeasurement && data.selfMeasurement.rows ? data.selfMeasurement.rows : []).forEach(row => {
        sheet.mergeCells(`A${rIdx}:B${rIdx}`); sheet.getCell(`A${rIdx}`).value = row.exhaustNo || '-';
        sheet.mergeCells(`C${rIdx}:F${rIdx}`); sheet.getCell(`C${rIdx}`).value = row.item || '-';
        sheet.mergeCells(`G${rIdx}:I${rIdx}`); sheet.getCell(`G${rIdx}`).value = row.density || '-';
        sheet.mergeCells(`J${rIdx}:L${rIdx}`); sheet.getCell(`J${rIdx}`).value = row.dailyFlow || '-';
        sheet.mergeCells(`M${rIdx}:P${rIdx}`); sheet.getCell(`M${rIdx}`).value = row.method || '-';
        rIdx++;
      });

      // 4. 기술인 의견
      rIdx++;
      sheet.mergeCells(`A${rIdx}:P${rIdx}`);
      sheet.getCell(`A${rIdx}`).value = '4. 환경기술인 의견 및 특이사항';
      sheet.getCell(`A${rIdx}`).font = { bold: true };
      rIdx++;
      sheet.mergeCells(`A${rIdx}:P${rIdx}`);
      sheet.getCell(`A${rIdx}`).value = data.engineerOpinion || '특이사항 없음. 정상 가동.';

      // 테두리 스타일 적용
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          if (!cell.font) cell.font = { name: '맑은 고딕', size: 9 };
          if (!cell.alignment) cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const filename = `대기배출시설_운영기록부_${dateStr}.xlsx`;
      
      if (window.saveAs) {
        window.saveAs(blob, filename);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('브라우저 엑셀 다운로드 오류:', err);
      alert('엑셀 파일 생성 중 오류가 발생했습니다: ' + err.message);
    } finally {
      btnExportExcel.disabled = false;
      btnExportExcel.textContent = '📊 엑셀 다운로드';
    }
  }

  // ============================================================
  // 전자결재 렌더링 및 모달 컨트롤
  // ============================================================
  let currentChargeSign = '';

  function renderSignatures() {
    if (currentChargeSign) {
      signInCharge.innerHTML = `<img src="${currentChargeSign}" class="electronic-sign-img" alt="담당 결재">`;
    } else {
      signInCharge.innerHTML = ``;
    }

    if (currentManagerSign) {
      signManager.innerHTML = `<img src="${currentManagerSign}" class="electronic-sign-img" alt="부서장 결재">`;
    } else {
      signManager.innerHTML = `<span class="sign-guide no-print">전자결재</span>`;
    }

    if (currentTechnicianSign) {
      signTechnician.innerHTML = `<img src="${currentTechnicianSign}" class="electronic-sign-img" alt="환경기술인 서명">`;
    } else {
      signTechnician.innerHTML = `<span class="stamp-bracket">(인)</span>`;
    }
  }

  // 캔버스 초기화
  function clearSignCanvas() {
    if (ctx && signCanvas) {
      ctx.clearRect(0, 0, signCanvas.width, signCanvas.height);
    }
  }

  // 캔버스 여백을 정밀하게 제거하고 도장/서명 내용만 타이트하게 크롭하는 함수
  function getTrimmedCanvasDataUrl(canvas) {
    const context = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = context.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w, minY = h, maxX = 0, maxY = 0;
    let hasContent = false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha > 15) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          hasContent = true;
        }
      }
    }

    if (!hasContent) return '';

    // 여백 4px 추가
    const pad = 4;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad);
    maxY = Math.min(h - 1, maxY + pad);

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;

    const trimmed = document.createElement('canvas');
    trimmed.width = cropW;
    trimmed.height = cropH;
    const tCtx = trimmed.getContext('2d');
    tCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

    return trimmed.toDataURL('image/png');
  }

  // 전자도장 자동 생성 함수 (관공서/기업 공식 인영 스타일 - 고해상도 확대 규격)
  function drawAutoStamp(nameText) {
    if (!ctx || !signCanvas) return;
    clearSignCanvas();

    const cx = signCanvas.width / 2;
    const cy = signCanvas.height / 2;
    const r = 64; // 기존 50에서 64로 대폭 확대 (지름 128px)

    // 선명하고 붉은 인주 색상
    ctx.strokeStyle = '#dc2626';
    ctx.fillStyle = '#dc2626';

    // 외곽 굵은 원
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // 안쪽 가는 원
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
    ctx.stroke();

    // 상단 반원 텍스트: "전자결재"
    ctx.font = 'bold 13px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('전자결재', cx, cy - 34);

    // 중앙 이름 (예: "윤경용" 또는 "담당")
    ctx.font = 'bold 26px "Noto Sans KR", sans-serif';
    ctx.fillText(nameText, cx, cy + 1);

    // 하단 날짜: YYYY.MM.DD
    const dStr = recordDateInput.value.replace(/-/g, '.');
    ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
    ctx.fillText(dStr, cx, cy + 34);
  }

  // 모달 열기
  function openSignModal(target) {
    currentSignTarget = target;
    clearSignCanvas();

    if (target === 'manager') {
      modalTitle.textContent = '부서장 전자결재 서명 / 날인';
      btnAutoStamp.textContent = '🔴 부서장 도장 자동 생성 (윤경용)';
    } else if (target === 'charge') {
      modalTitle.textContent = '담당 전자결재 서명 / 날인';
      btnAutoStamp.textContent = '🔴 담당 도장 자동 생성';
    } else {
      modalTitle.textContent = '환경기술인 전자결재 서명 / 날인';
      btnAutoStamp.textContent = '🔴 기술인 도장 자동 생성 (윤경용)';
    }

    signModal.style.display = 'flex';
  }

  // 모달 닫기
  function closeSignModal() {
    signModal.style.display = 'none';
  }

  // 캔버스 드로잉 이벤트 (마우스 및 터치)
  if (signCanvas && ctx) {
    function getCanvasPos(e) {
      const rect = signCanvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (signCanvas.width / rect.width),
        y: (clientY - rect.top) * (signCanvas.height / rect.height)
      };
    }

    function startDraw(e) {
      isDrawing = true;
      const pos = getCanvasPos(e);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1e3a8a'; // 서명 잉크색: 네이비블루
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      e.preventDefault();
    }

    function draw(e) {
      if (!isDrawing) return;
      const pos = getCanvasPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      e.preventDefault();
    }

    function stopDraw() {
      isDrawing = false;
    }

    signCanvas.addEventListener('mousedown', startDraw);
    signCanvas.addEventListener('mousemove', draw);
    signCanvas.addEventListener('mouseup', stopDraw);
    signCanvas.addEventListener('mouseleave', stopDraw);

    signCanvas.addEventListener('touchstart', startDraw, { passive: false });
    signCanvas.addEventListener('touchmove', draw, { passive: false });
    signCanvas.addEventListener('touchend', stopDraw);
  }

  // 전자도장 자동 생성 버튼
  btnAutoStamp.addEventListener('click', () => {
    let name = '윤경용';
    if (currentSignTarget === 'charge') {
      name = '담당';
    } else if (currentSignTarget === 'technician') {
      name = technicianName.value.replace(/\s+/g, '') || '윤경용';
    }
    drawAutoStamp(name);
  });

  // 서명 지우기 버튼
  btnClearCanvas.addEventListener('click', clearSignCanvas);

  // 모달 닫기 버튼들
  btnCloseModal.addEventListener('click', closeSignModal);
  btnCancelSign.addEventListener('click', closeSignModal);

  // 전자결재 승인 적용 버튼 (여백 정밀 크롭 적용)
  btnApplySign.addEventListener('click', () => {
    if (!signCanvas) return;
    const dataUrl = getTrimmedCanvasDataUrl(signCanvas);
    if (!dataUrl) {
      alert('서명을 그리거나 [전자도장 생성]을 클릭해주세요.');
      return;
    }

    if (currentSignTarget === 'manager') {
      currentManagerSign = dataUrl;
    } else if (currentSignTarget === 'technician') {
      currentTechnicianSign = dataUrl;
    } else if (currentSignTarget === 'charge') {
      currentChargeSign = dataUrl;
    }

    renderSignatures();
    markUnsaved();
    closeSignModal();
  });

  // 결재 삭제 버튼
  btnRemoveSign.addEventListener('click', () => {
    if (currentSignTarget === 'manager') {
      currentManagerSign = '';
    } else if (currentSignTarget === 'technician') {
      currentTechnicianSign = '';
    } else if (currentSignTarget === 'charge') {
      currentChargeSign = '';
    }

    renderSignatures();
    markUnsaved();
    closeSignModal();
  });

  // 결재란 클릭 이벤트 연결
  signInCharge.addEventListener('click', () => openSignModal('charge'));
  signManager.addEventListener('click', () => openSignModal('manager'));
  signTechnician.addEventListener('click', () => openSignModal('technician'));

  // 자가측정 기상 라디오 토글 해제 지원 (라디오 재클릭 시 선택 해제)
  document.querySelectorAll('input[name="selfWeather"]').forEach(radio => {
    radio.addEventListener('click', function() {
      if (this.dataset.checked === 'true') {
        this.checked = false;
        this.dataset.checked = 'false';
      } else {
        document.querySelectorAll('input[name="selfWeather"]').forEach(r => r.dataset.checked = 'false');
        this.dataset.checked = 'true';
      }
      markUnsaved();
    });
  });

  // 자가측정 기상 및 측정일 수치 입력 시 수정 상태 반영
  [selfTemp, selfHumidity, selfPressure, selfWindDir, selfWindSpeed, measureDateInput].forEach(elem => {
    if (elem) {
      elem.addEventListener('input', () => markUnsaved());
    }
  });

  // ============================================================
  // Supabase 클라우드 연동 모달 및 상태 관리
  // ============================================================
  function updateSupabaseStatusBadge() {
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

  function openSupabaseModal() {
    if (!supabaseModal) return;
    const config = window.SupabaseService ? window.SupabaseService.getSupabaseConfig() : { url: '', key: '' };
    supabaseUrlInput.value = config.url || '';
    supabaseKeyInput.value = config.key || '';
    supabaseTestResult.style.display = 'none';
    supabaseTestResult.textContent = '';
    supabaseModal.style.display = 'flex';
  }

  function closeSupabaseModal() {
    if (supabaseModal) supabaseModal.style.display = 'none';
  }

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

  // 초기 Supabase 상태 표시 갱신
  updateSupabaseStatusBadge();

  // ============================================================
  // 월간 / 주간 / 일일 검색 및 일괄 열람 / 인쇄 모듈
  // ============================================================
  let currentSearchResults = [];

  // 검색 모달 열기/닫기
  const btnOpenSearchModal = document.getElementById('btnOpenSearchModal');
  const batchSearchModal = document.getElementById('batchSearchModal');
  const btnCloseSearchModal = document.getElementById('btnCloseSearchModal');
  const btnCloseSearchModalFooter = document.getElementById('btnCloseSearchModalFooter');

  function openSearchModal() {
    if (batchSearchModal) {
      batchSearchModal.style.display = 'flex';
      executeMonthlySearch();
    }
  }

  function closeSearchModal() {
    if (batchSearchModal) {
      batchSearchModal.style.display = 'none';
    }
  }

  if (btnOpenSearchModal) btnOpenSearchModal.addEventListener('click', openSearchModal);
  if (btnCloseSearchModal) btnCloseSearchModal.addEventListener('click', closeSearchModal);
  if (btnCloseSearchModalFooter) btnCloseSearchModalFooter.addEventListener('click', closeSearchModal);
  if (batchSearchModal) {
    batchSearchModal.addEventListener('click', (e) => {
      if (e.target === batchSearchModal) closeSearchModal();
    });
  }

  // 탭 전환
  const tabButtons = document.querySelectorAll('.search-tabs .tab-btn');
  const tabPanels = {
    monthly: document.getElementById('tabContentMonthly'),
    weekly: document.getElementById('tabContentWeekly'),
    daily: document.getElementById('tabContentDaily'),
    batch_create: document.getElementById('tabContentBatchCreate')
  };

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetTab = btn.dataset.tab;
      Object.keys(tabPanels).forEach(key => {
        if (tabPanels[key]) {
          tabPanels[key].style.display = (key === targetTab) ? 'block' : 'none';
        }
      });
    });
  });

  // 모든 가용 운영기록 불러오기 (서버 전체 API -> Supabase 클라우드 -> 로컬스토리지 병합 및 자동 캐시)
  async function fetchAllAvailableRecords() {
    const recordsMap = new Map();

    // 1. 로컬 백엔드 서버에서 전체 운영기록 일괄 조회 (/api/records-all)
    try {
      const res = await fetch('/api/records-all');
      if (res.ok) {
        const resJson = await res.json();
        if (resJson.success && resJson.records) {
          Object.entries(resJson.records).forEach(([dateStr, record]) => {
            recordsMap.set(dateStr, record);
            // 브라우저 로컬 스토리지에도 자동 동기화 캐시
            try {
              localStorage.setItem('daelim_air_record_' + dateStr, JSON.stringify(record));
            } catch (e) {}
          });
        }
      }
    } catch (e) {
      console.warn('[Server] /api/records-all 호출 예외 (정적 호스팅 환경일 수 있음):', e);
    }

    // 2. Supabase 클라우드에서 전체 조회
    if (window.SupabaseService && window.SupabaseService.isSupabaseConfigured()) {
      try {
        const supaRecords = await window.SupabaseService.fetchSupabaseRecords();
        if (supaRecords && Array.isArray(supaRecords)) {
          supaRecords.forEach(item => {
            const dateStr = item.record_date;
            const fullRecord = {
              date: dateStr,
              status: item.status || 'NORMAL',
              ...item.record_data
            };
            if (!recordsMap.has(dateStr)) {
              recordsMap.set(dateStr, fullRecord);
            }
            try {
              if (!localStorage.getItem('daelim_air_record_' + dateStr)) {
                localStorage.setItem('daelim_air_record_' + dateStr, JSON.stringify(fullRecord));
              }
            } catch (e) {}
          });
        }
      } catch (e) {
        console.warn('[Supabase] 전체 목록 로드 예외:', e);
      }
    }

    // 3. 브라우저 localStorage 캐시 병합
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('daelim_air_record_')) {
          const dateStr = key.replace('daelim_air_record_', '');
          if (!recordsMap.has(dateStr)) {
            const parsed = JSON.parse(localStorage.getItem(key));
            if (parsed) {
              recordsMap.set(dateStr, parsed);
            }
          }
        }
      }
    } catch (e) {}

    return Array.from(recordsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  // 단일 일자 운영기록 안전 로드 헬퍼 (로컬스토리지 -> 로컬서버 -> Supabase 순)
  async function fetchSingleRecord(dateStr) {
    if (!dateStr) return null;

    // 1. 브라우저 localStorage 캐시 확인
    try {
      const localData = localStorage.getItem('daelim_air_record_' + dateStr);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed && (parsed.date || parsed.exhaustList)) return parsed;
      }
    } catch (e) {}

    // 2. 로컬 백엔드 서버 확인
    try {
      const res = await fetch(`/api/records/${dateStr}`);
      if (res.ok) {
        const resJson = await res.json();
        if (resJson.success && resJson.data) {
          try {
            localStorage.setItem('daelim_air_record_' + dateStr, JSON.stringify(resJson.data));
          } catch (e) {}
          return resJson.data;
        }
      }
    } catch (e) {}

    // 3. Supabase 클라우드 확인
    if (window.SupabaseService && window.SupabaseService.isSupabaseConfigured()) {
      try {
        const sbRes = await window.SupabaseService.fetchSupabaseRecord(dateStr);
        if (sbRes && sbRes.success && sbRes.data) {
          try {
            localStorage.setItem('daelim_air_record_' + dateStr, JSON.stringify(sbRes.data));
          } catch (e) {}
          return sbRes.data;
        }
      } catch (e) {}
    }

    return null;
  }

  // 검색 결과 테이블 렌더링
  const searchResultTableBody = document.getElementById('searchResultTableBody');
  const searchResultSummary = document.getElementById('searchResultSummary');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');

  function renderSearchResults(records) {
    currentSearchResults = records;
    if (!searchResultTableBody) return;

    if (!records || records.length === 0) {
      searchResultTableBody.innerHTML = `<tr><td colspan="7" style="padding: 24px; color: #94a3b8;">해당 기간에 등록된 운영기록이 없습니다.</td></tr>`;
      if (searchResultSummary) searchResultSummary.textContent = '(0건 선택됨)';
      return;
    }

    const dayKorean = ['일', '월', '화', '수', '목', '금', '토'];

    searchResultTableBody.innerHTML = records.map(r => {
      const d = new Date(r.date + 'T00:00:00');
      const dayName = dayKorean[d.getDay()];
      const isWeekend = (d.getDay() === 0 || d.getDay() === 6);

      let statusBadge = '<span class="badge-running">정상가동</span>';
      if (r.status === 'HOLIDAY' || r.isHoliday) {
        statusBadge = `<span class="badge-holiday">${r.holidayReason || '휴무'}</span>`;
      } else if (r.status === 'IDLE' || (r.exhaustList && r.exhaustList.every(e => e.note === '미가동'))) {
        statusBadge = '<span class="badge-idle">미가동</span>';
      }

      const weatherStr = r.weatherInfo ? `${r.weatherInfo.weather || '-'} (${r.weatherInfo.temp || '-'})` : '-';
      const reasonStr = r.engineerOpinion || (r.isHoliday ? '휴무' : '미가동');

      return `
        <tr>
          <td><input type="checkbox" class="batch-row-checkbox" data-date="${r.date}" checked></td>
          <td style="font-weight: 600;">${r.date}</td>
          <td style="color: ${isWeekend ? '#dc2626' : '#1e293b'};">${dayName}요일</td>
          <td>${statusBadge}</td>
          <td>${weatherStr}</td>
          <td style="text-align: left; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${reasonStr}">${reasonStr}</td>
          <td>
            <button type="button" class="btn btn-default" style="padding: 2px 8px; font-size: 0.78rem;" onclick="openSingleRecord('${r.date}')">
              열기
            </button>
          </td>
        </tr>
      `;
    }).join('');

    bindCheckboxEvents();
    updateSelectionSummary();
  }

  // 개별 일자 열기 전역 등록
  window.openSingleRecord = function(dateStr) {
    closeSearchModal();
    exitBatchViewMode();
    recordDateInput.value = dateStr;
    loadRecord(dateStr);
  };

  // 체크박스 이벤트 바인딩
  function bindCheckboxEvents() {
    const rowCheckboxes = document.querySelectorAll('.batch-row-checkbox');
    rowCheckboxes.forEach(cb => {
      cb.addEventListener('change', updateSelectionSummary);
    });

    if (selectAllCheckbox) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.onchange = () => {
        rowCheckboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
        updateSelectionSummary();
      };
    }
  }

  function updateSelectionSummary() {
    const selected = getSelectedDates();
    if (searchResultSummary) {
      searchResultSummary.textContent = `(총 ${currentSearchResults.length}건 중 ${selected.length}건 선택됨)`;
    }
  }

  function getSelectedDates() {
    const checkboxes = document.querySelectorAll('.batch-row-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.dataset.date);
  }

  // 1. 월간 검색 실행
  async function executeMonthlySearch() {
    const monthInput = document.getElementById('searchMonthInput');
    const targetMonth = monthInput ? monthInput.value : '2026-09';
    searchResultTableBody.innerHTML = `<tr><td colspan="7" style="padding: 20px; color: #64748b;">⏳ ${targetMonth} 운영기록을 조회하는 중...</td></tr>`;

    const allRecords = await fetchAllAvailableRecords();
    const filtered = allRecords.filter(r => r.date.startsWith(targetMonth));
    renderSearchResults(filtered);
  }

  const btnSearchMonthly = document.getElementById('btnSearchMonthly');
  if (btnSearchMonthly) btnSearchMonthly.addEventListener('click', executeMonthlySearch);

  // 2. 주간 검색 실행
  async function executeWeeklySearch() {
    const monthInput = document.getElementById('searchWeekMonthInput');
    const weekSelect = document.getElementById('searchWeekSelect');
    const targetMonth = monthInput ? monthInput.value : '2026-09';
    const weekNum = parseInt(weekSelect ? weekSelect.value : '1', 10);

    const weekRanges = {
      1: [1, 6],
      2: [7, 13],
      3: [14, 20],
      4: [21, 27],
      5: [28, 31]
    };

    const [startDay, endDay] = weekRanges[weekNum] || [1, 31];
    searchResultTableBody.innerHTML = `<tr><td colspan="7" style="padding: 20px; color: #64748b;">⏳ ${targetMonth} ${weekNum}주차 기록을 조회하는 중...</td></tr>`;

    const allRecords = await fetchAllAvailableRecords();
    const filtered = allRecords.filter(r => {
      if (!r.date.startsWith(targetMonth)) return false;
      const day = parseInt(r.date.split('-')[2], 10);
      return day >= startDay && day <= endDay;
    });

    renderSearchResults(filtered);
  }

  const btnSearchWeekly = document.getElementById('btnSearchWeekly');
  if (btnSearchWeekly) btnSearchWeekly.addEventListener('click', executeWeeklySearch);

  // 3. 일일 검색 실행
  const btnSearchDaily = document.getElementById('btnSearchDaily');
  if (btnSearchDaily) {
    btnSearchDaily.addEventListener('click', () => {
      const dailyInput = document.getElementById('searchDailyInput');
      const targetDate = dailyInput ? dailyInput.value : '';
      if (targetDate) {
        window.openSingleRecord(targetDate);
      }
    });
  }

  // 4. 기간 일괄 자동생성 실행
  const btnExecuteBatchGenerate = document.getElementById('btnExecuteBatchGenerate');
  const batchGenerateStatus = document.getElementById('batchGenerateStatus');

  if (btnExecuteBatchGenerate) {
    btnExecuteBatchGenerate.addEventListener('click', async () => {
      const startInput = document.getElementById('batchStartInput');
      const endInput = document.getElementById('batchEndInput');
      const startDate = startInput.value;
      const endDate = endInput.value;

      if (!startDate || !endDate || startDate > endDate) {
        alert('올바른 시작일과 종료일을 지정해주세요.');
        return;
      }

      btnExecuteBatchGenerate.disabled = true;
      btnExecuteBatchGenerate.textContent = '⏳ 일괄 생성 중...';
      if (batchGenerateStatus) {
        batchGenerateStatus.style.display = 'block';
        batchGenerateStatus.textContent = `${startDate}부터 ${endDate}까지 일일 기록을 자동 생성하고 있습니다...`;
      }

      try {
        let generatedCount = 0;
        try {
          const res = await fetch('/api/records/batch-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, endDate })
          });
          if (res.ok) {
            const data = await res.json();
            generatedCount = data.count || 0;
          }
        } catch (e) {}

        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const curDateStr = d.toISOString().split('T')[0];
          const dayOfWeek = d.getDay();
          const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
          const defaultNote = isWeekend ? '휴무' : '미가동';
          const opinion = isWeekend ? '휴무로 인한 배출시설 미가동.' : '배출시설 미가동.';

          const recordData = {
            date: curDateStr,
            formattedDate: getFormattedDateString(curDateStr),
            isHoliday: isWeekend,
            holidayReason: isWeekend ? (dayOfWeek === 6 ? '토요일(주말 휴무)' : '일요일(주말 휴무)') : '',
            status: isWeekend ? 'HOLIDAY' : 'IDLE',
            workHours: '09:00 ~ 18:00',
            weatherInfo: { weather: '맑음', temp: '17 ~ 25℃' },
            exhaustList: [
              { id: '1', facility: '혼합시설', opTime: '-', note: defaultNote },
              { id: '2', facility: '혼합시설', opTime: '-', note: defaultNote },
              { id: '3', facility: '혼합시설', opTime: '-', note: defaultNote },
              { id: '4', facility: '혼합시설', opTime: '-', note: defaultNote }
            ],
            preventionOperation: { exempt: true, text: '방지시설 면제', rows: [] },
            preventionMaintenance: { exempt: false, rows: [] },
            selfMeasurement: { measureDate: '', weather: '', temp: '', humidity: '', pressure: '', windDir: '', windSpeed: '', rows: [] },
            fuelUsage: '-',
            rawMaterialUsage: '-',
            engineerOpinion: opinion,
            etc: '-',
            technician: { position: '부장', name: '윤 경 용' },
            // 일자에 맞춘 부서장 및 환경기술인 공식 전자결재 도장 자동 날인
            managerSign: generateStampSvg('윤경용', curDateStr),
            technicianSign: generateStampSvg('윤경용', curDateStr),
            updatedAt: new Date().toISOString()
          };

          localStorage.setItem('daelim_air_record_' + curDateStr, JSON.stringify(recordData));

          if (window.SupabaseService && window.SupabaseService.isSupabaseConfigured()) {
            await window.SupabaseService.saveSupabaseRecord(curDateStr, recordData, recordData.status);
          }
          generatedCount++;
        }

        if (batchGenerateStatus) {
          batchGenerateStatus.textContent = `✅ ${startDate} ~ ${endDate} 총 ${generatedCount}건 일괄 생성 및 동기화 완료!`;
        }
        alert('일괄 생성이 완료되었습니다.');
        const monthTab = document.querySelector('.search-tabs .tab-btn[data-tab="monthly"]');
        if (monthTab) monthTab.click();
        executeMonthlySearch();
      } catch (err) {
        console.error('일괄 생성 오류:', err);
        alert('일괄 생성 중 오류가 발생했습니다: ' + err.message);
      } finally {
        btnExecuteBatchGenerate.disabled = false;
        btnExecuteBatchGenerate.textContent = '⚡ 일괄 생성 실행';
      }
    });
  }

  // ============================================================
  // 양식 렌더링 헬퍼 함수 (일괄 열람, 책 넘김 바인더 및 인쇄 전용)
  // ============================================================
  function getRecordPagesHtml(record, isForPrint = false) {
    const pageClass = isForPrint ? 'batch-print-page' : 'a4-sheet';
    const dateFormatted = record.formattedDate || getFormattedDateString(record.date);
    const weather = record.weatherInfo ? record.weatherInfo.weather || '맑음' : '맑음';
    const temp = record.weatherInfo ? record.weatherInfo.temp || '15 ~ 25℃' : '15 ~ 25℃';

    const chargeSignImg = record.chargeSign ? `<img src="${record.chargeSign}" class="electronic-sign-img" alt="담당">` : '';
    const managerSignImg = record.managerSign ? `<img src="${record.managerSign}" class="electronic-sign-img" alt="부서장">` : '';
    const techSignImg = record.technicianSign ? `<img src="${record.technicianSign}" class="electronic-sign-img" alt="환경기술인">` : '';

    const exhaustRowsHtml = (record.exhaustList && record.exhaustList.length > 0 ? record.exhaustList : [
      { id: '1', facility: '혼합시설', opTime: '-', note: record.isHoliday ? '휴무' : '미가동' },
      { id: '2', facility: '혼합시설', opTime: '-', note: record.isHoliday ? '휴무' : '미가동' },
      { id: '3', facility: '혼합시설', opTime: '-', note: record.isHoliday ? '휴무' : '미가동' },
      { id: '4', facility: '혼합시설', opTime: '-', note: record.isHoliday ? '휴무' : '미가동' }
    ]).map(e => `
      <tr>
        <td style="font-weight: 600;">${e.id}</td>
        <td>${e.facility || '혼합시설'}</td>
        <td>${e.opTime || '-'}</td>
        <td style="font-weight: 600;">${e.note || '-'}</td>
      </tr>
    `).join('');

    const isExempt = record.preventionOperation ? (record.preventionOperation.exempt !== undefined ? record.preventionOperation.exempt : true) : true;
    let preventionHtml = '';
    if (isExempt) {
      preventionHtml = `
        <tr class="exempt-row">
          <td colspan="9" style="padding: 10px; font-weight: 600; color: #475569; background-color: #f8fafc; text-align: center;">
            ※ 방지시설 설치 면제 사업장 (기록 생략)
          </td>
        </tr>
      `;
    } else {
      const pRows = record.preventionOperation && record.preventionOperation.rows ? record.preventionOperation.rows : [];
      if (pRows.length === 0) {
        preventionHtml = `
          <tr>
            <td>혼합방지시설</td>
            <td>1층</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
          </tr>
        `;
      } else {
        preventionHtml = pRows.map(r => `
          <tr>
            <td>${r.facilityName || '-'}</td>
            <td>${r.location || '-'}</td>
            <td>${r.power || '-'}</td>
            <td>${r.capacity || '-'}</td>
            <td>${r.pollutant || '-'}</td>
            <td>${r.density || '-'}</td>
            <td>${r.efficiency || '-'}</td>
            <td>${r.chemical || '-'}</td>
            <td>${r.usage || '-'}</td>
          </tr>
        `).join('');
      }
    }

    // 앞면(Front Sheet): 상단 요소를 wrapper div로 감싸고 제목줄-표 간격 최소화
    const frontHtml = `
      <article class="${pageClass}">
        <div class="sheet-badge">양식 1 : 배출시설 운영기록부 (앞면) - ${record.date}</div>
        <div>
          <!-- 타이틀 및 결재란 -->
          <div class="form-title-row" style="margin-bottom: 6px;">
            <div class="form-title">대기배출시설 및 방지시설 운영기록부</div>
            <table class="approval-table">
              <tr>
                <th rowspan="2" class="approval-header"><div class="vertical-text"><span>결</span><span>재</span></div></th>
                <th class="approval-role">담당</th>
                <th class="approval-role">부서장</th>
              </tr>
              <tr>
                <td class="approval-sign">${chargeSignImg}</td>
                <td class="approval-sign">${managerSignImg}</td>
              </tr>
            </table>
          </div>

          <!-- 일자 및 날씨/온도 정보 (아래 표와의 여백 최소화) -->
          <div class="info-box-table" style="margin-bottom: 6px;">
            <div class="info-date-cell">${dateFormatted}</div>
            <div class="info-weather-cell">
              <span>날씨 : ${weather}</span>
              <span style="margin-left: 15px;">온도 : ${temp}</span>
            </div>
          </div>

          <!-- 1. 배출구별 주요 배출시설 및 방지시설 가동(조업)시간 (위/아래 여백 최소화) -->
          <div class="section-title" style="margin: 6px 0 3px 0;">
            <span>1. 배출구별 주요 배출시설 및 방지시설 가동(조업)시간</span>
          </div>
          <table class="sheet-table" style="margin-top: 0; margin-bottom: 2px;">
            <thead>
              <tr>
                <th style="width: 14%;">배출구</th>
                <th style="width: 28%;">배출시설</th>
                <th style="width: 32%;">가동시간</th>
                <th style="width: 26%;">비고</th>
              </tr>
            </thead>
            <tbody>${exhaustRowsHtml}</tbody>
          </table>
          <div class="sub-note" style="margin-top: 2px; margin-bottom: 6px; font-size: 0.8rem;">* 비고란은 정상 여부를 기재합니다.</div>

          <!-- 2. 방지시설 운영사항 (위/아래 여백 최소화) -->
          <div class="section-title" style="margin: 6px 0 3px 0;">
            <span>2. 방지시설 운영사항</span>
          </div>
          <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 2px;">가. 방지시설 운전사항</div>
          <table class="sheet-table" id="preventionOpTable" style="margin-top: 0; margin-bottom: 0;">
            <thead>
              <tr>
                <th rowspan="2" style="width: 12%;">방 지<br>시설명</th>
                <th rowspan="2" style="width: 8%;">설치<br>위치</th>
                <th style="width: 10%;">전력사용량</th>
                <th style="width: 10%;">처리용량</th>
                <th rowspan="2" style="width: 11%;">처리오염<br>물 질</th>
                <th rowspan="2" style="width: 14%;">처리농도<br>(ppm, ㎎/S㎥)</th>
                <th style="width: 11%; white-space: nowrap;">처리효율</th>
                <th colspan="2" style="width: 24%;">사용약품</th>
              </tr>
              <tr>
                <th>(㎾/h)</th>
                <th>(㎥/min)</th>
                <th>(%)</th>
                <th style="width: 12%; white-space: nowrap;">약품명</th>
                <th style="width: 12%; white-space: nowrap;">사용량</th>
              </tr>
            </thead>
            <tbody>${preventionHtml}</tbody>
          </table>
        </div>

        <!-- 하단 용지 규격 표기 -->
        <div class="footer-standard">210㎜×297㎜(신문용지 54g/㎡)</div>
      </article>
    `;

    // 뒷면(Back Sheet): 상단 요소를 wrapper div로 감싸고 나목 보수사항 및 자가측정 단일표 여백 최소화
    const selfWeather = (record.selfMeasurement && record.selfMeasurement.weather) ? record.selfMeasurement.weather : weather;
    const selfTemp = (record.selfMeasurement && record.selfMeasurement.temp) ? record.selfMeasurement.temp : '';
    const selfHumidity = (record.selfMeasurement && record.selfMeasurement.humidity) ? record.selfMeasurement.humidity : '';
    const selfPressure = (record.selfMeasurement && record.selfMeasurement.pressure) ? record.selfMeasurement.pressure : '';
    const selfWindDir = (record.selfMeasurement && record.selfMeasurement.windDir) ? record.selfMeasurement.windDir : '';
    const selfWindSpeed = (record.selfMeasurement && record.selfMeasurement.windSpeed) ? record.selfMeasurement.windSpeed : '';
    const measureDate = (record.selfMeasurement && record.selfMeasurement.measureDate) ? record.selfMeasurement.measureDate : record.date;
    const techName = (record.technician && record.technician.name) ? record.technician.name : '윤 경 용';
    const techPos = (record.technician && record.technician.position) ? record.technician.position : '부장';

    const measureRows = (record.selfMeasurement && record.selfMeasurement.rows && record.selfMeasurement.rows.length > 0)
      ? record.selfMeasurement.rows
      : [{ exhaustNo: '-', facilityName: '-', item: '-', density: '-', dailyFlow: '-', dailyEmission: '-', inspectionDevice: '-', method: '-' }];

    const measureRowsHtml = measureRows.map(r => `
      <tr>
        <td>${r.exhaustNo || '-'}</td>
        <td>${r.facilityName || '-'}</td>
        <td>${r.item || '-'}</td>
        <td>${r.density || '-'}</td>
        <td>${r.dailyFlow || '-'}</td>
        <td>${r.dailyEmission || '-'}</td>
        <td>${r.inspectionDevice || '-'}</td>
        <td colspan="2">${r.method || '-'}</td>
      </tr>
    `).join('');

    const backHtml = `
      <article class="${pageClass}">
        <div class="sheet-badge">양식 2 : 방지시설 및 자가측정 (뒷면) - ${record.date}</div>
        <div>
          <div class="back-header" style="text-align: right; font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 2px;">(뒤 쪽)</div>

          <!-- 나. 방지시설 보수사항 (위/아래 여백 최소화) -->
          <div class="section-title" style="margin: 4px 0 2px 0;">
            <span>나. 방지시설 보수사항</span>
          </div>
          <table class="sheet-table" style="margin-top: 0; margin-bottom: 4px;">
            <thead>
              <tr>
                <th style="width: 20%;">방지시설명</th>
                <th style="width: 18%;">배 출 구 별</th>
                <th style="width: 18%;">보 수 기 간</th>
                <th style="width: 16%;">보 수 자</th>
                <th style="width: 28%;">보 수 명 세</th>
              </tr>
            </thead>
            <tbody>
              <tr class="exempt-row">
                <td colspan="5" style="padding: 8px; font-weight: 600; color: #475569; background-color: #f8fafc; text-align: center;">
                  ※ 방지시설 설치 면제 사업장 (보수 내역 없음)
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 3. 자가측정사항 (위/아래 여백 최소화) -->
          <div class="section-title" style="margin: 4px 0 2px 0;">
            <span>3. 자가측정사항</span>
          </div>
          <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 2px;">
            측정일: <span style="font-weight: normal;">${measureDate}</span>
          </div>

          <!-- 3개 표를 여백없이 1개로 통합한 자가측정 및 원료/연료 통합 테이블 -->
          <table class="sheet-table" style="margin-top: 2px; margin-bottom: 0;">
            <thead>
              <!-- 1. 기상 조건 헤더 -->
              <tr>
                <th colspan="2" style="width: 26%;">①기 상</th>
                <th style="width: 12%;">②기온</th>
                <th style="width: 17%;">③습도</th>
                <th style="width: 12%;">④기압</th>
                <th style="width: 12%;">⑤풍향</th>
                <th colspan="3" style="width: 21%;">⑥풍속</th>
              </tr>
            </thead>
            <tbody>
              <!-- 1-1. 기상 조건 데이터 행 -->
              <tr>
                <td colspan="2" style="text-align: center;">${selfWeather}</td>
                <td>${selfTemp ? selfTemp + '℃' : '-'}</td>
                <td>${selfHumidity ? selfHumidity + '%' : '-'}</td>
                <td>${selfPressure ? selfPressure + 'mb' : '-'}</td>
                <td>${selfWindDir ? selfWindDir + '풍' : '-'}</td>
                <td colspan="3">${selfWindSpeed ? selfWindSpeed + 'm/s' : '-'}</td>
              </tr>

              <!-- 2. 자가측정 결과 헤더 행 -->
              <tr>
                <th style="width: 10%;">⑦배출구<br>번 호</th>
                <th style="width: 16%;">⑧주요배출<br>시 설 명</th>
                <th style="width: 12%;">⑨측 정<br>항 목</th>
                <th style="width: 17%;">⑩측정농도<br>(ppm, ㎎/S㎥)</th>
                <th style="width: 12%;">⑪일일유량<br>(S㎥/일)</th>
                <th style="width: 12%;">⑫일일배출량<br>(㎏/일)</th>
                <th style="width: 11%;">⑬검 사<br>기기명</th>
                <th colspan="2" style="width: 10%;">⑭검 사<br>방 법</th>
              </tr>

              <!-- 2-1. 측정 결과 데이터 행 -->
              ${measureRowsHtml}

              <!-- 3. 원료 및 연료 사용량 섹션 -->
              <tr>
                <th colspan="3">
                  <div>⑮연  료  명    및    사  용  량</div>
                </th>
                <td colspan="6">${record.fuelUsage || '-'}</td>
              </tr>
              <tr>
                <th colspan="3">⑯원 료 명 및 사 용 량<br><span style="font-size:0.7rem; font-weight:normal;">(특정대기유해물질 배출원 포함)</span></th>
                <td colspan="6">${record.rawMaterialUsage || '-'}</td>
              </tr>
              <tr>
                <th colspan="3">⑰환 경 기 술 인 의 의 견</th>
                <td colspan="6" style="text-align: left; padding: 4px 8px;">${record.engineerOpinion || '특이사항 없음. 정상 가동.'}</td>
              </tr>
              <tr>
                <th colspan="3">⑱기 타</th>
                <td colspan="6" style="text-align: left; padding: 4px 8px;">${record.etc || '-'}</td>
              </tr>
              <!-- 환경기술인 서명란 -->
              <tr>
                <td colspan="9" class="engineer-box-cell" style="padding: 4px 10px;">
                  <div class="engineer-distributed-box" style="display: flex; justify-content: space-around; align-items: center;">
                    <div class="eng-item">
                      <span>환경기술인 직급 : </span><strong>${techPos}</strong>
                    </div>
                    <div class="eng-item">
                      <span>성명 : </span><strong>${techName}</strong>
                    </div>
                    <div class="eng-item">
                      <div class="technician-sign-slot" style="display: inline-block;">
                        ${techSignImg || '<span class="stamp-bracket">(인)</span>'}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 하단 작성 요령 법적 안내문 -->
        <div class="law-guide" style="margin-top: 10px;">
          <strong>※ 작성요령</strong>
          <ol style="margin-top: 2px;">
            <li>「대기환경보전법」 제39조에 따라 「환경분야 시험·검사 등에 관한 법률」에 따른 측정대행업자에게 해당 오염물질 전부를 위탁하여 측정하도록 하는 경우에는 제3호란을 작성하지 아니할 수 있습니다.</li>
            <li>방지시설의 설치를 면제받은 사업장은 제2호와 제3호란을 작성하지 아니할 수 있습니다.</li>
            <li>제2호나목의 방지시설 보수사항은 별도의 계약서나 지출증빙서로 갈음할 수 있습니다.</li>
          </ol>
        </div>
      </article>
    `;

    return { frontHtml, backHtml };
  }

  function buildSheetsHtmlForRecord(record, isForPrint = false) {
    const pages = getRecordPagesHtml(record, isForPrint);
    return pages.frontHtml + pages.backHtml;
  }

  // ============================================================
  // 일괄 열람 (Batch View) 실행 -> 책 뷰어 형식으로 일원화하여 양식 배치 완벽 보장
  // ============================================================
  const batchViewBanner = document.getElementById('batchViewBanner');
  const batchViewContainer = document.getElementById('batchViewContainer');
  const batchViewCount = document.getElementById('batchViewCount');
  const singleWorkspace = document.getElementById('singleWorkspace');
  const btnExitBatchView = document.getElementById('btnExitBatchView');
  const btnModalBatchView = document.getElementById('btnModalBatchView');
  const btnBatchPrintCurrent = document.getElementById('btnBatchPrintCurrent');
  const btnBatchExcelCurrent = document.getElementById('btnBatchExcelCurrent');

  async function executeBatchView() {
    const selectedDates = getSelectedDates();
    if (selectedDates.length === 0) {
      alert('일괄 열람할 일자를 1개 이상 선택해주세요.');
      return;
    }

    closeSearchModal();
    // 모든 열람은 양식 깨짐이 없는 책 뷰어(양면 펼침 바인더) 형식으로 실행
    await openBookViewer(selectedDates, selectedDates[0]);
  }

  function exitBatchViewMode() {
    if (batchViewBanner) batchViewBanner.style.display = 'none';
    if (batchViewContainer) {
      batchViewContainer.style.display = 'none';
      batchViewContainer.innerHTML = '';
    }
    if (singleWorkspace) singleWorkspace.style.display = 'flex';
  }

  if (btnModalBatchView) btnModalBatchView.addEventListener('click', executeBatchView);
  if (btnExitBatchView) btnExitBatchView.addEventListener('click', exitBatchViewMode);

  // ============================================================
  // 일괄 인쇄 (Batch Print - A4 다중 페이지) 실행
  // ============================================================
  const batchPrintContainer = document.getElementById('batchPrintContainer');
  const btnModalBatchPrint = document.getElementById('btnModalBatchPrint');

  async function executeBatchPrint() {
    const selectedDates = getSelectedDates();
    if (selectedDates.length === 0) {
      alert('일괄 인쇄할 일자를 1개 이상 선택해주세요.');
      return;
    }

    if (!batchPrintContainer) return;
    batchPrintContainer.innerHTML = '';

    const allRecords = await fetchAllAvailableRecords();
    const recordsMap = new Map(allRecords.map(r => [r.date, r]));

    const printSheetsHtml = selectedDates.map(dateStr => {
      const rec = recordsMap.get(dateStr) || { date: dateStr, formattedDate: getFormattedDateString(dateStr) };
      return buildSheetsHtmlForRecord(rec, true);
    }).join('');

    batchPrintContainer.innerHTML = printSheetsHtml;
    document.body.classList.add('printing-batch');

    setTimeout(() => {
      window.print();
    }, 250);

    const cleanupPrint = () => {
      document.body.classList.remove('printing-batch');
      batchPrintContainer.innerHTML = '';
      window.removeEventListener('afterprint', cleanupPrint);
    };
    window.addEventListener('afterprint', cleanupPrint);
    setTimeout(cleanupPrint, 3000);
  }

  if (btnModalBatchPrint) btnModalBatchPrint.addEventListener('click', executeBatchPrint);
  if (btnBatchPrintCurrent) btnBatchPrintCurrent.addEventListener('click', executeBatchPrint);

  // ============================================================
  // 일괄 엑셀 (Batch Excel - 다중 시트) 다운로드
  // ============================================================
  const btnModalBatchExcel = document.getElementById('btnModalBatchExcel');

  async function executeBatchExcel() {
    const selectedDates = getSelectedDates();
    if (selectedDates.length === 0) {
      alert('일괄 엑셀로 내보낼 일자를 1개 이상 선택해주세요.');
      return;
    }

    if (!window.ExcelJS) {
      alert('ExcelJS 라이브러리가 로드되지 않았습니다.');
      return;
    }

    const allRecords = await fetchAllAvailableRecords();
    const recordsMap = new Map(allRecords.map(r => [r.date, r]));

    const workbook = new window.ExcelJS.Workbook();
    workbook.creator = '대림 공조기록 시스템';

    for (const dateStr of selectedDates) {
      const data = recordsMap.get(dateStr) || { date: dateStr };
      const sheetName = dateStr.replace(/-/g, '').slice(4);
      const sheet = workbook.addWorksheet(sheetName);

      sheet.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 2 };
      sheet.columns = [
        { width: 5 }, { width: 5 }, { width: 5 }, { width: 7 },
        { width: 7 }, { width: 5 }, { width: 5 }, { width: 5 },
        { width: 5 }, { width: 5 }, { width: 5 }, { width: 6 },
        { width: 6 }, { width: 6 }, { width: 6 }, { width: 8 }
      ];

      sheet.mergeCells('A1:L3');
      const titleCell = sheet.getCell('A1');
      titleCell.value = '대기배출시설 및 방지시설 운영기록부';
      titleCell.font = { name: '맑은 고딕', size: 14, bold: true };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.mergeCells('M1:M3');
      sheet.getCell('M1').value = '결\n재';
      sheet.getCell('M1').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      sheet.getCell('N1').value = '담당';
      sheet.getCell('O1').value = '부서장';
      sheet.getCell('P1').value = '환경기술인';

      sheet.mergeCells('A4:P4');
      const weatherText = data.weatherInfo ? `${data.weatherInfo.weather || '맑음'} (기온: ${data.weatherInfo.temp || '-'})` : '맑음';
      sheet.getCell('A4').value = `■ 작성일자: ${data.formattedDate || dateStr}   |   ■ 날씨: ${weatherText}`;
      sheet.getCell('A4').font = { bold: true };

      sheet.mergeCells('A6:P6'); sheet.getCell('A6').value = '1. 배출시설 운전사항'; sheet.getCell('A6').font = { bold: true };
      sheet.mergeCells('A7:B7'); sheet.getCell('A7').value = '배출구';
      sheet.mergeCells('C7:H7'); sheet.getCell('C7').value = '배출시설명';
      sheet.mergeCells('I7:M7'); sheet.getCell('I7').value = '가동시간';
      sheet.mergeCells('N7:P7'); sheet.getCell('N7').value = '비고';

      let rIdx = 8;
      (data.exhaustList || []).forEach(item => {
        sheet.mergeCells(`A${rIdx}:B${rIdx}`); sheet.getCell(`A${rIdx}`).value = item.id + '번';
        sheet.mergeCells(`C${rIdx}:H${rIdx}`); sheet.getCell(`C${rIdx}`).value = item.facility;
        sheet.mergeCells(`I${rIdx}:M${rIdx}`); sheet.getCell(`I${rIdx}`).value = item.opTime;
        sheet.mergeCells(`N${rIdx}:P${rIdx}`); sheet.getCell(`N${rIdx}`).value = item.note;
        rIdx++;
      });

      rIdx++;
      sheet.mergeCells(`A${rIdx}:P${rIdx}`); sheet.getCell(`A${rIdx}`).value = '2. 방지시설 운전사항 (면제)'; sheet.getCell(`A${rIdx}`).font = { bold: true };
      rIdx++;
      sheet.mergeCells(`A${rIdx}:P${rIdx}`); sheet.getCell(`A${rIdx}`).value = '방지시설 설치 면제 사업장 (기록 생략)';
      sheet.getCell(`A${rIdx}`).alignment = { horizontal: 'center' };
      rIdx += 2;

      sheet.mergeCells('A${rIdx}:P${rIdx}'); sheet.getCell(`A${rIdx}`).value = '3. 환경기술인 의견 및 특이사항'; sheet.getCell(`A${rIdx}`).font = { bold: true };
      rIdx++;
      sheet.mergeCells(`A${rIdx}:P${rIdx}`); sheet.getCell(`A${rIdx}`).value = data.engineerOpinion || (data.isHoliday ? '휴무' : '미가동');

      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          if (!cell.font) cell.font = { name: '맑은 고딕', size: 9 };
          if (!cell.alignment) cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = `대기배출운영기록부_일괄_${selectedDates.length}건.xlsx`;
    if (window.saveAs) {
      window.saveAs(blob, filename);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  if (btnModalBatchExcel) btnModalBatchExcel.addEventListener('click', executeBatchExcel);
  if (btnBatchExcelCurrent) btnBatchExcelCurrent.addEventListener('click', executeBatchExcel);

  // ============================================================
  // 홈 화면 (Home Portal Dashboard) 및 화면 전환 네비게이션 로직
  // ============================================================
  const homeScreen = document.getElementById('homeScreen');
  const editorScreen = document.getElementById('editorScreen');
  const btnBackToHome = document.getElementById('btnBackToHome');
  const btnGoEditorToday = document.getElementById('btnGoEditorToday');
  const btnGoBookViewerAll = document.getElementById('btnGoBookViewerAll');
  const btnGoSearchModal = document.getElementById('btnGoSearchModal');
  const btnHomeOpenSupabaseModal = document.getElementById('btnHomeOpenSupabaseModal');
  const homeSupabaseBadge = document.getElementById('homeSupabaseBadge');

  // 홈 빠른 열람 요소들
  const homeQuickDate = document.getElementById('homeQuickDate');
  const btnHomeViewDate = document.getElementById('btnHomeViewDate');
  const homeQuickStart = document.getElementById('homeQuickStart');
  const homeQuickEnd = document.getElementById('homeQuickEnd');
  const btnHomeViewRange = document.getElementById('btnHomeViewRange');
  const btnHomeViewAll = document.getElementById('btnHomeViewAll');

  // 홈 대시보드 통계 요소들
  const statTotalCount = document.getElementById('statTotalCount');
  const statLatestDate = document.getElementById('statLatestDate');

  // 홈 포털 대시보드 화면 표시 함수
  async function showHomeScreen() {
    if (bookViewerModal) bookViewerModal.style.display = 'none';
    if (editorScreen) editorScreen.style.display = 'none';
    if (homeScreen) homeScreen.style.display = 'flex';
    document.body.style.overflow = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await updateHomePortalStats();
  }

  // 단일 작성 및 편집 화면 표시 함수
  function showEditorScreen(targetDate = null) {
    if (homeScreen) homeScreen.style.display = 'none';
    if (bookViewerModal) bookViewerModal.style.display = 'none';
    if (editorScreen) editorScreen.style.display = 'block';
    document.body.style.overflow = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const dateToLoad = targetDate || recordDateInput.value || new Date().toISOString().split('T')[0];
    recordDateInput.value = dateToLoad;
    loadRecord(dateToLoad);
  }

  // 홈 포털 통계 요약 갱신 함수
  async function updateHomePortalStats() {
    // 서버 및 Supabase, localStorage의 모든 기록을 일괄 로드하여 동기화
    const allRecords = await fetchAllAvailableRecords();
    const sortedDates = allRecords.map(r => r.date).sort();
    const count = sortedDates.length;
    const latest = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : new Date().toISOString().split('T')[0];

    if (statTotalCount) statTotalCount.textContent = `${count} 일`;
    if (statLatestDate) statLatestDate.textContent = latest;
    if (homeQuickDate && !homeQuickDate.value) homeQuickDate.value = latest;
    if (homeEditDate && !homeEditDate.value) homeEditDate.value = latest;
    if (homeQuickStart && !homeQuickStart.value && sortedDates.length > 0) homeQuickStart.value = sortedDates[0];
    if (homeQuickEnd && !homeQuickEnd.value) homeQuickEnd.value = latest;

    // Supabase 연동 배지 상태 동기화
    if (homeSupabaseBadge) {
      if (window.SupabaseService && window.SupabaseService.isSupabaseConfigured()) {
        homeSupabaseBadge.textContent = '⚡ Supabase 연동됨';
        homeSupabaseBadge.style.background = '#10b981';
      } else {
        homeSupabaseBadge.textContent = '⚡ Supabase 미연동';
        homeSupabaseBadge.style.background = '#64748b';
      }
    }
  }

  // ============================================================
  // ============================================================
  // 책 넘김 바인더 뷰어 (Flipbook / Binder Viewer) 로직 & 5대 추가 기능
  // ============================================================
  const bookViewerModal = document.getElementById('bookViewerModal');
  const bookPageIndicator = document.getElementById('bookPageIndicator');
  const bookBottomIndicator = document.getElementById('bookBottomIndicator');
  const bookDateSelect = document.getElementById('bookDateSelect');
  const btnBookBackHome = document.getElementById('btnBookBackHome');
  const btnBookPrevTop = document.getElementById('btnBookPrevTop');
  const btnBookNextTop = document.getElementById('btnBookNextTop');
  const btnBookPrevSide = document.getElementById('btnBookPrevSide');
  const btnBookNextSide = document.getElementById('btnBookNextSide');
  const btnBookPrevBottom = document.getElementById('btnBookPrevBottom');
  const btnBookNextBottom = document.getElementById('btnBookNextBottom');
  const btnCloseBookViewer = document.getElementById('btnCloseBookViewer');
  const btnBookPrintCurrent = document.getElementById('btnBookPrintCurrent');
  const btnBookPrintAll = document.getElementById('btnBookPrintAll');
  const btnBookEditCurrent = document.getElementById('btnBookEditCurrent');
  const bookLeftPage = document.getElementById('bookLeftPage');
  const bookRightPage = document.getElementById('bookRightPage');
  const bookSpread = document.getElementById('bookSpread');
  const btnOpenBookViewer = document.getElementById('btnOpenBookViewer');
  const btnModalBookView = document.getElementById('btnModalBookView');

  // 신규 추가 기능 컨트롤 요소
  const btnBookThumbnails = document.getElementById('btnBookThumbnails');
  const bookThumbnailDrawer = document.getElementById('bookThumbnailDrawer');
  const btnCloseThumbnailDrawer = document.getElementById('btnCloseThumbnailDrawer');
  const inputThumbnailSearch = document.getElementById('inputThumbnailSearch');
  const bookThumbnailList = document.getElementById('bookThumbnailList');

  const btnBookViewMode = document.getElementById('btnBookViewMode');
  const singlePageToggleBar = document.getElementById('singlePageToggleBar');

  const btnBookZoomOut = document.getElementById('btnBookZoomOut');
  const btnBookZoomFit = document.getElementById('btnBookZoomFit');
  const btnBookZoomIn = document.getElementById('btnBookZoomIn');
  const btnBookZoomReset = document.getElementById('btnBookZoomReset');
  const btnBookFullscreen = document.getElementById('btnBookFullscreen');

  // 책 넘김 뷰어 상태 변수
  let bookRecordList = []; // [{ date: '2026-09-01', data: {...} }, ...]
  let bookCurrentIndex = 0;
  let bookZoomLevel = 1.0;
  let isBookFitMode = true;
  let isSinglePageMode = false;
  let singlePageSheet = 'front'; // 'front' | 'back'
  let isThumbnailDrawerOpen = false;

  // 요일 한글 변환 헬퍼 함수
  function getKoreanDayOfWeek(dateStr) {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const d = new Date(dateStr);
    return days[d.getDay()] || '';
  }

  // 1. 줌 & 화면 맞춤 제어 함수
  function applyBookZoom() {
    if (!bookSpread) return;

    if (isBookFitMode) {
      const bookStage = document.getElementById('bookStage') || document.querySelector('.book-stage');
      if (bookStage) {
        const stageW = bookStage.clientWidth - (isThumbnailDrawerOpen ? 340 : 120);
        const stageH = bookStage.clientHeight - 40;
        const targetW = isSinglePageMode ? 820 : 1660; // A4 단면 vs 양면 펼침 기준 폭
        const targetH = 1140; // A4 높이 기준

        const scaleW = stageW / targetW;
        const scaleH = stageH / targetH;
        bookZoomLevel = Math.min(scaleW, scaleH);
        bookZoomLevel = Math.max(0.35, Math.min(1.4, bookZoomLevel));
      }
    }

    bookSpread.style.transform = `scale(${bookZoomLevel.toFixed(3)})`;
    bookSpread.style.transformOrigin = 'top center';

    if (btnBookZoomFit) {
      btnBookZoomFit.classList.toggle('active', isBookFitMode);
    }
    if (btnBookZoomReset) {
      btnBookZoomReset.classList.toggle('active', !isBookFitMode && Math.abs(bookZoomLevel - 1.0) < 0.05);
    }
  }

  function setZoom(level) {
    isBookFitMode = false;
    bookZoomLevel = Math.max(0.35, Math.min(2.0, level));
    applyBookZoom();
  }

  // 2. 단면 / 양면 보기 전환 토글 함수
  function toggleBookViewMode() {
    isSinglePageMode = !isSinglePageMode;
    if (btnBookViewMode) {
      btnBookViewMode.innerHTML = isSinglePageMode ? '📄 단면 보기' : '📖 양면 보기';
      btnBookViewMode.classList.toggle('active', isSinglePageMode);
    }
    if (singlePageToggleBar) {
      singlePageToggleBar.style.display = isSinglePageMode ? 'flex' : 'none';
    }
    const bookStage = document.getElementById('bookStage');
    if (bookStage) {
      bookStage.classList.toggle('book-single-mode', isSinglePageMode);
    }

    updateSinglePageVisibility();
    applyBookZoom();
  }

  function updateSinglePageVisibility() {
    if (!isSinglePageMode) {
      if (bookLeftPage) bookLeftPage.classList.remove('hidden-in-single');
      if (bookRightPage) bookRightPage.classList.remove('hidden-in-single');
      return;
    }

    if (singlePageSheet === 'front') {
      if (bookLeftPage) bookLeftPage.classList.remove('hidden-in-single');
      if (bookRightPage) bookRightPage.classList.add('hidden-in-single');
    } else {
      if (bookLeftPage) bookLeftPage.classList.add('hidden-in-single');
      if (bookRightPage) bookRightPage.classList.remove('hidden-in-single');
    }

    const singleTabs = document.querySelectorAll('.btn-single-sheet-tab');
    singleTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.sheet === singlePageSheet);
    });
  }

  // 3. 전체화면 전환 토글 함수
  function toggleBookFullscreen() {
    if (!document.fullscreenElement) {
      if (bookViewerModal.requestFullscreen) {
        bookViewerModal.requestFullscreen();
      } else if (bookViewerModal.webkitRequestFullscreen) {
        bookViewerModal.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // 4. 썸네일 목차 서랍 패널 렌더링 및 토글
  function renderThumbnailDrawer(searchFilter = '') {
    if (!bookThumbnailList) return;
    const filter = (searchFilter || '').trim().toLowerCase();

    const filtered = bookRecordList.map((item, idx) => ({ ...item, idx })).filter(item => {
      if (!filter) return true;
      const tag = item.data.isHoliday ? '휴무' : (item.data.status === 'NORMAL' ? '가동' : '미가동');
      const text = `${item.date} ${getKoreanDayOfWeek(item.date)} ${tag} ${item.data.holidayReason || ''}`.toLowerCase();
      return text.includes(filter);
    });

    if (filtered.length === 0) {
      bookThumbnailList.innerHTML = `<div style="text-align:center; padding:30px 10px; color:#94a3b8; font-size:0.85rem;">검색 결과가 없습니다.</div>`;
      return;
    }

    bookThumbnailList.innerHTML = filtered.map(item => {
      const isActive = item.idx === bookCurrentIndex;
      const holidayClass = item.data.isHoliday ? 'holiday' : (item.data.status === 'NORMAL' ? 'normal' : 'idle');
      const holidayTag = item.data.isHoliday ? '🏖️ 휴무' : (item.data.status === 'NORMAL' ? '🟢 가동' : '⚡ 미가동');
      const dayName = getKoreanDayOfWeek(item.date);

      return `
        <div class="book-thumb-item ${isActive ? 'active' : ''}" data-index="${item.idx}">
          <div class="book-thumb-top">
            <span class="book-thumb-date">${item.date} (${dayName})</span>
            <span class="book-thumb-badge ${holidayClass}">${holidayTag}</span>
          </div>
          <div class="book-thumb-bottom">
            <span>페이지 ${item.idx + 1} / ${bookRecordList.length}</span>
            <span style="color:#64748b;">${item.data.isHoliday ? (item.data.holidayReason || '휴무') : (item.data.workHours || '09:00~18:00')}</span>
          </div>
        </div>
      `;
    }).join('');

    bookThumbnailList.querySelectorAll('.book-thumb-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        if (!isNaN(idx)) {
          const dir = idx > bookCurrentIndex ? 'next' : 'prev';
          bookCurrentIndex = idx;
          renderBookSpread(dir);
          highlightActiveThumbnail();
        }
      });
    });
  }

  function highlightActiveThumbnail() {
    if (!bookThumbnailList) return;
    bookThumbnailList.querySelectorAll('.book-thumb-item').forEach(el => {
      const idx = parseInt(el.getAttribute('data-index'), 10);
      el.classList.toggle('active', idx === bookCurrentIndex);
    });
  }

  function toggleThumbnailDrawer() {
    isThumbnailDrawerOpen = !isThumbnailDrawerOpen;
    if (bookThumbnailDrawer) {
      bookThumbnailDrawer.classList.toggle('hidden', !isThumbnailDrawerOpen);
    }
    if (btnBookThumbnails) {
      btnBookThumbnails.classList.toggle('active', isThumbnailDrawerOpen);
    }
    if (isThumbnailDrawerOpen) {
      renderThumbnailDrawer(inputThumbnailSearch ? inputThumbnailSearch.value : '');
    }
    setTimeout(applyBookZoom, 200);
  }

  // 5. 인쇄 및 PDF 저장 함수
  function printBookCurrentRecord() {
    if (bookRecordList.length === 0) return;
    const currentItem = bookRecordList[bookCurrentIndex];
    if (!currentItem) return;

    let printArea = document.getElementById('bookPrintArea');
    if (!printArea) {
      printArea = document.createElement('div');
      printArea.id = 'bookPrintArea';
      document.body.appendChild(printArea);
    }

    const pages = getRecordPagesHtml(currentItem.data, true);
    printArea.innerHTML = pages.frontHtml + pages.backHtml;

    document.body.classList.add('printing-book');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-book');
      if (printArea) printArea.innerHTML = '';
    }, 500);
  }

  function printAllBookPages() {
    if (bookRecordList.length === 0) {
      alert('인쇄할 운영기록이 없습니다.');
      return;
    }

    const count = bookRecordList.length;
    const confirmMsg = `총 ${count}개 일자의 운영기록부(총 ${count * 2}페이지)를 일괄 인쇄(PDF 저장)하시겠습니까?\n\n(브라우저 인쇄 창에서 대상을 'PDF로 저장'으로 선택하시면 단일 PDF 파일로 저장됩니다)`;
    if (!confirm(confirmMsg)) return;

    let printArea = document.getElementById('bookPrintArea');
    if (!printArea) {
      printArea = document.createElement('div');
      printArea.id = 'bookPrintArea';
      document.body.appendChild(printArea);
    }

    let allHtml = '';
    for (const item of bookRecordList) {
      const pages = getRecordPagesHtml(item.data, true);
      allHtml += pages.frontHtml + pages.backHtml;
    }

    printArea.innerHTML = allHtml;
    document.body.classList.add('printing-book');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-book');
      if (printArea) printArea.innerHTML = '';
    }, 1000);
  }

  // 책 넘김 바인더 뷰어 열기
  async function openBookViewer(specifiedDates = null, initialDate = null) {
    if (!bookViewerModal) return;

    // 1. 전체 가용 운영기록 일괄 로드 및 동기화
    const allRecords = await fetchAllAvailableRecords();
    const recordsMap = new Map(allRecords.map(r => [r.date, r]));

    let targetDates = [];

    // 2. 대상 일자 목록 구성
    if (specifiedDates && specifiedDates.length > 0) {
      targetDates = [...specifiedDates].sort();
    } else {
      targetDates = Array.from(recordsMap.keys()).sort();
    }

    if (targetDates.length === 0) {
      alert('열람할 운영기록이 없습니다. 먼저 기록을 생성하거나 동기화해 주세요.');
      return;
    }

    // 3. 각 일자의 전체 기록 데이터 수집 (누락 일자는 안전 템플릿 생성)
    bookRecordList = [];
    for (const dateStr of targetDates) {
      let rec = recordsMap.get(dateStr);
      if (!rec) {
        rec = await fetchSingleRecord(dateStr);
      }
      if (!rec) {
        // 기록이 없는 경우 기본 휴무/미가동 템플릿 생성
        const d = new Date(dateStr + 'T00:00:00');
        const isWeekend = (d.getDay() === 0 || d.getDay() === 6);
        rec = {
          date: dateStr,
          formattedDate: getFormattedDateString(dateStr),
          isHoliday: isWeekend,
          holidayReason: isWeekend ? '주말 휴무' : '미가동',
          status: isWeekend ? 'HOLIDAY' : 'IDLE',
          workHours: '09:00 ~ 18:00',
          exhaustList: [
            { id: '1', facility: '혼합시설', opTime: '-', note: isWeekend ? '휴무' : '미가동' },
            { id: '2', facility: '혼합시설', opTime: '-', note: isWeekend ? '휴무' : '미가동' },
            { id: '3', facility: '혼합시설', opTime: '-', note: isWeekend ? '휴무' : '미가동' },
            { id: '4', facility: '혼합시설', opTime: '-', note: isWeekend ? '휴무' : '미가동' }
          ],
          preventionOperation: { exempt: true, text: '방지시설 면제', rows: [] },
          preventionMaintenance: { rows: [] },
          selfMeasurement: { measureDate: dateStr, rows: [] },
          fuelUsage: '-',
          rawMaterialUsage: '-',
          engineerOpinion: isWeekend ? '주말 휴무로 설비 미가동.' : '특이사항 없음. 정상 가동 대기.',
          technician: { name: '윤경용' }
        };
      }
      bookRecordList.push({ date: dateStr, data: rec });
    }

    if (bookRecordList.length === 0) {
      alert('운영기록 데이터를 불러올 수 없습니다.');
      return;
    }

    // 4. 상단 날짜 선택 드롭다운 채우기
    if (bookDateSelect) {
      bookDateSelect.innerHTML = '';
      bookRecordList.forEach((item, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        const holidayTag = item.data.isHoliday ? '🏖️ 휴무' : (item.data.status === 'NORMAL' ? '🟢 가동' : '⚡ 미가동');
        opt.textContent = `${item.date} (${getKoreanDayOfWeek(item.date)}) - ${holidayTag}`;
        bookDateSelect.appendChild(opt);
      });
    }

    // 5. 초기 펼칠 페이지 인덱스 설정
    let startIdx = 0;
    if (initialDate) {
      const found = bookRecordList.findIndex(item => item.date === initialDate);
      if (found !== -1) startIdx = found;
    } else {
      const curInputVal = recordDateInput.value;
      const found = bookRecordList.findIndex(item => item.date === curInputVal);
      if (found !== -1) startIdx = found;
    }

    bookCurrentIndex = startIdx;
    isBookFitMode = true;
    renderBookSpread();

    // 뷰어 모달 표시 및 초기 줌 자동 계산
    bookViewerModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(applyBookZoom, 150);
  }

  // 양면 펼침 바인더 현재 페이지 렌더링
  function renderBookSpread(animationDirection = null) {
    if (!bookSpread || bookRecordList.length === 0) return;

    const currentItem = bookRecordList[bookCurrentIndex];
    if (!currentItem) return;

    // 인디케이터 배지 및 드롭다운 동기화
    const indicatorText = `${bookCurrentIndex + 1} / ${bookRecordList.length}`;
    if (bookPageIndicator) bookPageIndicator.textContent = indicatorText;
    if (bookBottomIndicator) bookBottomIndicator.textContent = indicatorText;
    if (bookDateSelect) bookDateSelect.value = bookCurrentIndex;

    // 이전/다음 버튼 활성/비활성화 처리
    const isFirst = bookCurrentIndex === 0;
    const isLast = bookCurrentIndex === bookRecordList.length - 1;
    if (btnBookPrevTop) btnBookPrevTop.disabled = isFirst;
    if (btnBookNextTop) btnBookNextTop.disabled = isLast;
    if (btnBookPrevSide) btnBookPrevSide.disabled = isFirst;
    if (btnBookNextSide) btnBookNextSide.disabled = isLast;
    if (btnBookPrevBottom) btnBookPrevBottom.disabled = isFirst;
    if (btnBookNextBottom) btnBookNextBottom.disabled = isLast;

    // 책 넘김 3D 플립 애니메이션 적용
    bookSpread.classList.remove('flip-animation-next', 'flip-animation-prev');
    if (animationDirection === 'next') {
      void bookSpread.offsetWidth;
      bookSpread.classList.add('flip-animation-next');
    } else if (animationDirection === 'prev') {
      void bookSpread.offsetWidth;
      bookSpread.classList.add('flip-animation-prev');
    }

    // 양면 서식 HTML 주입: 좌측(앞면: 배출시설 운영기록), 우측(뒷면: 자가측정 및 원료연료)
    const pages = getRecordPagesHtml(currentItem.data, false);
    if (bookLeftPage) {
      bookLeftPage.innerHTML = pages.frontHtml;
    }
    if (bookRightPage) {
      bookRightPage.innerHTML = pages.backHtml;
    }

    updateSinglePageVisibility();
    highlightActiveThumbnail();

    const bookStage = document.getElementById('bookStage') || document.querySelector('.book-stage');
    if (bookStage) bookStage.scrollTop = 0;
  }

  // 이전/다음 페이지 탐색
  function navigateBook(direction) {
    if (direction === 'prev' && bookCurrentIndex > 0) {
      bookCurrentIndex--;
      renderBookSpread('prev');
    } else if (direction === 'next' && bookCurrentIndex < bookRecordList.length - 1) {
      bookCurrentIndex++;
      renderBookSpread('next');
    }
  }

  // 책 넘김 뷰어 닫기
  function closeBookViewer() {
    if (bookViewerModal) {
      bookViewerModal.style.display = 'none';
      document.body.style.overflow = '';
      if (document.fullscreenElement) {
        try { document.exitFullscreen(); } catch (e) {}
      }
    }
  }

  // 현재 보고 있는 일자를 메인 편집기로 로드하고 뷰어 닫기
  function editBookCurrentRecord() {
    if (bookRecordList.length === 0) return;
    const currentItem = bookRecordList[bookCurrentIndex];
    if (!currentItem) return;

    const targetDate = currentItem.date;
    closeBookViewer();
    showEditorScreen(targetDate);
  }

  // 이벤트 리스너 등록
  if (btnBookPrevTop) btnBookPrevTop.addEventListener('click', () => navigateBook('prev'));
  if (btnBookNextTop) btnBookNextTop.addEventListener('click', () => navigateBook('next'));
  if (btnBookPrevSide) btnBookPrevSide.addEventListener('click', () => navigateBook('prev'));
  if (btnBookNextSide) btnBookNextSide.addEventListener('click', () => navigateBook('next'));
  if (btnBookPrevBottom) btnBookPrevBottom.addEventListener('click', () => navigateBook('prev'));
  if (btnBookNextBottom) btnBookNextBottom.addEventListener('click', () => navigateBook('next'));

  if (btnCloseBookViewer) btnCloseBookViewer.addEventListener('click', closeBookViewer);
  if (btnBookPrintCurrent) btnBookPrintCurrent.addEventListener('click', printBookCurrentRecord);
  if (btnBookPrintAll) btnBookPrintAll.addEventListener('click', printAllBookPages);
  if (btnBookEditCurrent) btnBookEditCurrent.addEventListener('click', editBookCurrentRecord);

  // 줌 컨트롤 리스너
  if (btnBookZoomOut) btnBookZoomOut.addEventListener('click', () => setZoom(bookZoomLevel - 0.1));
  if (btnBookZoomIn) btnBookZoomIn.addEventListener('click', () => setZoom(bookZoomLevel + 0.1));
  if (btnBookZoomReset) btnBookZoomReset.addEventListener('click', () => setZoom(1.0));
  if (btnBookZoomFit) btnBookZoomFit.addEventListener('click', () => { isBookFitMode = true; applyBookZoom(); });

  // 단면/양면 보기 토글 및 단면 탭 리스너
  if (btnBookViewMode) btnBookViewMode.addEventListener('click', toggleBookViewMode);
  document.querySelectorAll('.btn-single-sheet-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      singlePageSheet = tab.dataset.sheet || 'front';
      updateSinglePageVisibility();
    });
  });

  // 전체화면 토글 리스너
  if (btnBookFullscreen) btnBookFullscreen.addEventListener('click', toggleBookFullscreen);
  document.addEventListener('fullscreenchange', () => {
    if (btnBookFullscreen) {
      const isFs = !!document.fullscreenElement;
      btnBookFullscreen.innerHTML = isFs ? '⛶ 창모드' : '⛶ 전체화면';
      btnBookFullscreen.classList.toggle('active', isFs);
    }
    setTimeout(applyBookZoom, 150);
  });

  // 썸네일 목차 서랍 리스너
  if (btnBookThumbnails) btnBookThumbnails.addEventListener('click', toggleThumbnailDrawer);
  if (btnCloseThumbnailDrawer) btnCloseThumbnailDrawer.addEventListener('click', toggleThumbnailDrawer);
  if (inputThumbnailSearch) {
    inputThumbnailSearch.addEventListener('input', (e) => {
      renderThumbnailDrawer(e.target.value);
    });
  }

  // 창 크기 변경 시 맞춤 줌 자동 재계산
  window.addEventListener('resize', () => {
    if (bookViewerModal && bookViewerModal.style.display === 'flex' && isBookFitMode) {
      applyBookZoom();
    }
  });

  // 책 뷰어 상단 [🏠 홈으로] 버튼
  if (btnBookBackHome) {
    btnBookBackHome.addEventListener('click', () => {
      closeBookViewer();
      showHomeScreen();
    });
  }

  if (bookDateSelect) {
    bookDateSelect.addEventListener('change', (e) => {
      const newIdx = parseInt(e.target.value, 10);
      if (!isNaN(newIdx) && newIdx >= 0 && newIdx < bookRecordList.length) {
        const dir = newIdx > bookCurrentIndex ? 'next' : 'prev';
        bookCurrentIndex = newIdx;
        renderBookSpread(dir);
      }
    });
  }

  // 키보드 방향키, PageUp/PageDown 책장 넘김 및 ESC 닫기 단축키
  window.addEventListener('keydown', (e) => {
    if (bookViewerModal && bookViewerModal.style.display === 'flex') {
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        navigateBook('prev');
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        navigateBook('next');
      } else if (e.key === 'Home') {
        e.preventDefault();
        bookCurrentIndex = 0;
        renderBookSpread('prev');
      } else if (e.key === 'End') {
        e.preventDefault();
        bookCurrentIndex = bookRecordList.length - 1;
        renderBookSpread('next');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeBookViewer();
      }
    }
  });

  // 헤더 [📖 책 넘김 뷰어] 버튼 클릭 이벤트
  if (btnOpenBookViewer) {
    btnOpenBookViewer.addEventListener('click', () => {
      openBookViewer(null, recordDateInput.value);
    });
  }

  // 검색 모달 내 [📖 책 넘김 뷰어로 열기] 버튼 클릭 이벤트
  if (btnModalBookView) {
    btnModalBookView.addEventListener('click', () => {
      const selectedDates = getSelectedDates();
      if (selectedDates.length === 0) {
        alert('책 넘김 뷰어로 열람할 일자를 하나 이상 선택해 주세요.');
        return;
      }
      closeSearchModal();
      openBookViewer(selectedDates, selectedDates[0]);
    });
  }

  // ============================================================
  // 홈 화면 버튼 이벤트 연결
  // ============================================================
  // 1. [🏠 홈으로] 뒤로가기 버튼
  if (btnBackToHome) {
    btnBackToHome.addEventListener('click', () => {
      showHomeScreen();
    });
  }

  // 2. 홈 카드: [✍️ 운영기록부 작성 / 편집]
  if (btnGoEditorToday) {
    btnGoEditorToday.addEventListener('click', () => {
      showEditorScreen(new Date().toISOString().split('T')[0]);
    });
  }

  // 2-1. 특정 일자 선택 편집
  const homeEditDate = document.getElementById('homeEditDate');
  const btnGoEditorDate = document.getElementById('btnGoEditorDate');
  if (btnGoEditorDate) {
    btnGoEditorDate.addEventListener('click', () => {
      const d = homeEditDate.value;
      if (!d) {
        alert('편집할 일자를 선택해 주세요.');
        return;
      }
      showEditorScreen(d);
    });
  }

  // 3. 홈 카드: [📖 책 뷰어로 전체 열람]
  if (btnGoBookViewerAll) {
    btnGoBookViewerAll.addEventListener('click', () => {
      openBookViewer();
    });
  }

  // 4. 홈 카드: [📑 일괄 검색 및 인쇄 창]
  if (btnGoSearchModal) {
    btnGoSearchModal.addEventListener('click', () => {
      openSearchModal();
    });
  }

  // 5. 홈 상단: [⚡ 클라우드 설정]
  if (btnHomeOpenSupabaseModal && btnSupabaseModal) {
    btnHomeOpenSupabaseModal.addEventListener('click', () => {
      btnSupabaseModal.click();
    });
  }

  // 6. 빠른 일자 선택 열람
  if (btnHomeViewDate) {
    btnHomeViewDate.addEventListener('click', () => {
      const d = homeQuickDate.value;
      if (!d) {
        alert('열람할 일자를 선택해 주세요.');
        return;
      }
      openBookViewer([d], d);
    });
  }

  // 7. 빠른 기간 선택 열람
  if (btnHomeViewRange) {
    btnHomeViewRange.addEventListener('click', () => {
      const start = homeQuickStart.value;
      const end = homeQuickEnd.value;
      if (!start || !end) {
        alert('시작일과 종료일을 모두 선택해 주세요.');
        return;
      }
      if (start > end) {
        alert('시작일은 종료일보다 이전이어야 합니다.');
        return;
      }

      // 지정 기간에 해당하는 모든 일자 추출 (시차 오차 방지)
      const rangeDates = [];
      const [sY, sM, sD] = start.split('-').map(Number);
      const [eY, eM, eD] = end.split('-').map(Number);
      const cur = new Date(sY, sM - 1, sD, 12, 0, 0);
      const endD = new Date(eY, eM - 1, eD, 12, 0, 0);
      while (cur <= endD) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        rangeDates.push(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
      }

      openBookViewer(rangeDates, rangeDates[0]);
    });
  }

  // 8. 빠른 전체 기록 열람 (원클릭)
  if (btnHomeViewAll) {
    btnHomeViewAll.addEventListener('click', () => {
      openBookViewer();
    });
  }

  // 초기 시작: 홈 포털 대시보드 화면을 기본으로 표시하고 최신 데이터 갱신
  const todayStr = new Date().toISOString().split('T')[0];
  recordDateInput.value = todayStr;
  if (homeEditDate) homeEditDate.value = todayStr;
  if (homeQuickDate) homeQuickDate.value = todayStr;
  loadRecord(todayStr); // 오늘 데이터 백그라운드 선로드
  showHomeScreen();     // 홈 화면 진입
});
