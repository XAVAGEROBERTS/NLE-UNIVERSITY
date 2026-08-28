// src/services/aiService.js
import { supabase } from './supabase';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const WORKING_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
  'groq/compound-mini',
  'groq/compound',
  'openai/gpt-oss-120b',
];

// ===================== HELPERS =====================

const getGradePoints = (grade) => {
  if (!grade) return 0;
  const map = {
    'A+': 5.0, 'A': 5.0, 'B+': 4.5, 'B': 4.0,
    'C+': 3.5, 'C': 3.0, 'D+': 2.5, 'D': 2.0, 'F': 0.0
  };
  return map[String(grade).toUpperCase()] || 0;
};

const getGradeFromMarks = (marks) => {
  if (marks === null || marks === undefined) return null;
  const n = parseFloat(marks);
  if (isNaN(n)) return null;
  if (n >= 90) return 'A+';
  if (n >= 80) return 'A';
  if (n >= 75) return 'B+';
  if (n >= 70) return 'B';
  if (n >= 65) return 'C+';
  if (n >= 60) return 'C';
  if (n >= 55) return 'D+';
  if (n >= 50) return 'D';
  return 'F';
};

// ===================== CORE DATA (CGPA, FEES, ASSIGNMENTS, EXAMS, ATTENDANCE) =====================

const fetchStudentCoreData = async (studentId, studentData) => {
  try {
    const { data: studentCourses } = await supabase
      .from('student_courses')
      .select('course_id, status, grade, grade_points, marks, credits')
      .eq('student_id', studentId);

    const activeCourseIds = (studentCourses || [])
      .filter(c => c.status !== 'completed' && c.status !== 'passed')
      .map(c => c.course_id)
      .filter(Boolean);

    // CGPA
    let totalPoints = 0;
    let totalCredits = 0;

    const gradedCourses = (studentCourses || []).filter(
      c => (c.grade || c.marks) && (c.status === 'completed' || c.status === 'passed' || c.grade)
    );

    if (gradedCourses.length > 0) {
      const courseIds = gradedCourses.map(c => c.course_id);
      const { data: courses } = await supabase
        .from('courses')
        .select('id, credits')
        .in('id', courseIds);

      const creditMap = {};
      (courses || []).forEach(c => { creditMap[c.id] = c.credits || 3; });

      gradedCourses.forEach(sc => {
        const grade = sc.grade || getGradeFromMarks(sc.marks);
        const gp = sc.grade_points || getGradePoints(grade);
        const credits = creditMap[sc.course_id] || sc.credits || 3;
        if (gp && credits) {
          totalPoints += gp * credits;
          totalCredits += credits;
        }
      });
    }

    if (totalCredits === 0) {
      const { data: submissions } = await supabase
        .from('exam_submissions')
        .select('grade, grade_points, total_marks_obtained, exam_id')
        .eq('student_id', studentId)
        .eq('status', 'graded');

      if (submissions && submissions.length > 0) {
        const examIds = submissions.map(s => s.exam_id);
        const { data: exams } = await supabase
          .from('examinations')
          .select('id, course_id')
          .in('id', examIds);

        const examCourseMap = {};
        (exams || []).forEach(e => { examCourseMap[e.id] = e.course_id; });

        const courseIds = (exams || []).map(e => e.course_id).filter(Boolean);
        const { data: courses } = await supabase
          .from('courses')
          .select('id, credits')
          .in('id', courseIds);

        const creditMap = {};
        (courses || []).forEach(c => { creditMap[c.id] = c.credits || 3; });

        submissions.forEach(sub => {
          const grade = sub.grade || getGradeFromMarks(sub.total_marks_obtained);
          if (!grade) return;
          const gp = sub.grade_points || getGradePoints(grade);
          const courseId = examCourseMap[sub.exam_id];
          const credits = creditMap[courseId] || 3;
          if (gp && credits) {
            totalPoints += gp * credits;
            totalCredits += credits;
          }
        });
      }
    }

    const cgpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;

    // Pending assignments
    let pendingAssignments = 0;
    if (activeCourseIds.length > 0) {
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id')
        .in('course_id', activeCourseIds)
        .eq('status', 'published')
        .gt('due_date', new Date().toISOString());
      pendingAssignments = (assignments || []).length;
    }

    // Upcoming exams
    let upcomingExams = 0;
    if (activeCourseIds.length > 0) {
      const { data: exams } = await supabase
        .from('examinations')
        .select('id')
        .in('course_id', activeCourseIds)
        .in('status', ['scheduled', 'published', 'active'])
        .gt('start_time', new Date().toISOString());
      upcomingExams = (exams || []).length;
    }

    // Fees
    const academicYear = studentData?.academic_year || studentData?.academicYear || null;
    let feeQuery = supabase
      .from('financial_records')
      .select('amount, balance_due, status')
      .eq('student_id', studentId);

    if (academicYear) {
      feeQuery = feeQuery.eq('academic_year', academicYear);
    }

    const { data: financial } = await feeQuery;

    const totalPaid = (financial || [])
      .filter(f => f.status === 'paid')
      .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);

    const totalPending = (financial || [])
      .filter(f => f.status === 'partial' || f.status === 'pending')
      .reduce((sum, f) => sum + (parseFloat(f.balance_due || f.amount) || 0), 0);

    // Attendance (last ~4 months)
    const semesterStart = new Date();
    semesterStart.setMonth(semesterStart.getMonth() - 4);
    semesterStart.setDate(1);

    const { data: attendanceRecords } = await supabase
      .from('attendance_records')
      .select('status')
      .eq('student_id', studentId)
      .gte('date', semesterStart.toISOString().split('T')[0]);

    const totalDays = (attendanceRecords || []).length;
    const presentDays = (attendanceRecords || []).filter(r => r.status === 'present').length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return {
      cgpa,
      pendingAssignments,
      upcomingExams,
      totalPaid,
      totalPending,
      attendanceRate,
      activeCourseIds
    };
  } catch (err) {
    console.error('Error fetching student core data:', err);
    return {
      cgpa: 0,
      pendingAssignments: 0,
      upcomingExams: 0,
      totalPaid: 0,
      totalPending: 0,
      attendanceRate: 0,
      activeCourseIds: []
    };
  }
};

