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
  // 김포시 월곶면 날씨 연동 함수
  // ============================================================
  async function fetchWolgotWeather(targetDate) {
    btnFetchWeather.disabled = true;
    btnFetchWeather.innerHTML = '⏳ 날씨 조회 중...';

    try {
      const res = await fetch(`/api/weather?date=${targetDate}`);
      const data = await res.json();

      if (data.success) {
        weatherSelect.value = data.weather || '맑음';
        tempRangeInput.value = data.tempStr || `${data.minTemp} ~ ${data.maxTemp}℃`;

        // 자가측정사항 기입칸은 사용자가 직접 입력/수정할 수 있도록 빈칸 유지
        markUnsaved();
      } else {
        alert('날씨 연동 안내: ' + (data.error || '날씨 정보를 불러오지 못했습니다.'));
      }
    } catch (err) {
      console.error('날씨 조회 오류:', err);
      alert('날씨 서버 통신에 실패했습니다.');
    } finally {
      btnFetchWeather.disabled = false;
      btnFetchWeather.innerHTML = '<span style="font-size:1.1rem;">⛅</span> 월곶면 날씨 연동';
    }
  }

  // ============================================================
  // 특정 일자 기록 로드 함수
  // ============================================================
  async function loadRecord(targetDate) {
    displayFormattedDate.textContent = getFormattedDateString(targetDate);
    measureDateInput.value = targetDate;

    try {
      const res = await fetch(`/api/records/${targetDate}`);
      const resJson = await res.json();

      if (resJson.success) {
        const record = resJson.data;

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
        if (resJson.isNew) {
          await fetchWolgotWeather(targetDate);
          markUnsaved();
        } else {
          markSaved();
        }
      }
    } catch (err) {
      console.error('기록 로드 실패:', err);
    }
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
  // 저장하기 API 호출
  // ============================================================
  async function saveCurrentRecord() {
    const targetDate = recordDateInput.value;
    const payload = collectFormData();

    btnSave.disabled = true;
    btnSave.textContent = '💾 저장 중...';

    try {
      const res = await fetch(`/api/records/${targetDate}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        markSaved();
      } else {
        alert('저장 실패: ' + data.message);
      }
    } catch (err) {
      console.error('저장 오류:', err);
      alert('서버 저장 중 오류가 발생했습니다.');
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = '💾 저장하기';
    }
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

  // 인쇄 및 엑셀 다운로드
  btnPrint.addEventListener('click', () => window.print());
  btnExportExcel.addEventListener('click', () => {
    const dateStr = recordDateInput.value;
    window.location.href = `/api/export/excel/${dateStr}`;
  });

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

  // 초기 로딩 (오늘 날짜)
  const todayStr = new Date().toISOString().split('T')[0];
  recordDateInput.value = todayStr;
  loadRecord(todayStr);
});
