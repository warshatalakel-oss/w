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
// FIX: Added 'student' and 'counselor' to the UserRole type to support different user dashboards and fix comparison errors.
export type UserRole = 'admin' | 'principal' | 'teacher' | 'student' | 'counselor';

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
    // FIX: Added properties to support principal and student roles.
    studentCodeLimit?: number; // For principal
    stage?: string; // For student
    section?: string; // For student
    classId?: string; // for student
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
    // FIX: Added missing properties to the Student interface to support student portal features.
    studentAccessCode?: string;
    photoUrl?: string;
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

// FIX: Added all missing type definitions for various app features.

export interface ParentContact {
    id: string;
    principalId: string;
    studentName: string;
    parentPhone: string;
    stage: string;
}

export interface StudentSubmission {
    id: string;
    principalId: string;
    studentName: string;
    stage: string;
    formData: Record<string, string>;
    studentPhoto?: string | null;
    submittedAt: string;
    status: 'pending' | 'viewed' | 'approved';
}

export const EVALUATION_RATINGS = ['ممتاز', 'جيد جدا', 'متوسط', 'ضعيف', 'ضعيف جدا'] as const;
export type EvaluationRating = typeof EVALUATION_RATINGS[number];

export interface StudentEvaluation {
    id: string;
    studentId: string;
    principalId: string;
    classId: string;
    subjectId: string;
    subjectName: string;
    teacherId: string;
    teacherName: string;
    rating: EvaluationRating;
    timestamp: string;
}

export interface StudentNotification {
    id: string;
    studentId: string;
    message: string;
    timestamp: string;
    isRead: boolean;
}

export interface MessageAttachment {
    name: string;
    url: string;
    type: 'image' | 'file';
}
export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
    attachment?: MessageAttachment;
}
export interface Conversation {
    id: string;
    principalId: string;
    studentId: string;
    studentName: string;
    teacherId?: string;
    staffName: string;
    subjectName?: string;
    classId?: string;
    groupName?: string;
    lastMessageText: string;
    lastMessageTimestamp: number;
    unreadByStudent: boolean;
    unreadByStaff: boolean;
    isArchived: boolean;
    chatDisabled: boolean;
}

export interface PublishedMonthlyResult {
    monthKey: string;
    monthLabel: string;
    publishedAt: string;
    grades: Array<{
        subjectName: string;
        grade: number | null;
    }>;
}

export interface BehaviorDeduction {
    id: string;
    principalId: string;
    studentId: string;
    classId: string;
    pointsDeducted: number;
    reason: string;
    timestamp: string;
}

export type PlayerSymbol = 'X' | 'O' | '⭐' | '🌙' | '❤️' | '🔷';

export interface XOGamePlayer {
    id: string;
    name: string;
    symbol: PlayerSymbol;
    classId?: string;
    section?: string;
}
export interface XOQuestion {
    id: string;
    principalId: string;
    grade: string;
    subject: string;
    chapter: string;
    questionText: string;
    options: [string, string, string, string];
    correctOptionIndex: number;
    createdBy: 'ai' | string;
    creatorName?: string;
    creatorSchool?: string;
}
export interface XOGameState {
    id: string;
    principalId: string;
    grade: string;
    subject: string;
    status: 'waiting_for_players' | 'in_progress' | 'finished';
    players: [XOGamePlayer, XOGamePlayer | null];
    board: Array<PlayerSymbol | null>;
    xIsNext: boolean;
    winner: PlayerSymbol | 'draw' | null;
    scores: Record<PlayerSymbol, number>;
    currentQuestion: XOQuestion | null;
    questionForSquare: number | null;
    questionTimerStart: number | null;
    chat: ChatMessage[];
    createdAt: number;
    updatedAt: number;
}
export interface XOChallenge {
    id: string;
    challengerId: string;
    challengerName: string;
    challengerClass: string;
    challengerClassId?: string;
    challengerSection?: string;
    targetId: string;
    grade: string;
    subject: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: number;
    gameId?: string;
}
export interface XOOverallLeaderboardEntry {
    studentId: string;
    studentName: string;
    totalPoints: number;
}
export interface XOGameSettings {
    pointsPolicy: 'winner_takes_all' | 'grant_all';
    startTime: string;
    endTime: string;
    questionTimeLimit: number;
    allowSinglePlayer: boolean;
}
export interface XOGameScore {
    studentId: string;
    studentName: string;
    classId?: string;
    section?: string;
    points: number;
}
export interface Announcement {
    id: string;
    principalId: string;
    stage: string;
    message: string;
    timestamp: string;
}

export interface BehavioralVote {
    voterId: string;
    voterName: string;
    criteriaKeys: string[];
}
export interface HonoredStudent {
    studentId: string;
    studentName: string;
    classId: string;
    section: string;
    nominationTimestamp: string;
    votes: Record<string, BehavioralVote>;
    studentPhotoUrl?: string;
}
export interface BehavioralHonorBoard {
    id: string;
    principalId: string;
    stage: string;
    weekStartDate: string;
    honoredStudents: Record<string, HonoredStudent>;
}
export interface HomeworkAttachment {
    name: string;
    url: string;
    type: 'image' | 'file';
}
export interface Homework {
    id: string;
    principalId: string;
    teacherId: string;
    classIds: string[];
    subjectId: string;
    subjectName: string;
    title: string;
    notes: string;
    deadline: string;
    createdAt: string;
    texts?: string[];
    attachments?: HomeworkAttachment[];
}
export interface HomeworkSubmission {
    id: string;
    homeworkId: string;
    studentId: string;
    studentName: string;
    classId: string;
    submittedAt: string;
    texts?: string[];
    attachments?: HomeworkAttachment[];
    status: 'pending' | 'accepted' | 'rejected';
    rejectionReason?: string;
    reviewedAt?: string;
}
export interface HomeworkProgress {
    totalCompleted: number;
    monthlyCompleted?: Record<string, {
        count: number;
        lastTimestamp: number;
    }>;
}
export interface Award {
    id: string;
    name: string;
    description: string;
    icon: string;
    minCompletions: number;
}