// ===================== EXAM SCHEDULE =====================

const fetchExaminationSchedule = async (studentId, studentData) => {
  try {
    const { data: studentCourses, error: coursesError } = await supabase
      .from('student_courses')
      .select('course_id, status')
      .eq('student_id', studentId)
      .neq('status', 'completed');

    if (coursesError) return null;

    const courseIds = (studentCourses || []).map(sc => sc.course_id);
    if (courseIds.length === 0) return [];

    let query = supabase
      .from('examinations')
      .select(`
        *,
        courses (id, course_code, course_name, credits)
      `)
      .in('course_id', courseIds)
      .in('status', ['scheduled', 'published', 'active', 'completed'])
      .order('start_time', { ascending: true });

    const cleanAY = (studentData?.academic_year || studentData?.academicYear || '').trim().replace(/\s/g, '');
    if (cleanAY || studentData?.year_of_study || studentData?.semester || studentData?.program_id) {
      const orConditions = [];
      if (cleanAY) {
        orConditions.push('target_academic_year.eq.' + cleanAY);
        orConditions.push('target_academic_year.is.null');
      }
      if (studentData?.year_of_study != null) {
        orConditions.push('target_year_of_study.eq.' + studentData.year_of_study);
        orConditions.push('target_year_of_study.is.null');
      }
      if (studentData?.semester != null) {
        orConditions.push('target_semester.eq.' + studentData.semester);
        orConditions.push('target_semester.is.null');
      }
      if (studentData?.program_id) {
        orConditions.push('target_program_id.eq.' + studentData.program_id);
        orConditions.push('target_program_id.is.null');
      }
      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
      }
    }

    const { data: examsData, error: examsError } = await query;
    if (examsError) return null;

    const { data: submissionsData } = await supabase
      .from('exam_submissions')
      .select('*')
      .eq('student_id', studentId);

    const now = new Date();

    return (examsData || []).map(exam => {
      const sub = (submissionsData || []).find(s => s.exam_id === exam.id);
      const startTime = new Date(exam.start_time);
      const endTime = new Date(exam.end_time);

      const isActiveByTime = now >= startTime && now <= endTime;
      const isUpcoming = now < startTime;
      const isEndedByTime = now > endTime;

      let isSubmitted = false;
      let isGraded = false;
      if (sub) {
        const status = (sub.status || '').toLowerCase();
        isSubmitted = status === 'submitted' || !!sub.submitted_at;
        isGraded = status === 'graded' || !!sub.graded_at;
      }

      const isStartedButNotSubmitted = sub && sub.status === 'started' && !isSubmitted && !isGraded;
      const canResume = isStartedButNotSubmitted && !isEndedByTime;

      let finalStatus = 'upcoming';
      if (isGraded) finalStatus = 'graded';
      else if (isSubmitted) finalStatus = 'submitted';
      else if (canResume) finalStatus = 'resume';
      else if (isActiveByTime) finalStatus = 'active';
      else if (isEndedByTime) finalStatus = 'ended';

      return {
        id: exam.id,
        title: exam.title === 'NA' ? ((exam.courses?.course_code || 'Exam') + ' Final') : exam.title,
        courseCode: exam.courses?.course_code || 'N/A',
        courseName: exam.courses?.course_name || 'N/A',
        examType: exam.exam_type,
        startTime: exam.start_time,
        endTime: exam.end_time,
        duration: exam.duration_minutes,
        location: exam.location || exam.venue || 'TBA',
        supervisor: exam.supervisor,
        status: finalStatus,
        submitted: isSubmitted,
        graded: isGraded,
        isActive: finalStatus === 'active' || finalStatus === 'resume',
        isUpcoming: isUpcoming,
        isEnded: isEndedByTime,
        canResume: canResume
      };
    });
  } catch (err) {
    console.error('Error fetching exam schedule:', err);
    return null;
  }
};

