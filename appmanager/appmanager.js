/**
 * @fileoverview AppManager is the main controller module for handling and
 *     communicating between other specialized controller modules
 * @module AppManager
 */

'use strict';

// Dependency Imports
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
      logger.info('/webhook received a POST request')
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
    const encrypted_text = simpleCrypto.encrypt(received_message_text)
    logger.debug({'encrypted_text': encrypted_text});
    DatabaseManager.getStatus(logger, sender_psid, useStatus, encrypted_text)
  }
}

/**
 * reads the status of a user after DatabaseManager.getStatus to use the
 *     received message text in the way expected by status.
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 * @param {string} status - the status status that reads if input is expected
 *     and what the input is for
 * @param {string} received_message_text - the text of the received message
 */
function useStatus(logger, sender_psid, status, received_message_text) {
  logger.info('AppManager.useStatus')
  if (status.includes('-')) {
    const [databaseFunction, next_status] = status.split('-')
    /* if status is ADD_GOAL-CHECK_IN_3.2 then it should call
    * DatabaseManager.addGoal(
    *   logger,
    *   sender_psid,
    *   received_message_text,
    *   'CHECK_IN_3.2',
    *   processReceivedPostback
    * )
    */
    DatabaseManager[toCamel(databaseFunction)](
      logger,
      sender_psid,
      received_message_text,
      next_status,
      processReceivedPostback
    )
  } else {
    // Input wasn't expected but was received
    // sendHelp(logger, sender_psid)
    processReceivedPostback(logger, sender_psid, status)
  }
}

/**
 * Receives postback from messages sent via POST to the /webhook endpoint and
 *     calls the next relevant function.
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 * @param {string} payload - the paylopad status status that was in the body
 *     of the request that was received
 */
function processReceivedPostback(logger, sender_psid, payload) {
  logger.info('AppManager.processReceivedPostback', {'payload': payload})
  DatabaseManager.updateStatus(
    logger,
    sender_psid,
    payload,
    getPostbackScriptResponse
  )
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
 * Parses the new UserDoc status to wait for input or send the script message to
 *     getMongoData to be prepared
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
      if (status == SCRIPT[i].status) {
        const script_entry = SCRIPT[i];
        const data_tags = script_entry.response.message.text.match(/\/([A-Z]+)\//g)
        if (data_tags) {
          const tags = {
            name: data_tags.includes('/NAME/'),
            goal: data_tags.includes('/GOAL/')
              ? data_tags.reduce((n, x) => { n + (x === '/GOAL/')})
              : false,
            hobby: data_tags.includes('/HOBBY/')
              ? data_tags.reduce((n, x) => { n + (x === '/HOBBY/')})
              : false,
            supporter: data_tags.includes('/SUPPORTER/')
              ? data_tags.reduce((n, x) => { n + (x === '/SUPPORTER/')})
              : false
          }
          DatabaseManager.getByTags(logger, sender_psid, script_entry, tags, useMongoData)
        } else {
          FacebookMessengerManager.callSendAPI(
            logger,
            sender_psid,
            script_entry.response,
            script_entry.next_status,
            processReceivedPostback
          )
        }
      }
    }
  }
}

/**
 * Decrypts the fetched data from the DatabaseManager and adds to the script
 *     entry before calling getMongoData with the updated script_entry
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE.
 * @param {JSON Object} script_entry - the JSON Object with the next message to
 *     send that is being 
 * @param {JSON Object} userDoc - The object with the data fields returned from
 *     DatabaseManager.getByTags
 */
function useMongoData(logger, sender_psid, script_entry, userDoc) {
  let message_text = script_entry.response.message.text
  logger.info('AppManager.useMongoData', {userDoc: userDoc});
  const simpleCrypto = new SimpleCrypto(sender_psid+'DSE')
  if (userDoc.name) {
    const real_name = simpleCrypto.decrypt(userDoc.name)
    message_text = message_text.replace('/NAME/', real_name)
    logger.info('unencrypted name ' + real_name)
  }
  if (userDoc.goals) {
    const real_goals = userDoc.map(goal => simpleCrypto.decrypt(goal))
    for (real_goal in real_goals) {
      message_text = message_text.replace('/GOAL/', real_goal)
      logger.info('unencrypted goal ' + real_goal)
    }
  }
  if (userDoc.hobbies) {
    const real_hobbies = userDoc.map(
      hobby => simpleCrypto.decrypt(hobby)
    )
    for (real_hobby in real_hobbies) {
      message_text = message_text.replace('/HOBBY/', real_hobby)
      logger.info('unencrypted hobby ' + real_hobby)
    }
  }
  if (userDoc.supporters) {
    const real_supporters = userDoc.map(
      supporter => simpleCrypto.decrypt(supporter)
    )
    for (real_supporter in real_supporters) {
      message_text = message_text.replace('/SUPPORTER/', real_supporter)
      logger.info('unencrypted supporter ' + real_supporter)
    }
  }
  script_entry.response.message.text = message_text
  FacebookMessengerManager.callSendAPI(
    logger,
    sender_psid,
    script_entry.response,
    script_entry.next_status,
    processReceivedPostback
  )
}

/**
 * Sends a formatted string to callSendAPI which informs the user of DSE's
 *     escape commands and legal information.
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 */
function sendHelp(logger, sender_psid) {
  logger.info('AppManager.sendHelp')
}

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
function confirmDelete(logger, sender_psid, command) {
  logger.info('AppManager.confirmDelete')
}

module.exports = {
  'setUpApp': setUpApp
}