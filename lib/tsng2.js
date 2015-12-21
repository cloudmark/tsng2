var yargs = require('yargs');
var path = require("path");
var util = require("util");
var glob = require("glob");
var fs = require("fs");
var tsng = require("../dist/lib/compiler/lexer");
var SourceFile = require("../dist/lib/file");

var defaultOpenPath = '';



yargs.option('files', {
    describe: 'array of file paths to preprocess',
    type: 'array'
});

var argv = yargs.argv;
//var openPath = getOpenPath();
var options =
{
    //openPath: openPath,
    //files: argv.files ? argv.files : [
    //    openPath + '/**/*.js'
    //],
    baseDir: '/Users/markgalea/Dev/Source/Suprnation/voodoodreams-exp/app/',
    //baseDir: argv.baseDir || '',
    extension: ".ng.ts"
};

glob(options.baseDir + "/**/*.ts", options, function (er, files){
    if (files){
        files.forEach(function (file){
            console.log("Processing File: [" + file + "]");
            var rawContents = fs.readFileSync(file, 'utf8');
            var lexer = new tsng.Lexer(new SourceFile.SourceFile(file, rawContents));
            var modDefinition = lexer.lex();
            console.log();
            console.log(modDefinition)
        });
    }
});
