const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

const StudentModel = require('./models/student.js');
const Trainingmodel = require('./models/training.js');
const Staffmodel = require('./models/staff.js');



const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use SMTP config
  auth: {
    user: 'arjunraja0906@gmail.com',
    pass: 'loockvpazgvwrcuv' // NOT your real password — use App Password
  }
});



app.use(express.json());
app.use(cors());

mongoose.connect("mongodb://localhost:27017/PTDMS");

// ====== SCHEMA USED FOR DYNAMIC TRAINING COLLECTIONS ======
const trainingSchema = new mongoose.Schema({
  name: String,
  rollno: String,
  department: String,
  year: String,
  
  totalDays: { type: Number, default: 0 },
  presentDays: { type: Number, default: 0 },
  attendancePercentage: { type: Number, default: 0 },
  presentDates: [{ type: Date }],

  totalMarks: { type: Number, default: 0 },
  marksCount: { type: Number, default: 0 },
  marksPercentage: { type: Number, default: 0 },
  
  // ✅ New field for storing each mark and its date
  marksHistory: [
    {
      mark: { type: Number },
      date: { type: Date }
    }
  ],

  date: Date // Optional: last update date
});

// ====== LOGIN ======
app.post('/', (req, res) => {
  const { email, rollno, role } = req.body;

  if (role === "student") {
    StudentModel.findOne({ email, rollno })
      .then(user => {
        if (user) {
          res.json("Success");
        } else {
          res.json({ status: "error", message: "Invalid student credentials" });
        }
      })
      .catch(err => res.status(500).json({ status: "error", message: "Server error" }));
  } else if (role === "staff") {
    Staffmodel.findOne({ staffemail: email, staffid: rollno })
      .then(staff => {
        if (staff) {
          res.json("Success");
        } else {
          res.json({ status: "error", message: "Staff not found" });
        }
      })
      .catch(err => res.status(500).json({ status: "error", message: "Server error" }));
  } else {
    res.json({ status: "error", message: "Invalid role selected" });
  }
});

// ====== STUDENT ROUTES ======
app.get('/addstudent', async (req, res) => {
  try {
    const students = await StudentModel.find();
    res.json(students);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/addstudent', async (req, res) => {
  const { name, email, rollno, department, year } = req.body;

  try {
    // Save student in DB
    const newStudent = await StudentModel.create({ name, email, rollno, department, year });

    // Send welcome email
    const mailOptions = {
      from: 'your_email@gmail.com',
      to: email,
      subject: 'Welcome to the Placement Training Portal 🎉',
      html: `
        <h2>Welcome, ${name}!</h2>
        <p>You’ve been successfully added to the Placement Training Portal.</p>
        <p><b>Roll No:</b> ${rollno}</p>
        <p><b>Department:</b> ${department}</p>
        <p><b>Year:</b> ${year}</p>
        <p>Start exploring your training opportunities and track your progress!</p>
        <p>Login Credentials:</p>
        <p>Your Username:${email}</p>
        <p>Your password:${rollno}</p>

        <br/>
        <em>- Team BITHUB</em>
      `
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Error sending mail:', err);
      } else {
        console.log('Email sent:', info.response);
      }
    });

    // Send response to frontend
    res.json({ message: 'Student added and email sent!', student: newStudent });

  } catch (err) {
    console.error("Error adding student:", err);
    res.status(500).json({ error: "Failed to add student" });
  }
});

