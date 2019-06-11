/**
 * @fileoverview AppManager is the main controller module for handling and
 *     communicating between other specialized controller modules
 * @module AppManager
 */

'use strict';

// Dependency Imports
const request = require('request')
const express = require('express')
const path = require('path')
const body_parser = require('body-parser')
const winston = require('winston');
const SimpleCrypto = require('simple-crypto-js').default;

// Module Imports
const FacebookMessengerManager = require('./facebookmessengermanager')
const DatabaseManager = require('./databasemanager')
const DevView = require('./devview')

const SCRIPT = require('./script')['script entries']
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console()
    ]
  });
logger.info('logger initiated');

/**
 * Creates an express app instance and configures the settings and paths
 *
 * @param {string} root_dir - The __dirname value from the root index.js for local file paths
 */
function setUpApp(root_dir) {
  logger.info('AppManager.setUpApp')
  const app = express()

  // express http server config
  app.use(body_parser.json())
  app.use(body_parser.urlencoded({ extended: false }));
  app.listen(process.env.PORT || 1337, () => logger.info('Express server is listening'));


  /** SITE ROUTING **/

  // Accepts GET requests at the /privacypolicy endpoint
  app.get('/privacypolicy', (req, res) => {
    res.sendFile(path.join(root_dir, 'privacypolicy.html'))
  })

  // Accepts both POST and GET at /webhook
  app.route('/webhook')
    .post((req, res) => {
      FacebookMessengerManager.receive(logger, req, res,
        processReceivedMessageText, processReceivedPostback)
    })
    .get((req, res) => {
      FacebookMessengerManager.verify(logger, req, res)
    });

  // Accepts both POST and GET at /dev or /dev/login
  app.route('/dev(/login)?')
    .get((req, res) => {
      res.sendFile(path.join(root_dir, 'appmanager/devview/login.html'))
    })
    .post((req, res) => {
      if (req.body.password === process.env.DEV_PASSWORD) {
        DevView.getUserDoc(logger, req, res, DatabaseManager.getAll)
      } else {
        logger.error('dev password does not match recorded password')
        res.sendStatus(403);
      }
    })
  return app;
}

/**
 * Receives text from messages sent via POST to the /webhook endpoint and
 *     calls the next relevant function
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE.
 * @param {string} received_message_text - the text of the message that was in
 *     the body of the request that was received.
 */
function processReceivedMessageText(logger, sender_psid, received_message_text) {
  logger.info('AppManager.processReceivedMessageText', {'received_message_text': received_message_text})
  const text_lower = received_message_text.toLowerCase()
  const escapeCommand = text_lower.match(/\b(help|delete)\b/)
  if (escapeCommand) {
    if (escapeCommand.includes('help')) {
      sendHelp(logger, sender_psid)
    } else if (escapeCommand[0] === 'delete') {
      processEscapeCommand(logger, sender_psid, text_lower)
    }
  } else {
    const simpleCrypto = new SimpleCrypto(sender_psid+'DSE')
    const encrypted_text = simpleCrypto.encrypt(received_message_text.text)
    logger.debug({'encrypted_text': encrypted_text});
    DatabaseManager.getStatus(logger, sender_psid, useStatus, received_message_text)
  }
}

/**
 * reads the status of a user after DatabaseManager.getStatus to use the
 *     received message text in the way expected by status.
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 * @param {string} status - the status trigger that reads if input is expected
 *     and what the input is for
 * @param {string} received_message_text - the text of the received message
 */
function useStatus(logger, sender_psid, status, received_message_text) {
  logger.info('AppManager.useStatus')
  if (next_trigger.includes('-')) {
    const [databaseFunction, next_status] = status.split('-')
    // if status is ADD_GOAL-CHECK_IN_3.2 then it should call
    // DatabaseManager.addGoal(logger, sender_psid, received_message_text, 'CHECK_IN_3.2, processReceivedPostback')
    DatabaseManager[toCamel(databaseFunction)](logger, sender_psid, received_message_text, next_status, processReceivedPostback)
  } else {
    // Input wasn't expected but was received
    sendHelp(logger, sender_psid)
  }
}

/**
 * Receives postback from messages sent via POST to the /webhook endpoint and
 *     calls the next relevant function.
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 * @param {string} payload - the paylopad status trigger that was in the body
 *     of the request that was received
 */
function processReceivedPostback(logger, sender_psid, payload) {
  logger.info('AppManager.processReceivedPostback', {'payload': payload})
  DatabaseManager.updateStatus(logger, sender_psid, payload, getPostbackScriptResponse)
}

