
// FIX: Added 'student' and 'counselor' to the Role type and added optional properties to User for different roles.
export type Role = 'admin' | 'principal' | 'teacher' | 'student' | 'counselor';

export type SchoolLevel = 'ابتدائية' | 'متوسطة' | 'اعدادية' | 'ثانوية' | 'اعدادي علمي' | 'اعدادي ادبي' | 'ثانوية علمي' | 'ثانوية ادبي';

export interface User {
    id: string;
    role: Role;
    name: string;
    schoolName?: string; // For principals
    code: string; // Used for login by principals and teachers, students
    email?: string; // For principals and admin
    principalId?: string; // For teachers, counselors, students
    assignments?: TeacherAssignment[]; // For teachers
    schoolLevel?: SchoolLevel; // For principals
    disabled?: boolean; // For admin to disable principal access
    studentCodeLimit?: number; // For principals
    // For students
    stage?: string;
    section?: string;
    classId?: string;
    subject?: string; // for single player game
}


export interface TeacherAssignment {
    classId: string;
    subjectId: string;
}

export interface Teacher extends User {
    role: 'teacher';
    principalId: string;
    assignments: TeacherAssignment[];
}

export interface SchoolSettings {
    schoolName: string;
    principalName: string;
    academicYear: string;
    directorate: string;
    supplementarySubjectsCount: number;
    decisionPoints: number;
    principalPhone?: string;
    schoolType?: string;
    schoolGender?: string;
    schoolLevel?: SchoolLevel;
    governorateCode?: string;
    schoolCode?: string;
    governorateName?: string;
    district?: string;
    subdistrict?: string;
}

export interface Student {
    id: string; // uuid
    name: string;
    registrationId: string;
    birthDate: string;
    examId: string;
    yearsOfFailure?: string;
    motherName?: string;
    motherFatherName?: string;
    grades: Record<string, SubjectGrade>; // key is subject name (Principal's view)
    teacherGrades?: Record<string, TeacherSubjectGrade>;
    photoUrl?: string;
    studentAccessCode?: string;
}

