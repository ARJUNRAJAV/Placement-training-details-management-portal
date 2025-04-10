const mongoose = require('mongoose');


const studentSchema = new mongoose.Schema({
   name:String,
   email:String,
   rollno:String,
   department:String,
   year:String
});


const StudentModel = mongoose.model('Students', studentSchema);
module.exports = StudentModel;
