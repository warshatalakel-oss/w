import React from 'react';
import type { User, SchoolSettings, ClassData, Teacher } from '../../types';

interface TeacherCommunicationProps {
    teacher: Teacher;
    settings: SchoolSettings;
    classes: ClassData[];
}

export default function TeacherCommunication({ teacher, settings, classes }: TeacherCommunicationProps) {
    return (
        <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold">التواصل مع الطلبة</h2>
            <p className="mt-4 text-gray-600">هذه الميزة قيد التطوير حالياً.</p>
        </div>
    );
}