const formatExamScheduleForContext = (exams, studentName) => {
  if (!exams || exams.length === 0) {
    return 'No examinations scheduled for ' + studentName + '.';
  }

  const upcomingExams = exams.filter(e => e.isUpcoming || e.status === 'upcoming');
  const activeExams = exams.filter(e => e.isActive || e.status === 'active' || e.status === 'resume');
  const submittedExams = exams.filter(e => e.submitted && !e.graded);
  const gradedExams = exams.filter(e => e.graded);
  const endedExams = exams.filter(e => e.isEnded && !e.submitted && !e.graded);

  let context = 'EXAMINATION SCHEDULE FOR ' + studentName.toUpperCase() + ':\n\n';

  if (upcomingExams.length > 0) {
    context += 'UPCOMING EXAMS (' + upcomingExams.length + '):\n';
    upcomingExams.forEach((exam, index) => {
      const date = new Date(exam.startTime);
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
      context += '  ' + (index + 1) + '. ' + exam.courseCode + ' - ' + exam.title + '\n';
      context += '     Date: ' + formattedDate + '\n';
      context += '     Location: ' + exam.location + '\n';
      context += '     Duration: ' + exam.duration + ' minutes\n';
      context += '     Type: ' + exam.examType + '\n';
      if (exam.supervisor) context += '     Supervisor: ' + exam.supervisor + '\n';
    });
    context += '\n';
  }

  if (activeExams.length > 0) {
    context += 'ACTIVE / RESUME EXAMS (' + activeExams.length + '):\n';
    activeExams.forEach((exam, index) => {
      context += '  ' + (index + 1) + '. ' + exam.courseCode + ' - ' + exam.title;
      if (exam.status === 'resume') context += ' (Resume available)';
      context += '\n';
    });
    context += '\n';
  }

  if (submittedExams.length > 0) {
    context += 'SUBMITTED (awaiting grade) (' + submittedExams.length + '):\n';
    submittedExams.forEach((exam, index) => {
      context += '  ' + (index + 1) + '. ' + exam.courseCode + ' - ' + exam.title + '\n';
    });
    context += '\n';
  }

  if (gradedExams.length > 0) {
    context += 'GRADED EXAMS (' + gradedExams.length + '):\n';
    gradedExams.forEach((exam, index) => {
      context += '  ' + (index + 1) + '. ' + exam.courseCode + ' - ' + exam.title + ' (Graded)\n';
    });
    context += '\n';
  }

  if (endedExams.length > 0) {
    context += 'ENDED EXAMS (' + endedExams.length + '):\n';
    endedExams.forEach((exam, index) => {
      context += '  ' + (index + 1) + '. ' + exam.courseCode + ' - ' + exam.title +
        ' (Ended on ' + new Date(exam.endTime).toLocaleDateString() + ')\n';
    });
    context += '\n';
  }

  context += 'SUMMARY:\n';
  context += '  - Total Exams: ' + exams.length + '\n';
  context += '  - Upcoming: ' + upcomingExams.length + '\n';
  context += '  - Active: ' + activeExams.length + '\n';
  context += '  - Submitted: ' + submittedExams.length + '\n';
  context += '  - Graded: ' + gradedExams.length + '\n';
  context += '  - Ended: ' + endedExams.length + '\n';

  if (upcomingExams.length > 0) {
    const nextExam = upcomingExams[0];
    const nextDate = new Date(nextExam.startTime);
    const formattedNext = nextDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
    context += '\nNEXT EXAM:\n';
    context += '  - ' + nextExam.courseCode + ' - ' + nextExam.title + '\n';
    context += '  - Date: ' + formattedNext + '\n';
    context += '  - Location: ' + nextExam.location + '\n';
  }

  return context;
};

// ===================== NOTES & TUTORIALS =====================

const isNotesOrTutorialsRelatedQuery = (query) => {
  const q = (query || '').toLowerCase();
  const keywords = [
    'note', 'notes', 'tutorial', 'tutorials', 'lecture note', 'lecture notes',
    'study material', 'study materials', 'handout', 'handouts', 'slide', 'slides',
    'pdf', 'video tutorial', 'video tutorials', 'watch tutorial', 'download note',
    'download notes', 'what notes', 'my notes', 'available notes', 'course notes'
  ];
  return keywords.some(k => q.includes(k));
};

const listAllFilesInBucket = async (bucketName) => {
  const allFiles = [];
  const scanFolder = async (path) => {
    const { data, error } = await supabase.storage.from(bucketName).list(path, {
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    });
    if (error || !data) return;

    for (const item of data) {
      const fullPath = path ? path + '/' + item.name : item.name;
      if (item.id === null) {
        await scanFolder(fullPath);
      } else {
        allFiles.push({
          name: item.name,
          path: fullPath,
          size: item.metadata?.size,
          updated: item.updated_at || item.created_at
        });
      }
    }
  };
  await scanFolder('');
  return allFiles;
};

