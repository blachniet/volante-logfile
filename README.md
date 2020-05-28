# Volante Logfile Spoke

Volante Spoke module which handles logging Volante log events to file.

## Usage

```bash
npm install volante-logfile
```

Volante Spokes are automatically loaded and instanced if they are installed locally and `hub.attachAll()` is called.

## Props

Options are changed using the `VolanteLogfile.update` event with an options object (shown with defaults):

```js
hub.emit('VolanteLogfile.update', {
	logVolante: false,                    // log all volante.log events
	logPath: '/tmp/volante/',             // path to log files
	rotationInterval: 'day',              // rotation interval
	rotationCheckTimerMs: 60000,          // how often we will check for rotation
	dateFormat: 'YYYY-MM-DDTHH.mm.ss[Z]', // format string used for filename dates
});
```

## License

ISC