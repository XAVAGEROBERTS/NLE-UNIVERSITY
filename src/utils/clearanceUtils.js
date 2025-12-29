// utils/clearanceUtils.js - SIMPLIFIED VERSION
import { supabase } from '../services/supabase';

/**
 * Main function to check exam clearance for a student
 * Uses dashboard attendance percentage for consistency
 */
export const checkExamClearance = async (studentId, academicYear, semester) => {
  try {
    console.log('=== CHECKING EXAM CLEARANCE ===');
    console.log('Parameters:', { studentId, academicYear, semester });
    
    // 1. First, get student details for verification
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, student_id, full_name, program_code, year_of_study, semester, academic_year, email')
      .eq('id', studentId)
      .single();

    if (studentError) {
      console.error('Student fetch error:', studentError);
      return getErrorResponse('Student not found in database');
    }

    if (!student) {
      return getErrorResponse('Student record not found');
    }

    console.log('Student info:', {
      id: student.id,
      student_id: student.student_id,
      name: student.full_name,
      program: student.program_code,
      year: student.year_of_study,
      semester: student.semester,
      academic_year: student.academic_year
    });

    // 2. Get dashboard attendance data (same logic as dashboard)
    const attendancePercentage = await getDashboardAttendancePercentage(studentId);
    
    // 3. Check financial records
    const financialResult = await checkFinancialClearance(studentId, academicYear, semester, student);
    
    // 4. Determine clearance status
    const attendanceCleared = attendancePercentage >= 75;
    const overallCleared = financialResult.cleared && attendanceCleared;
    
    // 5. Save to clearance table
    const clearanceData = {
      student_id: studentId,
      academic_year: academicYear || student.academic_year || '2025/2029',
      semester: semester || student.semester || 1,
      financial_cleared: financialResult.cleared,
      attendance_cleared: attendanceCleared,
      overall_cleared: overallCleared,
      financial_notes: financialResult.notes,
      attendance_notes: `Attendance: ${attendancePercentage}%`,
      attendance_percentage: attendancePercentage,
      updated_at: new Date().toISOString()
    };

    if (overallCleared) {
      clearanceData.cleared_at = new Date().toISOString();
    }

    await supabase
      .from('student_exam_clearance')
      .upsert(clearanceData, { 
        onConflict: 'student_id,academic_year,semester'
      });

    // 6. Return formatted result
    return {
      cleared: overallCleared,
      financial: {
        cleared: financialResult.cleared,
        notes: financialResult.notes,
        details: financialResult.details,
        outstandingBalance: financialResult.outstandingBalance,
        totalFees: financialResult.totalFees,
        totalPaid: financialResult.totalPaid,
        programCode: student.program_code
      },
      attendance: {
        cleared: attendanceCleared,
        notes: `Attendance: ${attendancePercentage}%`,
        details: attendanceCleared 
          ? ['✅ Attendance satisfactory', `  - Percentage: ${attendancePercentage}%`, `  - Minimum required: 75%`]
          : ['❌ Low attendance', `  - Percentage: ${attendancePercentage}%`, `  - Minimum required: 75%`],
        percentage: attendancePercentage,
        attended: 0, // Not calculating specific counts
        expected: 0  // Not calculating specific counts
      },
      student: {
        studentId: student.student_id,
        name: student.full_name,
        programCode: student.program_code,
        yearOfStudy: student.year_of_study,
        semester: student.semester,
        academicYear: student.academic_year
      },
      requirements: {
        minimum_attendance_percentage: 75,
        require_financial_clearance: true,
        require_attendance_clearance: true
      },
      timestamp: new Date().toISOString(),
      source: 'dashboard-attendance-calculation'
    };

  } catch (error) {
    console.error('Error in checkExamClearance:', error);
    return getErrorResponse(`System error: ${error.message}`);
  }
};

/**
 * Get attendance percentage using dashboard logic
 */
