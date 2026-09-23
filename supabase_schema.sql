-- ==============================================================================
-- 대림 대기배출시설 및 방지시설 운영기록부 시스템 - SUPABASE 데이터베이스 스키마
-- ==============================================================================
-- [사용 방법]
-- 1. Supabase 대시보드 (https://supabase.com)에 로그인합니다.
-- 2. 본인의 프로젝트를 선택 후 좌측 메뉴의 [SQL Editor]를 클릭합니다.
-- 3. 아래 SQL 내용을 전체 복사하여 붙여넣고 [Run] 버튼을 누르면 테이블 및 보안 설정이 완료됩니다.
-- ==============================================================================

-- 1. UUID 확장 기능 활성화 (필요 시)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 대기배출시설 및 방지시설 운영기록부 테이블 생성
CREATE TABLE IF NOT EXISTS public.air_operation_records (
    record_date DATE PRIMARY KEY,                       -- 기록 일자 (YYYY-MM-DD, 기본키)
    record_data JSONB NOT NULL,                         -- 운영기록부 전체 상세 데이터 (JSON 객체)
    status TEXT DEFAULT 'NORMAL',                       -- 기록 상태 (NORMAL: 정상가동, IDLE: 미가동, HOLIDAY: 휴무)
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Seoul', NOW()), -- 최초 작성 일시
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Seoul', NOW())  -- 최종 수정 일시
);

-- 3. 테이블 설명 주석
COMMENT ON TABLE public.air_operation_records IS '대기배출시설 및 방지시설 일일 운영기록부 데이터 테이블';
COMMENT ON COLUMN public.air_operation_records.record_date IS '기록 일자 (YYYY-MM-DD)';
COMMENT ON COLUMN public.air_operation_records.record_data IS '배출구, 방지시설, 약품/연료, 자가측정, 전자서명 등 전체 데이터';
COMMENT ON COLUMN public.air_operation_records.status IS '상태 (NORMAL / IDLE / HOLIDAY)';

-- 4. 업데이트 일시 자동 갱신 트리거 함수
CREATE OR REPLACE FUNCTION update_air_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('Asia/Seoul', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 트리거 적용
DROP TRIGGER IF EXISTS trigger_air_records_updated_at ON public.air_operation_records;
CREATE TRIGGER trigger_air_records_updated_at
BEFORE UPDATE ON public.air_operation_records
FOR EACH ROW
EXECUTE FUNCTION update_air_records_updated_at();

-- 6. 행 단위 보안 정책 (RLS) 설정
ALTER TABLE public.air_operation_records ENABLE ROW LEVEL SECURITY;

-- 7. 읽기/쓰기/수정/삭제 정책 (공개 웹 클라이언트 접근 허용)
DROP POLICY IF EXISTS "Public access for air_operation_records" ON public.air_operation_records;
CREATE POLICY "Public access for air_operation_records" 
ON public.air_operation_records 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 8. 실시간 변경 감지(Realtime) 복제 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.air_operation_records;
