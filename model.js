const MONGODB_URI = process.env.MONGODB_URI;
const mongoose = require('mongoose');
var db = mongoose.connect(MONGODB_URI);
var ChatStatus = require("./models/chatstatus");

// Modified off of index2.js by Vivian Chan
function updateStatus(sender_psid, status, callback, winston) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    const update = {status: status};
    // true if status is INIT_0, this makes a new document for the sender 
    const options = {upsert: status === "INIT_0"};

    ChatStatus.findOneAndUpdate(query, update, options).exec((err, cs) => {
      winston.log('info', 'update status to db: ', cs);
      callback(sender_psid, status, cs)
    })
  }
}

function updateName(sender_psid, preferred_name, status, callback, winston) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    const update = {status: status, name: preferred_name};
    ChatStatus.findOneAndUpdate(query, update).exec((err, cs) => {
      winston.log('info', 'update name to db: ', cs);
      callback(sender_psid, status, cs)
    })
  }
}

function addGoal(sender_psid, goal, status, callback, winston) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    const update = {status: status, $addToSet : {goals: {name: goal, progress: 0, trend: 0}}};
    ChatStatus.findOneAndUpdate(query, update).exec((err, cs) => {
      winston.log('info', 'add goal to db: ', cs);
      callback(sender_psid, status, cs)
    })
  }
}

function addHobby(sender_psid, hobby, status, callback, winston) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    const update = {status: status, $addToSet : {hobbies: {name: hobby, progress: 0, trend: 0}}};
    ChatStatus.findOneAndUpdate(query, update).exec((err, cs) => {
      winston.log('info', 'add hobby to db: ', cs);
      callback(sender_psid, status, cs)
    })
  }
}

function addSupport(sender_psid, supporter, status, callback, winston) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    const update = {status: status, $addToSet : {supporters: {name: supporter, progress: 0, trend: 0}}};
    ChatStatus.findOneAndUpdate(query, update).exec((err, cs) => {
      winston.log('info', 'add supporter to db: ', cs);
      callback(sender_psid, status, cs)
    })
  }
}

function getStatus(sender_psid, callback, received_message, winston) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    ChatStatus.findOne(query, {status: 1}).exec((err, obj) => {
      winston.log('info', 'get status from db: ', obj);
      callback(sender_psid, obj, received_message);
    })
  }
}

function getName(sender_psid, callback, winston) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    ChatStatus.findOne(query, {name: 1}).exec((err, obj) => {
      winston.log('info', 'get name from db: ', obj);
      callback(sender_psid, obj);
    })
  }
}

function getGoal(sender_psid, callback, options, winston) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    if (options) {
    	if (options.name) {
		  const select = {goals: {$elemMatch: {'name': options.name}}}
    	} else {
    	  winston.log('error', 'in getGoal the only supported option is .name', options)
    	}
    } else {
    	const select = {goals: {$sample: {size: 1}}}
    }
    ChatStatus.findOne(query, select).exec((err, obj) => {
      winston.log('info', 'get goal from db: ', obj);
      callback(sender_psid, obj);
    })
  }
}

module.exports = {
	'updateStatus': updateStatus,
	'updateName': updateName,
	'addGoal': addGoal,
	'addHobby': addHobby,
	'addSupport': addSupport,
	'getStatus': getStatus,
	'getName': getName
}