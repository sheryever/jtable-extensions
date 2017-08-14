/************************************************************************
 * LOCAL DB  extension for jTable
 * Author: Guillermo Bisheimer
 * Version 1.0
 *************************************************************************/
(function($) {

    //Reference to base object members
    var base = {
        _create: $.hik.jtable.prototype._create,
        _ajax: $.hik.jtable.prototype._ajax,
        _parseDate: $.hik.jtable.prototype._parseDate,
        _getRecords: $.hik.jtable.prototype._getRecords
    };

    //extension members
    $.extend(true, $.hik.jtable.prototype, {
        /************************************************************************
         * DEFAULT OPTIONS / EVENTS                                              *
         *************************************************************************/
        options: {
            DB: null,
            // Events
            onDBList: function(event, data) {
            },
            onDBCreate: function(event, data) {
            },
            onDBUpdate: function(event, data) {
            },
            onDBDelete: function(event, data) {
            },
            // Messages
            messages: {
                localDB: {
                    noKeyField: 'Primary key not defined. Cannot update table data.',
                    recordNotFound: 'No matching record found.',
                    multipleRecordsFound: 'Multiple records found. Check primary key field definition.'
                }
            }
        },
        _DBLoaded: false,
        _getWebApiActionOptions: function (url) {

            var httpMethodIndex = url.indexOf('@');
            if (httpMethodIndex < 1)
                return undefined;

            var httpMethod = url.substring(0, httpMethodIndex);
            var newUrl = url.substring(++httpMethodIndex, url.length);

            return { httpMethod: httpMethod, url: newUrl };
        },
        /* OVERRIDES BASE METHOD */
        _parseDate: function (dateString) {
            if (dateString.length > 0) {
                var hijriDate = new HijriDate(
                    parseInt(dateString.substr(0, 4), 10),
                    parseInt(dateString.substr(5, 2), 10) - 1,
                    parseInt(dateString.substr(8, 2, 10)));
                return hijriDate;
            }
            else {
                this._logWarn('Given date is not properly formatted: ' + dateString);
                return 'format error!';
            }

        },
        /************************************************************************
         * OVERRIDED METHODS                                                     *
         *************************************************************************/

        /* Overrides base method to do editing-specific constructions.
         *************************************************************************/
        _create: function() {
            var self = this;
            base._create.apply(this, arguments);

            if (!self.options.localDB)
                return;

            if (!self.options.DB)
                self.options.DB = [];

            // Backups original action strings
            $.each(this.options.actions, function(index, action) {
                if( typeof action === 'string' ){
                    var action = self._parseURL({url: action});
                }
                self.options.actions[index + 'Server'] = action;
                self.options.actions[index] = index;
            });
        },
        /**
         * 
         * @param {type} options
         * @returns {undefined}
         */
        _parseURL: function(options) {
            var url_array = options.url.split('?');

            options.url = url_array[0];
            options.urlParams = url_array.length > 1 ? this._deParam(url_array[1]) : null;
            if (typeof options.data === 'string') {
                options.data = this._deParam(options.data);
            }
            return options;
        },
        /**
         * 
         * @param {type} params
         * @returns {@exp;JSON@call;parse|_L6.Anonym$0._deParam.params}
         */
        _deParam: function(params) {
            return params ? JSON.parse('{"' + params.replace(/&/g, '","').replace(/=/g, '":"') + '"}', function(key, value) {
                return key === "" ? value : decodeURIComponent(value);
            }) : {};
        },
        /* Overrides base method
         *************************************************************************/
        _ajax: function(options) {
            var self = this;

            if (!self.options.localDB)
                return base._ajax.apply(this, arguments);
            else {
                if (options.data == null || options.data == undefined) {
                    options.data = {};
                } else if (typeof options.data == 'string') {
                    options.data = self._convertQueryStringToObject(options.data);
                }
            }
            // Parse the URL and data
            this._parseURL(options);
            var action = options.url;
            var serverAction = self.options.actions[action + 'Server'];

            switch (action) {
                case 'listAction':
                    // If server data is already loaded, call the localDB ajax function
                    if (self._DBLoaded === true || 
                        serverAction === true ||
                        typeof serverAction === 'object' ) {
                        if( serverAction.urlParams ){
                            options.data = $.extend({}, options.data, serverAction.urlParams);
                        }
                        return self._ajaxLocalDB(options);
                    }

                    var opts = $.extend(true, {}, options);

                    opts.url = serverAction.url;
                    if( serverAction.urlParams ) opts.urlParams = $.extend({}, opts.urlParams, serverAction.urlParams);
                    if (opts.urlParams) {
                        delete opts.urlParams.jtStartIndex;
                        delete opts.urlParams.jtPageSize;
                        opts.url += (opts.url.indexOf('?') >= 0 ? '&' : '?') + $.param(opts.urlParams);
                    }

                    // Override success
                    opts.success = function(data) {
                        if (data.Result !== 'OK') {
                            if (options.success) {
                                options.success(data);
                            }
                        }
                        else {
                            self.options.DB = data.Records || [];
                            self._DBLoaded = true;
                            self._ajaxLocalDB(options);
                        }
                    };
                    base._ajax.apply(this, [opts]);
                    break;

                case 'createAction':
                case 'updateAction':
                case 'deleteAction':
                    self._ajaxLocalDB(options);
                    break;

                    // Options loading
                default:
                    if (options.urlParams) {
                        options.url += (options.url.indexOf('?') >= 0 ? '&' : '?') + $.param(options.urlParams);
                    }

                    var webApiActionOptions = this._getWebApiActionOptions(options.url);

                    if (!webApiActionOptions) {
                        webApiActionOptions = { url: url, httpMethod: 'POST' };
                    }

                    options.url = webApiActionOptions.url;
                    options.type = webApiActionOptions.httpMethod;

                    base._ajax.apply(this, arguments);
                    break;
            }
        },
        /**
         * 
         * @param {type} options
         * @returns {undefined}
         */
        _ajaxLocalDB: function(options) {
            var self = this;
            var action = options.url;
            var opts = $.extend({}, this.options.ajaxSettings, options);

            // Override success
            opts.success = function(data) {
                if (options.success) {
                    options.success(data);
                }
            };

            // Override error
            opts.error = function() {
                if (options.error) {
                    options.error();
                }
            };

            // Override complete
            opts.complete = function() {
                if (options.complete) {
                    options.complete();
                }
            };

            var callbacks = {
                'listAction': function(data) {
                    return self._onDBList('list', data);
                },
                'updateAction': function(data) {
                    return self._onDBUpdate('update', data);
                },
                'createAction': function(data) {
                    return self._onDBCreate('create', data);
                },
                'deleteAction': function(data) {
                    return self._onDBDelete('delete', data);
                }
            };

            /* TODO
             * - Agregar registro de eventos, para poder reenviar los datos modificados a la base de datos
             */
            var result = callbacks[action](opts);

            if (result !== false) {
                opts.success(result);
            }
            else {
                opts.error();
            }

            opts.complete();
        },
        /**
         * Adds record to local database
         * @param {object} record Record to store
         * @returns {undefined}
         */
        _addRecordToLocalDB: function(record) {
            this.options.DB.push(record);
        },
        /**
         * Updates record in local database
         * @param {object} data Data to update in target record
         * @param {object} record Target record to update
         * @returns {undefined}
         */
        _updateRecordInLocalDB: function(record, data) {
            // Adds field values to record
            for (var field in data) {
                record[field] = data[field];
            }
        },
        /**
         * Deletes record from local database
         * @param {integer} recordIndex
         * @returns {undefined}
         */
        _deleteRecordFromLocalDB: function(recordIndex) {
            this.options.DB.splice(recordIndex, 1);
        },
        /**
         * Local DB listAction callback
         * @param {string} event Event type 'list'
         * @param {object} data Object posted parameters
         * @returns {object} result object acording to jTable server-side specifications
         */
        _onDBList: function(event, data) {
            var self = this;

            // Data ordering
            if (self._lastSorting.length > 0) {
                /** TODO
                 * Check if lastSorting changed since last call to avoid reordering
                 */
                var dynamicSort = function(field, order) {
                    if (order === 'DESC') {
                        return function(a, b) {
                            return (a[field] > b[field]) ? -1 : (a[field] < b[field]) ? 1 : 0;
                        };
                    }
                    return function(a, b) {
                        return (a[field] < b[field]) ? -1 : (a[field] > b[field]) ? 1 : 0;
                    };
                };

                var dynamicSortMultiple = function(fieldSorting) {
                    return function(obj1, obj2) {
                        var i = 0, result = 0, numberOfProperties = fieldSorting.length;
                        while (result === 0 && i < numberOfProperties) {
                            result = dynamicSort(fieldSorting[i].fieldName, fieldSorting[i].sortOrder)(obj1, obj2);
                            i++;
                        }
                        return result;
                    };
                };
                self.options.DB.sort(dynamicSortMultiple(self._lastSorting));
            }

            self._trigger("onDBList", event, {Records: self.options.DB});

            var records = self.options.DB.slice(0);

            if (data.data) {
                records = records.filter(function(record, index) {
                    var match = true;
                    for (var field in data.data) {
                        if (record.hasOwnProperty(field)) {
                            //var reg = new RegExp(data.data[field]);
                            //match &= record[field].match(reg);
                            switch( typeof record[field] ){
                                case 'string':
                                    match &= record[field].toLowerCase().indexOf(data.data[field].toLowerCase()) !== -1 ? true : false;
                                    break;
                                    
                                default:
                                    match &= record[field] == data.data[field];
                                    break;
                            }
                        }
                        else{
                            match = false;
                        }
                    }
                    return match;
                });
            }

            if (data.urlParams && data.urlParams.jtStartIndex)
                records = records.slice(Number(data.urlParams.jtStartIndex), Number(data.urlParams.jtStartIndex) + Number(data.urlParams.jtPageSize));

            // Return data with according to paging options
            return {
                Result: 'OK',
                TotalRecordCount: self.options.DB.length,
                Records: records
            };
        },
        /**
         * Local DB createAction callback
         * @param {string} event 'create'
         * @param {object} data Object posted parameters
         * @returns {object} result object acording to jTable server-side specifications
         */
        _onDBCreate: function(event, data) {
            var self = this;
            var keyField = self._keyField;
            var record = {};
            var result = {};

            if (!keyField) {
                return {
                    Result: 'ERROR',
                    Message: self.options.messages.localDB.noKeyField
                };
            }

            // Adds table fields to record
            for (var index in self._fieldList) {
                if (index.in('find','single', 'groupBy')) continue;
                var fieldName = self._fieldList[index];
                var fieldOptions = self.options.fields[fieldName];
                if (!fieldOptions.childTable) {
                    record[fieldName] = fieldOptions.defaultValue || null;
                }
            }

            // Adds field values to record
            for (var field in data.data) {
                record[field] = data.data[field];
            }

            // If there is no key field value provided in form data, autoincrement max key field Value
            if (!data.data.hasOwnProperty(keyField)) {
                var keys = self.options.DB.map(function(record) {
                    return record[keyField];
                });
                keys.push(0);
                record[keyField] = Math.max.apply(null, keys) + 1;
            }

            var success = self._trigger("onDBCreate", event, {data: data.data, record: record, parentRecord: self.options.parentRecord, result: result});

            if (success) {
                // Stores new record in local database
                this._addRecordToLocalDB(record);

                return {
                    Result: 'OK',
                    Record: record
                };
            }
            else {
                return {
                    Result: 'ERROR',
                    Message: result.Message
                };
            }
        },
        /**
         * Local DB updateAction callback
         * @param {string} event 'update'
         * @param {object} data Object posted parameters
         * @returns {object} result object acording to jTable server-side specifications
         */
        _onDBUpdate: function(event, data) {
            var self = this;
            var result = self._findRecordFromKey(data);

            if (result.Result !== 'OK') {
                return result;
            }

            var success = self._trigger("onDBUpdate", event, {data: data.data, record: result.Record, result: result});

            if (success) {
                // Stores updated record in local database
                this._updateRecordInLocalDB(result.Record, data);

                return {
                    Result: 'OK',
                    Record: result.Record
                };
            }
            else {
                return {
                    Result: 'ERROR',
                    Message: result.Message
                };
            }
        },
        /**
         * Local DB deleteAction callback
         * @param {string} event 'delete'
         * @param {object} data Object posted parameters
         * @returns {object} result object acording to jTable server-side specifications
         */
        _onDBDelete: function(event, data) {
            var self = this;
            var result = self._findRecordFromKey(data);

            if (result.Result !== 'OK') {
                return result;
            }

            var success = self._trigger("onDBDelete", event, {data: data.data, record: result.Record, result: result});

            if (success) {
                // Deletes record from local database
                this._deleteRecordFromLocalDB(result.RecordIndex);

                return {
                    Result: 'OK'
                };
            }
            else {
                return {
                    Result: 'ERROR',
                    Message: result.Message
                };
            }
            return result;
        },
        _findRecordFromKey: function(data) {
            var self = this;
            var keyField = self._keyField;
            var recordIndex = null;

            if (!keyField || !data.data.hasOwnProperty(keyField)) {
                return {
                    Result: 'ERROR',
                    Message: self.options.messages.localDB.noKeyField
                };
            }

            // Gets target record
            var records = self.options.DB.filter(function(record, index) {
                if (record[keyField] == data.data[keyField]) {
                    recordIndex = index;
                    return true;
                }
            });

            // If there no coincidence on key field value, returns error
            if (records.length === 0) {
                return {
                    Result: 'ERROR',
                    Message: self.options.messages.localDB.recordNotFound
                };
            }

            // If there is more than one coincidence on key field value, returns error
            if (records.length > 1) {
                return {
                    Result: 'ERROR',
                    Message: self.options.messages.localDB.multipleRecordsFound
                };
            }

            return {
                Result: 'OK',
                Record: records[0],
                RecordIndex: recordIndex
            };
        },
        /************************************************************************
         * PUBLIC METHODS                                                        *
         *************************************************************************/

        /**
         * Clear records in DB
         * @returns {undefined}
         */
        clearRecords: function() {
            if (this.options.localDB) {
                this.options.DB.length = 0;
            }
        },
        _convertQueryStringToObject: function (queryString) {
            var jsonObj = {};
            var e,
                a = /\+/g,
                r = /([^&=]+)=?([^&]*)/g,
                d = function (s) { return decodeURIComponent(s.replace(a, " ")); };

            while (e = r.exec(queryString)) {
                jsonObj[d(e[1])] = d(e[2]);
            }

            return jsonObj;
        }
    });

})(jQuery);