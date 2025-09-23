import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { User, ClassData, Student, SchoolSettings } from '../../types';
import { db } from '../../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { KeyRound, FileDown, Loader2, RefreshCw, Trash2, PlayCircle, X } from 'lucide-react';
import StudentCodesPDF from './StudentCodesPDF';

declare const jspdf: any;
declare const html2canvas: any;

const generateCode = (length = 12) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

interface StudentSubscriptionsProps {
    principal: User;
    classes: ClassData[];
    settings: SchoolSettings;
}

export default function StudentSubscriptions({ principal, classes, settings }: StudentSubscriptionsProps) {
    const [selectedStage, setSelectedStage] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

    const classesInSelectedStage = useMemo(() => {
        return selectedStage ? classes.filter(c => c.stage === selectedStage) : [];
    }, [selectedStage, classes]);

    useEffect(() => {
        if (selectedClassId) {
            const classData = classes.find(c => c.id === selectedClassId);
            setStudents(classData?.students || []);
        } else {
            setStudents([]);
        }
        setSelectedStudentIds([]);
    }, [selectedClassId, classes]);
    
    const usedCodesCount = useMemo(() => {
        // FIX: Access studentAccessCode property on the Student type.
        return classes.flatMap(c => c.students || []).filter(s => s.studentAccessCode).length;
    }, [classes]);

    // FIX: Access studentCodeLimit property on the User type.
    const codeLimit = principal.studentCodeLimit || 0;
    const remainingCodes = codeLimit - usedCodesCount;

    const handleCodeOperation = async (studentIds: string[]) => {
        if (studentIds.length === 0) return;
        
        const studentsToUpdate = students.filter(s => studentIds.includes(s.id));
        // FIX: Access studentAccessCode property on the Student type.
        const creatingNewCodesCount = studentsToUpdate.filter(s => !s.studentAccessCode).length;
        
        if (creatingNewCodesCount > remainingCodes) {
            alert(`لا يمكنك إنشاء أكثر من ${remainingCodes} رمز جديد. لقد وصلت إلى الحد الأقصى.`);
            return;
        }

        setIsLoading(true);
        const updates: Record<string, any> = {};
        
        for (const student of studentsToUpdate) {
            const studentIndex = students.findIndex(s => s.id === student.id);
            if (studentIndex === -1) continue;

            // Delete old code if it exists
            // FIX: Access studentAccessCode property on the Student type.
            if (student.studentAccessCode) {
                // FIX: Access studentAccessCode property on the Student type.
                updates[`/student_access_codes_individual/${student.studentAccessCode}`] = null;
            }

            // Generate new code
            let newCode;
            let isUnique = false;
            while(!isUnique) {
                newCode = generateCode();
                const snapshot = await db.ref(`/student_access_codes_individual/${newCode}`).get();
                if (!snapshot.exists()) {
                    isUnique = true;
                }
            }
            
            updates[`/classes/${selectedClassId}/students/${studentIndex}/studentAccessCode`] = newCode;
            updates[`/student_access_codes_individual/${newCode}`] = {
                studentId: student.id,
                classId: selectedClassId,
                principalId: principal.id
            };
        }

        try {
            await db.ref().update(updates);
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء إنشاء الرموز.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeleteCode = async (studentId: string) => {
         const student = students.find(s => s.id === studentId);
         const studentIndex = students.findIndex(s => s.id === studentId);
         // FIX: Access studentAccessCode property on the Student type.
         if (!student || studentIndex === -1 || !student.studentAccessCode) return;

         if (!window.confirm(`هل أنت متأكد من حذف رمز الطالب ${student.name}؟`)) return;
         
         setIsLoading(true);
         const updates: Record<string, null> = {};
         updates[`/classes/${selectedClassId}/students/${studentIndex}/studentAccessCode`] = null;
         // FIX: Access studentAccessCode property on the Student type.
         updates[`/student_access_codes_individual/${student.studentAccessCode}`] = null;

         try {
             await db.ref().update(updates);
         } catch (error) {
             console.error(error);
         } finally {
             setIsLoading(false);
         }
    };
    
    const handleExportPDF = async () => {
        // FIX: Access studentAccessCode property on the Student type.
        const studentsToExport = students.filter(s => s.studentAccessCode);
        if (studentsToExport.length === 0) {
            alert("لا يوجد طلاب لديهم رموز لتصديرها.");
            return;
        }

        setIsExporting(true);
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        try {
             const classData = classes.find(c => c.id === selectedClassId);
             await new Promise<void>(resolve => {
                root.render(
                    <StudentCodesPDF 
                        students={studentsToExport}
                        schoolName={settings.schoolName}
                        className={`${classData?.stage || ''} - ${classData?.section || ''}`}
                    />
                );
                setTimeout(resolve, 500);
            });
            
            const pdfElement = tempContainer.children[0] as HTMLElement;
            const canvas = await html2canvas(pdfElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            
            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
            pdf.save(`رموز-الطلاب-${classData?.stage}-${classData?.section}.pdf`);

        } catch (error) {
            alert('فشل تصدير PDF.');
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedStudentIds(students.map(s => s.id));
        } else {
            setSelectedStudentIds([]);
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
                                src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2F61578356680977%2Fvideos%2F1887155028879302%2F&show_text=false&autoplay=1&mute=0"
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4 gap-4">
                 <h2 className="text-3xl font-bold text-gray-800">تفعيل اشتراكات الطلبة</h2>
                 <button 
                    onClick={() => setIsVideoModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
                 >
                    <PlayCircle />
                    <span>طريقة تفعيل اشتراكات الطلبة والتلاميذ</span>
                 </button>
            </div>
            
            <div className="bg-blue-50 border-r-4 border-blue-500 text-blue-800 p-4 mb-6 rounded-md shadow-sm text-right" role="alert">
                <p className="font-bold">السيد مدير المدرسة المحترم،</p>
                <p className="mt-2">
                    لديك صلاحية انشاء رموز اشتراك في بوابة الطلبة والتلاميذ<span className="font-bold text-red-600"> لكافة عدد طلاب المدرسة  في مدرستك </span>الرموز ستكون متاحة للتجربة دون مقابل الى<span className="font-bold text-red-600"> يوم 2025/11/10</span>. في حال رغبة الطالب بالاشتراك طوعاً بالتطبيق او زيادة عدد المشتركين بإمكانكم مراسلتنا لتجديد الاشتراك. قيمة الاشتراك لسنة كاملة <span className="font-bold text-red-600">2500 دينار فقط </span> لا غير للعام الدراسي الحالي بخصم 50% عن سعر الاشتراك السابق .
                </p>
                <p className="mt-2">
                    ملاحظة مهمة / راسلنا لمعرفة عدد طلاب وتلاميذ مدرستك لتزويدك بالرموز الكافية للتفعيل
                </p>
                <p className="mt-2">
                    شكرا" لكم.
                </p>
            </div>

            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-md">
                <p className="font-bold">صلاحية إنشاء الرموز:</p>
                <p>الحد الأقصى: {codeLimit} | المستخدم: {usedCodesCount} | المتبقي: {remainingCodes}</p>
            </div>

            <div className="flex gap-4 mb-4">
                <select value={selectedStage} onChange={e => { setSelectedStage(e.target.value); setSelectedClassId(''); }} className="p-2 border rounded-md">
                    <option value="">-- اختر المرحلة --</option>
                    {Array.from(new Set(classes.map(c => c.stage))).map(stage => <option key={stage} value={stage}>{stage}</option>)}
                </select>
                <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} disabled={!selectedStage} className="p-2 border rounded-md">
                    <option value="">-- اختر الشعبة --</option>
                    {classesInSelectedStage.map(c => <option key={c.id} value={c.id}>{c.section}</option>)}
                </select>
            </div>
            
            {selectedClassId && (
                <div>
                    <div className="flex gap-4 mb-4">
                        <button onClick={() => handleCodeOperation(selectedStudentIds)} disabled={selectedStudentIds.length === 0 || isLoading} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 disabled:bg-gray-400">
                           <KeyRound size={18}/> إنشاء رموز للمحددين ({selectedStudentIds.length})
                        </button>
                        <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-400">
                           {isExporting ? <Loader2 className="animate-spin"/> : <FileDown size={18}/>}
                           تصدير PDF
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 border text-right w-12"><input type="checkbox" onChange={handleSelectAll} checked={students.length > 0 && selectedStudentIds.length === students.length}/></th>
                                    <th className="p-2 border text-right">اسم الطالب</th>
                                    <th className="p-2 border text-center">الرمز</th>
                                    <th className="p-2 border text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="p-2 border"><input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={() => setSelectedStudentIds(prev => prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id])}/></td>
                                        <td className="p-2 border">{student.name}</td>
                                        {/* FIX: Access studentAccessCode property on the Student type. */}
                                        <td className="p-2 border text-center font-mono text-blue-600">{student.studentAccessCode || '---'}</td>
                                        <td className="p-2 border text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleCodeOperation([student.id])} disabled={isLoading} className="p-1 text-blue-600 hover:bg-blue-100 rounded-full" title="تحديث الرمز"><RefreshCw size={18}/></button>
                                                {/* FIX: Access studentAccessCode property on the Student type. */}
                                                <button onClick={() => handleDeleteCode(student.id)} disabled={isLoading || !student.studentAccessCode} className="p-1 text-red-600 hover:bg-red-100 rounded-full disabled:text-gray-400" title="حذف الرمز"><Trash2 size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}