const fetchStudentNotes = async (studentData) => {
  try {
    if (!studentData) return [];

    const programCode = (studentData.program_code || studentData.programCode || '').toUpperCase().trim();
    const academicYear = (studentData.academic_year || studentData.academicYear || '').trim();
    const yearOfStudy = studentData.year_of_study || studentData.yearOfStudy;
    const semester = studentData.semester;

    if (!programCode) return [];

    let startYear = '';
    let endYear = '';
    if (academicYear) {
      const parts = academicYear.replace(/\s/g, '').split(/[/ -]/);
      if (parts.length >= 2) {
        startYear = parts[0];
        endYear = parts[1];
      }
    }

    const cohortString = 'YEAR' + (yearOfStudy || '') + '_SEM' + (semester || '');
    const normProgram = programCode.replace(/[^A-Z0-9]/g, '');

    const { data: studentCourses } = await supabase
      .from('student_courses')
      .select('course_id, status, courses(course_code)')
      .eq('student_id', studentData.id);

    const completedCourseCodes = new Set();
    (studentCourses || []).forEach(sc => {
      if (sc.status === 'completed' || sc.status === 'passed') {
        const code = (sc.courses?.course_code || '').toUpperCase().trim();
        if (code) completedCourseCodes.add(code);
      }
    });

    const allFiles = await listAllFilesInBucket('Notes');
    const matching = allFiles.filter(file => {
      const upper = file.path.toUpperCase();
      const hasProgram = upper.includes(normProgram) || upper.includes(programCode);
      const hasCohort = upper.includes(cohortString.toUpperCase());
      const hasStart = startYear ? upper.includes(startYear) : true;
      const hasEnd = endYear ? upper.includes(endYear) : true;
      return hasProgram && (hasCohort || (hasStart && hasEnd));
    });

    const notes = [];
    for (const file of matching) {
      const parts = file.path.split('/');
      let rawCourseCode = '';
      for (let i = parts.length - 2; i >= 0; i--) {
        const p = parts[i].toUpperCase();
        if (p && !p.includes('YEAR') && !p.includes('SEM') && p !== normProgram && p !== programCode) {
          rawCourseCode = p.replace(/[^A-Z0-9]/g, '');
          break;
        }
      }
      if (rawCourseCode && completedCourseCodes.has(rawCourseCode)) continue;

      const title = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const ext = (file.name.split('.').pop() || '').toLowerCase();

      notes.push({
        title: title,
        courseCode: rawCourseCode || 'General',
        fileType: ext,
        path: file.path
      });
    }
    return notes;
  } catch (err) {
    console.error('Error fetching notes:', err);
    return [];
  }
};

const fetchStudentTutorials = async (studentData) => {
  try {
    if (!studentData) return [];

    const programCode = (studentData.program_code || studentData.programCode || '').toUpperCase().trim();
    const academicYear = (studentData.academic_year || studentData.academicYear || '').trim();
    const yearOfStudy = studentData.year_of_study || studentData.yearOfStudy;
    const semester = studentData.semester;

    if (!programCode) return [];

    let startYear = '';
    let endYear = '';
    if (academicYear) {
      const parts = academicYear.replace(/\s/g, '').split(/[/ -]/);
      if (parts.length >= 2) {
        startYear = parts[0];
        endYear = parts[1];
      }
    }

    const cohortString = 'YEAR' + (yearOfStudy || '') + '_SEM' + (semester || '');
    const normProgram = programCode.replace(/[^A-Z0-9]/g, '');

    const { data: studentCourses } = await supabase
      .from('student_courses')
      .select('course_id, status, courses(course_code)')
      .eq('student_id', studentData.id);

    const completedCourseCodes = new Set();
    (studentCourses || []).forEach(sc => {
      if (sc.status === 'completed' || sc.status === 'passed') {
        const code = (sc.courses?.course_code || '').toUpperCase().trim();
        if (code) completedCourseCodes.add(code);
      }
    });

    const allFiles = await listAllFilesInBucket('Tutorials');
    const matching = allFiles.filter(file => {
      const upper = file.path.toUpperCase();
      const hasProgram = upper.includes(normProgram) || upper.includes(programCode);
      const hasCohort = upper.includes(cohortString.toUpperCase());
      const hasStart = startYear ? upper.includes(startYear) : true;
      const hasEnd = endYear ? upper.includes(endYear) : true;
      return hasProgram && (hasCohort || (hasStart && hasEnd));
    });

    const tutorials = [];
    for (const file of matching) {
      const parts = file.path.split('/');
      let rawCourseCode = '';
      for (let i = parts.length - 2; i >= 0; i--) {
        const p = parts[i].toUpperCase();
        if (p && !p.includes('YEAR') && !p.includes('SEM') && p !== normProgram && p !== programCode) {
          rawCourseCode = p.replace(/[^A-Z0-9]/g, '');
          break;
        }
      }
      if (rawCourseCode && completedCourseCodes.has(rawCourseCode)) continue;

      const title = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      tutorials.push({
        title: title,
        courseCode: rawCourseCode || 'General',
        path: file.path
      });
    }
    return tutorials;
  } catch (err) {
    console.error('Error fetching tutorials:', err);
    return [];
  }
};

