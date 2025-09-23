import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { ClassData, Teacher, TeacherSubjectGrade, TeacherCalculatedGrade, TeacherSubmission, SchoolSettings, Student } from '../../types.ts';
import { Download, Send, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import * as ReactDOM from 'react-dom/client';
import TeacherGradeSheetPDF from './TeacherGradeSheetPDF.tsx';
import { db } from '../../lib/firebase.ts';

declare const jspdf: any;
declare const html2canvas: any;
declare const XLSX: any;

interface TeacherGradeSheetProps {
    classData: ClassData;
    teacher: Teacher;
    settings: SchoolSettings;
    isReadOnly?: boolean;
    subjectId?: string; // Passed in read-only mode
}

const DEFAULT_TEACHER_GRADE: TeacherSubjectGrade = {
    firstSemMonth1: null, firstSemMonth2: null, midYear: null, secondSemMonth1: null, secondSemMonth2: null, finalExam: null,
    october: null, november: null, december: null, january: null, february: null, march: null, april: null,
};

const GradeInput: React.FC<{
    value: number | null;
    onChange: (value: number | null) => void;
    onEnterPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    isReadOnly?: boolean;
    onAutoAdvance: (input: HTMLInputElement | null) => void;
    studentId: string;
    field: keyof TeacherSubjectGrade;
    schoolGender?: string;
    max: number;
}> = ({ value, onChange, onEnterPress, isReadOnly = false, onAutoAdvance, studentId, field, schoolGender, max }) => {
    
    const valueToString = useCallback((val: number | null): string => {
        if (val === null) return '';
        if (val === -1) return schoolGender === 'بنات' ? 'غائبة' : 'غائب';
        if (val === -2) return schoolGender === 'بنات' ? 'مجازة' : 'مجاز';
        return String(val);
    }, [schoolGender]);

    const [localValue, setLocalValue] = useState(valueToString(value));

    React.useEffect(() => {
        setLocalValue(valueToString(value));
    }, [value, valueToString]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const inputElement = e.currentTarget;
        setLocalValue(val);

        if (isReadOnly) return;
        
        const numericValue = parseInt(val, 10);
        if (isNaN(numericValue)) {
            return;
        }

        if (numericValue >= 0 && numericValue <= max) {
            const shouldAdvance = String(numericValue).length >= String(max).length && (max < 10 || val !== String(Math.floor(max/10)));

            if (shouldAdvance) {
                onChange(numericValue);
                setTimeout(() => onAutoAdvance(inputElement), 0);
            }
        }
    };
    
    const handleBlur = () => {
        if (isReadOnly) return;
        const trimmedVal = localValue.trim();
        if (trimmedVal === '') {
            onChange(null);
            return;
        }
        if (trimmedVal === 'غ' || trimmedVal === 'غائب' || trimmedVal === 'غائبة') {
            onChange(-1);
            return;
        }
        if (trimmedVal === 'م' || trimmedVal === 'مجاز' || trimmedVal === 'مجازة') {
            onChange(-2);
            return;
        }

        let numericValue = parseInt(trimmedVal, 10);
        if (!isNaN(numericValue)) {
            if (numericValue > max) numericValue = max;
            if (numericValue < 0) numericValue = 0;
            onChange(numericValue);
        } else {
            setLocalValue(valueToString(value));
        }
    };
    
    return (
        <input
            type="text" 
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={onEnterPress}
            data-student-id={studentId}
            data-field={field}
            className="w-full h-full text-center bg-transparent border-0 focus:ring-1 focus:ring-inset focus:ring-cyan-500 p-1 outline-none disabled:bg-gray-100"
            disabled={isReadOnly}
        />
    );
};

export default function TeacherGradeSheet({ classData, teacher, settings, isReadOnly = false, subjectId: readOnlySubjectId }: TeacherGradeSheetProps): React.ReactNode {
    const [submissions, setSubmissions] = useState<TeacherSubmission[]>([]);
    const [localGrades, setLocalGrades] = useState<Record<string, TeacherSubjectGrade>>({});

    const isPrimary = settings.schoolLevel === 'ابتدائية';
    const isPrimary1_4 = isPrimary && ['الاول ابتدائي', 'الثاني ابتدائي', 'الثالث ابتدائي', 'الرابع ابتدائي'].includes(classData.stage);
    const isPrimary5_6 = isPrimary && ['الخامس ابتدائي', 'السادس ابتدائي'].includes(classData.stage);
    const maxGrade = isPrimary1_4 ? 10 : 100;
    const studentLabel = isPrimary ? 'التلميذ' : 'الطالب';
    const teacherLabel = isPrimary ? 'المعلم' : 'المدرس';

    useEffect(() => {
        if (isReadOnly) return;
        const submissionsRef = db.ref('teacher_submissions');
        const callback = (snapshot: any) => {
            const data = snapshot.val();
            setSubmissions(data ? Object.values(data) : []);
        };
        submissionsRef.on('value', callback);
        return () => submissionsRef.off('value', callback);
    }, [isReadOnly]);

    const activeSubject = useMemo(() => {
        if (isReadOnly) {
            return (classData.subjects || []).find(s => s.id === readOnlySubjectId);
        }
        const assignment = (teacher.assignments || []).find(a => a.classId === classData.id);
        return assignment ? (classData.subjects || []).find(s => s.id === assignment.subjectId) : undefined;
    }, [classData, teacher, isReadOnly, readOnlySubjectId]);

    useEffect(() => {
        if (activeSubject) {
            const initialGrades: Record<string, TeacherSubjectGrade> = {};
            (classData.students || []).forEach(student => {
                initialGrades[student.id] = student.teacherGrades?.[activeSubject.name] || { ...DEFAULT_TEACHER_GRADE };
            });
            setLocalGrades(initialGrades);
        }
    }, [classData.students, activeSubject]);
    
    const sortedStudents = useMemo(() => 
        [...(classData.students || [])].sort((a, b) => {
            const aId = a.examId || '';
            const bId = b.examId || '';
            const numA = parseInt(aId, 10);
            const numB = parseInt(bId, 10);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            return aId.localeCompare(bId, undefined, { numeric: true });
        }), 
    [classData.students]);

    const isValidGrade = (g: number | null): g is number => g !== null && g >= 0;

    const calculateGrades = (grade: TeacherSubjectGrade): TeacherCalculatedGrade => {
        const firstSemAvg = (isValidGrade(grade.firstSemMonth1) && isValidGrade(grade.firstSemMonth2))
            ? Math.round((grade.firstSemMonth1 + grade.firstSemMonth2) / 2)
            : null;

        const secondSemAvg = (isValidGrade(grade.secondSemMonth1) && isValidGrade(grade.secondSemMonth2))
            ? Math.round((grade.secondSemMonth1 + grade.secondSemMonth2) / 2)
            : null;
            
        const annualPursuit = (firstSemAvg !== null && isValidGrade(grade.midYear) && secondSemAvg !== null)
            ? Math.round((firstSemAvg + grade.midYear! + secondSemAvg) / 3)
            : null;
        
        return { firstSemAvg, secondSemAvg, annualPursuit };
    };

    const calculateGradesForPrimary = (grade: TeacherSubjectGrade): TeacherCalculatedGrade => {
        const { october, november, december, january, february, march, april, midYear } = grade;

        let primaryFirstTerm: number | null = null;
        const firstTermMonths = [october, november, december, january].filter(g => g !== null);
        if (firstTermMonths.length > 0) {
            primaryFirstTerm = Math.round(firstTermMonths.reduce((acc, val) => acc + (val as number), 0) / firstTermMonths.length);
        }

        let primarySecondTerm: number | null = null;
        const secondTermMonths = [february, march, april].filter(g => g !== null);
        if (secondTermMonths.length > 0) {
            primarySecondTerm = Math.round(secondTermMonths.reduce((acc, val) => acc + (val as number), 0) / secondTermMonths.length);
        }

        const annualPursuit = (primaryFirstTerm !== null && isValidGrade(midYear) && primarySecondTerm !== null)
            ? Math.round((primaryFirstTerm + midYear! + primarySecondTerm) / 3)
            : null;

        return { firstSemAvg: null, secondSemAvg: null, annualPursuit, primaryFirstTerm, primarySecondTerm };
    };


    const results = useMemo(() => {
        const studentResults: Record<string, TeacherCalculatedGrade> = {};
        sortedStudents.forEach(student => {
            const grade = localGrades[student.id];
            if (grade) {
                 studentResults[student.id] = isPrimary5_6 ? calculateGradesForPrimary(grade) : calculateGrades(grade);
            }
        });
        return studentResults;
    }, [sortedStudents, localGrades, isPrimary5_6, calculateGrades, calculateGradesForPrimary]);

    const handleGradeChange = useCallback((studentId: string, field: keyof TeacherSubjectGrade, value: number | null) => {
        setLocalGrades(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || DEFAULT_TEACHER_GRADE),
                [field]: value
            }
        }));
    }, []);

    const handleAutoAdvance = useCallback((currentInput: HTMLInputElement | null) => {
        if (!currentInput?.form) return;
        const { studentId, field } = currentInput.dataset;
        if (!studentId || !field) return;

        const currentStudentIndex = sortedStudents.findIndex(s => s.id === studentId);
        if (currentStudentIndex !== -1 && currentStudentIndex < sortedStudents.length - 1) {
            const nextStudentId = sortedStudents[currentStudentIndex + 1].id;
            const nextInput = currentInput.form.querySelector(`input[data-student-id="${nextStudentId}"][data-field="${field}"]`) as HTMLInputElement;
            if (nextInput) { nextInput.focus(); nextInput.select(); }
        }
    }, [sortedStudents]);

    const handleEnterPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAutoAdvance(e.currentTarget);
        }
    };
    
     const handleSubmit = () => {
        if (!activeSubject || !teacher.principalId) return;
        if (window.confirm("هل أنت متأكد من إرسال هذا السجل إلى الإدارة؟ لا يمكن التراجع بعد الإرسال.")) {
            const submission: TeacherSubmission = {
                id: uuidv4(),
                teacherId: teacher.id,
                classId: classData.id,
                subjectId: activeSubject.id,
                submittedAt: new Date().toISOString(),
                grades: localGrades
            };
            db.ref(`teacher_submissions/${submission.id}`).set(submission)
                .then(() => alert("تم إرسال السجل بنجاح!"))
                .catch(err => alert("حدث خطأ أثناء الإرسال."));
        }
    };

    if (!activeSubject) {
        return <div className="p-4 text-center">لم يتم تعيين مادة لهذا الصف.</div>;
    }
    
    const lastSubmissionDate = submissions
        .filter(s => s.classId === classData.id && s.subjectId === activeSubject.id)
        .sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        [0]?.submittedAt;
        
    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                        سجل درجات: {classData.stage} - {classData.section}
                    </h2>
                    <p className="text-lg font-semibold text-cyan-700 mt-1">المادة: {activeSubject.name}</p>
                </div>
                {!isReadOnly && (
                    <div className="flex gap-2 mt-2 sm:mt-0">
                        <button 
                            onClick={handleSubmit} 
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
                        >
                            <Send size={20} />
                            <span>إرسال للإدارة</span>
                        </button>
                    </div>
                )}
            </div>
             {lastSubmissionDate && !isReadOnly && (
                <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded-md">
                    <p>
                        <b>آخر إرسال:</b> {new Date(lastSubmissionDate).toLocaleString('ar-EG')}
                    </p>
                </div>
            )}
            
            <div className="overflow-x-auto">
                <form>
                    {isPrimary1_4 ? (
                         <table className="min-w-full border-collapse border border-gray-400 text-sm">
                            <thead className="bg-gray-200 text-gray-700 font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="border border-gray-300 p-2 w-12">ت</th>
                                    <th className="border border-gray-300 p-2 min-w-[250px]">اسم {studentLabel}</th>
                                    <th className="border border-gray-300 p-2">نصف السنة</th>
                                    <th className="border border-gray-300 p-2">نهاية السنة</th>
                                </tr>
                            </thead>
                             <tbody>
                                {sortedStudents.map((student, studentIndex) => {
                                    const grade = localGrades[student.id] || DEFAULT_TEACHER_GRADE;
                                    return (
                                        <tr key={student.id} className="hover:bg-cyan-50 h-10">
                                            <td className="border border-gray-300 text-center">{studentIndex + 1}</td>
                                            <td className="border border-gray-300 p-2 font-semibold">{student.name}</td>
                                            <td className="border border-gray-300 p-0">
                                                <GradeInput value={grade.midYear} onChange={val => handleGradeChange(student.id, 'midYear', val)} onEnterPress={handleEnterPress} isReadOnly={isReadOnly} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='midYear' max={maxGrade} schoolGender={settings.schoolGender}/>
                                            </td>
                                            <td className="border border-gray-300 p-0">
                                                <GradeInput value={grade.finalExam} onChange={val => handleGradeChange(student.id, 'finalExam', val)} onEnterPress={handleEnterPress} isReadOnly={isReadOnly} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='finalExam' max={maxGrade} schoolGender={settings.schoolGender}/>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : isPrimary5_6 ? (
                         <table className="min-w-full border-collapse border border-gray-400 text-sm">
                             <thead className="bg-gray-200 text-gray-700 font-bold sticky top-0 z-10">
                                <tr>
                                    <th rowSpan={2} className="border border-gray-300 p-2 w-12">ت</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2 min-w-[180px]">اسم {studentLabel}</th>
                                    <th colSpan={4} className="border-b border-gray-300 p-2">الفصل الأول</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2">معدل الفصل الأول</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2">نصف السنة</th>
                                    <th colSpan={3} className="border-b border-gray-300 p-2">الفصل الثاني</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2">معدل الفصل الثاني</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2 text-red-600">السعي السنوي</th>
                                </tr>
                                <tr>
                                    <th className="border border-gray-300 p-2">تشرين الأول</th>
                                    <th className="border border-gray-300 p-2">تشرين الثاني</th>
                                    <th className="border border-gray-300 p-2">كانون الأول</th>
                                    <th className="border border-gray-300 p-2">كانون الثاني</th>
                                    <th className="border border-gray-300 p-2">شباط</th>
                                    <th className="border border-gray-300 p-2">آذار</th>
                                    <th className="border border-gray-300 p-2">نيسان</th>
                                </tr>
                            </thead>
                             <tbody>
                                {sortedStudents.map((student, studentIndex) => {
                                    const grade = localGrades[student.id] || DEFAULT_TEACHER_GRADE;
                                    const calculated = results[student.id];
                                    return (
                                        <tr key={student.id} className="hover:bg-cyan-50 h-10">
                                            <td className="border border-gray-300 text-center">{studentIndex + 1}</td>
                                            <td className="border border-gray-300 p-2 font-semibold">{student.name}</td>
                                            {['october', 'november', 'december', 'january'].map(month => (
                                                <td key={month} className="border border-gray-300 p-0"><GradeInput value={grade[month as keyof TeacherSubjectGrade] as number | null} onChange={val => handleGradeChange(student.id, month as keyof TeacherSubjectGrade, val)} onEnterPress={handleEnterPress} isReadOnly={isReadOnly} onAutoAdvance={handleAutoAdvance} studentId={student.id} field={month as keyof TeacherSubjectGrade} max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                            ))}
                                            <td className="border border-gray-300 text-center font-semibold bg-gray-100">{calculated?.primaryFirstTerm ?? ''}</td>
                                            <td className="border border-gray-300 p-0"><GradeInput value={grade.midYear} onChange={val => handleGradeChange(student.id, 'midYear', val)} onEnterPress={handleEnterPress} isReadOnly={isReadOnly} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='midYear' max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                            {['february', 'march', 'april'].map(month => (
                                                <td key={month} className="border border-gray-300 p-0"><GradeInput value={grade[month as keyof TeacherSubjectGrade] as number | null} onChange={val => handleGradeChange(student.id, month as keyof TeacherSubjectGrade, val)} onEnterPress={handleEnterPress} isReadOnly={isReadOnly} onAutoAdvance={handleAutoAdvance} studentId={student.id} field={month as keyof TeacherSubjectGrade} max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                            ))}
                                            <td className="border border-gray-300 text-center font-semibold bg-gray-100">{calculated?.primarySecondTerm ?? ''}</td>
                                            <td className="border border-gray-300 text-center font-bold bg-yellow-100 text-red-600">{calculated?.annualPursuit ?? ''}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                         </table>
                    ) : (
                        <table className="min-w-full border-collapse border border-gray-400 text-sm">
                            <thead className="bg-gray-200 text-gray-700 font-bold sticky top-0 z-10">
                                <tr>
                                    <th rowSpan={2} className="border border-gray-300 p-2 w-12">ت</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2 min-w-[180px]">اسم {studentLabel}</th>
                                    <th colSpan={2} className="border-b border-gray-300 p-2">الفصل الاول</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2">معدل الفصل الاول</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2">نصف السنة</th>
                                    <th colSpan={2} className="border-b border-gray-300 p-2">الفصل الثاني</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2">معدل الفصل الثاني</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2 text-red-600">السعي السنوي</th>
                                </tr>
                                <tr>
                                    <th className="border border-gray-300 p-2">الشهر الاول</th>
                                    <th className="border border-gray-300 p-2">الشهر الثاني</th>
                                    <th className="border border-gray-300 p-2">الشهر الاول</th>
                                    <th className="border border-gray-300 p-2">الشهر الثاني</th>
                                </tr>
                            </thead>
                             <tbody>
                                {sortedStudents.map((student, studentIndex) => {
                                    const grade = localGrades[student.id] || DEFAULT_TEACHER_GRADE;
                                    const calculated = results[student.id];
                                    return (
                                        <tr key={student.id} className="hover:bg-cyan-50 h-10">
                                            <td className="border border-gray-300 text-center">{studentIndex + 1}</td>
                                            <td className="border border-gray-300 p-2 font-semibold">{student.name}</td>
                                            <td className="border border-gray-300 p-0"><GradeInput value={grade.firstSemMonth1} onChange={val => handleGradeChange(student.id, 'firstSemMonth1', val)} onEnterPress={handleEnterPress} isReadOnly={isReadOnly} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='firstSemMonth1' max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                            <td className="border border-gray-300 p-0"><GradeInput value={grade.firstSemMonth2} onChange={val => handleGradeChange(student.id, 'firstSemMonth2', val)} onEnterPress={handleEnterPress} isReadOnly={isReadOnly} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='firstSemMonth2' max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                            <td className="border border-gray-300 text-center font-semibold bg-gray-100">{calculated?.firstSemAvg ?? ''}</td>
                                            <td className="border border-gray-300 p-0"><GradeInput value={grade.midYear} onChange={val => handleGradeChange(student.id, 'midYear', val)} onEnterPress={handleEnterPress} isReadOnly={isReadOnly} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='midYear' max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                            <td className="border border-gray-300 p-0"><GradeInput value={grade.secondSemMonth1} onChange={val => handleGradeChange(student.id, 'secondSemMonth1', val)} onEnterPress={handleEnterPress} isReadOnly={isReadOnly} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='secondSemMonth1' max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                            <td className="border border-gray-300 p-0"><GradeInput value={grade.secondSemMonth2} onChange={val => handleGradeChange(student.id, 'secondSemMonth2', val)} onEnterPress={handleEnterPress} isReadOnly={isReadOnly} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='secondSemMonth2' max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                            <td className="border border-gray-300 text-center font-semibold bg-gray-100">{calculated?.secondSemAvg ?? ''}</td>
                                            <td className="border border-gray-300 text-center font-bold bg-yellow-100 text-red-600">{calculated?.annualPursuit ?? ''}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </form>
            </div>
        </div>
    );
}