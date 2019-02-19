/*
 * The MIT License
 *
 * Copyright (c) 2015, Sebastian Sdorra
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


var gulp = require('gulp');
var connect = require('gulp-connect');
var modRewrite = require('connect-modrewrite');
var $ = require('gulp-load-plugins')();
var del = require('del');
var pkg = require('./package.json');

console.log(pkg.name);
var karmaServer = require('karma').Server;
var name = pkg.name;

var templateOptions = {
    root: '../src/templates',
    module: 'adf'
};

var annotateOptions = {
    enable: [
        'angular-dashboard-framework'
    ]
};

var minifyHtmlOptions = {
    empty: true,
    loose: true
};

var ngdocOptions = {
    html5Mode: false,
    title: 'ADF API Documentation'
};

var protractorOptions = {
    configFile: 'test/protractor.conf.js'
};

/** lint **/

gulp.task('csslint', function() {
    return gulp.src('src/styles/*.css')
        .pipe($.csslint())
        .pipe($.csslint.reporter());
});

gulp.task('jslint', function() {
    return gulp.src('src/scripts/*.js')
        .pipe($.eslint())
        .pipe($.eslint.format())
        .pipe($.eslint.failAfterError());
});

gulp.task('lint', gulp.series('csslint', 'jslint'));

/** clean **/

gulp.task('clean', function(cb) {
    del(['dist', '.tmp'], cb);
});

/** build **/

gulp.task('styles', function() {
    return gulp.src(['src/styles/**/*.scss'])
        .pipe($.sass({
            precision: 10,
            outputStyle: 'expanded'
        }).on('error', $.sass.logError))
        .pipe($.concat(name + '.css'))
        .pipe(gulp.dest('dist/'))
        .pipe($.rename(name + '.min.css'))
        .pipe($.minifyCss())
        .pipe(gulp.dest('src/styles'))
        .pipe(gulp.dest('dist/'));
});

function processScripts(sources, filename) {
    return sources.pipe($.sourcemaps.init())
        .pipe($.if('*.js', $.replace('<<adfVersion>>', pkg.version)))
        .pipe($.if('*.js', $.replace(/'use strict';/g, '')))
        .pipe($.concat(filename + '.js'))
        .pipe($.headerfooter('(function(window, undefined) {\'use strict\';\n', '\n})(window);'))
        .pipe($.ngAnnotate(annotateOptions))
        .pipe(gulp.dest('dist/'))
        .pipe($.rename(filename + '.min.js'))
        .pipe($.uglify())
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest('dist/'));
}

gulp.task('js', function() {
    var sources = gulp.src(['src/scripts/*.js']);
    return processScripts(sources, name);
});

gulp.task('js-with-tpls', function() {
    var sources = gulp.src(['src/scripts/*.js', 'src/templates/*.html'])
        .pipe($.if('*.html', $.minifyHtml(minifyHtmlOptions)))
        .pipe($.if('*.html', $.angularTemplatecache(name + '.tpl.js', templateOptions)))
    return processScripts(sources, name + '-tpls');
});

gulp.task('build', gulp.parallel('styles', 'js', 'js-with-tpls'));

/** build docs **/

gulp.task('docs', function() {
    return gulp.src('src/scripts/*.js')
        .pipe($.ngdocs.process(ngdocOptions))
        .pipe(gulp.dest('./dist/docs'));
});

/** build sample **/
gulp.task('install-widgets', function() {
    return gulp.src('sample/widgets/*/bower.json')
        .pipe($.install());
});
gulp.task('widget-templates:build', function() {
    var opts = {
        root: '{widgetsPath}',
        module: 'sample'
    };
    return gulp.src('sample/widgets/*/src/*.html')
        .pipe($.minifyHtml(minifyHtmlOptions))
        .pipe($.angularTemplatecache('widgets.js', opts))
        .pipe(gulp.dest('.tmp'));
});

gulp.task('widget-templates', gulp.series('install-widgets', 'widget-templates:build'));

gulp.task('sample-templates', function() {
    var opts = {
        root: 'partials',
        module: 'sample'
    };
    return gulp.src('sample/partials/*.html')
        .pipe($.minifyHtml(minifyHtmlOptions))
        .pipe($.angularTemplatecache('samples.js', opts))
        .pipe(gulp.dest('.tmp'));
});

