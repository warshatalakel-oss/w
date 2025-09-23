import type { Student, Subject, SubjectGrade, CalculatedGrade, StudentResult, SchoolSettings, ClassData } from '../types.ts';

const MINISTERIAL_STAGES = ['الثالث متوسط', 'السادس العلمي', 'السادس الادبي', 'السادس ابتدائي'];

const isValidGrade = (grade: number | null | undefined): grade is number => {
    return grade !== null && grade !== undefined && grade >= 0;
};

export function calculateStudentResult(student: Student, subjects: Subject[], settings: SchoolSettings, classData: ClassData): { finalCalculatedGrades: Record<string, CalculatedGrade>, result: StudentResult } {
    const finalCalculatedGrades: Record<string, CalculatedGrade> = {};
    let remainingDecisionPoints = settings.decisionPoints;
    
    const isMinisterial = MINISTERIAL_STAGES.includes(classData.stage);
    if (isMinisterial && classData.ministerialDecisionPoints !== undefined) {
        remainingDecisionPoints = classData.ministerialDecisionPoints;
    }

    subjects.forEach(subject => {
        const grade: SubjectGrade = {
            october: null, november: null, december: null, january: null,
            february: null, march: null, april: null,
            firstTerm: null, midYear: null, secondTerm: null,
            finalExam1st: null, finalExam2nd: null,
            ...student.grades?.[subject.name]
        };
        
        // --- Calculate Annual Pursuit ---
        let firstTerm = grade.firstTerm;
        let secondTerm = grade.secondTerm;
        
        // For primary 5/6, calculate terms from monthly grades
        const isPrimary5_6 = classData.stage === 'الخامس ابتدائي' || classData.stage === 'السادس ابتدائي';
        if (isPrimary5_6) {
             const firstTermMonths = [grade.october, grade.november, grade.december, grade.january];
             if(firstTermMonths.every(isValidGrade)) {
                 firstTerm = Math.round(firstTermMonths.reduce((a, b) => a + b!, 0) / firstTermMonths.length);
             }
             const secondTermMonths = [grade.february, grade.march, grade.april];
             if(secondTermMonths.every(isValidGrade)) {
                 secondTerm = Math.round(secondTermMonths.reduce((a, b) => a + b!, 0) / secondTermMonths.length);
             }
        }

        let annualPursuit: number | null = null;
        if (isValidGrade(firstTerm) && isValidGrade(grade.midYear) && isValidGrade(secondTerm)) {
            annualPursuit = Math.round((firstTerm! + grade.midYear! + secondTerm!) / 3);
        }

        // --- Exemption Logic ---
        const isExempt = isValidGrade(annualPursuit) && annualPursuit >= 85 && isValidGrade(grade.midYear) && grade.midYear >= 75;

        // --- Calculate Final Grade (1st attempt) ---
        let finalGrade1st: number | null = null;
        if (isExempt) {
            finalGrade1st = annualPursuit;
        } else if (isValidGrade(annualPursuit) && isValidGrade(grade.finalExam1st)) {
            finalGrade1st = Math.round((annualPursuit! + grade.finalExam1st!) / 2);
        } else if (isValidGrade(annualPursuit) && grade.finalExam1st === null) {
            // Student has pursuit but didn't take final, they get a zero for the final exam portion.
            finalGrade1st = Math.round(annualPursuit! / 2);
        }


        finalCalculatedGrades[subject.name] = {
            annualPursuit,
            finalGrade1st,
            finalGradeWithDecision: finalGrade1st, // Initially same as final grade
            decisionApplied: 0,
            finalGrade2nd: null,
            isExempt,
            annualPursuitWithDecision: annualPursuit,
            decisionAppliedOnPursuit: 0,
        };
    });

    // --- Apply Decision Points (Qarar) ---
    const PASSING_GRADE = 50;

    // First, for Ministerial stages on annual pursuit
    if (isMinisterial) {
        const ministeralDecisionPoints = classData.ministerialDecisionPoints ?? 5;
        let remainingMinisterialDecisionPoints = ministeralDecisionPoints;

        subjects.forEach(subject => {
            const calculated = finalCalculatedGrades[subject.name];
            if (calculated.annualPursuit !== null && calculated.annualPursuit < PASSING_GRADE && calculated.annualPursuit >= (PASSING_GRADE - ministeralDecisionPoints)) {
                const pointsNeeded = PASSING_GRADE - calculated.annualPursuit;
                if (remainingMinisterialDecisionPoints >= pointsNeeded) {
                    calculated.annualPursuitWithDecision = PASSING_GRADE;
                    calculated.decisionAppliedOnPursuit = pointsNeeded;
                    remainingMinisterialDecisionPoints -= pointsNeeded;
                }
            }
        });
    }


    // Then, for non-ministerial stages on final grade
    if (!isMinisterial) {
        subjects.forEach(subject => {
            const calculated = finalCalculatedGrades[subject.name];
            if (calculated.finalGrade1st !== null && calculated.finalGrade1st < PASSING_GRADE && calculated.finalGrade1st >= (PASSING_GRADE - remainingDecisionPoints)) {
                const pointsNeeded = PASSING_GRADE - calculated.finalGrade1st;
                if (remainingDecisionPoints >= pointsNeeded) {
                    calculated.finalGradeWithDecision = PASSING_GRADE;
                    calculated.decisionApplied = pointsNeeded;
                    remainingDecisionPoints -= pointsNeeded;
                }
            }
        });
    }

    // --- Calculate Final Grade (2nd attempt) ---
    subjects.forEach(subject => {
        const grade = student.grades?.[subject.name];
        const calculated = finalCalculatedGrades[subject.name];
        
        if (isValidGrade(calculated.annualPursuit) && isValidGrade(grade?.finalExam2nd)) {
            calculated.finalGrade2nd = Math.round((calculated.annualPursuit! + grade!.finalExam2nd!) / 2);
        }
    });

    // --- Determine Overall Result ---
    let failingSubjectsCount1stAttempt = 0;
    let failingSubjectsCount2ndAttempt = 0;
    let anySecondAttemptGradeEntered = false;

    subjects.forEach(subject => {
        const calculated = finalCalculatedGrades[subject.name];
        
        // 1st attempt result
        const gradeToCheck = isMinisterial ? calculated.annualPursuitWithDecision : calculated.finalGradeWithDecision;
        if (gradeToCheck !== null && gradeToCheck < PASSING_GRADE && !calculated.isExempt) {
            failingSubjectsCount1stAttempt++;
        }

        // 2nd attempt result
        if (calculated.finalGrade2nd !== null) {
            anySecondAttemptGradeEntered = true;
            if (calculated.finalGrade2nd < PASSING_GRADE) {
                failingSubjectsCount2ndAttempt++;
            }
        } else if (gradeToCheck !== null && gradeToCheck < PASSING_GRADE && !calculated.isExempt) {
            // if they were failing in the first attempt, they count as failing in the second until they pass
            failingSubjectsCount2ndAttempt++;
        }
    });

    const supplementarySubjectsLimit = isMinisterial ? (classData.ministerialSupplementarySubjects ?? 3) : settings.supplementarySubjectsCount;
    let status: StudentResult['status'] = 'قيد الانتظار';
    let message = 'النتيجة قيد الانتظار';

    if (anySecondAttemptGradeEntered) {
        if (failingSubjectsCount2ndAttempt === 0) {
            status = 'ناجح';
            message = 'ناجح (الدور الثاني)';
        } else {
            status = 'راسب';
            message = `راسب (الدور الثاني)`;
        }
    } else {
         if (isMinisterial) {
            if (failingSubjectsCount1stAttempt === 0) {
                status = 'مؤهل';
                message = 'مؤهل لدخول الامتحان الوزاري';
            } else if (failingSubjectsCount1stAttempt <= supplementarySubjectsLimit) {
                status = 'مؤهل بقرار';
                message = `مؤهل لدخول الامتحان الوزاري بقرار (${failingSubjectsCount1stAttempt} دروس)`;
            } else {
                status = 'غير مؤهل';
                message = `غير مؤهل لدخول الامتحان الوزاري (${failingSubjectsCount1stAttempt} دروس)`;
            }
        } else {
            if (failingSubjectsCount1stAttempt === 0) {
                status = 'ناجح';
                message = 'ناجح';
            } else if (failingSubjectsCount1stAttempt <= supplementarySubjectsLimit) {
                status = 'مكمل';
                message = `مكمل بـ ${failingSubjectsCount1stAttempt} دروس`;
            } else {
                status = 'راسب';
                message = `راسب بـ ${failingSubjectsCount1stAttempt} دروس`;
            }
        }
    }

    const result: StudentResult = { status, message };

    return { finalCalculatedGrades, result };
}