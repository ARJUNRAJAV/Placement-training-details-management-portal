const mongoose = require('mongoose');

const trainingschema = new mongoose.Schema({
   trainingname:String,
   trainingduration:String,
   venue:String,
   trainingdepartment:String,
   trainingbatch:String,
   startdate: Date,
   enddate: Date
});


const Trainingmodel = mongoose.model('Training', trainingschema);
module.exports = Trainingmodel