const formatNotesForContext = (notes, studentName) => {
  if (!notes || notes.length === 0) {
    return 'No notes available for ' + studentName + "'s active courses. (Notes for completed courses are hidden.)";
  }

  const byCourse = {};
  notes.forEach(n => {
    const c = n.courseCode || 'General';
    if (!byCourse[c]) byCourse[c] = [];
    byCourse[c].push(n);
  });

  let context = 'NOTES AVAILABLE FOR ' + studentName.toUpperCase() + ':\n\n';
  Object.keys(byCourse).sort().forEach(code => {
    const list = byCourse[code];
    context += code + ' (' + list.length + '):\n';
    list.slice(0, 10).forEach(n => {
      context += '  - ' + n.title;
      if (n.fileType) context += ' [' + n.fileType.toUpperCase() + ']';
      context += '\n';
    });
    if (list.length > 10) {
      context += '  - ...and ' + (list.length - 10) + ' more\n';
    }
    context += '\n';
  });
  context += 'SUMMARY: ' + notes.length + ' notes across ' + Object.keys(byCourse).length + ' course(s).\n';
  context += 'Students can view and download these from the Notes page.';
  return context;
};

const formatTutorialsForContext = (tutorials, studentName) => {
  if (!tutorials || tutorials.length === 0) {
    return 'No video tutorials available for ' + studentName + "'s active courses. (Tutorials for completed courses are hidden.)";
  }

  const byCourse = {};
  tutorials.forEach(t => {
    const c = t.courseCode || 'General';
    if (!byCourse[c]) byCourse[c] = [];
    byCourse[c].push(t);
  });

  let context = 'VIDEO TUTORIALS AVAILABLE FOR ' + studentName.toUpperCase() + ':\n\n';
  Object.keys(byCourse).sort().forEach(code => {
    const list = byCourse[code];
    context += code + ' (' + list.length + '):\n';
    list.slice(0, 10).forEach(t => {
      context += '  - ' + t.title + '\n';
    });
    if (list.length > 10) {
      context += '  - ...and ' + (list.length - 10) + ' more\n';
    }
    context += '\n';
  });
  context += 'SUMMARY: ' + tutorials.length + ' tutorials across ' + Object.keys(byCourse).length + ' course(s).\n';
  context += 'Students can watch and download these from the Tutorials page.';
  return context;
};

// ===================== TIMETABLE =====================

const isTimetableRelatedQuery = (query) => {
  const q = (query || '').toLowerCase();
  const keywords = [
    'timetable', 'time table', 'schedule', 'class schedule', 'lecture schedule',
    'my classes', 'what class', 'when is my class', 'when do i have',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
    'today lecture', 'tomorrow lecture', 'upcoming lecture', 'upcoming lectures',
    'what lectures', 'class time', 'lecture time', 'room number', 'which room'
  ];
  return keywords.some(k => q.includes(k));
};

const fetchStudentTimetable = async (studentData) => {
  try {
    if (!studentData) return { slots: [], upcoming: [] };

    const programId = studentData.program_id;
    const academicYear = studentData.academic_year || studentData.academicYear;
    const semester = studentData.semester;
    const yearOfStudy = studentData.year_of_study || studentData.yearOfStudy;

    if (!programId || !academicYear || semester == null || yearOfStudy == null) {
      return { slots: [], upcoming: [] };
    }

    const { data: programTimetable, error: ptError } = await supabase
      .from('program_timetables')
      .select('id')
      .eq('program_id', programId)
      .eq('academic_year', academicYear)
      .eq('semester', semester)
      .eq('year_of_study', yearOfStudy)
      .eq('is_active', true)
      .maybeSingle();

    if (ptError || !programTimetable) {
      return { slots: [], upcoming: [] };
    }

    const { data: timetableSlots, error: slotsError } = await supabase
      .from('program_timetable_slots')
      .select(`
        course_code,
        course_name,
        lecturer_id,
        day_of_week,
        start_time,
        end_time,
        room_number,
        building,
        slot_type,
        lecturers (full_name)
      `)
      .eq('program_timetable_id', programTimetable.id)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (slotsError || !timetableSlots || timetableSlots.length === 0) {
      return { slots: [], upcoming: [] };
    }

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const slots = timetableSlots.map(slot => ({
      courseCode: slot.course_code || 'N/A',
      courseName: slot.course_name || 'Unknown Course',
      lecturer: slot.lecturers?.full_name || 'Not Assigned',
      dayOfWeek: slot.day_of_week,
      dayName: dayNames[slot.day_of_week] || 'Unknown',
      startTime: slot.start_time,
      endTime: slot.end_time,
      room: slot.room_number
        ? (slot.room_number + (slot.building ? ', ' + slot.building : ''))
        : 'TBA',
      slotType: slot.slot_type === 'lab' ? 'LAB' : 'Lecture'
    }));

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const todayDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;

    const upcoming = [];
    slots.forEach(slot => {
      let daysToAdd = slot.dayOfWeek - todayDayIndex;
      if (daysToAdd < 0) daysToAdd += 7;

      const lectureDate = new Date(today);
      lectureDate.setDate(today.getDate() + daysToAdd);

      if (lectureDate <= nextWeek) {
        upcoming.push({
          ...slot,
          date: lectureDate.toISOString().split('T')[0],
          isToday: daysToAdd === 0,
          isTomorrow: daysToAdd === 1
        });
      }
    });

    upcoming.sort((a, b) => {
      if (a.date === b.date) return (a.startTime || '').localeCompare(b.startTime || '');
      return a.date.localeCompare(b.date);
    });

    return { slots: slots, upcoming: upcoming };
  } catch (err) {
    console.error('Error fetching timetable for AI:', err);
    return { slots: [], upcoming: [] };
  }
};

