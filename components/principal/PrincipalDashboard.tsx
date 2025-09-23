import React, { useState, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { User, ClassData, TeacherAssignment } from '../../types.ts';
import { Plus, UserPlus, Copy, Check, Trash2, Edit, Save, X, Download, Loader2, Shield, PlayCircle } from 'lucide-react';
import TeacherCodesPDF from './TeacherCodesPDF.tsx';
import { db } from '../../lib/firebase.ts';
import { GRADE_LEVELS } from '../../constants.ts';

declare const jspdf: any;
declare const html2canvas: any;

interface PrincipalDashboardProps {
    principal: User;
    classes: ClassData[];
    users: User[];
    addUser: (user: Omit<User, 'id' | 'assignments'> & { assignments: TeacherAssignment[] }) => User;
    updateUser: (userId: string, updater: (user: User) => User) => void;
    deleteUser: (userId: string) => void;
}

const generateCode = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export default function PrincipalDashboard({ principal, classes, users, addUser, updateUser, deleteUser }: PrincipalDashboardProps) {
    const [newTeacherName, setNewTeacherName] = useState('');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [isExportingCodes, setIsExportingCodes] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

    const staff = users.filter(u => u.role === 'teacher' && u.principalId === principal.id);
    const teachers = staff.sort((a, b) => a.name.localeCompare(b.name, 'ar-IQ'));

    const sortedClassesForModal = useMemo(() => {
        return [...classes].sort((a, b) => {
            const stageAIndex = GRADE_LEVELS.indexOf(a.stage);
            const stageBIndex = GRADE_LEVELS.indexOf(b.stage);
    
            if (stageAIndex === -1 && stageBIndex !== -1) return 1;
            if (stageAIndex !== -1 && stageBIndex === -1) return -1;
            
            if (stageAIndex !== stageBIndex) {
                return stageAIndex - stageBIndex;
            }
    
            return a.section.localeCompare(b.section, 'ar-IQ');
        });
    }, [classes]);

    const handleAddTeacher = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeacherName.trim()) return;

        addUser({
            name: newTeacherName.trim(),
            role: 'teacher',
            code: generateCode(7),
            principalId: principal.id,
            assignments: [],
        });

        setNewTeacherName('');
    };

    const handleEditAssignments = (teacher: User) => {
        setEditingTeacher(teacher);
        setAssignments(teacher.assignments || []);
    };
    
    const handleAssignmentChange = (classId: string, subjectId: string, isChecked: boolean) => {
        setAssignments(prev => {
            if (isChecked) {
                return [...prev, { classId, subjectId }];
            } else {
                return prev.filter(a => !(a.classId === classId && a.subjectId === subjectId));
            }
        });
    };

    const handleSaveAssignments = () => {
        if (!editingTeacher) return;
        updateUser(editingTeacher.id, user => ({ ...user, assignments }));
        setEditingTeacher(null);
    };


    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 2000);
        });
    };
    
    const handleExportCodes = async () => {
        if (teachers.length === 0) {
            alert("لا يوجد مدرسين لتصدير أرقامهم.");
            return;
        }
        setIsExportingCodes(true);

        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 500);
        });

        try {
            await document.fonts.ready;
            await renderComponent(<TeacherCodesPDF teachers={teachers} />);

            const pdfElement = tempContainer.children[0] as HTMLElement;
            const canvas = await html2canvas(pdfElement, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');

            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            pdf.save(`teacher_codes_${principal.schoolName}.pdf`);
        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("حدث خطأ أثناء تصدير الأرقام السرية.");
        } finally {
            root.unmount();
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
            setIsExportingCodes(false);
        }
    };


    return (
        <div className="bg-white p-8 rounded-xl shadow-lg">
             {isVideoModalOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100] p-4"
                    onClick={() => setIsVideoModalOpen(false)}
                >
                    <div 
                        className="bg-black p-2 rounded-lg shadow-xl w-full max-w-4xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setIsVideoModalOpen(false)}
                            className="absolute -top-3 -right-3 bg-white text-black rounded-full p-2 z-10 shadow-lg hover:scale-110 transition-transform"
                            aria-label="Close video"
                        >
                            <X size={24} />
                        </button>
                        <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
                            <iframe
                                src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2F61578356680977%2Fvideos%2F643783455430949%2F&show_text=false&autoplay=1&mute=0"
                                className="absolute top-0 left-0 w-full h-full"
                                style={{ border: 'none', overflow: 'hidden' }}
                                title="Facebook video player"
                                frameBorder="0"
                                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                allowFullScreen={true}>
                            </iframe>
                        </div>
                    </div>
                </div>
            )}
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">لوحة تحكم المدير</h2>
             <div className="mb-6">
                <button
                    onClick={() => setIsVideoModalOpen(true)}
                    className="w-full flex items-center gap-4 p-3 bg-red-100 rounded-lg hover:bg-red-200 transition-all duration-300 hover:shadow-md text-red-700"
                >
                    <PlayCircle className="w-12 h-12 text-red-600" />
                    <div>
                        <h4 className="font-bold text-red-800">طريقة اضافة المدرس مع جولة سريعة</h4>
                        <p className="text-sm text-red-600">شاهد عرض الفيديو التوضيحي للخطوات بالتفصيل.</p>
                    </div>
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <h3 className="text-xl font-bold text-gray-700 mb-4">إضافة مدرس جديد</h3>
                    <form onSubmit={handleAddTeacher} className="space-y-4 bg-gray-50 p-4 rounded-lg">
                        <div>
                            <label className="block text-md font-medium text-gray-700 mb-2">اسم المدرس</label>
                            <input
                                type="text"
                                value={newTeacherName}
                                onChange={(e) => setNewTeacherName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="الاسم الكامل للمدرس"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-cyan-600 text-white