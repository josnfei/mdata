var tooltip = require('Tooltip');

/*
 *  report edit控制器
 * */
oasgames.mdataControllers.controller('reportEditCtrl', [
    '$rootScope',
    '$scope',
    '$route',
    '$http',
    '$location',
    '$cacheFactory',
    'REPORT_DATE_RANGE',
    'REPORT_DIMENSION',
    'FILTER',
    'FILTER_COMPUTE_SIGN',
    'VALUE_TYPE',
    'VALUE_ARITHMETIC',
    'ApiCtrl',
    'MdataVerify',
    function ($rootScope, $scope, $route, $http, $location, $cacheFactory, reportDateRanges, reportDimensions, filters, filterComputeSigns, valueTypes, valueArithmetics, ApiCtrl, MdataVerify) {

        /*
        * 常量
        * */
        (function () {
            // 日期范围可选列表-常量
            $scope.reportDateRanges = reportDateRanges;

            // dimension可选列表-常量
            $scope.reportDimensions = reportDimensions;

            // report_filter可选列表-常量
            $scope.filters = filters;

            // report_filter支持的运算符-常量
            $scope.filterComputeSigns = filterComputeSigns;

            // report_value支持的类型-常量
            $scope.valueTypes = valueTypes;

            // report_value支持的算法-常量
            $scope.valueArithmetics = valueArithmetics;
        })();

        // 当前编辑的reportId
        $scope.reportId = $route.current.params.reportId;

        // 用于区分创建和编辑状态
        $scope.reportIsExisting = false;

        // 编辑report获取到的所有数据
        $scope.reportSourceData = {};

        /*
        * 可选列表初始化
        * */
        (function () {

            // 已选的guest_user数据列表
            $scope.selectedGuestUids = [];

            /*
             * 如果有id，则说明是编辑状态
             * */
            if($scope.reportId) {
                $scope.reportIsExisting = true;
                initReportData($scope.reportId);
            }else {
                initAppData();
            }

            // 编辑Report时获取某report的数据
            function initReportData (reportId) {
                $http({
                    url: ApiCtrl.get('reportUpdate'),
                    method: 'POST',
                    params: {
                        reportId : reportId
                    }
                }).success(function (result) {
                    if(result && result.code == 200) {
                        $scope.reportSourceData = result.data;
                        $scope.appData = result.data['appDataList'];
                        $scope.guestUserValue = result.data['guestUserValue'];
                        $scope.guestUsers = result.data['guestUser'];
                        $scope.valueList = $scope.appData['val_list'];
                        initSelectData();
                    }else {
                        Ui.alert(result.msg);
                    }
                }).error(function (status) {
                    Ui.alert('网络错误！');
                });
            }

            /*
             * 创建report时所需的数据，
             * 包含可选的app列表和app数据，
             * 这些app都是当前用户有管理权限的app。
             * 同时含有第一个app对应的guest_account可选列表数据
             * */
            function initAppData () {
                $http({
                    url: ApiCtrl.get('reportCreate'),
                    method: 'POST'
                }).success(function (result) {
                    if(result && result.code == 200) {
                        console.log(result);
                        $scope.appDataList = result.data['appDataList'];
                        $scope.appData = result.data['appDataList'][0];
                        $scope.guestUsers = result.data['guestUser'];
                        $scope.valueList = $scope.appData['val_list'];
                        initSelectData();
                    }else {
                        console.log(result);
                        Ui.alert(result.msg);
                    }
                });
            }

            /*
            * 初始化空值
            * */
            function initSelectData () {
                // 当前编辑的report数据信息
                if(!$scope.reportSourceData['reportData']) {
                    $scope.reportSourceData['reportData'] = {};
                }
                // 已选的value数据
                if(!$scope.reportSourceData['reportData']['values']) {
                    $scope.reportSourceData['reportData']['values'] = [];
                }
                // 已选的guest用户数据
                if(!$scope.reportSourceData['reportData']['guestUserValue']) {
                    $scope.reportSourceData['reportData']['guestUserValue'] = [];
                }
                // 已选的dimension数据
                if(!$scope.reportSourceData['reportData']['dimension']) {
                    $scope.reportSourceData['reportData']['dimension'] = []
                }
                // 已选的filter数据
                if(!$scope.reportSourceData['reportData']['filter']) {
                    $scope.reportSourceData['reportData']['filter'] = []
                }
                // 可选的app列表及其数据,当前用户可支配的app列表,创建report所需信息
                if(!$scope.appDataList) {
                    $scope.appDataList = [];
                }
                // report关联的app数据
                if(!$scope.appData) {
                    $scope.appData = {};
                }
                if(!$scope.appData['app']) {
                    $scope.appData['app'] = {};
                }
                // 可选的value
                if(!$scope.valueList) {
                    $scope.valueList = {};
                }
                // 已选的guest账号列表
                if(!$scope.guestUserValue) {
                    $scope.guestUserValue = [];
                }
                // 可选的guest账号列表
                if(!$scope.guestUsers) {
                    $scope.guestUsers = [];
                }
                // 已选的date值
                $scope.selectedDateValue = $scope.reportSourceData['reportData']['date'] || '';
                if($scope.selectedDateValue) {
                    $scope.selectedDateValue = reportDateRanges[$scope.selectedDateValue];
                }
            }
        })();

        // 选择application
        (function () {
            $('.report-page').on('click', '.select_content_list_value-select-app', function () {
                $scope.$apply(function () {
                    $scope.selectedAppId = $(this).data('value');
                });
            });

            // 根据选择的appId更新valueList
            $scope.$watch('selectedAppId', function () {
                if(!$scope.selectedAppId || !$scope.appDataList.length) {
                    console.log('无法更新valueList，selectedAppId：' + $scope.selectedAppId + ',appDataList：' + $scope.appDataList);
                    return;
                }
                for(var i = 0; i < $scope.appDataList.length; i++) {
                    if($scope.selectedAppId == $scope.appDataList[i]['app'].appid) {
                        $scope.valueList = $scope.appDataList[i]['val_list'];
                    }
                }
            })
        })();

        // getGuestUser数据
        function upGuestUserData () {
            $http({
                method : "GET",
                url : ApiCtrl.get('guestUser')
            }).success(function (result) {
                if(result.code == 200) {
                    $scope.guestUsers = result.data;
                }else {
                    console.log(result);
                    Ui.alert(result.msg);
                }
            });
        }

        // 事件处理、表单效验
        (function () {
            $scope.tooltip = new tooltip({'position':'rc'}).getNewTooltip();
            //判断report_name重复 1为重复
            var flag = 0;

            //表单失去焦点时错误提示
            $scope.blur = function(type, $errors){
                if(type == "reportName"){
                    if(MdataVerify.blur(type, $errors, $scope)){

                        //验证report name是否重复  
                        var report_name = $scope.reportSourceData['reportData']['report_name'];
                        var app_id = $scope.selectedAppId;
                        $http({
                            url: ApiCtrl.get('checkReportName'),
                            method: 'POST',
                            data: {
                                'appId' : app_id,
                                'report_name' : report_name
                            }
                        }).success(function (result) {
                            if(result && result.code == 200) {
                                flag = 0;
                            }else {
                                $scope[type + 'Error'] = true;
                                $scope.tooltip.errorType = type;
                                $scope.tooltip.setContent(result.msg);
                                $scope.tooltip.setPosition('.fieldset-' + type, $scope.tooltip.toolTipLooks);
                                $scope.tooltip.toolTipLooks.css({'color': 'rgba(255, 0, 0, 0.7)'});
                                $scope.tooltip.show();
                                flag = 1;
                            }
                        });
                    }              
                }
                MdataVerify.blur(type, $errors, $scope);                
            };

            //表单焦点时清除错误提示
            $scope.focus = function (type) {
                $scope[type + 'Error'] = false;
                if($scope.tooltip.errorType == type) {
                    $scope.tooltip.hide();
                }
            };

            /*
            * 编辑提交
            * */
            $scope.submit = function () {

                //判断app Name，只在创建report时进行判断
                if(!$scope.selectedAppId && !$scope.reportId){
                     Ui.alert("Application Name must not be empty");
                     return false;
                }

                //判断Report Name
                if(!MdataVerify.submit('reportName', $scope["reportFrom"]["reportName"].$error, $scope)){
                    return false;
                }

                //判断name重复
                if(flag == 1){
                    Ui.alert("report name 重复");
                    return false;
                }

                //判断Column
                if($.trim( $('.field-common-value').data('value')) == ""){
                     Ui.alert("Column must not be empty");
                     return;
                }

                // 提交数据
                var result = {}, submitApi = ApiCtrl.get('reportSave');
                if($scope.reportId) {
                    result.id = $scope.reportId;
                }
                result.appid = $scope.selectedAppId;
                result.report_name = $scope.reportSourceData['reportData']['report_name'];
                result.describe = $scope.reportSourceData['reportData']['describe'];
                result.dimension = $('.field-common-dimension').data('value');
                result.filter = $('.field-common-filter').data('value');
                result.guest_uid = $('.field-common-guest').data('value');
                result.values = $('.field-common-value').data('value');
                result.date = $('.select-date').data('value');

                $http({
                    method : "POST",
                    url : submitApi,
                    data : result
                }).success(function (result) {
                    if(result.code == 200) {
                        Ui.alert('success', function () {
                            $scope.$apply(function () {
                                $location.path('/report/manage');
                            });
                        });
                    }else {
                        console.log(result);
                        Ui.alert(result.msg);
                    }
                });
            };
        })();
    }
]);