/**
 * From https://matthiashager.com/converting-snake-case-to-camel-case-object-keys-with-javascript
 *
 * @param {string} s - a_string_in_snake_case
 * @return {string} aStringInCamelCase
 */
const toCamel = (s) => {
  return s.toLowerCase().replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

/**
 * Parses the new UserDoc status to wait for input or prepare the script
 *     message to send to FaceBookMessenger.CallSendAPI
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE.
 * @param {string} status - the status returned from DatabaseManager.updateStatus
 */
function getPostbackScriptResponse(logger, sender_psid, status) {
  logger.info('AppManager.getPostbackScriptResponse', {
    sender_psid: sender_psid,
    status: status
  })
  if (status.includes('-')) {
    logger.debug('the status requests user input before another event in script.json')
  } else {
    for(let i = 0; i < SCRIPT.length; i++) {
      if (status == SCRIPT[i].trigger) {
        const script_entry = SCRIPT[i]
        // const script_entry_response =
        logger.debug('response text should be set equal to ' + script_entry.response.message.text)
        const data_tags = script_entry.response.message.text.match(/\/([A-Z]+)\//g)
        if (data_tags) {
          // Where a function for getting specific fields from DatabaseKeeper should be
        } else {
          FacebookMessengerManager.callSendAPI(logger, sender_psid, script_entry, getSendAPINextStep)
        }
      }
    }
  }
}

/**
 * Reads a script entry's next trigger to call processReceivedPostback
 *     if multiple messages should be chained.
 */
function getSendAPINextStep(logger, err, res, body, script_entry) {
  if (!next_trigger.includes('-')) {

  } else {
    // Applies if we are now expecting to wait to receive input as a user typed message
  }
}

/**
 * Sends a formatted string to callSendAPI which informs the user of DSE's
 *     escape commands and legal information.
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 */
function sendHelp(logger, sender_psid) {}

/**
 * Parses the command string for a target doc or field to delete from the db
 *     and asks for conformation if valid, sends help string if the command
 *     is invalid
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 * @param {string} command - the string taken from received message text
 *     converted to lowercase
 */
function confirmDelete(logger, sender_psid, command) {}




/** OLD CONTROLLER LOGIC **/

// function requestMongoData(sender_psid, dseEventObj, text_tags, callback) {
//   logger.info('at requestMongoData function with response ' + dseEventObj.response.message.text, {'text_tags': text_tags}) 
//   var tag_replacements = text_tags.slice(0)
//   text_tags.forEach((tag, i) => {
//     tag_replacements[i] = useName(sender_psid, DatabaseManager.byTag(logger, sender_psid, tag))
//   })
// }

// function useName(sender_psid, obj) {
//   const simpleCrypto = new SimpleCrypto(sender_psid+'DSE')
//   const real_name = simpleCrypto.decrypt(obj.name)
//   logger.info('in useName name is ' + real_name)
//   return real_name
// }

// function runDSEEvent(sender_psid, status, userDoc) {
//   logger.info('inside runDSEEvent callback')
//   const dseEventObj = new DSEEventObject(logger, sender_psid, status)
//   var response_text = dseEventObj.response.message.text
//   if (text_tags) {
//     requestMongoData(sender_psid, dseEventObj, text_tags, FacebookMessengerManager.callSendAPI)
//   } else {
//     FacebookMessengerManager.callSendAPI(logger, sender_psid, dseEventObj.response, dseEventObj.next_trigger)
//   }
// }
// class DSEEventObject {
//   constructor(logger, sender_psid, trigger) {
//     logger.info('at DSEEventObject constructor from trigger ' + trigger)
//     this._sender_psid = sender_psid
//     this._jsonObj = getEventJSON(sender_psid, trigger)
//   }
//   get response() {
//     return this._jsonObj.response
//   }
//   get next_trigger() {
//     return this._jsonObj.next_trigger
//   }
//   get sender_psid() {
//     return this._sender_psid
//   }
// }
// function next_call(logger, next_trigger, callback){
//   logger.info('in callback of request in callSendAPI next_trigger is ' + next_trigger)
//   if (next_trigger.includes('-')) {
//     // applies if we are now expecting to wait to receive input as a user typed message
//     callback(logger, sender_psid, next_trigger)
//   } else {
//     // applies if chaining multiple messages without waiting
//     processReceivedPostback(logger, sender_psid, next_trigger)
//   }
// }

module.exports = {
  'setUpApp': setUpApp
}