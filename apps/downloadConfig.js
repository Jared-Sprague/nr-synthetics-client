//@ts-check
/**
 *
 * Download Synthetics Monitor Configuration
 *
 */
const inquirer = require("inquirer");

const chalk = require ('chalk');
const colorize={
    red:chalk.bold.red,
    orange: chalk.keyword('orange'),
    green: chalk.keyword('green'),
    grey: chalk.keyword('grey')
};


const synthClient = require("../lib/index");
const {
    apiKey
} = require("../.nrconfig.json");

console.log(`Using apiKey: ${colorize.orange(JSON.stringify(apiKey))}`);

(async function () {
    const smgr = synthClient({
        apiKey
    });

    const alertPolicies = await smgr.getAllAlertPolicies();
    const alertChannels = await smgr.getAllAlertChannels();
    const alertConditions = await smgr.getAllAlertConditions(alertPolicies);

    // Get monitors and save to local
    const response = await smgr.getAllMonitors({
        saveConfig: true
    });

    const { count, monitors } = response;
    console.log(`Total scripts ${colorize.orange(count)}`);
})()
.then( _=> {
    console.log(`Download ${colorize.green("Complete")}` );
}, err=>{
    console.log(`Download ${colorize.red("Failed")}` );
    console.log(err);
});
