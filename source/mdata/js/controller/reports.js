
/*
 *  report manage控制器
 * */
oasgames.mdataControllers.controller('reportManageCtrl', [
    '$rootScope',
    '$scope',
    '$cacheFactory',
    'ApiCtrl',
    'Report',
    'Shortcut',
    'Filter',
    function ($rootScope, $scope, $cacheFactory, ApiCtrl, Report, Shortcut, Filter) {

        // 权限
        $scope.authority = $rootScope.user['authority'];

        // 定义default数据
        $scope.searchPlaceholder = 'Search AppName ReportName...';

        // report列表
        $scope.sourceData = [];
        $scope.viewData = [];

        // 所有report的收藏状态
        $scope.reportsShortcutStatus = {};

        // 用于存储每个app的report列表展示状态
        $scope.reportsShow = [];

        /*
        * 收藏对象，
        * 列表五角星初始化，
        * 收藏、取消收藏与左侧导航联动
        * */
        var Shortcuts = {
            operationObject : {
                "app" : null,
                "report" : null
            },

            /*
            * method ：初始化收藏标记-五角星的状态
            * 调用该方法需要保证 $scope.sourceData 已经初始化完成。
            * */
            init : function () {
                var self = this;
                var reportShortcutIdList = [];
                var shortcutCache = $cacheFactory.get('shortcut');

                // 初始化函数核心
                function processor () {
                    $scope.reportsShortcutStatus = self.initReportShortcutList(self.getReportId($scope.sourceData, 'object'), self.getReportId(reportShortcutIdList, 'array'));
                    self.bind();
                }

                if(shortcutCache && shortcutCache.get('list')) {
                    reportShortcutIdList = shortcutCache.get('list');
                    processor();
                }else {
                    shortcutCache = $cacheFactory('shortcut');
                    $http({
                        method : "GET",
                        url : ApiCtrl.get('shortcuts')
                    }).success(function (result) {
                        if(result.code == 200) {
                            reportShortcutIdList = result.data;
                            shortcutCache.put('list', result.data);
                            processor();
                        }else {
                            Ui.alert(result.msg);
                        }
                    }).error(function () {
                        Ui.alert('网络错误');
                    });
                }
            },

            /*
            * method ：提取report数据列表中的reportId属性
            * @param {Array} reportData 传入一个report列表数据([{reports: [id: 1]}...])，
            * @param {String}  returnType 设置方法返回的数据类型
            * @return {Object || Array} object返回一个由reportId为key值为null的对象，array返回一个由reportId组成的数组
            * */
            getReportId : function (reportData, returnType) {
                var allReport = [];

                // 在嵌套循环里进行逻辑判断，会比较耗资源，所以把判断提到了外层
                if(returnType == 'object') {
                    var allReport = {};
                    for(var i = 0; i < reportData.length; i++) {
                        for(var j = 0; j < reportData[i]['reports'].length; j++) {
                            allReport[reportData[i]['reports'][j]['id']] = null;
                        }
                    }
                }else {
                    for(var i = 0; i < reportData.length; i++) {
                        for(var j = 0; j < reportData[i]['reports'].length; j++) {
                            allReport.push([reportData[i]['reports'][j]['id']]);
                        }
                    }
                }
                return allReport;
            },

            /*
            * method ：已收藏的report值设为true
            * @return {Object} 修改过的reportShortcutStatus
            * */
            initReportShortcutList : function (defaultShortcutStatus, shortcutList) {
                for(var i = 0; i < shortcutList.length; i++) {
                    defaultShortcutStatus[shortcutList[i]] = true;
                }

                return defaultShortcutStatus;
            },

            /*
            * 五角星事件绑定，
            * 通过被动式绑定可以保证事件绑定在数据初始化之后进行,
            * 考虑到服务器收藏失败的几率和可能的网络延迟，为了最佳体验，
            * 默认认为操作是成功的，如果操作失败做倒退处理。
            * */
            bind : function () {
                var self = this;
                $scope.shortcutChange = function (report, app) {
                    var reportId = report.id;
                    var appId = app.appid;

                    self.changeOperationObject(report, app);

                    if($scope.reportsShortcutStatus[reportId]) {
                        self.cancelShortcut(reportId, appId);
                    }else {
                        self.addShortcut(reportId, appId);
                    }
                    console.log($scope.reportsShortcutStatus[reportId]);
                    $scope.reportsShortcutStatus[reportId] = !$scope.reportsShortcutStatus[reportId];
                    console.log($scope.reportsShortcutStatus[reportId]);
                };
            },

            // 修改当前收藏操作的report和所属app对象
            changeOperationObject : function (report, app) {
                this.operationObject.report = report;
                this.operationObject.app = app;
            },

            /*
            *
            * */
            addShortcut : function (reportId, appId) {
                var self = this;
                Shortcut.get(
                    {reportId : reportId, appId : appId},
                    function () {
                        $scope.$emit('addShortcut', self.operationObject.report, self.operationObject.app);
                    },
                    function () {
                        $scope.reportsShortcutStatus[reportId] = !$scope.reportsShortcutStatus[reportId];
                    }
                );
            },

            /*
             *
             * */
            cancelShortcut : function (reportId, appId) {
                var self = this;
                Shortcut.get(
                    {'type' : 'shortcut_cancel'},
                    {reportId : reportId, appId : appId},
                    function () {
                        $scope.$emit('cancelShortcut', self.operationObject.report, self.operationObject.app);
                    },
                    function () {
                        $scope.reportsShortcutStatus[reportId] = !$scope.reportsShortcutStatus[reportId];
                    }
                );
            }
        };

        /*
        * 展示列表初始化
        * */
        (function () {

            // 展示列表数据初始化
            Report.query().$promise.then(function (result) {
                if(result.code == 200) {
                    $scope.sourceData = result.data;
                    $scope.viewData = result.data;

                    // 初始化展示状态
                    upReportsListShow();

                    // 初始化收藏标记
                    Shortcuts.init();
                }else {
                    Ui.alert(result.msg);
                }
            }, function () {
                Ui.alert('网络错误');
            });

            /*
             * 更新report列表的展示状态，
             * 一个app时展开，多个app时合并列表
             * */
            function upReportsListShow (reportsList) {
                var reportsList = reportsList || $scope.viewData;
                if(reportsList && reportsList.length > 1) {
                    for(var i = 0; i < reportsList.length; i++) {
                        $scope.reportsShow[i] = false;
                    }
                }else {
                    for(var i = 0; i < reportsList.length; i++) {
                        $scope.reportsShow[i] = true;
                    }
                }
            }
        })();

        /*
         * @暴漏的搜索处理函数
         * @param {String} searchVal
         * */
        $scope.searchHandler = function (searchVal) {

            // 依据appName匹配到的apps
            var matchedApps = Filter($scope.sourceData, {appname : searchVal});
            // 依据appName匹配到的apps
            var unmatchedApps = [];
            // 用于临时存放依据reportsName匹配到的reports
            var tmpMatchedReports = null;
            // 用于临时创建新的匹配对象，以避免修改源对象属性
            var tmpMatchedApps = null;

            /*
             * 得到未匹配的apps
             * */
            if(matchedApps && matchedApps.length) {
                for(var j = 0; j < $scope.viewData.length; j++) {
                    for(var i = 0; i < matchedApps.length; i++) {
                        if($scope.viewData[j] === matchedApps[i]) {
                            break;
                        }
                        if(j == $scope.sourceData.length - 1) {
                            unmatchedApps.push($scope.sourceData[j]);
                        }
                    }
                }
            }else {
                unmatchedApps = $scope.sourceData;
            }

            /*
             * 遍历未匹配的apps，查找其匹配的reports,
             * 如果有匹配的reports，则重置该app的reports属性，并添加至匹配的apps
             * */
            if(unmatchedApps && unmatchedApps.length) {
                for(var i = 0; i < unmatchedApps.length; i++) {
                    var tmpMatchedReports = Filter(unmatchedApps[i]['reports'], {report_name : searchVal});

                    // 为匹配到的reports重新创建一个app对象存储
                    if(tmpMatchedReports && tmpMatchedReports.length) {
                        if(Object.prototype.toString.call(matchedApps) !== '[object Array]') {
                            matchedApps = [];
                        }

                        // 初始化空对象
                        tmpMatchedApps = {};
                        $.extend(tmpMatchedApps, unmatchedApps[i]);
                        tmpMatchedApps['reports'] = tmpMatchedReports;
                        matchedApps.push(tmpMatchedApps);
                    }
                }
            }

            upReportsListShow(matchedApps);
            $scope.viewData = matchedApps;
        };

        // 事件处理
        (function () {
            // 删除account
            $scope.delete = function (reportId) {
                Ui.confirm('确定要删除这个report吗', function () {
                    Report.save(
                        {reportId : reportId},
                        {reportId : reportId},
                        function (result) {
                            if(result && result.code == 200) {
                                Ui.alert('删除成功');
                            }else {
                                Ui.alert('删除失败');
                            }
                        },
                        function () {
                            Ui.alert('网络错误');
                        }
                    );
                });
            };
        })();
    }
]);