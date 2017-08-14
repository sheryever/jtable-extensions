/************************************************************************
* DATETIME extension for jTable       
* Author: Abu Ali Muhammad Sharjeel         
* Requied: jquery ui, jquery-ui-timepicker-addon.js, jquery.dateFormat.js
*************************************************************************/
(function ($) {

    //Reference to base object members
    var base = {
        _createDropDownListForField: $.hik.jtable.prototype._createDropDownListForField,
    };

    //extension members
    $.extend(true, $.hik.jtable.prototype, {

        /************************************************************************
         * DEFAULT OPTIONS / EVENTS                                              *
         *************************************************************************/
        options: {
            //groupSelectList: false
        },

        /************************************************************************
        * OVERRIDED METHODS                                                     *
         *************************************************************************/

        /* Creates a drop down list (combobox) input element for a field.
       *************************************************************************/
        _createDropDownListForField: function (field, fieldName, value, record, source, form) {
            var self = this;
            var $containerDiv = {};

            if (!field.optionGroups) {
                $containerDiv = base._createDropDownListForField.apply(this, arguments);
            } else {
                //Create a container div
                $containerDiv = $('<div />')
                    .addClass('jtable-input jtable-dropdown-input');

                //Create select element
                var $select = $('<select class="' + field.inputClass + '" id="Edit-' + fieldName + '" name="' + fieldName + '"></select>')
                    .appendTo($containerDiv);

                //add options
                var options = this._getOptionsForField(fieldName, {
                    record: record,
                    source: source,
                    form: form,
                    dependedValues: this._createDependedValuesUsingForm(form, field.dependsOn)
                });

                this._fillGroupDropDownListWithOptions($select, options, value);
            }

            if (field.change) {
                var $select = $containerDiv.find('select[name=' + fieldName + ']');
                $select.change(function () {
                    //Refresh options
                    var funcParams = {
                        record: record,
                        source: source,
                        form: form,
                        dependedValues: {},
                    };
                    
                    funcParams.dependedValues = self._createDependedValuesUsingForm(form, field.dependsOn);
                    var options = self._getOptionsForField(fieldName, funcParams);
                    var option = self._findOptionByValue(options, this.value);
                    funcParams.option = option;
                    field.change(funcParams);

                });
            }

            return $containerDiv;
        },
        /* Fills a dropdown list with given options.
         *************************************************************************/
        _fillGroupDropDownListWithOptions: function ($select, options, value) {
            $select.empty();

            var optionGroups = options.groupBy(function (obj) { return obj.GroupName; });
            var optionsString = "";
            for (var group in optionGroups) {
                var opts = optionGroups[group];
                optionsString += '<optgroup label="{0}" value="{1}">'.formatString(opts[0].GroupName, opts[0].GroupKey);
                for (var i = 0; i < opts.length; i++) {
                    optionsString += '<option {0} value="{1}">{2}</option>'.formatString(
                    (opts[i].Value == value ? ' selected="selected"' : ''), opts[i].Value, opts[i].DisplayText);
                }
                optionsString += '</optgroup>';
            }
            $select.html(optionsString);

        },
    });

})(jQuery);