import React, { useState } from 'react';

const Results = () => {
  const [activeYear, setActiveYear] = useState('year1');

  const resultsData = {
    year1: {
      semester1: [
        { course: "ENGINEERING MATHEMATICS-I", grade: "A", credits: 4, score: 85, gpa: 5.0 },
        { course: "FUNDAMENTALS OF ELECTRICAL ENGINEERING", grade: "A", credits: 3, score: 82, gpa: 5.0 },
        { course: "ENGINEERING PHYSICS", grade: "A", credits: 3, score: 97, gpa: 5.0 },
        { course: "C-PROGRAMMING", grade: "B", credits: 3, score: 75, gpa: 4.0 },
        { course: "ENGINEERING PROFESSIONAL SKILLS", grade: "A", credits: 3, score: 80, gpa: 5.0 }
      ],
      semester2: [
        { course: "ENGINEERING MATHEMATICS-II", grade: "A", credits: 4, score: 85, gpa: 5.0 },
        { course: "OPERATING SYSTEMS", grade: "B", credits: 3, score: 75, gpa: 4.0 },
        { course: "ENGINEERING CHEMISTRY", grade: "B+", credits: 3, score: 78, gpa: 4.5 },
        { course: "DIGITAL SYSTEMS", grade: "C+", credits: 3, score: 67, gpa: 3.5 },
        { course: "DATA STRUCTURES AND ALGORITHMS", grade: "B+", credits: 3, score: 79, gpa: 4.5 }
      ]
    },
    year2: {
      semester1: [
        { course: "ENGINEERING MATHEMATICS-III", grade: "A", credits: 4, score: 88, gpa: 5.0 },
        { course: "DATABASE MANAGEMENT SYSTEMS", grade: "B+", credits: 3, score: 79, gpa: 4.0 },
        { course: "OBJECT ORIENTED PROGRAMMING USING JAVA", grade: "B+", credits: 3, score: 79, gpa: 4.0 },
        { course: "MICROPROCESSOR & PC HARDWARE", grade: "B+", credits: 3, score: 79, gpa: 4.0 }
      ],
      semester2: [
        { course: "ENGINEERING MATHEMATICS-IV", grade: "A", credits: 4, score: 90, gpa: 5.0 },
        { course: "ARTIFICIAL INTELLIGENCE", grade: "B+", credits: 3, score: 78, gpa: 4.5 }
      ]
    }
  };

  const exportToPDF = () => {
    alert('PDF export functionality would be implemented here.');
    // In a real app, this would generate and download a PDF
  };

  return (
    <div className="content">
      <div className="dashboard-header">
        <h2>Examination Results</h2>
        <div className="date-display">Academic Year: 2024-2025</div>
      </div>

      <div className="tabs">
        <div className="tab active" data-result-tab="current">Results</div>
        <div className="tab CGPA"><strong>CGPA:</strong> 4.5</div>
        <button id="export-pdf" className="export-button" onClick={exportToPDF}>
          Export to PDF
        </button>
      </div>

      <div className="tab-content active" id="current-results">
        <div className="year-selector">
          <div className="custom-select-wrapper">
            <select 
              id="academic-year" 
              className="form-control"
              value={activeYear}
              onChange={(e) => setActiveYear(e.target.value)}
            >
              <option value="year1">Year 1</option>
              <option value="year2">Year 2</option>
              <option value="year3">Year 3</option>
              <option value="year4">Year 4</option>
            </select>
            <span className="custom-arrow">▼</span>
          </div>
        </div>

        {Object.keys(resultsData).map(year => (
          <div 
            key={year} 
            className="year-results" 
            style={{ display: activeYear === year ? 'block' : 'none' }}
            id={`${year}-results`}
          >
            <h3>{year.replace('year', 'Year ')}, Semester 1 (2024-2025)</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Final Grade</th>
                    <th>Credit Units</th>
                    <th>Score</th>
                    <th>GPA</th>
                  </tr>
                </thead>
                <tbody>
                  {resultsData[year].semester1.map((course, index) => (
                    <tr key={index}>
                      <td>{course.course}</td>
                      <td className={`grade-${course.grade.charAt(0)}`}>{course.grade}</td>
                      <td>{course.credits}</td>
                      <td>{course.score}</td>
                      <td>{course.gpa}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan="3"></td>
                    <td><strong>Semester GPA:</strong></td>
                    <td><strong>4.2</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>{year.replace('year', 'Year ')}, Semester 2 (2024-2025)</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Final Grade</th>
                    <th>Credit Units</th>
                    <th>Score</th>
                    <th>GPA</th>
                  </tr>
                </thead>
                <tbody>
                  {resultsData[year].semester2.map((course, index) => (
                    <tr key={index}>
                      <td>{course.course}</td>
                      <td className={`grade-${course.grade.charAt(0)}`}>{course.grade}</td>
                      <td>{course.credits}</td>
                      <td>{course.score}</td>
                      <td>{course.gpa}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan="3"></td>
                    <td><strong>Semester GPA:</strong></td>
                    <td><strong>4.1</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Results;