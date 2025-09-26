import React, { useState, useMemo, useEffect } from 'react';
import type { User, ClassData, TeacherSubmission, TeacherSubjectGrade, SchoolSettings, Student, Teacher } from '../../types.ts';
import TeacherGradeSheet from '../teacher/TeacherGradeSheet.tsx';
import { db } from '../../lib/firebase.ts';
import { Eye, ArrowLeft } from 'lucide-react';

interface ReceiveTeacherLogProps {
    principal: User;
    classes: ClassData[];
    settings: SchoolSettings;
    users: User[];
}

const DEFAULT_TEACHER_GRADE: TeacherSubjectGrade = {
    firstSemMonth1: null,
    firstSemMonth2: null,
    midYear: null,
    secondSemMonth1: null,
    secondSemMonth2: null,
    finalExam: null,
    october: null,
    november: null,
    december: null,
    january: null,
    february: null,
    march: null,
    april: null,
};


export default function ReceiveTeacherLog({ principal, classes, settings, users }: ReceiveTeacherLogProps) {
    const [submissions, setSubmissions] = useState<TeacherSubmission[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
    const [selectedSubmission, setSelectedSubmission] = useState<TeacherSubmission | null>(null);

    useEffect(() => {
        const submissionsRef = db.ref('teacher_submissions');
        const callback = (snapshot: any) => {
            const data = snapshot.val();
            const allSubmissions: TeacherSubmission[] = data ? Object.values(data) : [];
            const principalTeacherIds = new Set(users.filter(u => u.principalId === principal.id).map(u => u.id));
            const relevantSubmissions = allSubmissions.filter(sub => principalTeacherIds.has(sub.teacherId));
            setSubmissions(relevantSubmissions);
        };
        submissionsRef.on('value', callback);
        return () => submissionsRef.off('value', callback);
    }, [principal.id, users]);

    const teachers = useMemo(() => users.filter(u => u.role === 'teacher' && u.principalId === principal.id), [users, principal.id]);
    
    const latestSubmissions = useMemo(() => {
        const latest = new Map<string, TeacherSubmission>();
        (submissions || []).forEach(sub => {
            const key = `${sub.teacherId}-${sub.classId}-${sub.subjectId}`;
            const existing = latest.get(key);
            if (!existing || new Date(sub.submittedAt) > new Date(existing.submittedAt)) {
                latest.set(key, sub);
            }
        });
        return Array.from(latest.values()).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    }, [submissions]);

    const filteredSubmissions = useMemo(() => {
        if (!selectedTeacherId) {
            return latestSubmissions;
        }
        return latestSubmissions.filter(sub => sub.teacherId === selectedTeacherId);
    }, [selectedTeacherId, latestSubmissions]);


    const handleViewSubmission = (submission: TeacherSubmission) => {
        setSelectedSubmission(submission);
    };
    
    const getTeacherName = (teacherId: string) => users.find(u => u.id === teacherId)?.name || 'مدرس غير معروف';
    const getClassName = (classId: string) => {
        const cls = classes.find(c => c.id === classId);
        return cls ? `${cls.stage} - ${cls.section}` : 'شعبة محذوفة';
    }
    const getSubjectName = (classId: string, subjectId: string) => {
        const cls = classes.find(c => c.id === classId);
        const sub = (cls?.subjects || []).find(s => s.id === subjectId);
        return sub ? sub.name : 'مادة محذوفة';
    }

    if (selectedSubmission) {
        const classData = classes.find(c => c.id === selectedSubmission.classId);
        const teacher = users.find(u => u.id === selectedSubmission.teacherId);

        if (!classData || !teacher) {
            return (
                <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                    <p className="text-red-500">خطأ: لم يتم العثور على بيانات الصف أو المدرس لهذا السجل.</p>
                    <button onClick={() => setSelectedSubmission(null)} className="mt-4 px-4 py-2 bg-gray-300 rounded-lg flex items-center gap-2 mx-auto">
                        <ArrowLeft />
                        العودة
                    </button>
                </div>
            );
        }
        
        const subjectName = getSubjectName(classData.id, selectedSubmission.subjectId);
        const classDataWithGrades: ClassData = {
            ...classData,
            students: (classData.students || []).map((s: Student) => ({
                ...s,
                teacherGrades: {
                    ...s.teacherGrades,
                    [subjectName]: (selectedSubmission.grades || {})[s.id] || DEFAULT_TEACHER_GRADE,
                }
            }))
        };
        
        return (
            <div>
                 <button onClick={() => setSelectedSubmission(null)} className="mb-4 px-4 py-2 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 flex items-center gap-2">
                    <ArrowLeft />
                    العودة إلى قائمة السجلات
                </button>
                <TeacherGradeSheet
                    classData={classDataWithGrades}
                    teacher={teacher as Teacher}
                    settings={settings}
                    isReadOnly={true}
                    subjectId={selectedSubmission.subjectId}
                />
            </div>
        )
    }

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-0">استلام سجلات المدرسين</h2>
                <div className="flex items-center gap-2 w-full md:w-auto">
                     <label htmlFor="teacher-filter" className="font-semibold text-gray-700 whitespace-nowrap">اختر مدرس لعرض سجلاته المستلمة:</label>
                    <select 
                        id="teacher-filter"
                        onChange={e => setSelectedTeacherId(e.target.value)} 
                        value={selectedTeacherId}
                        className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    >
                        <option value="">-- كل المدرسين --</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            </header>

            <div className="space-y-4">
                {filteredSubmissions.length > 0 ? (
                    filteredSubmissions.map(sub => (
                         <div key={sub.id} className="p-4 bg-gray-50 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <div>
                                <p className="font-bold text-lg text-gray-800">{getTeacherName(sub.teacherId)}</p>
                                <div className="text-sm text-gray-600 mt-1">
                                    <span className="font-semibold">{getClassName(sub.classId)}</span>
                                    <span className="mx-2 text-gray-300">|</span>
                                    <span>{getSubjectName(sub.classId, sub.subjectId)}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                 <span className="text-xs text-gray-500">
                                    آخر تحديث: {new Date(sub.submittedAt).toLocaleString('ar-EG')}
                                </span>
                                <button onClick={() => handleViewSubmission(sub)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600">
                                    <Eye size={16} />
                                    عرض السجل
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center p-12 bg-gray-100 rounded-lg">
                         <p className="text-xl text-gray-500">لم يتم استلام أي سجلات من المدرسين بعد.</p>
                    </div>
                )}
            </div>
        </div>
    );
}