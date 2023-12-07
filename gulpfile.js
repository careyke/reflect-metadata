const gulp = require("gulp");
const sequence = require("gulp-sequence");
const del = require("del");
const tsb = require("gulp-tsb");
const mocha = require("gulp-mocha");
const emu = require("gulp-emu");
const rename = require("gulp-rename");
const gls = require("gulp-live-server");

const debugProject = tsb.create("tsconfig.json");
const releaseProject = tsb.create("tsconfig-release.json");
const tests = tsb.create("test/tsconfig.json");

let project = debugProject;

gulp.task("release", () => { project = releaseProject; });
gulp.task("clean", () => del([
    "Reflect.js",
    "Reflect.js.map",
    "ReflectLite.js",
    "ReflectLite.js.map",
    "ReflectNoConflict.js",
    "ReflectNoConflict.js.map",
    "test/**/*.js",
    "test/**/*.js.map"
]));

gulp.task("build:reflect", () => gulp
    .src(["globals.d.ts", "Reflect.ts", "ReflectLite.ts", "ReflectNoConflict.ts"])
    .pipe(project())
    .pipe(gulp.dest(".")));

gulp.task("build:tests", ["build:reflect"], () => gulp
    .src(["test/**/*.ts"])
    .pipe(tests())
    .pipe(gulp.dest("test")));

gulp.task("build:spec", () => gulp
    .src(["spec.html"])
    .pipe(emu({ js: "ecmarkup.js", css: "ecmarkup.css", biblio: true }))
    .pipe(rename(path => {
        if (path.basename === "spec" && path.extname === ".html") {
            path.basename = "index";
        }
    }))
    .pipe(gulp.dest("docs")));

gulp.task("build", ["build:reflect", "build:tests", "build:spec"]);

gulp.task("no-polyfill", () => {
    process.env["REFLECT_METADATA_USE_MAP_POLYFILL"] = "";
});

gulp.task("use-polyfill", () => {
    process.env["REFLECT_METADATA_USE_MAP_POLYFILL"] = "true";
});

gulp.task("test:full", ["build:tests", "no-polyfill"], () => {
    console.log("Running tests w/o polyfill...");
    return gulp
        .src(["test/full/**/*.js"], { read: false })
        .pipe(mocha({ reporter: "dot" }));
});
gulp.task("test:lite", ["build:tests", "no-polyfill"], () => {
    console.log("Running lite-mode tests w/o polyfill...");
    return gulp
        .src(["test/lite/**/*.js"], { read: false })
        .pipe(mocha({ reporter: "dot" }));
});
gulp.task("test:no-conflict", ["build:tests", "no-polyfill"], () => {
    console.log("Running no-conflict-mode tests w/o polyfill...");
    return gulp
        .src(["test/no-conflict/**/*.js"], { read: false })
        .pipe(mocha({ reporter: "dot" }));
});
gulp.task("test:use-polyfill", ["build:tests", "use-polyfill"], () => {
    console.log("Running tests w/ polyfill...");
    return gulp
        .src(["test/full/**/*.js"], { read: false })
        .pipe(mocha({ reporter: "dot" }));
});
gulp.task("test", sequence("test:full", "test:lite", "test:no-conflict", "test:use-polyfill"));


gulp.task("watch:reflect", () => gulp.watch([
    "index.d.ts",
    "no-conflict.d.ts",
    "globals.d.ts",
    "Reflect.ts",
    "ReflectLite.ts",
    "ReflectNoConflict.ts",
    "tsconfig.json",
    "test/**/*.ts",
    "test/**/tsconfig.json"
], ["test"]));
gulp.task("watch:spec", () => gulp.watch(["spec.html"], ["build:spec"]));
gulp.task("watch", ["watch:reflect", "watch:spec"], () => {
    const server = gls.static("docs", 8080);
    const promise = server.start();
    gulp.watch(["docs/**/*"], file => server.notify(file));
    return promise;
});

gulp.task("prepublish", sequence("release", "clean", "test"));
gulp.task("reflect", ["build:reflect"]);
gulp.task("tests", ["build:tests"]);
gulp.task("spec", ["build:spec"]);
gulp.task("start", ["watch"]);
gulp.task("default", ["build", "test"]);
