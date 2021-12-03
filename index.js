const fs = require('fs');
const path = require('path');

//
// handles logging certain events from the volante.Hub and renders them to
// file with optional rotation
//
module.exports = {
	name: 'VolanteLogfile',
	init() {
		this.intervalTimer = setInterval(this.checkRotation, this.rotationCheckTimerMs);
	},
	done() {
		this.closeFile();
	},
	events: {
		'volante.log'(obj) {
			if (this.logVolante) {
				this.render(obj);
			}
		},
		'VolanteLogfile'(obj, callback) {
			this.render(...arguments);
		},
	},
	props: {
		logVolante: true,                    // log all volante.log events
		logPath: '/tmp/volante/',             // path to log files
		rotationInterval: 'day',              // rotation interval
		rotationCheckTimerMs: 60000,          // how often we will check for rotation
		exitOnStartupError: false,            // exit when error on startup
	},
	data() {
		return {
			enabled: false,        // not enabled until update has been called
			currentFilePath: null, // full path to current log file
			currentFd: null,       // current file handle
			lastOpenTime: null,    // timestamp of last open, to compare against current time
			intervalTimer: null,   // interval timer object to check if rotate necessary
		};
	},
	updated() {
		this.openFile();
		// reset interval timer
		if (this.intervalTimer) {
			this.$log(`setting log rotation interval to ${this.rotationInterval}`);
			clearInterval(this.intervalTimer);
			this.intervalTimer = setInterval(this.checkRotation, this.rotationCheckTimerMs);
		}
	},
	methods: {
		//
		// open a log file with the current timestamp as the start time
		//
		openFile() {
			// make sure directory is ready
			fs.mkdir(this.logPath, { recursive: true }, (err) => {
				this.$debug(`ensuring path and opening log file in ${this.logPath}`);
				if (err) {
					this.$error('error creating logPath directory', this.logPath);
					if (this.exitOnStartupError) {
						return this.$shutdown();
					}
				}
				// generate filename
				let ts = new Date();
				let filename = `${ts.toISOString()}_XXX.log`;
				this.currentFilePath = path.join(this.logPath, filename);

				try {
					this.currentFd = fs.openSync(this.currentFilePath, 'a');
					this.$log('opened log file', this.currentFilePath);
					// set enabled if open successful
					this.enabled = true;
					this.lastOpenTime = ts.getTime();
				} catch (e) {
					this.$error('error opening logfile', e);
					this.enabled = false;
					if (this.exitOnStartupError) {
						return this.$shutdown();
					}
				}
				this.$ready(`writing log files in ${this.logPath}`);
			});
		},
		//
		// closes a file properly while updating the end timestamp
		//
		closeFile() {
			if (this.currentFd && this.currentFilePath) {
				this.$debug('closing file');
				fs.closeSync(this.currentFd);
				let newFilename = this.currentFilePath.replace(/XXX/, new Date().toISOString());
				fs.renameSync(this.currentFilePath, newFilename);
				this.currentFd = null;
				this.currentFilePath = null;
			}
		},
		//
		// initiate a rotate by closing current file and opening new one
		//
		rotateFile() {
			this.$log('rotating file');
			this.closeFile();
			this.openFile();
		},
		//
		// check the current time against the start of file to see if we need to rotate
		//
		checkRotation() {
			let rotationMillisecs;
			switch (this.rotationInterval) {
				case 'minute':
					rotationMillisecs = 60000;
					break;
				case 'hour':
					rotationMillisecs = 3600000;
					break;
				case 'day':
					rotationMillisecs = 86400000;
					break;
				case 'week':
					rotationMillisecs = 604800000;
					break;
			}
			let now = new Date().getTime();
			if (now > this.lastOpenTime + rotationMillisecs) {
				this.rotateFile();
			}
		},
		//
		// main entry point for log rendering
		//
		render(obj, callback) {
			if (this.currentFd) {
				try {
					fs.appendFileSync(this.currentFd, `${JSON.stringify(obj)}\n`, 'utf8');
					callback && callback(null);
				} catch (e) {
					callback && callback('unable to write to log file');
					// use console to avoid event loops
					console.error('VolanteLogfile unable to write to log file');
				}
			}
		},
	}
};

if (require.main === module) {
	console.log('running test volante wheel');
	const volante = require('volante');

	let hub = new volante.Hub().attachAll().debug();

	hub.attachFromObject(module.exports);

	// set tight intervals to allow testing
	hub.emit('VolanteLogfile.update', {
		rotationInterval: 'minute',
		rotationCheckTimerMs: 5000,
	});
}

