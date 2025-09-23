import { GoogleGenAI, Type } from "@google/genai";
import type { User, ClassData, StudyPlan, ScheduleData, SchedulePeriod, Teacher, SchoolLevel, ScheduleAssignment } from '../types.ts';
import { v4 as uuidv4 } from 'uuid';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});

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