/************************************************************************
* DATETIME extension for jTable       
* Author: Abu Ali Muhammad Sharjeel 
* Requied: jquery.ui.datepicker-cc.js
*************************************************************************/
var debugDate;
(function ($) {


    //Reference to base object members
    var base = {
        _createInputForRecordField: $.hik.jtable.prototype._createInputForRecordField
    };
    //extension members
    $.extend(true, $.hik.jtable.prototype, {

        options: {
            otherAttributes: false
        },

        _createInputForRecordField: function(funcParams) {
            var fieldHtml = base._createInputForRecordField.apply(this, arguments);
            //fieldHtml.find('#'+)

            if (!this.options.otherAttributes)
                return fieldHtml;

            var otherAttributes = this.options.fields[funcParams.fieldName].otherAttributes;
            if (otherAttributes)
                fieldHtml.find('#Edit-' + funcParams.fieldName).attr(otherAttributes);

            return fieldHtml;
            //funcParams.fieldName
        }

    });

})(jQuery);