// ====== STAFF ROUTES ======
app.get('/addstaff', async (req, res) => {
  try {
    const staff = await Staffmodel.find();
    res.json(staff);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/addstaff', (req, res) => {
  Staffmodel.create(req.body)
    .then(data => res.json(data))
    .catch(err => res.status(500).json(err));
});

//retrieve count of the records
app.get('/dashboard', async (req, res) => {
  try {
    const studentCount = await StudentModel.countDocuments();
    const staffCount = await Staffmodel.countDocuments();
    const trainingCount = await Trainingmodel.countDocuments();
    const training = await Trainingmodel.find();

    res.json({ studentCount, staffCount, trainingCount,training });
  } catch (err) {
    console.error("Error fetching counts:", err);
    res.status(500).json({ error: "Failed to fetch counts" });
  }
});



// ====== ADD TRAINING + AUTO INSERT STUDENTS INTO TRAINING COLLECTION ======
app.post('/addtraining', async (req, res) => {
  try {
    const {
      trainingname,
      trainingdepartment,
      trainingbatch,
      startdate,
      enddate,
      venue
    } = req.body;

    const newTraining = await Trainingmodel.create(req.body);
    const collectionName = trainingname.replace(/\s+/g, '_').toLowerCase();
    const AttendanceModel =
      mongoose.models[collectionName] ||
      mongoose.model(collectionName, trainingSchema, collectionName);

    const matchedStudents = await StudentModel.find({
      department: trainingdepartment,
      year: trainingbatch,
    });

    const attendanceData = matchedStudents.map(student => ({
      name: student.name,
      rollno: student.rollno,
      department: student.department,
      year: student.year
    }));

    await AttendanceModel.insertMany(attendanceData);

    // Send mail to each matched student
    for (const student of matchedStudents) {
      const mailOptions = {
        from: 'your_email@gmail.com',
        to: student.email,
        subject: `📢 New Training Assigned: ${trainingname}`,
        html: `
          <h2>Hello, ${student.name}!</h2>
          <p>You have been assigned a new training by  the <b>T&P cell</b> </p>
          <ul>
            <li><b>Training:</b> ${trainingname}</li>
            <li><b>Department:</b> ${trainingdepartment}</li>
            <li><b>Batch:</b> ${trainingbatch}</li>
            <li><b>Start Date:</b> ${new Date(startdate).toLocaleDateString('en-GB')}</li>
            <li><b>End Date:</b> ${new Date(enddate).toLocaleDateString('en-GB')}</li>
            <li><b>Venue:</b> ${venue}</li>
          </ul>
          <p>Please check your dashboard for more details.</p>
          <br/>
          <em>- BITHUB Training Team</em>
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(`❌ Failed to send email to ${student.email}:`, error.message);
        } else {
          console.log(`✅ Mail sent to ${student.email}:`, info.response);
        }
      });
    }

    res.json({
      message: "Training created, students added, and emails sent",
      studentsAdded: attendanceData.length
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: "Failed to add training" });
  }
});

// ====== GET ALL TRAININGS ======
app.get('/addtraining', async (req, res) => {
  try {
    const training = await Trainingmodel.find();
    res.json(training);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// ====== GET TRAINING STUDENTS FOR SPECIFIC TRAINING ======
app.get('/specificdetails/:training', async (req, res) => {
  const collectionName = req.params.training.replace(/\s+/g, '_').toLowerCase();
  try {
    const DynamicModel = mongoose.models[collectionName] || mongoose.model(collectionName, new mongoose.Schema({}, { strict: false }), collectionName);
    const records = await DynamicModel.find();
    res.json(records);
  } catch (err) {
    console.error("Error fetching records:", err);
    res.status(500).json({ message: "Fetch error" });
  }
});

// ====== UPDATE ATTENDANCE & MARKS CUMULATIVELY ======
app.put('/specificdetails/:collectionName/:rollno', async (req, res) => {
  const { collectionName, rollno } = req.params;
  const { attendance, marks, date } = req.body;

  const parsedAttendance = parseFloat(attendance);
  const parsedMarks = parseFloat(marks);
  const newDate = new Date(date);

  try {
    const TrainingModel =
      mongoose.models[collectionName] ||
      mongoose.model(collectionName, trainingSchema, collectionName);

    const student = await TrainingModel.findOne({ rollno });

    if (!student) {
      console.log("No student found for rollno:", rollno);
      return res.status(404).json({ error: "Student not found" });
    }

    // Ensure fields are initialized
    student.presentDates = Array.isArray(student.presentDates) ? student.presentDates : [];
    student.marksHistory = Array.isArray(student.marksHistory) ? student.marksHistory : [];
    student.totalDays = student.totalDays || 0;
    student.presentDays = student.presentDays || 0;
    student.totalMarks = student.totalMarks || 0;
    student.marksCount = student.marksCount || 0;

    // Attendance logic
    const alreadyMarked = student.presentDates.some(
      d => new Date(d).toDateString() === newDate.toDateString()
    );

    if (!alreadyMarked) {
      student.totalDays += 1;

      if (parsedAttendance > 50) {
        student.presentDays += 1;
        student.presentDates.push(newDate);
      }
    }

    student.attendancePercentage =
      student.totalDays > 0
        ? (student.presentDays / student.totalDays) * 100
        : 0;

    // Marks logic
    if (!isNaN(parsedMarks)) {
      student.totalMarks += parsedMarks;
      student.marksCount += 1;
      student.marksPercentage = student.totalMarks / student.marksCount;

      // Push to marksHistory
      student.marksHistory.push({
        mark: parsedMarks,
        date: newDate
      });
    }

    student.date = date;

    await student.save();
    res.json({ message: "Updated successfully", student });

  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});







//admin panel specif training details
app.get('/adminspecific/:training', async (req, res) => {
  const training = req.params.training.replace(/\s+/g, '_').toLowerCase();
  const collectionName = training;

  try {
    const AdminModel = mongoose.models[collectionName] || mongoose.model(
      collectionName,
      new mongoose.Schema({}, { strict: false }),
      collectionName
    );

    const data = await AdminModel.find({});
    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching admin data:", err);
    res.status(500).json({ message: "Failed to fetch data" });
  }
});

// ====== FILTER STUDENTS BY DEPARTMENT (Optional) ======
app.get("/specificdetails", async (req, res) => {
  const department = req.query.department;
  try {
    const students = await StudentModel.find({
      department: { $regex: new RegExp(`^${department}$`, 'i') }
    });
    res.json(students);
  } catch (err) {
    res.status(500).json({ status: "error", message: "Server error" });
  }
});



//student performance
app.get('/studentperformance/:rollno', async (req, res) => {
  const { rollno } = req.params;

  try {
    const user = await StudentModel.findOne({ rollno });

    if (!user) {
      return res.status(404).json({ message: "Student not found" });
    }

    const department = user.department;

    const trainings = await Trainingmodel.find({ trainingdepartment: department });

    if (!trainings || trainings.length === 0) {
      return res.status(404).json({ message: "No trainings found for this student" });
    }

    res.json(trainings);
  } catch (error) {
    console.error("Error fetching student or trainings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


//retireve student performance for specific training

app.get('/studentdashboard/:collectionName/:rollno', async (req, res) => {
  const { collectionName, rollno } = req.params;

  try {
    const TrainingModel = mongoose.model(collectionName, trainingSchema, collectionName);
    const student = await TrainingModel.findOne({ rollno });

    if (!student) return res.status(404).json({ message: 'Student not found' });

    res.json(student);
  } catch (err) {
    console.error("Error fetching student:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// ====== SERVER START ======
app.listen(3001, () => {
  console.log("Server started on port 3001");
});
