"use strict";

require('dotenv').config();

const { GithubPusher } = require('./github/github-push')
const { GitlabPuller } = require('./gitlab/gitlab-pull')

async function main() {

    const gitlabPull = new GitlabPuller({
        username: process.env.GITLAB_USERNAME,
        mail: process.env.GITLAB_MAIL,
        pw: process.env.GITLAB_TOKEN,
        project: process.env.GITLAB_PROJECT,
        projectId: process.env.GITLAB_PROJECT_ID || null,
        domain: process.env.GITLAB_DOMAIN
    });

    let repos = []
    if (gitlabPull.projectId != null){
        repos = [gitlabPull.projectId]
    } else {
        repos = await gitlabPull.getRepoNames();
    }

    const gitlabCommits = await gitlabPull.getAllUserCommits(repos)

    const githubPush = new GithubPusher({
        owner: process.env.GITHUB_OWNER,
        username: process.env.GITHUB_USERNAME,
        mail: process.env.GITHUB_MAIL,
        token: process.env.GITHUB_TOKEN,
    });

    await githubPush.sync(gitlabCommits);
}

main();
