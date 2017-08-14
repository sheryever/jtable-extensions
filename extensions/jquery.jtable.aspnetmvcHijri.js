/************************************************************************
* DATETIME extension for jTable       
* Author: Abu Ali Muhammad Sharjeel 
* Requied: jquery.ui.datepicker-cc.js
*************************************************************************/
var debugDate;
(function ($) {

    //Reference to base object members
    var base = {
        _parseDate: $.hik.jtable.prototype._parseDate
    };
    //extension members
    $.extend(true, $.hik.jtable.prototype, {

        /************************************************************************
        * DEFAULT OPTIONS / EVENTS                                              *
         *************************************************************************/
        options: {
           requestVerificationToken: false
        },
        /* OVERRIDES BASE METHOD.
        * THIS METHOD IS DEPRECATED AND WILL BE REMOVED FROM FEATURE RELEASES.
        * USE _ajax METHOD.
        *************************************************************************/
        _performAjaxCall: function (url, postData, async, success, error) {
            this._ajax({
                url: url,
                data: postData,
                async: async,
                success: success,
                error: error
            });
        },

        _getWebApiActionOptions: function (url) {

            var httpMethodIndex = url.indexOf('@');
            if (httpMethodIndex < 1) {
                //self.warn("Method not found in url., detault method will be POST");
                return { httpMethod: 'POST', url: url };
            }

            var httpMethod = url.substring(0, httpMethodIndex);
            var newUrl = url.substring(++httpMethodIndex, url.length);

            return { httpMethod: httpMethod, url: newUrl };
        },

        /* OVERRIDES BASE METHOD */
        _ajax: function (options) {
            var self = this;

            var opts = $.extend({}, this.options.ajaxSettings, options);

            if (opts.data == null || opts.data == undefined) {
                opts.data = {};
            } else if (typeof opts.data == 'string') {
                opts.data = self._convertQueryStringToObject(opts.data);
            }

            if (this.options.requestVerificationToken) {
                opts.data['__RequestVerificationToken'] = $.cookie('__RequestVerificationToken');
            }

            var qmIndex = opts.url.indexOf('?');
            if (qmIndex > -1) {
                $.extend(opts.data, self._convertQueryStringToObject(opts.url.substring(qmIndex + 1)));
            }

            var webApiActionOptions = this._getWebApiActionOptions(opts.url);
            
            if (!webApiActionOptions) {
                webApiActionOptions = { url: url, httpMethod: 'POST' };
            }

            if (webApiActionOptions.httpMethod == "GET")
                opts.data = undefined;
            opts.data = JSON.stringify(opts.data);

            opts.contentType = 'application/json; charset=utf-8';

            opts.url = webApiActionOptions.url;
            opts.type = webApiActionOptions.httpMethod;

            //Override success
            opts.success = function (data) {
                if (options.success) {
                    data = self._fixDefaultDateInJSONReturnData(data);
                    options.success(data);
                }
            };

            //Override error
            opts.error = function () {
                if (options.error) {
                    options.error();
                }
            };

            //Override complete
            opts.complete = function () {
                if (options.complete) {
                    options.complete();
                }
            };

            $.ajax(opts);
        },

        /* OVERRIDES BASE METHOD */
        _submitFormUsingAjax: function (url, formData, success, error) {
            var self = this;

            formData = {
                //record: formData//self._convertQueryStringToObject(formData)
                record: self._convertQueryStringToObject(formData)
            };

            formData.record = self._convertDateToIsoString(self.option().fields, formData.record);

            if (self.option().submittingAjaxData) {

                formData = self.option().submittingAjaxData(formData);
            }

            if (this.options.requestVerificationToken) {
                formData.record['__RequestVerificationToken'] = $.cookie('__RequestVerificationToken');
            }

            
            var qmIndex = url.indexOf('?');
            if (qmIndex > -1) {
                $.extend(formData, self._convertQueryStringToObject(url.substring(qmIndex + 1)));
            }

            var postData = JSON.stringify(formData.record);
            //var postData = formData.record;
            
            var webApiActionOptions = this._getWebApiActionOptions(url);

            if (!webApiActionOptions) {
                webApiActionOptions = { url: url, httpMethod: 'POST' };
            }
 
            $.ajax({
                url: webApiActionOptions.url,
                type: webApiActionOptions.httpMethod,
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                data: postData,
                success: function (data) {
                    data = self._fixDefaultDateInJSONReturnData(data);
                    success(data);
                },
                error: function () {
                    error();
                }
            });
        },

        /* OVERRIDES BASE METHOD */
       _parseDate: function (dateString) {
           if (dateString.length > 0) {
               var hijriDate = new HijriDate(
                   parseInt(dateString.substr(0, 4), 10),
                   parseInt(dateString.substr(5, 2), 10) -1,
                   parseInt(dateString.substr(8, 2, 10)));
               return hijriDate;
           }
           else {
               this._logWarn('Given date is not properly formatted: ' + dateString);
               return 'format error!';
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
        },
        
        _convertDateToIsoString: function(fields, record) {
            
            for (var fieldKey in fields) {
                var field = fields[fieldKey];
            
                if (field.type == 'date') {
                    var val = record[fieldKey];
                    if (val) {
                        val = val;
                        record[fieldKey] = val;
                    } else {
                        record[fieldKey] = null;
                    }
                }

                if (field.type == 'datetime') {
                    var val = record[fieldKey];
                    if (val) {
                        //mb.debugLog(value);
                        val = this._toIsoDateTime(val.split(' ')[0], val.split(' ')[1]);
                        record[fieldKey] = val;
                    } else {
                        record[fieldKey] = null;
                    }
                }
            }
            return record;
        },
        
        _stringToDate: function(dateString, dateFormat) {

            if (dateString.length > 12)
                return new Date(dateString);
            
            return $.datepicker.parseDate(dateFormat, dateString);
        },
        
        _fixDefaultDateInJSONReturnData: function (data) {
            var self = this;
            if (data.hasOwnProperty('Record')) {
                data.Record = self._fixDefaultJSONDate(self.option().fields, data.Record);
            }
            
            if (data.hasOwnProperty('Records')) {
                for (var i = 0; i < data.Records.length; i++) {
                    data.Records[i] = self._fixDefaultJSONDate(self.option().fields, data.Records[i]);
                }
            }

            return data;
        },
        
        _fixDefaultJSONDate: function(fields, record) {
            
            for (var fieldKey in fields) {
                var field = fields[fieldKey];
                
                if (field.type == 'date') {
                    var value = record[fieldKey];
                    if (value == "2000-01-01T00:00:00" || value == "1970-01-01T00:00:00")
                        record[fieldKey] = null;
                    
                    if (value) {
                        var date = value.split('T')[0].split('-');

                        record[fieldKey] = value; //this._fixDateDigit(hijri.getFullYear(), hijri.getMonth().toString(), hijri.getDay().toString()) + ' 00:00:00';
                    }
                }
            }
            return record;
        },

        _fixDateDigit : function (y, m, d) {
            if (m < 10 && m.length < 2)
                m = '0' + m.toString();

            if (d < 10 && d.length < 2)
                d = '0' + d.toString();

            return this._formatString("{0}-{1}-{2}", y, m, d);
        },
        
        _toIsoDateTime : function (dateInShortFormatString, timeString) {
            if (!dateInShortFormatString)
                return dateInShortFormatString;

            if (!timeString)
                timeString = '00:00';
            var dateValues = dateInShortFormatString.split('/');
            var timeValues = timeString.split(':');
           /* mb.debugLog(dateValues);
            mb.debugLog(timeValues);*/
            return dateValues[2] + '-' + dateValues[1] + '-' + dateValues[0] + 'T' + this._fixTimeDigit(timeValues[0], timeValues[1]);
        },

        _fixTimeDigit : function (h, m) {
            if (h == 0 && m == 0)
                return "00:00:00";

            if (h < 10 && h.length < 2)
                h = '0' + h.toString();

            if (m < 10 && m.length < 2)
                m = '0' + m.toString();

            return  this._formatString("{0}:{1}:00", h, m);
        }

    });

})(jQuery);