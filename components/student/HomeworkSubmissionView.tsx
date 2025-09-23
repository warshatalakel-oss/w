import React, { useState, useEffect, useRef } from 'react';
import type { User, Homework, HomeworkSubmission, HomeworkAttachment } from '../../types';
import { ArrowLeft, Paperclip, Send, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { db } from '../../lib/firebase';
import { v4 as uuidv4 } from 'uuid';

interface HomeworkSubmissionViewProps {
    currentUser: User;
    homework: Homework;
    submission: HomeworkSubmission | undefined;
    onBack: () => void;
}

export default function HomeworkSubmissionView({ currentUser, homework, submission, onBack }: HomeworkSubmissionViewProps) {
    const [textAnswer, setTextAnswer] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isSubmitted = !!submission;
    const isReadOnly = isSubmitted && submission.status !== 'pending';

    useEffect(() => {
        if (submission) {
            setTextAnswer(submission.texts?.[0] || '');
        }
    }, [submission]);

    const handleSubmit = async () => {
        if (!textAnswer.trim()) {
            alert('يرجى كتابة إجابة.');
            return;
        }
        setIsSubmitting(true);
        try {
            const submissionData: HomeworkSubmission = {
                id: submission?.id || uuidv4(),
                homeworkId: homework.id,
                studentId: currentUser.id,
                studentName: currentUser.name,
                classId: currentUser.classId!,
                submittedAt: new Date().toISOString(),
                texts: [textAnswer.trim()],
                attachments: [], // Attachments removed
                status: 'pending'
            };

            await db.ref(`homework_submissions/${currentUser.principalId}/${currentUser.id}/${homework.id}`).set(submissionData);
            alert('تم إرسال إجابتك بنجاح.');
            onBack();

        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء إرسال الواجب.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const renderStatusBadge = () => {
        if (!submission) return null;
        
        let statusInfo: { text: string; icon: React.ReactNode; color: string; };

        switch(submission.status) {
            case 'accepted':
                statusInfo = { text: 'تم قبول واجبك', icon: <CheckCircle/>, color: 'bg-green-100 text-green-800' };
                break;
            case 'rejected':
                statusInfo = { text: 'تم رفض واجبك', icon: <XCircle/>, color: 'bg-red-100 text-red-800' };
                break;
            default:
                 statusInfo = { text: 'تم إرسال واجبك وهو قيد المراجعة', icon: <Clock/>, color: 'bg-yellow-100 text-yellow-800' };
        }

        return (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${statusInfo.color}`}>
                {statusInfo.icon}
                <div>
                    <p className="font-bold">{statusInfo.text}</p>
                    {submission.status === 'rejected' && submission.rejectionReason && (
                        <p className="text-sm mt-1">السبب: {submission.rejectionReason}</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
             <button onClick={onBack} className="flex items-center gap-2 mb-4 text-cyan-600 font-semibold hover:text-cyan-800">
                <ArrowLeft size={20} />
                <span>العودة للواجبات</span>
            </button>
            
            <div className="border-b pb-4 mb-4">
                <h2 className="text-3xl font-bold">{homework.title}</h2>
                <p className="text-gray-600">{homework.subjectName}</p>
            </div>
            
            {homework.notes && (
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                    <h4 className="font-bold mb-2">ملاحظات المدرس:</h4>
                    <p className="whitespace-pre-wrap">{homework.notes}</p>
                </div>
            )}
            
            {Array.isArray(homework.attachments) && homework.attachments.length > 0 && (
                 <div className="p-4 bg-gray-50 rounded-lg mb-4">
                    <h4 className="font-bold mb-2">المرفقات:</h4>
                    <div className="space-y-2">
                        {homework.attachments.map(att => (
                            <a key={att.url} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-white border rounded-md hover:bg-gray-100 text-blue-600">
                                <Paperclip size={16}/> {att.name}
                            </a>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-6">
                <h3 className="text-2xl font-bold mb-4">إجابتك</h3>
                {renderStatusBadge()}
                
                <div className="mt-4 space-y-4">
                     <textarea 
                        value={textAnswer}
                        onChange={e => setTextAnswer(e.target.value)}
                        placeholder="اكتب إجابتك هنا..."
                        rows={8}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        disabled={isReadOnly}
                    />
                    
                    {!isReadOnly && (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 disabled:bg-gray-400 transition"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin"/> : <Send/>}
                            {isSubmitting ? 'جاري الإرسال...' : (isSubmitted ? 'إعادة إرسال الواجب' : 'إرسال الواجب')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}