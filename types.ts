// All type definitions for the application

// Basic School-related types
export type SchoolType = 'نهاري' | 'مسائي' | 'خارجي';
export type SchoolGender = 'بنين' | 'بنات' | 'مختلط';
export type SchoolLevel = 'ابتدائية' | 'متوسطة' | 'اعدادية' | 'ثانوية' | 'اعدادي علمي' | 'اعدادي ادبي' | 'ثانوية علمي' | 'ثانوية ادبي';

export interface SchoolSettings {
    schoolName: string;
    principalName: string;
    academicYear: string;
    directorate: string;
    supplementarySubjectsCount: number;
    decisionPoints: number;
    principalPhone: string;
    schoolType: SchoolType;
    schoolGender: SchoolGender;
    schoolLevel: SchoolLevel;
    governorateCode: string;
    schoolCode: string;
    governorateName: string;
    district: string;
    subdistrict: string;
}

export interface Subject {
    id: string;
    name: string;
}

// User and Role types
export type UserRole = 'admin' | 'principal' | 'teacher';

export interface TeacherAssignment {
    classId: string;
    subjectId: string;
}

export interface User {
    id: string;
    name: string;
    email?: string;
    code: string;
    role: UserRole;
    schoolName?: string;
    schoolLevel?: SchoolLevel;
    principalId?: string;
    disabled?: boolean;
    assignments?: TeacherAssignment[];
}

export interface Teacher extends User {
    role: 'teacher';
    assignments: TeacherAssignment[];
}

// Student and Grade types
export interface SubjectGrade {
    firstTerm: number | null;
    midYear: number | null;
    secondTerm: number | null;
    finalExam1st: number | null;
    finalExam2nd: number | null;
    october?: number | null;
    november?: number | null;
    december?: number | null;
    january?: number | null;
    february?: number | null;
    march?: number | null;
    april?: number | null;
}

export interface TeacherSubjectGrade {
    firstSemMonth1: number | null;
    firstSemMonth2: number | null;
    midYear: number | null;
    secondSemMonth1: number | null;
    secondSemMonth2: number | null;
    finalExam?: number | null;
    october?: number | null;
    november?: number | null;
    december?: number | null;
    january?: number | null;
    february?: number | null;
    march?: number | null;
    april?: number | null;
}

export interface Student {
    id: string;
    name: string;
    registrationId?: string;
    birthDate?: string;
    examId?: string;
    yearsOfFailure?: string;
    motherName?: string;
    motherFatherName?: string;
    grades: Record<string, SubjectGrade>;
    teacherGrades?: Record<string, TeacherSubjectGrade>;
}

export interface ClassData {
    id: string;
    stage: string;
    section: string;
    subjects: Subject[];
    students: Student[];
    principalId: string;
    ministerialDecisionPoints?: number;
    ministerialSupplementarySubjects?: number;
    subjects_migrated_v1?: boolean;
}

export interface CalculatedGrade {
    annualPursuit: number | null;
    finalGrade1st: number | null;
    finalGradeWithDecision: number | null;
    decisionApplied: number;
    finalGrade2nd: number | null;
    isExempt: boolean;
    annualPursuitWithDecision?: number | null;
    decisionAppliedOnPursuit?: number;
}

export interface TeacherCalculatedGrade {
    firstSemAvg: number | null;
    secondSemAvg: number | null;
    annualPursuit: number | null;
    primaryFirstTerm?: number | null;
    primarySecondTerm?: number | null;
}

export interface StudentResult {
    status: 'قيد الانتظار' | 'ناجح' | 'مكمل' | 'راسب' | 'مؤهل' | 'مؤهل بقرار' | 'غير مؤهل';
    message: string;
}

export type AbsenceStatus = 'present' | 'absent' | 'excused' | 'runaway';

export interface LeaveRequest {
    id: string;
    teacherId: string;
    principalId: string;
    teacherName: string;
    requestedAt: string;
    status: 'pending' | 'approved' | 'rejected';
    requestBody: string;
    approvalBody?: string;
    rejectionReason?: string;
    daysDeducted?: number;
    resolvedAt?: string;
}

// Scheduling types
export interface ScheduleAssignment {
    subject: string;
    teacher: string;
}
export interface SchedulePeriod {
    period: number;
    assignments: Record<string, ScheduleAssignment>;
}
export type ScheduleData = Record<string, SchedulePeriod[]>;

export interface StudyPlan {
    grades: Record<string, {
        subjects: Record<string, number>;
        total: number;
    }>;
}
interface Slot {
    classId: string;
    day: string;
    period: number;
}
export interface SwapRequest {
    id: string;
    requesterId: string;
    responderId: string;
    originalSlot: Slot;
    requestedSlot: Slot;
    status: 'pending_teacher' | 'pending_principal' | 'approved' | 'rejected';
}

// Yard Duty types
export interface YardDutyLocation {
    id: string;
    name: string;
}
export interface YardDutyAssignment {
    day: string;
    locationId: string;
    teacherId: string;
}
export interface YardDutySchedule {
    principalId: string;
    locations: YardDutyLocation[];
    assignments: YardDutyAssignment[];
}
export interface YardDutySwapRequest {
    id: string;
    requesterId: string;
    responderId: string;
    originalSlot: { day: string, locationId: string };
    requestedSlot: { day: string, locationId: string };
    status: 'pending_teacher' | 'pending_principal' | 'approved' | 'rejected';
}

export interface TeacherSubmission {
    id: string;
    teacherId: string;
    classId: string;
    subjectId: string;
    submittedAt: string;
    grades: Record<string, TeacherSubjectGrade>; // key is studentId
}