const formatTimetableForContext = (timetable, studentName) => {
  const slots = timetable?.slots || [];
  const upcoming = timetable?.upcoming || [];

  if (slots.length === 0) {
    return 'No timetable available for ' + studentName + ' for the current semester.';
  }

  let context = 'TIMETABLE FOR ' + studentName.toUpperCase() + ':\n\n';

  const byDay = {};
  slots.forEach(s => {
    const day = s.dayName || 'Unknown';
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(s);
  });

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  dayOrder.forEach(day => {
    if (!byDay[day] || byDay[day].length === 0) return;
    context += day.toUpperCase() + ':\n';
    byDay[day]
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
      .forEach(s => {
        context += '  - ' + s.startTime + '-' + s.endTime + ' | ' + s.courseCode +
          ' (' + s.courseName + ') | ' + s.room + ' | ' + s.lecturer;
        if (s.slotType === 'LAB') context += ' [LAB]';
        context += '\n';
      });
    context += '\n';
  });

  if (upcoming.length > 0) {
    context += 'UPCOMING LECTURES (next 7 days):\n';
    upcoming.forEach((u, i) => {
      const label = u.isToday ? 'Today' : (u.isTomorrow ? 'Tomorrow' : u.dayName);
      context += '  ' + (i + 1) + '. ' + label + ' ' + u.startTime + '-' + u.endTime +
        ' | ' + u.courseCode + ' | ' + u.room + ' | ' + u.lecturer + '\n';
    });
    context += '\n';
  }

  context += 'SUMMARY: ' + slots.length + ' weekly slots, ' + upcoming.length +
    ' lectures in the next 7 days.\n';
  context += 'Students can view the full timetable on the Timetable page.';

  return context;
};

// ===================== QUERY DETECTION =====================

const isExamRelatedQuery = (query) => {
  const q = (query || '').toLowerCase();
  const keywords = [
    'exam', 'exams', 'examination', 'examinations', 'test', 'tests',
    'when is my exam', 'next exam', 'upcoming exam',
    'exam timetable', 'exam date', 'exam time', 'final exam'
  ];
  return keywords.some(k => q.includes(k));
};

// ===================== CONTEXT BUILDER =====================

const buildCompleteContext = (studentStats, studentData, coreData) => {
  const name = studentData?.full_name || studentData?.fullName || 'Student';

  const cgpa = coreData?.cgpa ?? studentStats?.gpa?.examBasedCGPA ?? studentStats?.gpa?.cgpa ?? 0;
  const paid = coreData?.totalPaid ?? studentStats?.finance?.totalPaid ?? 0;
  const pending = coreData?.totalPending ?? studentStats?.finance?.totalPending ?? 0;
  const pendingAssign = coreData?.pendingAssignments ?? studentStats?.assignments?.pending ?? 0;
  const upcoming = coreData?.upcomingExams ?? (studentStats?.exams?.upcoming?.length || studentStats?.exams?.upcomingCount || 0);
  const attendance = coreData?.attendanceRate ?? studentStats?.attendance?.rate ?? 0;

  let context = 'STUDENT INFORMATION:\n';
  context += 'Name: ' + name + '\n';
  context += 'Student ID: ' + (studentData?.student_id || studentData?.studentId || 'N/A') + '\n';
  context += 'Program: ' + (studentData?.program || 'N/A') + '\n';
  context += 'Year: ' + (studentData?.year_of_study || studentData?.yearOfStudy || 'N/A') + '\n';
  context += 'Semester: ' + (studentData?.semester || 'N/A') + '\n';
  context += 'Academic Year: ' + (studentData?.academic_year || studentData?.academicYear || 'N/A') + '\n\n';

  context += 'ACADEMIC:\n';
  context += '- CGPA: ' + cgpa + '\n';
  context += '- Attendance Rate: ' + attendance + '%\n\n';

  context += 'FINANCE:\n';
  context += '- Total Paid: $' + Number(paid).toLocaleString() + '\n';
  context += '- Total Pending / Balance: $' + Number(pending).toLocaleString() + '\n\n';

  context += 'ASSIGNMENTS: ' + pendingAssign + ' pending\n';
  context += 'EXAMS: ' + upcoming + ' upcoming\n';

  return context;
};

