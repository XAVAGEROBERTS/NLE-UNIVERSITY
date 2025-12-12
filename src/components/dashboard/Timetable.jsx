import React from 'react';

const Timetable = () => {
  const timetableData = [
    {
      time: "8:00 - 9:00",
      monday: "",
      tuesday: "Computer Architecture (CS-105)<br>202",
      wednesday: "",
      thursday: "Computer Architecture (CS-105)<br>202",
      friday: "",
      saturday: ""
    },
    {
      time: "9:00 - 10:00",
      monday: "",
      tuesday: "Computer Architecture (CS-105)<br>202",
      wednesday: "",
      thursday: "Computer Architecture (CS-105)<br>202",
      friday: "",
      saturday: ""
    },
    {
      time: "10:00 - 11:00",
      monday: "Data Structures (CS-202)<br>302",
      tuesday: "",
      wednesday: "Data Structures (CS-202)<br>302",
      thursday: "",
      friday: "Data Structures (CS-202)<br>302",
      saturday: ""
    },
    {
      time: "11:00 - 12:00",
      monday: "Data Structures (CS-202)<br>PRACTICE SESSION",
      tuesday: "",
      wednesday: "Data Structures (CS-202)<br>PRACTICE SESSION",
      thursday: "",
      friday: "Data Structures (CS-202)<br>PRACTICE SESSION",
      saturday: ""
    },
    {
      time: "12:00 - 1:00",
      monday: "",
      tuesday: "",
      wednesday: "",
      thursday: "",
      friday: "",
      saturday: ""
    },
    {
      time: "1:00 - 2:00",
      monday: "Database Systems (CS-203)<br>310",
      tuesday: "Operating Systems (CS-204)<br>202",
      wednesday: "Database Systems (CS-203)<br>310",
      thursday: "",
      friday: "",
      saturday: ""
    },
    {
      time: "2:00 - 3:00",
      monday: "Database Systems (CS-203)<br>310",
      tuesday: "Operating Systems (CS-204)<br>202",
      wednesday: "Database Systems (CS-203)<br>310",
      thursday: "",
      friday: "",
      saturday: ""
    },
    {
      time: "3:00 - 4:00",
      monday: "",
      tuesday: "",
      wednesday: "Operating Systems (CS-204)<br>202",
      thursday: "Lab: Database Systems<br>LAB-3",
      friday: "Lab: Data Structures<br>LAB-2",
      saturday: ""
    },
    {
      time: "4:00 - 5:00",
      monday: "",
      tuesday: "",
      wednesday: "Operating Systems (CS-204)<br>202",
      thursday: "Lab: Database Systems<br>LAB-3",
      friday: "Lab: Data Structures<br>LAB-2",
      saturday: ""
    },
    {
      time: "5:00 - 6:00",
      monday: "",
      tuesday: "",
      wednesday: "",
      thursday: "Lab: Database Systems<br>PRACTICE SESSION",
      friday: "Lab: Data Structures<br>PRACTICE SESSION",
      saturday: ""
    }
  ];

  return (
    <div className="content">
      <div className="dashboard-header">
        <h2>My Time Table</h2>
        <div className="date-display">Week: June 12 - June 18, 2025</div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Monday</th>
              <th>Tuesday</th>
              <th>Wednesday</th>
              <th>Thursday</th>
              <th>Friday</th>
              <th>Saturday</th>
            </tr>
          </thead>
          <tbody>
            {timetableData.map((row, index) => (
              <tr key={index}>
                <td>{row.time}</td>
                <td dangerouslySetInnerHTML={{ __html: row.monday }}></td>
                <td dangerouslySetInnerHTML={{ __html: row.tuesday }}></td>
                <td dangerouslySetInnerHTML={{ __html: row.wednesday }}></td>
                <td dangerouslySetInnerHTML={{ __html: row.thursday }}></td>
                <td dangerouslySetInnerHTML={{ __html: row.friday }}></td>
                <td dangerouslySetInnerHTML={{ __html: row.saturday }}></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Timetable;