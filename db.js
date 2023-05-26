const mongoose = require("mongoose");

module.exports = () => {
	const connectionParams = {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	};
	const retryInterval = 5000; // 5 seconds
	let retries = 5;

	const connectWithRetry = () => {
		try {
			mongoose.connect(process.env.DB, connectionParams);
		} catch (error) {
			if (retries > 0) {
				retries -= 1;
				setTimeout(connectWithRetry, retryInterval);
			} else {
				alert("Exceeded maximum number of retries. Giving up.");
			}
		}
	};

	connectWithRetry();
};