// ===================== FALLBACKS =====================

const fallbackExamResponse = (exams, studentName) => {
  if (!exams || exams.length === 0) {
    return 'You currently have no examinations scheduled, ' + (studentName || 'student') + '.';
  }
  const upcoming = exams.filter(e => e.isUpcoming || e.status === 'upcoming');
  if (upcoming.length === 0) {
    return 'You have no upcoming exams right now. Check the Examinations page for submitted or graded ones.';
  }
  const next = upcoming[0];
  const date = new Date(next.startTime).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
  return 'Your next exam is ' + next.courseCode + ' - ' + next.title + ' on ' + date +
    ' at ' + (next.location || 'TBA') + '. You have ' + upcoming.length + ' upcoming exam(s) in total.';
};

const fallbackNotesTutorialsResponse = (notes, tutorials, studentName, query) => {
  const q = (query || '').toLowerCase();
  const wantsNotes = q.includes('note');
  const wantsTutorials = q.includes('tutorial') || q.includes('video');
  const firstName = (studentName || 'Student').split(' ')[0];
  const parts = [];

  if (wantsNotes || (!wantsNotes && !wantsTutorials)) {
    if (!notes || notes.length === 0) {
      parts.push('You have no notes available for your active courses, ' + firstName + '.');
    } else {
      const byCourse = {};
      notes.forEach(n => {
        const c = n.courseCode || 'General';
        if (!byCourse[c]) byCourse[c] = [];
        byCourse[c].push(n.title);
      });
      let text = 'You have ' + notes.length + ' note(s):\n';
      Object.keys(byCourse).sort().forEach(code => {
        text += '\n' + code + ':\n';
        byCourse[code].slice(0, 8).forEach(title => {
          text += '- ' + title + '\n';
        });
        if (byCourse[code].length > 8) {
          text += '- ...and ' + (byCourse[code].length - 8) + ' more\n';
        }
      });
      text += '\nView and download them from the Notes page.';
      parts.push(text);
    }
  }

  if (wantsTutorials || (!wantsNotes && !wantsTutorials)) {
    if (!tutorials || tutorials.length === 0) {
      parts.push('You have no video tutorials available for your active courses, ' + firstName + '.');
    } else {
      const byCourse = {};
      tutorials.forEach(t => {
        const c = t.courseCode || 'General';
        if (!byCourse[c]) byCourse[c] = [];
        byCourse[c].push(t.title);
      });
      let text = 'You have ' + tutorials.length + ' tutorial(s):\n';
      Object.keys(byCourse).sort().forEach(code => {
        text += '\n' + code + ':\n';
        byCourse[code].slice(0, 8).forEach(title => {
          text += '- ' + title + '\n';
        });
        if (byCourse[code].length > 8) {
          text += '- ...and ' + (byCourse[code].length - 8) + ' more\n';
        }
      });
      text += '\nWatch and download them from the Tutorials page.';
      parts.push(text);
    }
  }

  return parts.join('\n\n') || ('No notes or tutorials found, ' + firstName + '.');
};

