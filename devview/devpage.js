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

function render (req, res, db_keeper, logger) {
	const sender_psid = req.body.psid
	logger.log('info', 'devpage render function', {sender_psid:sender_psid})
	let html_body = '<div>'
	html_body += '<p>PSID:</p><p>' + sender_psid + '</p>'
	html_body += '<p>Status:</p><p>' + db_keeper.getAll(sender_psid, callback, logger) + '</p>'
	// html_body += '<p>Name:</p><p>' + db_keeper.getName(sender_psid, callback, logger) + '</p>'
	res.send(html_body + '</div>')
}
module.exports = {
	render: render
}