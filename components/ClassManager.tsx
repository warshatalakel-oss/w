import React, { useState, useRef } from 'react';
import type { ClassData, Student, User, TeacherAssignment, Subject } from '../types.ts';
import { GRADE_LEVELS, DEFAULT_SUBJECTS } from '../constants.ts';
import { Plus, Upload, Trash2, Edit, Save, X, UserPlus, ListVideo } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/firebase.ts';


declare const XLSX: any;

const MINISTERIAL_STAGES = ['الثالث متوسط', 'السادس العلمي', 'السادس الادبي'];

interface ClassManagerProps {
    classes: ClassData[];
    onSelectClass: (classId: string) => void;
    currentUser: User;
    teacherAssignments?: TeacherAssignment[];
}

export default function ClassManager({ classes, onSelectClass, currentUser, teacherAssignments }: ClassManagerProps): React.ReactNode {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<Partial<ClassData> | null>(null);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [selectedClassForStudentAdd, setSelectedClassForStudentAdd] = useState<ClassData | null>(null);
    const [pastedData, setPastedData] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for subject editing
    const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
    const [editingSubjectName, setEditingSubjectName] = useState('');
    const [newSubjectName, setNewSubjectName] = useState('');
    
    const isPrincipal = currentUser.role === 'principal';

    const displayedClasses = React.useMemo(() => {
        let filteredClasses;
        if (isPrincipal) {
            filteredClasses = classes.filter(c => c.principalId === currentUser.id);
        } else { // For teacher
            const assignedClassIds = teacherAssignments?.map(a => a.classId) || [];
            filteredClasses = classes.filter(c => assignedClassIds.includes(c.id));
        }

        // Sort the filtered classes based on stage and section
        return filteredClasses.sort((a, b) => {
            const stageAIndex = GRADE_LEVELS.indexOf(a.stage);
            const stageBIndex = GRADE_LEVELS.indexOf(b.stage);

            // Handle cases where a stage might not be in the predefined list
            // (e.g., custom stage) by placing them at the end.
            if (stageAIndex === -1 && stageBIndex !== -1) return 1;
            if (stageAIndex !== -1 && stageBIndex === -1) return -1;
            
            // Primary sort by stage index from GRADE_LEVELS
            if (stageAIndex !== stageBIndex) {
                return stageAIndex - stageBIndex;
            }

            // Secondary sort by section name, alphabetically for Arabic
            return a.section.localeCompare(b.section, 'ar-IQ');
        });
    }, [classes, isPrincipal, currentUser.id, teacherAssignments]);

    const handleOpenModal = (classToEdit: Partial<ClassData> | null) => {
        if (classToEdit) {
            setEditingClass(classToEdit);
        } else {
            // Re-enable adding all grade levels, defaulting to a sensible choice.
            const defaultStage = GRADE_LEVELS[6] || GRADE_LEVELS[0]; // Default to 'الاول متوسط' for this school
            setEditingClass({
                id: '',
                stage: defaultStage,
                section: '',
                subjects: DEFAULT_SUBJECTS[defaultStage] || [],
                students: [],
                principalId: currentUser.id,
            });
        }
        setIsModalOpen(true);
    };

    const handleSaveClass = () => {
        if (!editingClass || !editingClass.stage || !editingClass.section) {
            alert('يرجى تحديد المرحلة والشعبة.');
            return;
        }

        const classToSave: ClassData = {
            id: editingClass.id || uuidv4(),
            stage: editingClass.stage,
            section: editingClass.section,
            subjects: editingClass.subjects || [],
            students: editingClass.students || [],
            principalId: currentUser.id,
            ...MINISTERIAL_STAGES.includes(editingClass.stage) && {
                ministerialDecisionPoints: editingClass.ministerialDecisionPoints ?? 5,
                ministerialSupplementarySubjects: editingClass.ministerialSupplementarySubjects ?? 2,
            }
        };

        db.ref(`classes/${classToSave.id}`).set(classToSave);
        setIsModalOpen(false);
        setEditingClass(null);
    };

    const handleDeleteClass = (classId: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذه الشعبة وجميع الطلاب فيها؟ لا يمكن التراجع عن هذا الإجراء.')) {
            db.ref(`classes/${classId}`).remove();
        }
    };

    const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStage = e.target.value;
        setEditingClass(prev => ({
            ...prev,
            stage: newStage,
            subjects: DEFAULT_SUBJECTS[newStage] || [],
        }));
    };
    
    const handleAddStudentFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedClassForStudentAdd) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            const newStudents: Student[] = json
                .slice(1) // Skip header row
                .map((row: any[]) => ({
                    id: uuidv4(),
                    name: row[0] ? String(row[0]).trim() : '',
                    examId: row[1] ? String(row[1]).trim() : undefined,
                    registrationId: row[2] ? String(row[2]).trim() : undefined,
                    birthDate: row[3] ? String(row[3]).trim() : undefined,
                    grades: {},
                }))
                .filter(student => student.name);

            if (newStudents.length > 0) {
                const updatedStudents = [...(selectedClassForStudentAdd.students || []), ...newStudents];
                db.ref(`classes/${selectedClassForStudentAdd.id}/students`).set(updatedStudents);
                alert(`تمت إضافة ${newStudents.length} طالب بنجاح.`);
                setIsStudentModalOpen(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleAddStudentFromPaste = () => {
        if (!pastedData || !selectedClassForStudentAdd) return;

        const rows = pastedData.split('\n').filter(row => row.trim() !== '');
        const newStudents: Student[] = rows.map(row => {
            const columns = row.split('\t'); // Assuming tab-separated
            return {
                id: uuidv4(),
                name: columns[0] ? columns[0].trim() : '',
                examId: columns[1] ? columns[1].trim() : undefined,
                registrationId: columns[2] ? columns[2].trim() : undefined,
                birthDate: columns[3] ? columns[3].trim() : undefined,
                grades: {},
            };
        }).filter(student => student.name);

        if (newStudents.length > 0) {
            const updatedStudents = [...(selectedClassForStudentAdd.students || []), ...newStudents];
            db.ref(`classes/${selectedClassForStudentAdd.id}/students`).set(updatedStudents);
            alert(`تمت إضافة ${newStudents.length} طالب بنجاح.`);
            setIsStudentModalOpen(false);
            setPastedData('');
        }
    };
    
    const handleSubjectNameChange = () => {
        if (!editingClass || !editingSubjectId || !editingSubjectName.trim()) return;

        const newSubjects = (editingClass.subjects || []).map(s => 
            s.id === editingSubjectId ? { ...s, name: editingSubjectName.trim() } : s
        );

        setEditingClass(prev => ({...prev, subjects: newSubjects}));
        setEditingSubjectId(null);
        setEditingSubjectName('');
    };

    const handleAddSubject = () => {
        if (!editingClass || !newSubjectName.trim()) return;

        const newSubject: Subject = { id: uuidv4(), name: newSubjectName.trim() };
        const newSubjects = [...(editingClass.subjects || []), newSubject];

        setEditingClass(prev => ({...prev, subjects: newSubjects}));
        setNewSubjectName('');
    };
    
    const handleDeleteSubject = (subjectIdToDelete: string) => {
         if (!editingClass) return;
         const newSubjects = (editingClass.subjects || []).filter(s => s.id !== subjectIdToDelete);
         setEditingClass(prev => ({...prev, subjects: newSubjects}));
    };
    
    const renderModal = () => {
        if (!isModalOpen) return null;
        const isMinisterial = editingClass?.stage ? MINISTERIAL_STAGES.includes(editingClass.stage) : false;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
                    <h3 className="text-xl font-bold mb-4">{editingClass?.id ? 'تعديل الشعبة' : 'إضافة شعبة جديدة'}</h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">المرحلة الدراسية</label>
                                <select
                                    value={editingClass?.stage || ''}
                                    onChange={handleStageChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm bg-white disabled:bg-gray-200"
                                    disabled={!!editingClass?.id}
                                >
                                    {GRADE_LEVELS.map(level => (
                                        <option key={level} value={level}>{level}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">اسم الشعبة</label>
                                <input
                                    type="text"
                                    value={editingClass?.section || ''}
                                    onChange={(e) => setEditingClass(prev => ({ ...prev, section: e.target.value }))}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                />
                            </div>
                        </div>

                        {isMinisterial && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700">درجات القرار الوزاري</label>
                                    <input
                                        type="number"
                                        value={editingClass?.ministerialDecisionPoints ?? 5}
                                        onChange={(e) => setEditingClass(prev => ({ ...prev, ministerialDecisionPoints: parseInt(e.target.value) }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">عدد مواد الاكمال الوزاري</label>
                                    <input
                                        type="number"
                                        value={editingClass?.ministerialSupplementarySubjects ?? 2}
                                        onChange={(e) => setEditingClass(prev => ({ ...prev, ministerialSupplementarySubjects: parseInt(e.target.value) }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-4">
                            <h4 className="font-semibold mb-2">المواد الدراسية</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto border p-2 rounded-md">
                                {(editingClass?.subjects || []).map(subject => (
                                    <div key={subject.id} className="flex items-center gap-2 p-1 bg-gray-100 rounded">
                                        {editingSubjectId === subject.id ? (
                                            <>
                                                <input value={editingSubjectName} onChange={e => setEditingSubjectName(e.target.value)} className="flex-grow p-1 border rounded" autoFocus onBlur={handleSubjectNameChange} onKeyDown={e => e.key === 'Enter' && handleSubjectNameChange()}/>
                                                <button onClick={handleSubjectNameChange}><Save size={18} className="text-green-600"/></button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="flex-grow">{subject.name}</span>
                                                <button onClick={() => { setEditingSubjectId(subject.id); setEditingSubjectName(subject.name); }}><Edit size={18} className="text-yellow-600"/></button>
                                                <button onClick={() => handleDeleteSubject(subject.id)}><Trash2 size={18} className="text-red-600"/></button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                             <div className="flex items-center gap-2 mt-2">
                                <input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubject()} placeholder="إضافة مادة جديدة" className="flex-grow p-2 border rounded"/>
                                <button onClick={handleAddSubject} className="p-2 bg-blue-500 text-white rounded"><Plus/></button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md flex items-center gap-2"><X size={18} /> إلغاء</button>
                        <button onClick={handleSaveClass} className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2"><Save size={18} /> حفظ</button>
                    </div>
                </div>
            </div>
        );
    };

    const renderStudentModal = () => {
        if (!isStudentModalOpen) return null;
        return (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                    <h3 className="text-xl font-bold mb-4">إضافة طلاب إلى {selectedClassForStudentAdd?.stage} / {selectedClassForStudentAdd?.section}</h3>
                    <div className="space-y-4">
                         <div className="p-4 border rounded-lg">
                             <h4 className="font-semibold mb-2">1. إضافة من ملف Excel</h4>
                             <p className="text-sm text-gray-500 mb-2">يجب أن يحتوي الملف على الأعمدة التالية بالترتيب: الاسم، الرقم الامتحاني، رقم القيد، التولد.</p>
                             <input type="file" ref={fileInputRef} onChange={handleAddStudentFromFile} accept=".xlsx, .xls" className="hidden" />
                             <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                 <Upload size={18} />
                                 <span>اختر ملف</span>
                             </button>
                         </div>
                         <div className="p-4 border rounded-lg">
                             <h4 className="font-semibold mb-2">2. لصق البيانات من جدول</h4>
                             <p className="text-sm text-gray-500 mb-2">انسخ البيانات من Excel والصقها هنا. تأكد من نفس ترتيب الأعمدة المذكور أعلاه.</p>
                             <textarea value={pastedData} onChange={(e) => setPastedData(e.target.value)} rows={5} className="w-full p-2 border rounded" placeholder="الصق بيانات الطلاب هنا..."></textarea>
                             <button onClick={handleAddStudentFromPaste} className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                 إضافة من النص
                             </button>
                         </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button onClick={() => setIsStudentModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md">إغلاق</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-0">
            {isPrincipal && (
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">إدارة الشعب الدراسية</h2>
                    <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition-colors shadow-md">
                        <Plus size={20} />
                        <span>إضافة شعبة جديدة</span>
                    </button>
                </div>
            )}
            
            <div className="space-y-4">
                {displayedClasses.map(cls => (
                    <div key={cls.id} className="bg-white p-4 rounded-lg shadow-md border-r-4 border-cyan-500">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{cls.stage} - {cls.section}</h3>
                                <p className="text-sm text-gray-500">{(cls.students || []).length} طالب</p>
                            </div>
                            <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-shrink-0">
                                {isPrincipal && (
                                    <>
                                        <button onClick={() => { setSelectedClassForStudentAdd(cls); setIsStudentModalOpen(true); }} className="p-2 text-white bg-green-500 rounded-md hover:bg-green-600 transition" title="إضافة طلاب"><UserPlus size={18}/></button>
                                        <button onClick={() => handleOpenModal(cls)} className="p-2 text-white bg-yellow-500 rounded-md hover:bg-yellow-600 transition" title="تعديل"><Edit size={18}/></button>
                                        <button onClick={() => handleDeleteClass(cls.id)} className="p-2 text-white bg-red-500 rounded-md hover:bg-red-600 transition" title="حذف"><Trash2 size={18}/></button>
                                    </>
                                )}
                                <button onClick={() => onSelectClass(cls.id)} className="p-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 transition" title="عرض سجل الدرجات"><ListVideo size={18}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {renderModal()}
            {renderStudentModal()}
        </div>
    );
}