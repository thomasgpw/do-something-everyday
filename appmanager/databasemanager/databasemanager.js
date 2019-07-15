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
  logger.info('DatabaseManager.updateName')
  const query = {user_id: sender_psid};
  const update = {status: status, name: preferred_name};
  UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
    logger.info('DatabaseManager.updateName.UserDoc.findOneAndUpdate.exec');
    getPostbackScriptResponse(logger, sender_psid, status)
  })
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
  logger.info('DatabaseManager.addGoal')
  const query = {user_id: sender_psid};
  const update = {status: status, $addToSet : {goals: {name: goal, progress: 0, trend: 0}}};
  UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
    logger.info('DatabaseManager.addGoal.UserDoc.findOneAndUpdate.exec');
    getPostbackScriptResponse(logger, sender_psid, status)
  })
}

/**
 * Adds a joy to a user's UserDoc joys.
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 * @param {string} joy - the joy to add to UserDoc's list of joys
 * @param {string} status - the status to set as UserDoc's status
 * @param {Function} getPostbackScriptResponse - the function called after successfully
 *     updating the UserDoc status
 */
function addJoy(logger, sender_psid, joy, status, getPostbackScriptResponse) {
  logger.info('DatabaseManager.addJoy')
  const query = {user_id: sender_psid};
  const update = {status: status, $addToSet : {joys: {name: joy, progress: 0, trend: 0}}};
  UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
    logger.info('DatabaseManager.addJoy.UserDoc.findOneAndUpdate.exec');
    getPostbackScriptResponse(logger, sender_psid, status)
  })
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
  logger.info('DatabaseManager.addSupport')
  const query = {user_id: sender_psid};
  const update = {status: status, $addToSet : {supporters: {name: supporter, progress: 0, trend: 0}}};
  UserDoc.findOneAndUpdate(query, update).exec((err, userDoc) => {
    logger.info('DatabaseManager.addSupport.UserDoc.findOneAndUpdate.exec');
    getPostbackScriptResponse(logger, sender_psid, status)
  })
}

// For devpage only
function getAll(logger, sender_psid, res, callback) {
  logger.info('DatabaseManager.getAll')
  const query = {user_id: sender_psid};
  UserDoc.findOne(query).exec((err, userDoc) => {
    logger.info('UserDoc.findOne.exec get all attributes from db:');
    callback(logger, sender_psid, res, userDoc);
  })
}

function getStatus(logger, sender_psid, received_message_text, useStatus) {
  logger.info('DatabaseManager.getStatus')
  const query = {user_id: sender_psid};
  UserDoc.findOne(query, {status: 1}).exec((err, userDoc) => {
    logger.info('DatabaseManager.getStatus.UserDoc.findOne.exec');
    useStatus(logger, sender_psid, userDoc.status, received_message_text);
  })
}

function getByTags(logger, sender_psid, script_entry, tags, useMongoData) {
  logger.info('DatabaseManager.getByTags', {tags: tags})
  const query = {user_id: sender_psid};
  const select = {
    name: tags.name ? 1 : false,
    goals: tags.goal ? {$sample: {size: tags.goal}} : false,
    joys: tags.joy ? {$sample: {size: tags.joy}} : false,
    supporters: tags.supporter ? {$sample: {size: tags.supporter}} : false,
  }
  if (!select.goals) {delete select.goals};
  if (!select.joys) {delete select.joys};
  if (!select.supporters) {delete select.supporters};
  logger.info('the select projector', {select})
  UserDoc.findOne(query, select).exec((err, userDoc) => {
    logger.info('DatabaseManager.getByTags.UserDoc.findOne.exec');
    useMongoData(logger, sender_psid, script_entry, userDoc);
  })
}

module.exports = {
  'updateStatus': updateStatus,
  'updateName': updateName,
  'addGoal': addGoal,
  'addJoy': addJoy,
  'addSupport': addSupport,
  'getAll': getAll,
  'getStatus': getStatus,
  'getByTags': getByTags
}