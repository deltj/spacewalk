/**
 * High-level functions for eva-tasklist
 */

'use strict';

const program = require('commander');
const path = require('path');
const fs = require('fs');
const child = require('child_process');

const ver = require('./app/helpers/versionHelper');
const Procedure = require("./app/model/procedure");
const html = require('./app/helpers/nunjucksHelper').generators;

module.exports = {
    run: run,
    buildProgramArguments: buildProgramArguments
}

/**
 * Surrogate program entry point
 */
function run(args) {
    console.log('\nNASA EVA Tasklist Generator version ' + ver.currentVersion + '\n');

    //  Use Commander to process command line arguments
    buildProgramArguments(program, args);

    //  Minimum number of arguments is 3:
    if(process.argv.length < 3) {
        program.help();
    }

    console.log('Input YAML file: \t\t' + program.input);

    //  If no output file was specified, use a default
    if(!program.output) {
        let p = path.parse(program.input);
        let file_without_path = p.base;
        let ext = p.ext;
        let name = file_without_path.replace(ext, '.html');

        program.output = name;
    }

    //  If the input file doesn't exist, emit an error and quit
    if(!fs.existsSync(program.input)) {
        console.error('Input YAML doesn\'t exist: ' + program.input);
        return;
    }

    //  If this process can't write to the output location, emit an error and quit
    if(fs.existsSync(program.output)) {
        //  Output file exists - Can we write to it?
        try {
            fs.accessSync(program.output, fs.constants.W_OK);
        } catch(err) {
            console.error('Can\'t write to output file: ' + program.output);
            return;
        }
    } else {
        //  Output file doesn't exist - Can we write to the output directory?
        let p = path.parse(program.output);
        let outputDir = p.dir;

        if(outputDir === '') {
            outputDir = '.';
        }

        try {
            fs.accessSync(outputDir, fs.constants.W_OK);
        } catch(err) {
            console.error('Can\'t write to output directory: ' + outputDir);
            return;
        }
    }

    // Parse the input file
    let procedure = new Procedure();
    procedure.populateFromFile(program.input).then( (err) => {

        // Check if an error occurred
        if(err) {
            console.error('Error while deserializing YAML: ' + err);
            if (err.validationErrors) {
                console.log("Validation Errors:");
                console.log(err.validationErrors);
            }
            return;
        }

        // Generate the HTML output file
        generateHtmlChecklist(procedure, program, function () {
            if(!fs.existsSync(program.output)) {
                console.error('Failed to generate HTML output');
                return;
            }

            console.log('HTML output written to: \t' + program.output);

            //  Perform HTML -> DOCX conversion, if requested
            if(program.doc) {

                //  Figure out docx output filename
                let p = path.parse(program.output);
                let ext = p.ext;
                let docfile = program.output.replace(ext, '.docx');

                //  Outsource the conversion to pandoc
                //  WARNING: NEVER USE THIS ON A WEB SERVER!
                let command = `/usr/bin/pandoc -s -o ${docfile} -t html5 -t docx ${program.output}`;
                child.execSync(command);

                if(!fs.existsSync(docfile)) {
                    console.error('Failed to generate DOCX output');
                    return;
                }

                console.log('DOCX output written to: \t' + docfile);
            }

            console.log('\nDone!');
        });
    });
}

/**
 * This function configures commander.js for this application's command line
 * arguments, and attemps to parse the arguments passed to this process.
 *
 * @param program   A commander.js object for this function to use
 * @param args      Command line argument array (e.g. process.argv)
 */
function buildProgramArguments(program, args) {
    const DEFAULT_TEMPLATE = `${__dirname}/templates/htmlHelper-template.thtml`;

    program
        .version(ver.currentVersion, '-v, --version')
        .name('eva-checklist')
        .description('Generate the spacewalk EVA checklist from YAML files')
        .option('-i, --input <input.yml>', 'name the YAML file for this EVA')
        .option('-o, --output <.html>', 'name of output HTML file')
        .option('-t, --template <.html>', 'specify a template to use', DEFAULT_TEMPLATE)
        .option('-d, --doc', 'Also generate Word doc output', null)
        .allowUnknownOption();

    //  Commander.js does an unhelpful thing if there are invalid options;
    //  Override the default behavior to do a more helpful thing.
    program.unknownOption = function() {
        //  An invalid option has been received. Print usage and exit.
        program.help();
    }

    try {
        program.parse(args);
    } catch(e) {
        if(e instanceof TypeError) {
            //  Commander.js will annoyingly throw a TypeError if an argument
            //  that requires a parameter is missing its parameter.
            program.help();
        }
    }

    return program;
}

/**
 * This function generates a checklist in HTML format and calls the callback
 * when complete.
 */
async function generateHtmlChecklist(evaTaskList, program, callback) {
    let outputFile = path.resolve(program.output);

    html.params.inputDir(path.resolve(path.dirname(program.input)));
    html.params.outputDir(path.resolve(path.dirname(program.output)));
    html.params.htmlFile(outputFile);
    
    html.create(evaTaskList, program.template, callback);
}

/*
(function () {


    console.log('Input YAML file: ' + program.input);

    //  If no output file was specified, use a default
    if(!program.output) {
        let p = path.parse(program.input);
        let file_without_path = p.base;
        let ext = p.ext;
        let name = file_without_path.replace(ext, '.html');

        program.output = name;
    }

    //  If the input file doesn't exist, emit an error and quit
    if(!fs.existsSync(program.input)) {
        console.error('Input YAML doesn\'t exist: ' + program.input);
        return;
    }

    //  If this process can't write to the output location, emit an error and quit
    if(fs.existsSync(program.output)) {
        //  Output file exists - Can we write to it?
        try {
            fs.accessSync(program.output, fs.constants.W_OK);
        } catch(err) {
            console.error('Can\'t write to output file: ' + program.output);
            return;
        }
    } else {
        //  Output file doesn't exist - Can we write to the output directory?
        let p = path.parse(program.output);
        let outputDir = p.dir;

        if(outputDir === '') {
            outputDir = '.';
        }

        try {
            fs.accessSync(outputDir, fs.constants.W_OK);
        } catch(err) {
            console.error('Can\'t write to output directory: ' + outputDir);
            return;
        }
    }

    // Parse the input file
    let procedure = new Procedure();
    procedure.populateFromFile(program.input).then( (err) => {

        // Check if an error occurred
        if(err) {
            console.error('Error while deserializing YAML: ' + err);
            if (err.validationErrors) {
                console.log("Validation Errors:");
                console.log(err.validationErrors);
            }
            return;
        }

        // Generate the HTML output file
        generateHtmlChecklist(procedure, program, function () {
            if(!fs.existsSync(program.output)) {
                console.error('Failed to generate HTML output');
                return;
            }

            console.log('HTML output written to: ' + program.output);

            //  Perform HTML -> DOCX conversion, if requested
            if(program.doc) {

                //  Figure out docx output filename
                let p = path.parse(program.output);
                let ext = p.ext;
                let docfile = program.output.replace(ext, '.docx');

                //  Outsource the conversion to pandoc
                //  WARNING: NEVER USE THIS ON A WEB SERVER!
                let command = `/usr/bin/pandoc -s -o ${docfile} -t html5 -t docx ${program.output}`;
                child.execSync(command);

                if(!fs.existsSync(docfile)) {
                    console.error('Failed to generate DOCX output');
                    return;
                }

                console.log('DOCX output written to: ' + docfile);
            }
        });
    });

})();

*/