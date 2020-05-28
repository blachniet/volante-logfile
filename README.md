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
  timestamp: false, // add timestamp
  level: 'any',     // level filter ['any', 'normal', 'debug', 'warning', 'error']
  srcFilter: null   // filter src value by string match or regex
});
```

## License

ISC