export interface SubjectGrade {
    october?: number | null;
    november?: number | null;
    december?: number | null;
    january?: number | null;
    february?: number | null;
    march?: number | null;
    april?: number | null;
    firstTerm: number | null;
    midYear: number | null;
    secondTerm: number | null;
    finalExam1st: number | null;
    finalExam2nd: number | null;
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


export interface TeacherCalculatedGrade {
    firstSemAvg: number | null;
    secondSemAvg: number | null;
    annualPursuit: number | null;
    primaryFirstTerm?: number | null;
    primarySecondTerm?: number | null;
}

export interface TeacherSubmission {
    id: string;
    teacherId: string;
    classId: string;
    subjectId: string;
    submittedAt: string;
    grades: Record<string, TeacherSubjectGrade>; // studentId -> grades
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

export interface StudentResult {
    status: 'ناجح' | 'مكمل' | 'راسب' | 'قيد الانتظار' | 'مؤهل' | 'غير مؤهل' | 'مؤهل بقرار';
    message: string;
}

export interface Subject {
    id: string;
    name: string;
}

export interface ClassData {
    id: string; // uuid
    stage: string;
    section: string;
    subjects: Subject[];
    students: Student[];
    principalId: string; // Link class to a principal
    ministerialDecisionPoints?: number;
    ministerialSupplementarySubjects?: number;
    subjects_migrated_v1?: boolean; // Migration flag
}

export type AbsenceStatus = 'present' | 'absent' | 'excused' | 'runaway';

export interface AppNotification {
    id: string;
    senderId: string;
    senderName: string;
    recipientScope: 'all_principals' | 'all_teachers';
    message: string;
    timestamp: string;
    isRead?: boolean;
}

// FIX: Added all missing type definitions below
// For Scheduling
export type PlayerSymbol = 'X' | 'O' | '⭐' | '🌙' | '❤️' | '🔷';

export interface ScheduleAssignment {
    subject: string;
    teacher: string;
}

export interface SchedulePeriod {
    period: number;
    assignments: Record<string, ScheduleAssignment>; // key is classNameKey
}

export interface ScheduleData {
    [day: string]: SchedulePeriod[]; // day is "Sunday", "Monday", etc.
}

export interface StudyPlan {
    grades: Record<string, {
        subjects: Record<string, number>;
        total: number;
    }>;
}

export interface SwapRequest {
    id: string;
    requesterId: string;
    responderId: string;
    originalSlot: { classId: string; day: string; period: number };
    requestedSlot: { classId: string; day: string; period: number };
    status: 'pending_teacher' | 'pending_principal' | 'approved' | 'rejected';
}

// For Yard Duty
export interface YardDutyLocation {
    id: string;
    name: string;
}

export interface YardDutyAssignment {
    day: string; // "Saturday", etc.
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

// For Student Management
export interface StudentSubmission {
    id: string;
    principalId: string;
    studentName: string;
    stage: string;
    formData: Record<string, string>;
    studentPhoto: string | null;
    submittedAt: string;
    status: 'pending' | 'viewed';
}

export interface Announcement {
    id: string;
    principalId: string;
    stage: string;
    message: string;
    timestamp: string;
}

export interface ParentContact {
    id: string;
    principalId: string;
    studentName: string;
    parentPhone: string;
    stage: string;
}

// For Student App
export type EvaluationRating = 'ممتاز' | 'جيد جدا' | 'متوسط' | 'ضعيف' | 'ضعيف جدا';
export const EVALUATION_RATINGS: EvaluationRating[] = ['ممتاز', 'جيد جدا', 'متوسط', 'ضعيف', 'ضعيف جدا'];


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
    type: 'image' | 'pdf';
    url: string;
    name: string;
    size: number;
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
    teacherId?: string; // For teacher-student
    classId?: string; // For group chats
    subjectName?: string; // For teacher-student
    groupName?: string; // For group chats
    staffName: string; // Principal or Teacher name
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
    grades: { subjectName: string; grade: number | null }[];
    publishedAt: string;
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

export interface XOQuestion {
    id: string;
    principalId: string;
    grade: string;
    subject: string;
    questionText: string;
    options: [string, string, string, string];
    correctOptionIndex: number;
    createdBy: string; // user id
    creatorName?: string;
    creatorSchool?: string;
    chapter?: string;
}

export interface XOGamePlayer {
    id: string;
    name: string;
    symbol: PlayerSymbol;
    classId?: string;
    section?: string;
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

export interface XOGameScore {
    studentId: string;
    studentName: string;
    classId: string;
    section: string;
    points: number;
}

export interface XOGameSettings {
    pointsPolicy: 'grant_all' | 'winner_takes_all';
    startTime: string;
    endTime: string;
    questionTimeLimit: number;
    allowSinglePlayer: boolean;
}

// Homework
export interface HomeworkAttachment {
    name: string;
    url: string;
    type: 'image' | 'pdf';
    path: string;
}

export interface Homework {
    id: string;
    principalId: string;
    teacherId: string;
    classIds: string[];
    subjectId: string;
    subjectName: string;
    title: string;
    notes?: string;
    texts?: string[];
    attachments?: HomeworkAttachment[];
    deadline: string;
    createdAt: string;
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
    reviewedAt?: string;
    rejectionReason?: string;
}

export interface HomeworkProgress {
    totalCompleted: number;
    monthlyCompleted?: Record<string, { // key is "YYYY-MM"
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

// Honors board
export interface BehavioralVote {
    voterId: string;
    voterName: string;
    criteriaKeys: string[];
}

export interface HonoredStudent {
    studentId: string;
    studentName: string;
    studentPhotoUrl?: string;
    classId: string;
    section: string;
    nominationTimestamp: string;
    votes: Record<string, BehavioralVote>; // key is voterId
}

export interface BehavioralHonorBoard {
    id: string;
    principalId: string;
    stage: string;
    weekStartDate: string;
    honoredStudents: Record<string, HonoredStudent>; // key is studentId
}

export interface LeaveRequest {
    id: string;
    teacherId: string;
    principalId: string;
    teacherName: string;
    requestedAt: string;
    status: 'pending' | 'approved' | 'rejected';
    requestBody: string;
    rejectionReason?: string;
    approvalBody?: string;
    daysDeducted?: number;
    resolvedAt?: string;
}
