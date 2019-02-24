var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var ChatStatusSchema = new Schema({
  user_id: { type: String, unique: true },
  name: String,
  status: String,
  goals: [{
  	name: String,
  	progress: Number,
  	trend: Number
  }],
  hobbies: [{
  	name: String,
  	progress: Number,
  	trend: Number
  }],
  supporters: [{
  	name: String,
  	progress: Number,
  	trend: Number
  }]
});

module.exports = mongoose.model("ChatStatus", ChatStatusSchema);