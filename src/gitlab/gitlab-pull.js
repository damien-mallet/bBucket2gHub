"use strict";

const { makeRequest } = require('../utils')

class GitlabPuller {

    constructor(user) {
        this.username = user.username;
        this.pw = user.pw;
        this.usermail = user.mail;
        this.project = user.project;
        this.projectId = user.projectId;
        this.domain = user.domain;

        this.commitsBuffer = [];

        this.headers =  {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + this.pw
        }
    }

    _getMail(authorRawStr) {
        // Extracts the mail address of the "raw author" string, e.g.
        // "abc <abc@somewhere.com>", via a regular expression

        const mailMatch = authorRawStr.match(/(?:\<)(.*)(?=\>)/);

        if (mailMatch) {
            return mailMatch[1]; // Second capture group
        } else {
            return null;
        }
    }

    async _getRepoCommits(repo) {
        // Returns all the commits made by the user in the specified repository

        let commits = [];
        let page = 1
        let next = true

        // do-while loop that handles the pagination of the API
        do {
            let url = (
                `https://gitlab.${this.domain}/api/v4/projects/${repo}/repository/commits?` +
                    `author=${this.usermail}&all=true&per_page=100&page=${page}`
            );

            const data = await makeRequest("GET", url, this.headers);
            console.log(`Retrieving ${data.length} commits from page ${page}`)

            if (data.length) {
                data?.forEach(item => {
                    if ([item.author_email, item.committer_email].includes(this.usermail)) {
                        commits.push({
                            "hash": item.id,
                            "date": item.authored_date,
                            "user": this.usermail
                        });
                    }
                });
            } else {
                next = false
            }
            page++

        } while (next)

        console.log("Commits retrieved for author:", commits.length)
        if (commits && commits.length > 0) {
            this.commitsBuffer.push({
                "repo": this.project, "commits": commits, "repo_id": repo,
            });
        }
    }

    async getRepoNames() {
        // Gets the slugs of all repos found in the workspace

        console.log("Getting repo list from GitLab...");

        const results = [];

        let url = (
            `https://gitlab.${this.domain}/api/v4/projects`
        );

        // do-while loop that handles the pagination of the API
        do {
            const data = await makeRequest("GET", url, this.headers);
            data?.forEach(item => {
                results.push(item.id);
            });

            url = data.next;
        } while (url)

        return results;
    };

    async getAllUserCommits(repos) {

        const promises = [];
        this.commitsBuffer = [];

        console.log(`Fetching commits from ${repos.length} GitLab repos...`);

        repos?.forEach(repo =>{
            promises.push(
                this._getRepoCommits(repo)
            );
        })

        await Promise.all(promises);
        console.log("Done.");

        return this.commitsBuffer;
    }
}

module.exports = { GitlabPuller };