const fallbackTimetableResponse = (timetable, studentName, query) => {
  const firstName = (studentName || 'Student').split(' ')[0];
  const slots = timetable?.slots || [];
  const upcoming = timetable?.upcoming || [];
  const q = (query || '').toLowerCase();

  if (slots.length === 0) {
    return 'No timetable is available for you this semester, ' + firstName +
      '. Please contact your department.';
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const askedDay = days.find(d => q.includes(d));
  if (askedDay) {
    const daySlots = slots.filter(s => (s.dayName || '').toLowerCase() === askedDay);
    if (daySlots.length === 0) {
      return 'You have no classes on ' + askedDay.charAt(0).toUpperCase() + askedDay.slice(1) + ', ' + firstName + '.';
    }
    let text = 'Your classes on ' + askedDay.charAt(0).toUpperCase() + askedDay.slice(1) + ':\n';
    daySlots
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
      .forEach(s => {
        text += '- ' + s.startTime + '-' + s.endTime + ' | ' + s.courseCode + ' | ' + s.room + ' | ' + s.lecturer + '\n';
      });
    return text;
  }

  if (q.includes('today')) {
    const todaySlots = upcoming.filter(u => u.isToday);
    if (todaySlots.length === 0) {
      return 'You have no lectures today, ' + firstName + '.';
    }
    let text = 'Your lectures today:\n';
    todaySlots.forEach(s => {
      text += '- ' + s.startTime + '-' + s.endTime + ' | ' + s.courseCode + ' | ' + s.room + '\n';
    });
    return text;
  }

  if (q.includes('tomorrow')) {
    const tomorrowSlots = upcoming.filter(u => u.isTomorrow);
    if (tomorrowSlots.length === 0) {
      return 'You have no lectures tomorrow, ' + firstName + '.';
    }
    let text = 'Your lectures tomorrow:\n';
    tomorrowSlots.forEach(s => {
      text += '- ' + s.startTime + '-' + s.endTime + ' | ' + s.courseCode + ' | ' + s.room + '\n';
    });
    return text;
  }

  let text = 'You have ' + slots.length + ' weekly class slots';
  if (upcoming.length > 0) {
    text += ' and ' + upcoming.length + ' lecture(s) in the next 7 days';
  }
  text += '.\n\nNext up:\n';
  upcoming.slice(0, 5).forEach(u => {
    const label = u.isToday ? 'Today' : (u.isTomorrow ? 'Tomorrow' : u.dayName);
    text += '- ' + label + ' ' + u.startTime + ' | ' + u.courseCode + ' | ' + u.room + '\n';
  });
  text += '\nAsk me about a specific day (e.g. "What do I have on Monday?") for details.';
  return text;
};

// ===================== MAIN AI RESPONSE =====================

export const generateAIResponseWithContext = async (
  userQuery,
  studentStats,
  studentData,
  conversationHistory = []
) => {
  if (!GROQ_API_KEY) {
    return 'AI service is not configured. Please contact support.';
  }

  const studentName = studentData?.full_name || studentData?.fullName || 'Student';
  const studentId = studentData?.id;

  try {
    let coreData = null;
    if (studentId) {
      coreData = await fetchStudentCoreData(studentId, studentData);
    }

    let extraContext = '';
    let examData = null;
    let notesData = null;
    let tutorialsData = null;
    let timetableData = null;

    if (isExamRelatedQuery(userQuery) && studentId) {
      examData = await fetchExaminationSchedule(studentId, studentData);
      if (examData) {
        extraContext += '\n\n' + formatExamScheduleForContext(examData, studentName);
      }
    }

    if (isNotesOrTutorialsRelatedQuery(userQuery) && studentData) {
      const [notes, tutorials] = await Promise.all([
        fetchStudentNotes(studentData),
        fetchStudentTutorials(studentData)
      ]);
      notesData = notes;
      tutorialsData = tutorials;
      extraContext += '\n\n' + formatNotesForContext(notes, studentName);
      extraContext += '\n\n' + formatTutorialsForContext(tutorials, studentName);
    }

    if (isTimetableRelatedQuery(userQuery) && studentData) {
      timetableData = await fetchStudentTimetable(studentData);
      extraContext += '\n\n' + formatTimetableForContext(timetableData, studentName);
    }

    const baseContext = buildCompleteContext(studentStats, studentData, coreData);

    const systemPrompt =
      'You are a helpful academic assistant for a university student portal. ' +
      'Answer ONLY what the student asks. Be concise and accurate. ' +
      'Use the provided student data. Do not invent information. ' +
      'If data is missing, say so politely.\n\n' +
      baseContext + extraContext;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      })),
      { role: 'user', content: userQuery }
    ];

    for (const model of WORKING_MODELS) {
      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + GROQ_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.4,
            max_tokens: 1024
          })
        });

        if (!response.ok) continue;

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content && content.trim()) {
          return content.trim();
        }
      } catch (e) {
        console.warn('Model failed:', model, e.message);
      }
    }

    // Fallbacks when all models fail
    if (isExamRelatedQuery(userQuery) && examData) {
      return fallbackExamResponse(examData, studentName);
    }
    if (isNotesOrTutorialsRelatedQuery(userQuery)) {
      return fallbackNotesTutorialsResponse(notesData, tutorialsData, studentName, userQuery);
    }
    if (isTimetableRelatedQuery(userQuery) && timetableData) {
      return fallbackTimetableResponse(timetableData, studentName, userQuery);
    }

    const cgpa = coreData?.cgpa ?? 0;
    const paid = coreData?.totalPaid ?? 0;
    const pending = coreData?.totalPending ?? 0;
    const pendingAssign = coreData?.pendingAssignments ?? 0;
    const upcoming = coreData?.upcomingExams ?? 0;

    return (
      'Here is a quick summary for you:\n' +
      '- CGPA: ' + cgpa + '\n' +
      '- Fees paid: $' + Number(paid).toLocaleString() + '\n' +
      '- Balance: $' + Number(pending).toLocaleString() + '\n' +
      '- Pending assignments: ' + pendingAssign + '\n' +
      '- Upcoming exams: ' + upcoming + '\n\n' +
      'Ask me about a specific area (exams, notes, tutorials, timetable, fees, etc.) for more details.'
    );
  } catch (err) {
    console.error('AI response error:', err);
    return 'Sorry, I could not process your request right now. Please try again.';
  }
};

export default {
  generateAIResponseWithContext
};