var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var UserDocSchema = new Schema({
  user_id: { type: String, unique: true },
  name: { type: String, required: true },
  status: String,
  goals: [{
  	name: { type: String, unique: true },
  	progress: { type: Number, required: true },
  	trend: { type: Number, required: true }
  }],
  hobbies: [{
  	name: { type: String, unique: true },
  	progress: { type: Number, required: true },
    trend: { type: Number, required: true }
  }],
  supporters: [{
  	name: { type: String, unique: true },
  	progress: { type: Number, required: true },
    trend: { type: Number, required: true }
  }]
});

module.exports = mongoose.model("UserDoc", UserDocSchema);