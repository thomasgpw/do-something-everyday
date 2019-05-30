const
  MONGODB_URI = process.env.MONGODB_URI,
  mongoose = require('mongoose'),
  UserDoc = require("./schema/userdoc");

mongoose.connect(MONGODB_URI);

function updateStatus(sender_psid, status, callback, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.log('info', 'updateStatus function')
    const query = {user_id: sender_psid};
    const update = {status: status};
    // true if status is INIT_0, this makes a new document for the sender 
    const options = {upsert: status === "INIT_0"};

    UserDoc.findOneAndUpdate(query, update, options).exec((err, userDoc) => {
      logger.log('info', 'UserDoc.findOneAndUpdate.exec update status to db:');
      callback(sender_psid, status, userDoc, logger)
    })
  }
}

function updateName(sender_psid, preferred_name, status, callback, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.log('info', 'updateName function')
    const query = {user_id: sender_psid};
    const update = {status: status, name: preferred_name};
    UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
      logger.log('info', 'UserDoc.findOneAndUpdate.exec update name to db:');
      callback(sender_psid, status, userDoc, logger)
    })
  }
}

function addGoal(sender_psid, goal, status, callback, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.log('info', 'addGoal function')
    const query = {user_id: sender_psid};
    const update = {status: status, $addToSet : {goals: {name: goal, progress: 0, trend: 0}}};
    UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
      logger.log('info', 'UserDoc.findOneAndUpdate.exec add goal to db:');
      callback(sender_psid, status, userDoc, logger)
    })
  }
}

function addHobby(sender_psid, hobby, status, callback, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.log('info', 'addHobby function')
    const query = {user_id: sender_psid};
    const update = {status: status, $addToSet : {hobbies: {name: hobby, progress: 0, trend: 0}}};
    UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
      logger.log('info', 'UserDoc.findOneAndUpdate.exec add hobby to db:');
      callback(sender_psid, status, userDoc, logger)
    })
  }
}

function addSupport(sender_psid, supporter, status, callback, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.log('info', 'addSupport function')
    const query = {user_id: sender_psid};
    const update = {status: status, $addToSet : {supporters: {name: supporter, progress: 0, trend: 0}}};
    UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
      logger.log('info', 'UserDoc.findOneAndUpdate.exec add supporter to db:');
      callback(sender_psid, status, userDoc, logger)
    })
  }
}

function getStatus(sender_psid, callback, received_message, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.log('info', 'getStatus function')
    const query = {user_id: sender_psid};
    UserDoc.findOne(query, {status: 1}).exec((err, userDoc) => {
      logger.log('info', 'UserDoc.findOne.exec get status from db:');
      callback(sender_psid, userDoc, received_message, logger);
    })
  }
}

function getName(sender_psid, callback, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.log('info', 'getName function')
    const query = {user_id: sender_psid};
    UserDoc.findOne(query, {name: 1}).exec((err, userDoc) => {
      logger.log('info', 'UserDoc.findOne.exec get name from db:');
      callback(sender_psid, userDoc, logger);
    })
  }
}

function getGoal(sender_psid, callback, options, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.log('info', 'getGoal function')
    const query = {user_id: sender_psid};
    if (options) {
    	if (options.name) {
		  const select = {goals: {$elemMatch: {'name': options.name}}}
    	} else {
    	  logger.log('error', 'in getGoal the only supported option is .name', options)
    	}
    } else {
    	const select = {goals: {$sample: {size: 1}}}
    }
    UserDoc.findOne(query, select).exec((err, userDoc) => {
      logger.log('info', 'UserDoc.findOne.exec get goal from db:');
      callback(sender_psid, userDoc, logger);
    })
  }
}

function byTag(sender_psid, tag, logger) {
  logger.log('info', 'inside db_model.byTag with tag ' + tag)
  const _TAG_REFERENCE = {
    '/NAME/': getName
  }
  return _TAG_REFERENCE[tag](sender_psid, (sender_psid, userDoc) => {
    logger.log('info', 'inside callback of _TAG_REFERENCE[tag] in byTag with userDoc', {'userDoc': userDoc})
    return (sender_psid, userDoc)
  }, logger)
}

module.exports = {
	'updateStatus': updateStatus,
	'updateName': updateName,
	'addGoal': addGoal,
	'addHobby': addHobby,
	'addSupport': addSupport,
	'getStatus': getStatus,
	'getName': getName,
  'byTag': byTag
}