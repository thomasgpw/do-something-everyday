/**
 * @fileoverview The schema definition for the only database model, UserDocs.
 * @module UserDoc
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserDocSchema = new Schema({
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

module.exports = mongoose.model('UserDoc', UserDocSchema);