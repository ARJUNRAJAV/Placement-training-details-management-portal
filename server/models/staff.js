const mongoose = require('mongoose');


const staffschema = new mongoose.Schema({
   staffname:String,
   staffemail:String,
   staffid:String,
   staffdepartment:String,
});


const Staffmodel = mongoose.model('staff', staffschema);
module.exports = Staffmodel;
