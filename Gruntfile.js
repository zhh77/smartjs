module.exports = function(grunt) {
    var Files = {
        'smart': ['src/base/define.js','src/base/base.js','src/base/support.js','src/base/deferred.js', 'src/base/util.js', 'src/base/aop.js', 'src/base/oop.js'],
        'smart-jq': ['src/base/define.js','src/base/base.js','src/base/support-jquery.js', 'src/base/util.js', 'src/base/aop.js', 'src/base/oop.js'],
        'smart-dataManager': ['src/dataManager/filterBuilder.js', 'src/dataManager/dataManager.js', 'src/dataManager/dataManager-table.js'],
        'smart-node': ['src/base/define-node.js','src/base/base.js','src/base/support.js','src/base/deferred.js', 'src/base/util.js', 'src/base/aop.js', 'src/base/oop.js']
    };

    function getResource(type) {
        var name, path, res = {};
        for (name in Files) {
            res['dest/' + name + (type ? '.' + type : '') + '.js'] = Files[name];
        }
        return res;
    }

    function getTest(isJQ) {
        var tests = isJQ ? ['lib/jquery.js'] : [];
        for (name in Files) {
            if((isJQ && name === 'smart') || (!isJQ && name ==='smart-jq'))
                break;

            tests.push('dest/' + name + '.js')
        }
        return tests;
    }

    // 项目配置
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        smartdoc: {
            build: {
                options: {
                    paths: ['src/'],
                    outdir: 'doc/',
                    // demoDir:"test/",
                    demo: {
                        paths: ['dest/smart.js','dest/smart-dataManager.js'],
                        link: ['http://code.jquery.com/jquery-1.11.0.min.js']
                    },
                    //项目信息配置
                    project: {
                        name: '<%= pkg.name %>',
                        // description: '<%= pkg.description %>',
                        version: '<%= pkg.version %>',
                        url: 'https://github.com/zhh77/smartjs',
                        navs: [{
                            name: "Home",
                            url: "https://github.com/zhh77/smartjs"
                        }, {
                            name: "Document",
                            url: "http://zhh77.github.io/smartjs/"
                        }, {
                            name: "Blog",
                            url: "http://www.cnblogs.com/zhh8077"
                        }, {
                            name: "SmartDoc",
                            url: "https://github.com/zhh77/smartDoc"
                        }]
                    }
                }
            }
        },
        concat: {
            dist: {
                options: {
                    separator: '\n',
                    banner: "'use strict';\n",
                    process: function(src, filepath) {
                        return src.replace(/('use strict'|"use strict");?\s*/g, '');
                    }
                },
                files: getResource()
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.file %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            min: {
                options: {
                    report: "min"
                },
                files: getResource('min')
            }
        },
        jasmine: {
            src: getTest(),
            options: {
                specs: 'test/*/*.js',
                keepRunner: true
            }
        },
        connect: {
            options: {
                port: 9020,
                keepalive: true,
                livereload: 35729 //声明给 watch 监听的端口
            },
            server: {
                options: {
                    open: 'http://localhost:9020', //自动打开网页 http://
                    base: 'doc/'
                }
            }
        }
    });
    // 加载提供"uglify"任务的插件
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    // grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-smartdoc');

    // 默认任务
    grunt.registerTask('default', ['concat', "uglify", "smartdoc"]);

    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.registerTask('test', ['jasmine']);

    grunt.registerTask('doc', ['smartdoc']);
    grunt.registerTask('docserver', ['connect:server']);
}
