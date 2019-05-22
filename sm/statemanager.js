'use strict';

class DSEEventObject {
  constructor(sender_psid, trigger) {
    logger.log('info', 'at DSEEventObject constructor from trigger ' + trigger)
    this._sender_psid = sender_psid
    this._jsonObj = getEventJSON(sender_psid, trigger)
  }
  get response() {
    return this._jsonObj.response
  }
  get next_trigger() {
    return this._jsonObj.next_trigger
  }
  get sender_psid() {
    return this._sender_psid
  }
}

function getEventJSON(sender_psid, trigger) {
  logger.log('info', 'at getEventJSON function from trigger ' + trigger)
  for(var i = 0; i < text_responses.length; i++) {
    if (trigger == text_responses[i].trigger) {
      logger.log('info', 'response text should be set equal to ' + text_responses[i].response.message.text)
      return text_responses[i]
    }
  }
}

function handleMessage(sender_psid, received_message) {
  logger.log('info', 'handleMessage encoded received_text string is ' + received_text)
  db_model.getStatus(sender_psid, useStatus, received_text, logger)
}

function handlePostback(sender_psid, payload) {
  logger.log('info', 'at handlePostback payload is ' + payload)
  db_model.updateStatus(sender_psid, payload, runDSEEvent, logger)
}

function next_call(next_trigger){
  logger.log('info', 'in callback of request in callSendAPI next_trigger is ' + next_trigger)
  if (next_trigger.includes('-')) {
    // applies if we are now expecting to wait to receive input as a user typed message
    db_model.updateStatus(sender_psid, next_trigger, fizzle, logger)
  } else {
    // applies if chaining multiple messages without waiting
    handlePostback(sender_psid, next_trigger)
  }
}

module.exports = {
  'handleMessage': handleMessage,
  'handlePostback': handlePostback,
  'DSEEventObject': DSEEventObject
}