
import { GoogleGenAI, Type } from "@google/genai";
// FIX: Fix incomplete import statement for types.
import type { User, ClassData, StudyPlan, ScheduleData, SchedulePeriod, XOQuestion, Teacher, SchoolLevel, ScheduleAssignment } from '../types';
import { v4 as uuidv4 } from 'uuid';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});

// FIX: Implement the missing 'extractTextFromURL' function.
// This is a placeholder implementation as Gemini API does not directly support PDF URL text extraction.
export const extractTextFromURL = async (
    url: string,
    startPage: number,
    endPage: number,
    chapter: string
): Promise<string> => {
    console.warn("extractTextFromURL is a placeholder and does not extract text from PDFs.");
    return `Functionality to extract text from PDF URLs is not implemented. Please paste the text for "${chapter}" manually.`;
};


// FIX: Implement the missing 'generateXOQuestionsFromText' function using Gemini API.
export const generateXOQuestionsFromText = async (
    text: string,
    questionCount: number,
    grade: string,
    subject: string,
    principalId: string,
    chapter: string
): Promise<XOQuestion[] | null> => {
    try {
        const prompt = `
        Based on the following educational text about "${subject}" for grade "${grade}", generate ${questionCount} multiple-choice questions.
        Each question must have exactly four options, with only one correct answer.
        The questions should be suitable for a tic-tac-toe game, meaning they should be clear and concise.
        Format the output as a JSON array of objects.
        
        TEXT:
        ---
        ${text.substring(0, 30000)}
        ---
        `;

        const responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    questionText: { type: Type.STRING },
                    options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                    },
                    correctOptionIndex: { type: Type.INTEGER },
                },
                required: ["questionText", "options", "correctOptionIndex"],
            },
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonString = response.text.trim();
        const parsedResponse = JSON.parse(jsonString);

        if (!Array.isArray(parsedResponse)) {
            return null;
        }

        const questions: XOQuestion[] = parsedResponse
            .filter(item => 
                item.questionText &&
                Array.isArray(item.options) && item.options.length === 4 &&
                typeof item.correctOptionIndex === 'number' && item.correctOptionIndex >= 0 && item.correctOptionIndex < 4
            )
            .map((item: any) => ({
                id: uuidv4(),
                principalId: principalId,
                grade: grade,
                subject: subject,
                questionText: item.questionText,
                options: item.options as [string, string, string, string],
                correctOptionIndex: item.correctOptionIndex,
                createdBy: 'ai',
                chapter: chapter,
            }));

        return questions;

    } catch (error) {
        console.error("Error generating XO questions with Gemini:", error);
        return null;
    }
};

// FIX: Implement the missing 'generateScheduleForGradeOnDay' function using Gemini API.
export const generateScheduleForGradeOnDay = async (
    day: string,
    stage: string,
    gradeClasses: ClassData[],
    dailySchedule: SchedulePeriod[],
    teachers: User[],
    studyPlans: Record<string, StudyPlan>,
    schoolDayPeriodsForDay: number,
    targetPeriodsForGrade: number,
    schoolLevel: SchoolLevel,
    scheduleUntilYesterday: ScheduleData,
    allClasses: ClassData[],
    teacherUnavailability: Record<string, string[]>
): Promise<SchedulePeriod[] | null> => {

    const planType = schoolLevel === 'ابتدائية' ? 'primary' : stage.includes('متوسط') ? 'intermediate' : 'preparatory';
    const planForGrade = studyPlans[planType]?.grades[stage];
    if (!planForGrade) return null;

    const unavailableTeachersToday = Object.entries(teacherUnavailability)
        .filter(([, days]) => days.includes(day))
        .map(([teacherId]) => teachers.find(t => t.id === teacherId)?.name)
        .filter(Boolean);

    const prompt = `
    You are an expert school schedule generator. Your task is to generate the schedule for a specific grade level for a single day.
    
    **Grade Level:** ${stage}
    **Day:** ${day}
    **Total Periods in this school day:** ${schoolDayPeriodsForDay}
    **Target number of periods for this grade today:** ${targetPeriodsForGrade}

    **Classes in this Grade:**
    ${gradeClasses.map(c => `- ${c.stage} - ${c.section} (key: "${c.stage.replace(/ /g, '-')}-${c.section}")`).join('\n')}

    **Weekly Subject Distribution (total lessons per week):**
    ${Object.entries(planForGrade.subjects).map(([subject, count]) => `- ${subject}: ${count}`).join('\n')}

    **Teachers and their assigned subjects:**
    ${teachers.map(t => {
        const subjects = (t.assignments || [])
            .map(a => allClasses.flatMap(c => c.subjects || []).find(s => s.id === a.subjectId)?.name)
            .filter(Boolean)
            .join(', ');
        return `- ${t.name}: ${subjects}`;
    }).join('\n')}

    **Constraints & Rules:**
    1. A teacher cannot teach two different classes at the same time (in the same period).
    2. The following teachers are unavailable today (${day}) and must not be scheduled: ${unavailableTeachersToday.join(', ') || 'None'}.
    3. You must only use teachers assigned to the subjects.
    4. Distribute subjects as evenly as possible throughout the week. Avoid scheduling the same subject multiple times on the same day for the same class unless necessary to meet weekly totals.
    5. Prioritize core subjects (Math, Arabic, English, Science) in earlier periods.
    6. PE and Art should ideally be in later periods.

    **Context of existing schedule today (for other grades):**
    This data shows which teachers are already busy in which periods. Do not schedule these teachers for the current grade (${stage}) during these busy periods.
    ${JSON.stringify(dailySchedule, null, 2)}
    
    **Context of schedule from previous days this week (for the current grade):**
    Use this to understand which subjects have already been taught, to ensure fair distribution.
    ${JSON.stringify(scheduleUntilYesterday, null, 2)}

    **Output Format:**
    Provide the output as a JSON array of objects, where each object represents a period. For each period, include an 'assignments' object. The keys of the 'assignments' object should be the class keys (e.g., "الاول-متوسط-أ"), and the values should be an object with "subject" and "teacher".
    Only include periods where this grade (${stage}) has a lesson.
    
    Example for one period:
    [
      {
        "period": 1,
        "assignments": {
          "الاول-متوسط-أ": { "subject": "الرياضيات", "teacher": "أستاذ أحمد" },
          "الاول-متوسط-ب": { "subject": "اللغة العربية", "teacher": "أستاذة فاطمة" }
        }
      }
    ]
    `;

    try {
        const responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    period: { type: Type.INTEGER },
                    assignments: {
                        type: Type.OBJECT,
                        properties: {}, // Dynamic keys
                        additionalProperties: {
                            type: Type.OBJECT,
                            properties: {
                                subject: { type: Type.STRING },
                                teacher: { type: Type.STRING },
                            },
                            required: ["subject", "teacher"],
                        }
                    },
                },
                required: ["period", "assignments"],
            },
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.2, // Be more deterministic
            },
        });

        const jsonString = response.text.trim();
        const generatedPeriods = JSON.parse(jsonString);

        if (Array.isArray(generatedPeriods)) {
            return generatedPeriods as SchedulePeriod[];
        }
        return null;
    } catch (error) {
        console.error(`Error generating schedule for ${stage} on ${day}:`, error);
        return null;
    }
};