const getDashboardAttendancePercentage = async (studentId) => {
  try {
    console.log('Getting dashboard attendance percentage for student:', studentId);
    
    // Get student's academic info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('academic_year, semester')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      console.error('Error getting student info:', studentError);
      return 0;
    }

    // Use the SAME logic as dashboard: last 4 months
    const semesterStart = new Date();
    semesterStart.setMonth(semesterStart.getMonth() - 4);
    semesterStart.setDate(1); // Start of month

    const startDateStr = semesterStart.toISOString().split('T')[0];
    
    console.log('Fetching attendance from:', startDateStr);

    const { data: semesterRecords, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('date, status')
      .eq('student_id', studentId)
      .gte('date', startDateStr)
      .order('date', { ascending: true });

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      return 0;
    }

    console.log(`Found ${semesterRecords?.length || 0} attendance records`);

    if (!semesterRecords || semesterRecords.length === 0) {
      return 0;
    }

    const totalDays = semesterRecords.length;
    const presentDays = semesterRecords.filter(r => r.status === 'present').length;
    const attendancePercentage = totalDays > 0
      ? Math.round((presentDays / totalDays) * 100)
      : 0;

    console.log('Dashboard attendance calculation:', {
      totalDays,
      presentDays,
      percentage: attendancePercentage
    });

    return attendancePercentage;

  } catch (error) {
    console.error('Error in getDashboardAttendancePercentage:', error);
    return 0;
  }
};

/**
 * Check financial clearance
 */
const checkFinancialClearance = async (studentId, academicYear, semester, student) => {
  try {
    const targetAcademicYear = academicYear || student.academic_year || '2025/2029';
    const targetSemester = semester || student.semester || 1;
    
    console.log('Checking financial records:', {
      studentId,
      academicYear: targetAcademicYear,
      semester: targetSemester
    });

    // First, try semester-specific records
    const { data: financialRecords, error: financeError } = await supabase
      .from('financial_records')
      .select('*')
      .eq('student_id', studentId)
      .eq('academic_year', targetAcademicYear)
      .eq('semester', targetSemester);

    if (financeError) {
      console.error('Financial records error:', financeError);
      return {
        cleared: false,
        notes: 'Error checking financial records',
        details: ['❌ Error checking financial status'],
        outstandingBalance: 0,
        totalFees: 0,
        totalPaid: 0
      };
    }

    let totalFees = 0;
    let totalPaid = 0;
    let outstandingBalance = 0;

    if (!financialRecords || financialRecords.length === 0) {
      // Check all records for this academic year
      const { data: allYearRecords, error: allYearError } = await supabase
        .from('financial_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('academic_year', targetAcademicYear);

      if (allYearError || !allYearRecords || allYearRecords.length === 0) {
        return {
          cleared: false,
          notes: 'No fee records found',
          details: ['❌ No fee records found for this academic year'],
          outstandingBalance: 0,
          totalFees: 0,
          totalPaid: 0
        };
      }

      // Calculate from all records in the academic year
      allYearRecords.forEach(record => {
        const amount = parseFloat(record.amount) || 0;
        totalFees += amount;
        
        if (record.status === 'paid') {
          totalPaid += amount;
        } else {
          const balanceDue = parseFloat(record.balance_due) || amount;
          outstandingBalance += balanceDue;
        }
      });
    } else {
      // Calculate from specific semester records
      financialRecords.forEach(record => {
        const amount = parseFloat(record.amount) || 0;
        totalFees += amount;
        
        if (record.status === 'paid') {
          totalPaid += amount;
        } else {
          const balanceDue = parseFloat(record.balance_due) || amount;
          outstandingBalance += balanceDue;
        }
      });
    }

    const financialCleared = outstandingBalance === 0;
    const financialNotes = financialCleared 
      ? `All fees cleared. Total paid: $${totalPaid.toLocaleString()}`
      : `Outstanding balance: $${outstandingBalance.toLocaleString()}. Total fees: $${totalFees.toLocaleString()}, Paid: $${totalPaid.toLocaleString()}`;

    const financialDetails = financialCleared 
      ? ['✅ All fees are paid', `  - Total fees: $${totalFees.toLocaleString()}`, `  - Amount paid: $${totalPaid.toLocaleString()}`, `  - Balance: $0.00`]
      : ['❌ Outstanding fees', `  - Total fees: $${totalFees.toLocaleString()}`, `  - Amount paid: $${totalPaid.toLocaleString()}`, `  - Balance due: $${outstandingBalance.toLocaleString()}`];

    return {
      cleared: financialCleared,
      notes: financialNotes,
      details: financialDetails,
      outstandingBalance,
      totalFees,
      totalPaid
    };

  } catch (error) {
    console.error('Error in checkFinancialClearance:', error);
    return {
      cleared: false,
      notes: `Financial check error: ${error.message}`,
      details: ['❌ Error checking financial status'],
      outstandingBalance: 0,
      totalFees: 0,
      totalPaid: 0
    };
  }
};

/**
 * Helper function to get existing clearance status
 */
export const getExamClearanceStatus = async (studentId, academicYear, semester) => {
  try {
    const { data, error } = await supabase
      .from('student_exam_clearance')
      .select('*')
      .eq('student_id', studentId)
      .eq('academic_year', academicYear)
      .eq('semester', semester)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting clearance status:', error);
    return null;
  }
};

/**
 * Function to manually trigger clearance check
 */
export const manuallyCheckClearance = async (studentId, academicYear, semester) => {
  try {
    return await checkExamClearance(studentId, academicYear, semester);
  } catch (error) {
    console.error('Manual clearance check error:', error);
    throw error;
  }
};

/**
 * DEBUG: Get detailed attendance analysis
 */
export const debugAttendanceRecords = async (studentId) => {
  try {
    console.log('=== DEBUG ATTENDANCE RECORDS ===');
    
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, student_id, full_name, academic_year, semester, year_of_study, program, program_code')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return { error: 'Student not found', details: studentError };
    }

    // Get dashboard attendance percentage
    const dashboardPercentage = await getDashboardAttendancePercentage(studentId);
    
    // Also get all records for debugging
    const { data: allRecords, error: allRecordsError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: true });

    const analysis = {
      student: {
        id: student.id,
        student_id: student.student_id,
        name: student.full_name,
        academic_year: student.academic_year,
        semester: student.semester,
        year_of_study: student.year_of_study,
        program: student.program,
        program_code: student.program_code
      },
      dashboard: {
        percentage: dashboardPercentage,
        cleared: dashboardPercentage >= 75,
        method: 'Last 4 months calculation (same as dashboard)'
      },
      rawData: {
        totalRecords: allRecords?.length || 0,
        recordsWithNullLectureId: allRecords?.filter(r => !r.lecture_id).length || 0,
        sampleRecords: allRecords?.slice(0, 10).map(r => ({
          date: r.date,
          status: r.status,
          lecture_id: r.lecture_id ? 'has_id' : 'null',
          course_id: r.course_id
        })) || []
      }
    };

    return analysis;

  } catch (error) {
    console.error('Debug error:', error);
    return { error: `Debug error: ${error.message}` };
  }
};

