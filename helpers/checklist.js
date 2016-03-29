var _ = require('lodash'),
    Q = require('q');

module.exports = function initPlugin(events) {

    // Loop over all events
    _.each(events, function(options, event_name) {

        // Fill options with defaults
        var checklist_options = _.defaults(options, {
            before: '',
            after: '',
            checks: []
        });

        // Respond to the item with checklist
        var respondTo = function(data) {
            return responseBody(data).
                then(function (body) {
                    github.issues.createComment({
                        'user': config.target.user,
                        'repo': data.repository.name,
                        'number': checklist_options.getNumber(data),
                        'body': body
                    }, function(err, result) {
                        winston.info(result);
                    });
                });
        };

        var deprecatedRepos = {
            'sickrage-issues': 'This repository is no longer in use for issues or wiki, ' +
            'please use the main repo for [Issues](https://github.com/SickRage/SickRage/issues) ' +
            'and the [Wiki](https://github.com/SickRage/SickRage/wiki)'
        };

        // Create the body based on the checklist
        var responseBody = function(data) {
            return checklist(data).then(function (list) {
                if (data.repository.name in deprecatedRepos) {
                    return Q.all([deprecatedRepos[data.repository.name]]);
                } else {
                    return list ? Q.all([checklist_options.before, list, checklist_options.after]) : null;
                }
            }).
                then(function (paragraphs) {
                    return paragraphs.join('\n\n');
                });
        };

        // Create a checklist
        var EMPTY = '- [ ] ',
            NON_EMPTY = '- [x] ';

        var checklist = function (data) {
            return Q.all(checklist_options.checks.map(function (check) {
                return Q(check.condition(data)).then(function (condition) {
                    if(condition !== undefined)
                        return (!condition ? EMPTY : NON_EMPTY) + check.message;
                });
            })).
                then(function (lines) {
                    return lines.filter(removeEmpty).join('\n');
                });
        };
        // Add it to poppins
        pubsub.on(event_name, respondTo);
    });
};

function removeEmpty(x) {
    return x;
}

// Issue test data
function getTestData() {
    return {
        "action": "opened",
        "issue": {
            "number": 4,
            "body": "Since the update it hangs when I click home on 'Loading 'Snatched & Available'." +
                "Log file pasted below." +
                "### Steps to reproduce:" +
                "1. Restart Couchpotato" +
                "2. Go to home" +
                "" +
                "### Information:" +
                "Movie(s) I have this with: ..." +
                "Quality of the movie being searched: ..." +
                "Providers I use: ..." +
                "Version of CouchPotato: git:(RuudBurger:CouchPotatoServer master) b773f7b7 (2014-10-07 23:09:44)" +
                "Running on: ..." +
                "### Logs:" +
                "```" +
                "10-07 23:25:18 ERROR [          couchpotato.api] Log goes here```"
        },
        "sender": {
            "login": "CouchPotatoBot"
        }
    };
}

// Pull request test data
function getPullTestData() {
    return {
        "action": "opened",
        "number": 6,
        "pull_request": {
            "number": 6,
            "title": "Update README.md",
            "body": "",
            "head": {
                "ref": "develop"
            },
            "commits": 10,
            "additions": 2,
            "deletions": 0,
            "changed_files": 1
        },
        "repository": {
            "default_branch": "master"
        },
        "sender": {
            "login": "SickRage2"
        }
    };
}
