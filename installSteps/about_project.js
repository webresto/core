"use strict";

const path = require("path");

class AboutProjectStep {
    constructor() {
        this.canBeSkipped = false;
        this.description = 'About project';
        this.ejsPath = path.resolve(__dirname, "../views/installSteps/about_project.ejs");
        this.id = 'about-project-step';
        this.scriptsUrl = '';
        this.sortOrder = 0;
        this.groupSortOrder = 1;
        this.stylesUrl = '';
        this.title = 'About Project';
        this.badge = 'about-project';
        this.isSkipped = false;
        this.settingsKeys = ["CITY"];
        this.renderer = "ejs";
        this.isProcessed = false;
        this.finallyDescription = null;
    }

    async check() {
        const recipe = await Settings.get("CITY");
        if (recipe) {
            return true;
        }
        return this.isProcessed;
    }

    async process(data, context) {
        // save data in context to process it on last step
        Object.assign(context, data);
        this.isProcessed = true;
    }

    async skip() {
        this.isProcessed = true;
    }

    async finally() {
        // Implementation if needed
    }
}

module.exports.default = AboutProjectStep;