gulp.task('dashboard-templates', function() {
    var opts = {
        root: '../src/templates',
        module: 'adf'
    };
    return gulp.src('src/templates/*.html')
        .pipe($.minifyHtml(minifyHtmlOptions))
        .pipe($.angularTemplatecache('adf.js', opts))
        .pipe(gulp.dest('.tmp'));
});

gulp.task('copy-font', function() {
    return gulp.src('sample/components/bootstrap/dist/fonts/*')
        .pipe(gulp.dest('dist/sample/fonts'));
});

gulp.task('sample:build', function() {
    var templates = gulp.src('.tmp/*.js', { read: false });
    var assets = $.useref.assets();
    return gulp.src('sample/index.html')
        // inject templates
        .pipe($.inject(templates, { relative: true }))
        .pipe(assets)
        .pipe($.if('*.js', $.replace('<<adfVersion>>', pkg.version)))
        .pipe($.if('*.js', $.ngAnnotate(annotateOptions)))
        .pipe($.if('*.js', $.uglify()))
        .pipe($.if('*.css', $.minifyCss()))
        .pipe($.rev())
        .pipe(assets.restore())
        .pipe($.useref())
        .pipe($.revReplace())
        .pipe(gulp.dest('dist/sample'));
});
gulp.task('sample', gulp.series('widget-templates', 'sample-templates', 'dashboard-templates', 'copy-font', 'sample:build'));

/** livereload **/

gulp.task('reload', function() {
    return gulp.src('sample/*.html')
        .pipe(connect.reload());
})

gulp.task('watch-styles', function() {
    return gulp.watch('src/styles/*.scss', gulp.series('styles', 'reload'));
})

gulp.task('watch', gulp.parallel('watch-styles', function() {
    var paths = [
        'src/scripts/*.js',
        'src/styles/*.css',
        'src/templates/*.html',
        'sample/*.html',
        'sample/scripts/*.js',
        'sample/partials/*.html',
        'sample/widgets/*/*.js',
        'sample/widgets/*/*.css',
        'sample/widgets/*/*.html',
        'sample/widgets/*/src/*.js',
        'sample/widgets/*/src/*.css',
        'sample/widgets/*/src/*.html'
    ];
    return gulp.watch(paths, ['reload']);
}));

gulp.task('webserver', function() {
    return connect.server({
        port: 9002,
        livereload: true,
        // redirect / to /sample
        middleware: function() {
            return [
                modRewrite([
                    '^/$ /sample/ [R]'
                ])
            ];
        }
    });
});

gulp.task('serve', gulp.series('install-widgets', 'webserver', 'styles', 'watch'));

/** unit tests */
gulp.task('karma', function(done) {
    runKarma(done, true);
});

gulp.task('karma-debug', function(done) {
    runKarma(done, false);
});

gulp.task('test', gulp.series('dashboard-templates', 'karma'));

/** run karma */
function runKarma(done, singleRun) {
    new karmaServer({
        configFile: __dirname + '/test/karma.conf.js',
        singleRun: singleRun
    }, done).start();
}



gulp.task('coverall', function() {
    return gulp.src('dist/reports/coverage/html/lcov.info')
        .pipe($.coveralls());
});

/** e2e **/

// The protractor task
var protractor = require('gulp-protractor').protractor;

// Start a standalone server
var webdriver_standalone = require('gulp-protractor').webdriver_standalone;

// Download and update the selenium driver
var webdriver_update = require('gulp-protractor').webdriver_update;

// Downloads the selenium webdriver
gulp.task('webdriver_update', webdriver_update);

// Start the standalone selenium server
// NOTE: This is not needed if you reference the
// seleniumServerJar in your protractor.conf.js
gulp.task('webdriver_standalone', webdriver_standalone);

// start webserver for e2e tests
gulp.task('e2e-server', function() {
    connect.server({
        port: 9003
    });
});

gulp.task('e2e-build', function(cb) {
    gulp.src('test/e2e/*Spec.js')
        .pipe(protractor(protractorOptions))
        .on('error', function(e) {
            // stop webserver
            connect.serverClose();
            // print test results
            console.log(e);
        })
        .on('end', function() {
            // stop webserver
            connect.serverClose();
            cb();
        });
});

// Setting up the test task
gulp.task('e2e', gulp.series('install-widgets', 'e2e-server', 'webdriver_update', 'e2e-build'));

