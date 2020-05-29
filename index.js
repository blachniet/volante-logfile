const fs = require('fs');
const path = require('path');
const moment = require('moment');

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
		'VolanteLogfile.log'(obj, callback) {
			this.render(...arguments);
		},
	},
	props: {
		logVolante: false,                    // log all volante.log events
		logPath: '/tmp/volante/',             // path to log files
		rotationInterval: 'day',              // rotation interval
		rotationCheckTimerMs: 60000,          // how often we will check for rotation
		dateFormat: 'YYYY-MM-DDTHH.mm.ss[Z]', // format string used for filename dates
	},
	data() {
		return {
			enabled: false,            // not enabled until update has been called
			currentFilePath: null,     // full path to current log file
			currentFd: null,           // current file handle
			lastOpenTime: null,        // timestamp of last open, to compare against current time
			intervalTimer: null,       // interval timer object to check if rotate necessary
			exitOnStartupError: false, // exit when error on startup
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
						this.$shutdown();
					}
				}
				// generate filename
				let ts = moment();
				let filename = `${ts.format(this.dateFormat)}_XXX.log`;
				this.currentFilePath = path.join(this.logPath, filename);

				try {
					this.currentFd = fs.openSync(this.currentFilePath, 'a');
					this.$log('opened log file', this.currentFilePath);
					// set enabled if open successful
					this.enabled = true;
					this.lastOpenTime = ts;
				} catch (e) {
					this.$error('error opening logfile', e);
					this.enabled = false;
					if (this.exitOnStartupError) {
						this.$shutdown();
					}
				}
			});
		},
		//
		// closes a file properly while updating the end timestamp
		//
		closeFile() {
			if (this.currentFd && this.currentFilePath) {
				this.$debug('closing file');
				fs.closeSync(this.currentFd);
				let newFilename = this.currentFilePath.replace(/XXX/, moment().format(this.dateFormat));
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
			if (moment().isAfter(moment(this.lastOpenTime).add(1, this.rotationInterval))) {
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
					console.error('VolanteLogFile unable to write to log file');
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
		logVolante: true,
	});
}

