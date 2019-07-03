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
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 * @param {string} status - the status to set as UserDoc's status
 * @param {Function} getPostbackScriptResponse - the function called after successfully
 *     updating the UserDoc status
 */
function updateStatus(logger, sender_psid, status, getPostbackScriptResponse) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.updateStatus')
    const query = {user_id: sender_psid};
    const update = {status: status};
    // true if status is INIT_0, this makes a new document for the sender
    const options = {upsert: status === 'INIT_0'};

    UserDoc.findOneAndUpdate(query, update, options).exec((err, userDoc) => {
      logger.info('DatabaseManager.updateStatus.UserDoc.findOneAndUpdate.exec');
      getPostbackScriptResponse(logger, sender_psid, status)
    })
  }
}

/**
 * Sets a user's UserDoc name.
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 * @param {string} preffered_name - the name to set as UserDoc's name
 * @param {string} status - the status to set as UserDoc's status
 * @param {Function} getPostbackScriptResponse - the function called after successfully
 *     updating the UserDoc status
 */
function updateName(logger, sender_psid, preferred_name, status, getPostbackScriptResponse) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.updateName')
    const query = {user_id: sender_psid};
    const update = {status: status, name: preferred_name};
    UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
      logger.info('DatabaseManager.updateName.UserDoc.findOneAndUpdate.exec');
      getPostbackScriptResponse(logger, sender_psid, status)
    })
  }
}

/**
 * Adds a goal to a user's UserDoc goals.
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 * @param {string} goal - the goal to add to UserDoc's list of goals
 * @param {string} status - the status to set as UserDoc's status
 * @param {Function} getPostbackScriptResponse - the function called after successfully
 *     updating the UserDoc status
 */
function addGoal(logger, sender_psid, goal, status, getPostbackScriptResponse) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.addGoal')
    const query = {user_id: sender_psid};
    const update = {status: status, $addToSet : {goals: {name: goal, progress: 0, trend: 0}}};
    UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
      logger.info('DatabaseManager.addGoal.UserDoc.findOneAndUpdate.exec');
      getPostbackScriptResponse(logger, sender_psid, status)
    })
  }
}

/**
 * Adds a hobby to a user's UserDoc hobbies.
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 * @param {string} hobby - the hobby to add to UserDoc's list of hobbies
 * @param {string} status - the status to set as UserDoc's status
 * @param {Function} getPostbackScriptResponse - the function called after successfully
 *     updating the UserDoc status
 */
function addHobby(logger, sender_psid, hobby, status, getPostbackScriptResponse) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.addHobby')
    const query = {user_id: sender_psid};
    const update = {status: status, $addToSet : {hobbies: {name: hobby, progress: 0, trend: 0}}};
    UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
      logger.info('DatabaseManager.addHobby.UserDoc.findOneAndUpdate.exec');
      getPostbackScriptResponse(logger, sender_psid, status)
    })
  }
}

/**
 * Adds a supporter to a user's UserDoc supporters.
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 * @param {string} supporter - the supporter to add to UserDoc's list of supporters
 * @param {string} status - the status to set as UserDoc's status
 * @param {Function} getPostbackScriptResponse - the function called after successfully
 *     updating the UserDoc status
 */
function addSupport(logger, sender_psid, supporter, status, getPostbackScriptResponse) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.addSupport')
    const query = {user_id: sender_psid};
    const update = {status: status, $addToSet : {supporters: {name: supporter, progress: 0, trend: 0}}};
    UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
      logger.info('DatabaseManager.addSupport.UserDoc.findOneAndUpdate.exec');
      getPostbackScriptResponse(logger, sender_psid, status)
    })
  }
}

// For devpage only
function getAll(logger, sender_psid, res, callback) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.getAll')
    const query = {user_id: sender_psid};
    UserDoc.findOne(query).exec((err, userDoc) => {
      logger.info('UserDoc.findOne.exec get all attributes from db:');
      callback(logger, sender_psid, res, userDoc);
    })
  }
}

function getStatus(logger, sender_psid, callback, received_message_text) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.getStatus')
    const query = {user_id: sender_psid};
    UserDoc.findOne(query, {status: 1}).exec((err, userDoc) => {
      logger.info('DatabaseManager.getStatus.UserDoc.findOne.exec');
      callback(logger, sender_psid, userDoc.status, received_message_text);
    })
  }
}

function getName(logger, sender_psid, callback) {
  if (sender_psid != process.env.APP_PSID) {
    logger.info('DatabaseManager.getName')
    const query = {user_id: sender_psid};
    UserDoc.findOne(query, {name: 1}).exec((err, userDoc) => {
      logger.info('DatabaseManager.getName.UserDoc.findOne.exec');
      callback(logger, sender_psid, userDoc);
    })
  }
}

function getGoal(logger, sender_psid, callback) {
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
      callback(logger, sender_psid, userDoc);
    })
  }
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