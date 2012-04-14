// let's see if we can use node's filesystem operations
var fs, dataViewBlock;
if(typeof require !== "undefined") {
  fs = require('fs');
  // add window.console.log so transform keeps working
  window = { console: { log: console.log }};
}

// Load jDataView and buildDataView if they don't exist
if(typeof jDataView === "undefined") {
  // the dirty way, for Node, because these are not
  // node modules, just plain old code.
  if(typeof fs !== "undefined") {
    // get a reference to the object that node makes based on eval...
    dataViewBlock = this;
    var jDataViewCode = fs.readFileSync("jDataView.js") + "";
    eval(jDataViewCode);
    var buildDataViewCode = fs.readFileSync("buildDataView.js") + "";
    eval(buildDataViewCode);
  }

  // the ajax way, for browsers.
  else if(typeof XMLHttpRequest !== "undefined") {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'jDataView.js', false);
    xhr.send(null);
    eval("("+xhr.responseText+")");

    xhr = new XMLHttpRequest();
    xhr.open('GET', 'buildDataView.js', false);
    xhr.send(null);
    eval("("+xhr.responseText+")");
  }
}

// shell-executed using node?
if(typeof process.argv !== "undefined") {
  var arguments = process.argv.splice(2);
  if(typeof fs !== "undefined") {
    eval(fs.readFileSync('transform.js')+'');
  }

  debug = false;

  // generate the parser code
  var specfile = fs.readFileSync(arguments[0])+"";
  var parsercode = generateParser(specfile);

  // if we're not immediately running this code,
  // print it to terminal or pipe to file, what have you.
  if (arguments.length === 1) {
    console.log(parsercode);
  }

  // OH NO! EVAL! ... which is perfectly fine, since
  // the generator generates source code for independent
  // use. Normally you'd save it to a .js file, but in
  // this case we want to immediately make use of it.
  eval(parsercode);

  // parsable object
  var setupParseData = function(data) {
    return {pointer: 0, marks: [], bytecode: dataViewBlock.buildDataView(data)};
  };

  // Do we have a file that we want to immediately read in?
  if (arguments.length > 1)
  {
    // run the parser on a file
    var data = setupParseData(fs.readFileSync(arguments[1])),
        parser = new Parser();

    // png image
    if(arguments[1].indexOf('.png')>-1) {
      var png = parser.parse(data);
      var IHDR = parser.getInstance("IHDR");
      var pHYs = parser.getInstance("pHYs");
      console.log("This is a "+IHDR.BitDepth+" bit "+IHDR.Width+" x "+IHDR.Height+" pixel image (with ppu dimensions "+pHYs.PixelsPerUnitXaxis+" x "+pHYs.PixelsPerUnitYaxis+")");
    }

    // font
    if(arguments[1].indexOf('.ttf')>-1 || arguments[1].indexOf('.otf')>-1) {
      var font = parser.parse(data);
      var maxp = parser.getInstance("maxp");
      console.log("font information: "+maxp.numGlyphs+" glyphs.");
    }
  }
}
