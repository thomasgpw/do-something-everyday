function callback (sender_psid, userDoc, logger) {
	logger.log('info', {
		sender_psid: sender_psid,
		userDoc: userDoc
	})
}

function callback_with_message (sender_psid, userDoc, received_message, logger) {
	logger.log('info', {
		sender_psid: sender_psid,
		userDoc: userDoc,
		received_message: received_message
	})
}
function getUserDoc (req, res, getAll, logger) {
	const sender_psid = req.body.psid
	logger.log('info', 'devpage getUserDoc function', {sender_psid:sender_psid})
	getAll(sender_psid, res, render, logger)
}

function render (sender_psid, res, userDoc, logger) {
	let html_body = '<div>'
	html_body += '<p>PSID:</p><p>' + sender_psid + '</p>'
	html_body += '<p>Status:</p><p>' + userDoc.status + '</p>'
	// html_body += '<p>Name:</p><p>' + userDoc.name + '</p>'
	res.send(html_body + '</div>')
}
module.exports = {
	getUserDoc: getUserDoc
}