/**
 * Quick clearance status check
 */
export const quickClearanceCheck = async (studentId) => {
  try {
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('academic_year, semester, student_id, full_name')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return { cleared: false, error: 'Student not found' };
    }

    // Get existing clearance status from database
    const existingStatus = await getExamClearanceStatus(
      studentId,
      student.academic_year,
      student.semester
    );

    if (existingStatus) {
      return {
        cleared: existingStatus.overall_cleared,
        financial: existingStatus.financial_cleared,
        attendance: existingStatus.attendance_cleared,
        cached: true,
        lastChecked: existingStatus.updated_at,
        notes: {
          financial: existingStatus.financial_notes,
          attendance: existingStatus.attendance_notes
        }
      };
    }

    return {
      cleared: false,
      financial: false,
      attendance: false,
      cached: false,
      needsFullCheck: true,
      message: 'No cached clearance status found'
    };

  } catch (error) {
    console.error('Quick clearance check error:', error);
    return { cleared: false, error: error.message };
  }
};

/**
 * Error response helper
 */
const getErrorResponse = (errorMessage) => {
  return {
    cleared: false,
    financial: { 
      cleared: false, 
      notes: errorMessage,
      details: ['❌ System error checking financial status'],
      outstandingBalance: 0,
      totalFees: 0,
      totalPaid: 0
    },
    attendance: { 
      cleared: false, 
      notes: errorMessage,
      details: ['❌ System error checking attendance'],
      percentage: 0,
      attended: 0,
      expected: 0
    },
    student: null,
    error: errorMessage,
    timestamp: new Date().toISOString()
  };
};

export default {
  checkExamClearance,
  getExamClearanceStatus,
  manuallyCheckClearance,
  debugAttendanceRecords,
  quickClearanceCheck
};