/** travis ci **/

gulp.task('travis', gulp.series('jslint', 'test', 'coverall', 'build'));

/** shorthand methods **/
gulp.task('all', gulp.series('build', 'docs', 'sample'));

gulp.task('default', gulp.series('jslint', 'test', 'build'));




// dependencies 
var ver = require('gulp-ver'),
    git = require('gulp-git'),
    bump = require('gulp-bump'),
    argv = require('yargs').argv,
    tag_version = require('gulp-tag-version');


/**
 * Bumping version number and tagging the repository with it.
 * Please read http://semver.org/
 *
 * You can use the commands
 *
 *     gulp patch     # makes v0.1.0 → v0.1.1
 *     gulp feature   # makes v0.1.1 → v0.2.0
 *     gulp release   # makes v0.2.1 → v1.0.0
 *
 * To bump the version numbers accordingly after you did a patch,
 * introduced a feature or made a backwards-incompatible release.
 */

//STEP 1 
gulp.task('create:release:branch', function(cb) {
    git.checkout(temporalBranchRelease(), { args: '-b' }, function(err) {
        cb(err);
    })
});

gulp.task('increase:version', function() {
    return increase(versionType());
});

// STEP 2

gulp.task('build:all', gulp.series('create:release:branch', 'increase:version', 'build'));

// STEP 3 
gulp.task('commit:increase:version', function() {
    return gulp.src(['dist', './bower.json', './package.json'])
        .pipe(git.add())
        .pipe(git.commit('release ' + versionType() + ' version:' + versionNumber()))
});
// STEP 3 

// STEP 4
gulp.task('checkout:master:increase', function(cb) {
    git.checkout(masterBranch(), function(err) {
        cb(err);
    })
});
gulp.task('merge:master:increase', function(cb) {
    git.merge(temporalBranchRelease(), function(err) {
        cb(err);
    });
})

/*gulp.task('commit:master:increase:version', ['merge:master:increase'], function () {
    return gulp.src(['.'])
        .pipe(git.add())
        .pipe(git.commit('release ' + versionType() + ' version:' + versionNumber()))
});*/

gulp.task('prepare_tag:increase', function() {
    return gulp.src(['./package.json'])
        .pipe(tag_version());
});

gulp.task('checkout:develop', function(cb) {
    git.checkout(developBranch(), function(err) {
        if (!err) {
            git.merge(masterBranch(), function(err) {
                cb(err);
            });
        } else {
            cb(err);

        }
    });
});

gulp.task('prepare:develop:increase', gulp.series('build:all', 'commit:increase:version', 'checkout:master:increase', 'merge:master:increase', 'prepare_tag:increase', 'checkout:develop'));
// STEP 4

gulp.task('push:increase', gulp.series('prepare:develop:increase', 'prepare_tag:increase', function(cb) {
    git.push('origin', [masterBranch(), developBranch()], { args: " --follow-tags" }, function(err) {
        if (!err) {
            git.branch(temporalBranchRelease(), { args: "-D" }, function(err) {
                cb(err);
            });
        } else {
            cb(err);
        }
    });
}));


function increase(importance) {
    // get all the files to bump version in 
    return gulp.src(['./package.json', './bower.json'])
        // bump the version number in those files 
        .pipe(bump({ type: importance }))
        // save it back to filesystem 
        .pipe(gulp.dest('./'))
}

function temporalBranchRelease() {
    return (argv['temporal-branch'] === undefined) ? 'release_branch' : argv['temporal-branch'];
}

function masterBranch() {
    return (argv['master-branch'] === undefined) ? 'master' : argv['master-branch'];
}

function developBranch() {
    return (argv['develop-branch'] === undefined) ? 'develop' : argv['develop-branch'];
}

function versionType() {
    if (isPatch()) return "patch";
    if (isMajor()) return "major";
    if (isMinor()) return "minor";
    throw new Error('Version increase type unknown. Only valid [minor,major,patch].');
}

function versionNumber() {
    var fs = require('fs')
    var json = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    return json.version;
}

function isMinor() {
    return (argv.minor === undefined) ? false : true;
}

function isMajor() {
    return (argv.major === undefined) ? false : true;
}

function isPatch() {
    return (argv.patch === undefined) ? false : true;
}