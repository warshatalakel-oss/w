

import React, { useState, useMemo, useEffect } from 'react';
// FIX: Add missing type import
import type { User, ClassData, TeacherSubmission, TeacherSubjectGrade, SchoolSettings } from '../../types.ts';
import useAuth from '../../hooks/useAuth.ts';
import TeacherGradeSheet from '../teacher/TeacherGradeSheet.tsx'; // Re-using for display
import { db } from '../../lib/firebase.ts';

interface ReceiveTeacherLogProps {
    principal: User;
    classes: ClassData[];
    settings: SchoolSettings;
}

const DEFAULT_TEACHER_GRADE: TeacherSubjectGrade = {
    firstSemMonth1: null,
    firstSemMonth2: null,
    midYear: null,
    secondSemMonth1: null,
    secondSemMonth2: null,
};


export default function ReceiveTeacherLog({ principal, classes, settings }: ReceiveTeacherLogProps) {
    const { users } = useAuth();
    const [submissions, setSubmissions] = useState<TeacherSubmission[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<TeacherSubmission | null>(null);

    useEffect(() => {
        const submissionsRef = db.ref('teacher_submissions');
        const callback = (snapshot: any) => {
            const data = snapshot.val();
            setSubmissions(data ? Object.values(data) : []);
        };
        submissionsRef.on('value', callback);
        return () => submissionsRef.off('value', callback);
    }, []);

    const teachers = useMemo(() => users.filter(u => u.role === 'teacher' && u.principalId === principal.id), [users, principal.id]);
    
    const teacherSubmissions = useMemo(() => {
        const latestSubmissions = new Map<string, TeacherSubmission>();
        (submissions || []).forEach(sub => {
            if (teachers.some(t => t.id === sub.teacherId)) {
                const key = `${sub.teacherId}-${sub.classId}-${sub.subjectId}`;
                const existing = latestSubmissions.get(key);
                if (!existing || new Date(sub.submittedAt) > new Date(existing.submittedAt)) {
                    latestSubmissions.set(key, sub);
                }
            }
        });
        return Array.from(latestSubmissions.values());
    }, [submissions, teachers]);
    
    const submissionsByTeacher = useMemo(() => {
        const grouped = new Map<string, TeacherSubmission[]>();
        teacherSubmissions.forEach(sub => {
            const list = grouped.get(sub.teacherId) || [];
            list.push(sub);
            grouped.set(sub.teacherId, list);
        });
        return grouped;
    }, [teacherSubmissions]);

    const handleViewSubmission = (submission: TeacherSubmission) => {
        setSelectedSubmission(submission);
    };
    
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
                <div>
                    <p>خطأ: لم يتم العثور على بيانات الصف أو المدرس.</p>
                    <button onClick={() => setSelectedSubmission(null)} className="mt-4 px-4 py-2 bg-gray-300 rounded">رجوع</button>
                </div>
            );
        }
        
        // Inject submitted grades into classData for display
        const classDataWithGrades: ClassData = {
            ...classData,
            students: (classData.students || []).map(s => ({
                ...s,
                teacherGrades: {
                    ...s.teacherGrades,
                    [getSubjectName(classData.id, selectedSubmission.subjectId)]: (selectedSubmission.grades || {})[s.id] || DEFAULT_TEACHER_GRADE,
                }
            }))
        };
        
        return (
            <div>
                 <button onClick={() => setSelectedSubmission(