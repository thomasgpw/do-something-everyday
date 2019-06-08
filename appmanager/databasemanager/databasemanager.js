/**
 * @fileoverview The controller module for communicating
 *     between the AppManager module and the Mongo Database.
 * @module DatabaseManager
 */

const MONGODB_URI = process.env.MONGODB_URI;
const mongoose = require('mongoose');
const UserDoc = require('./schema/userdoc');

mongoose.connect(MONGODB_URI);

/**
 * Sets a user's UserDoc status, if the user is new, it creates a new UserDoc.
 * 
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE 
 * @param {string} status - the status to set as UserDoc's status
 * @param {Function} callback - the function called after successfully
 *     updating the UserDoc status
 * @param {Winston} logger - the Winston logger
 */
function updateStatus(sender_psid, status, callback, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.updateStatus')
    const query = {user_id: sender_psid};
    const update = {status: status};
    // true if status is INIT_0, this makes a new document for the sender 
    const options = {upsert: status === 'INIT_0'};

    UserDoc.findOneAndUpdate(query, update, options).exec((err, userDoc) => {
      logger.info('DatabaseManager.updateStatus.UserDoc.findOneAndUpdate.exec');
      if (status === userDoc.status) {
        callback(sender_psid, status, logger)
      } else {
        logger.error('status did not correctly set in db', {'should be':status, 'is':userDoc.status})
      }
    })
  }
}

function updateName(sender_psid, preferred_name, status, callback, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.updateName')
    const query = {user_id: sender_psid};
    const update = {status: status, name: preferred_name};
    UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
      logger.info('DatabaseManager.updateName.UserDoc.findOneAndUpdate.exec');
      callback(sender_psid, status, userDoc, logger)
    })
  }
}

function addGoal(sender_psid, goal, status, callback, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.addGoal')
    const query = {user_id: sender_psid};
    const update = {status: status, $addToSet : {goals: {name: goal, progress: 0, trend: 0}}};
    UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
      logger.info('DatabaseManager.addGoal.UserDoc.findOneAndUpdate.exec');
      callback(sender_psid, status, userDoc, logger)
    })
  }
}

function addHobby(sender_psid, hobby, status, callback, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.addHobby')
    const query = {user_id: sender_psid};
    const update = {status: status, $addToSet : {hobbies: {name: hobby, progress: 0, trend: 0}}};
    UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
      logger.info('DatabaseManager.addHobby.UserDoc.findOneAndUpdate.exec');
      callback(sender_psid, status, userDoc, logger)
    })
  }
}

function addSupport(sender_psid, supporter, status, callback, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.addSupport')
    const query = {user_id: sender_psid};
    const update = {status: status, $addToSet : {supporters: {name: supporter, progress: 0, trend: 0}}};
    UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
      logger.info('DatabaseManager.addSupport.UserDoc.findOneAndUpdate.exec');
      callback(sender_psid, status, userDoc, logger)
    })
  }
}

// For devpage only
function getAll(sender_psid, res, callback, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.getAll')
    const query = {user_id: sender_psid};
    UserDoc.findOne(query).exec((err, userDoc) => {
      logger.info('UserDoc.findOne.exec get all attributes from db:');
      callback(sender_psid, res, userDoc, logger);
    })
  }
}

function getStatus(sender_psid, callback, received_message, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.getStatus')
    const query = {user_id: sender_psid};
    UserDoc.findOne(query, {status: 1}).exec((err, userDoc) => {
      logger.info('DatabaseManager.getStatus.UserDoc.findOne.exec');
      callback(sender_psid, userDoc, received_message, logger);
    })
  }
}

function getName(sender_psid, callback, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.getName')
    const query = {user_id: sender_psid};
    UserDoc.findOne(query, {name: 1}).exec((err, userDoc) => {
      logger.info('DatabaseManager.getName.UserDoc.findOne.exec');
      callback(sender_psid, userDoc, logger);
    })
  }
}

function getGoal(sender_psid, callback, options, logger) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.getGoal')
    const query = {user_id: sender_psid};
    if (options) {
      if (options.name) {
      const select = {goals: {$elemMatch: {'name': options.name}}}
      } else {
        logger.error('in getGoal the only supported option is .name', options)
      }
    } else {
      const select = {goals: {$sample: {size: 1}}}
    }
    UserDoc.findOne(query, select).exec((err, userDoc) => {
      logger.info('DatabaseManager.getGoal.UserDoc.findOne.exec');
      callback(sender_psid, userDoc, logger);
    })
  }
}

function byTag(sender_psid, tag, logger) {
  logger.info('DatabaseManager.byTag', {'tag': tag})
  const _TAG_REFERENCE = {
    '/NAME/': getName
  }
  return _TAG_REFERENCE[tag](sender_psid, (sender_psid, userDoc) => {
    logger.info('inside callback of _TAG_REFERENCE[tag] in byTag with userDoc', {'userDoc': userDoc})
    return (sender_psid, userDoc)
  }, logger)
}

module.exports = {
  'updateStatus': updateStatus,
  'updateName': updateName,
  'addGoal': addGoal,
  'addHobby': addHobby,
  'addSupport': addSupport,
  'getAll': getAll,
  'getStatus': getStatus,
  'getName': getName,
  'byTag': byTag
}